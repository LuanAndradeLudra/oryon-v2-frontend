import { useState, useEffect, useCallback, useRef } from 'react'
import { messagesApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import { inferMessageType } from '@/lib/inferMessageType'
import { applyStatusUpdate } from '@/lib/messageStatus'
import type { Message, SendMessageDto, SocketAnomalyReviewed, SocketMediaReady, SocketMessageStatus } from '@/types'

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const pageRef = useRef(1)
  // Revisão 02/10: troca rápida de conversa (J/K) — a resposta atrasada da
  // conversa anterior sobrescrevia a lista da atual, e o retorno de um envio
  // caía na conversa errada. Só aplica o que ainda é da conversa à vista e da
  // busca mais recente.
  const conversaAtual = useRef(conversationId)
  conversaAtual.current = conversationId
  const buscaAtual = useRef(0)

  const fetchMessages = useCallback(async (reset = true) => {
    if (!conversationId) return
    const minha = ++buscaAtual.current
    const valeAinda = () => minha === buscaAtual.current && conversaAtual.current === conversationId
    setLoading(true)
    try {
      const page = reset ? 1 : pageRef.current
      const { data } = await withRetry(() => messagesApi.list(conversationId, page, 50))
      if (!valeAinda()) return
      if (reset) {
        setMessages(data.data.reverse())
        pageRef.current = 2
      } else {
        setMessages((prev) => [...data.data.reverse(), ...prev])
        pageRef.current = page + 1
      }
      setHasMore(data.data.length === 50)
    } finally {
      if (valeAinda()) setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (conversationId) {
      setMessages([])
      fetchMessages(true)
    }
  }, [conversationId, fetchMessages])

  const addIncomingMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Deduplicate by id to prevent double-rendering from overlapping socket events
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [])

  // Casa por id OU wamid, respeita a conversa e nunca regride o status
  // (lib/messageStatus). O payload do socket não traz `timestamp`: os
  // instantes vêm em deliveredAt/readAt/failedAt.
  const updateMessageStatus = useCallback((payload: SocketMessageStatus) => {
    setMessages((prev) => prev.map((m) => applyStatusUpdate(m, payload)))
  }, [])

  /** Preview estilo WhatsApp — a miniatura de PDF é gerada numa fila
   *  assíncrona (pedido do usuário 2026-09-22, sem card de Jira) e "encaixa"
   *  na bolha do documento já renderizada, sem precisar refetch. */
  const updateMediaThumbnail = useCallback((payload: SocketMediaReady) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === payload.messageId ? { ...m, mediaThumbnailUrl: payload.mediaThumbnailUrl } : m))
    )
  }, [])

  /** SCRUM-806 — "marcar como verificada": todo marcador de handoff pendente
   *  cuja anomalia aconteceu ANTES do reconhecimento vira verificado. Anomalias
   *  posteriores (conversa re-sinalizada) continuam pendentes. */
  const markAnomaliesReviewed = useCallback((payload: SocketAnomalyReviewed) => {
    const at = new Date(payload.reviewedAt).getTime()
    setMessages((prev) =>
      prev.map((m) => {
        const a = m.anomaly
        if (!a || a.kind !== 'handoff' || a.reviewedAt) return m
        const occurred = a.occurredAt ? new Date(a.occurredAt).getTime() : 0
        if (occurred > at) return m
        return { ...m, anomaly: { ...a, reviewedAt: payload.reviewedAt, reviewedBy: payload.reviewedBy } }
      }),
    )
  }, [])

  const sendMessage = useCallback(
    async (dto: SendMessageDto) => {
      if (!conversationId) return

      // Eco otimista — texto E anexo, do mesmo jeito: a bolha (com a mídia
      // já visível, via blob: local) aparece na hora, com status `sending`
      // (cai no ícone de relógio que `StatusIcon` já usa como fallback). O
      // POST é síncrono até a API do WhatsApp responder (pode levar
      // segundos) e SÓ ENTÃO devolve a mensagem salva; sem isto a bolha não
      // aparecia até o fim desse round-trip inteiro. Reconciliada com a
      // mensagem real — ou marcada `failed` — quando a resposta chega.
      const tempId = `pending-${crypto.randomUUID()}`
      // blob: local do arquivo — o mesmo <img>/<audio>/link da bolha real
      // já aceita sem nenhuma mudança (useAuthenticatedMediaSrc devolve a
      // blob: URL tal como está, ver mediaUrls.ts). Só revogada no sucesso;
      // numa falha ela continua servindo de preview na bolha `failed`.
      const objectUrl = dto.file ? URL.createObjectURL(dto.file) : null
      const now = new Date().toISOString()
      setMessages((prev) => [...prev, {
        id: tempId,
        conversationId,
        direction: 'outbound',
        type: dto.file ? inferMessageType(dto.file.type) : 'text',
        status: 'sending',
        body: dto.body,
        mediaUrl: objectUrl ?? undefined,
        mediaCaption: dto.mediaCaption,
        // Miniatura renderizada no navegador (só PDF) — some assim que a
        // real (gerada no servidor) chega, ver o `?? ` na troca abaixo.
        mediaThumbnailUrl: dto.clientThumbnailUrl,
        contextWamid: dto.replyToWamid,
        senderKind: 'operator',
        sentAt: now,
        createdAt: now,
      }])

      try {
        const { data } = await messagesApi.send(conversationId, dto)
        // Trocou de conversa durante o envio: a mensagem já está salva no
        // servidor e aparece quando voltar — não entra na lista da outra.
        if (conversaAtual.current !== conversationId) {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
          return
        }
        // Substitui a bolha otimista pela real. Se o socket `message:new`
        // já tiver entregue a mesma mensagem enquanto o POST ainda estava em
        // voo (self-echo — ver handler em ChatWindow), ela já está na lista
        // por id: só tira a temporária, sem duplicar.
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId)
          if (withoutTemp.some((m) => m.id === data.id)) return withoutTemp
          // A miniatura real (gerada no servidor, fila assíncrona) ainda não
          // chegou neste ponto — sem isto, a miniatura do navegador
          // desapareceria por alguns segundos bem na hora em que o status
          // vira "enviado", até `message:media-ready` repor. `data` sempre
          // vence quando já tiver a sua própria (nunca deveria acontecer tão
          // rápido, mas não custa a guarda).
          const merged = { ...data, mediaThumbnailUrl: data.mediaThumbnailUrl ?? dto.clientThumbnailUrl }
          return [...withoutTemp, merged]
        })
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      } catch (err) {
        // A bolha fica marcada como falha em vez de sumir — o operador vê o
        // que tentou mandar (texto ou mídia) e decide reenviar, em vez de
        // perder de vista (o backend nunca chega a salvar nada quando a
        // chamada à Meta falha, então não há mensagem real para reconciliar
        // aqui — e o objectUrl não é revogado, a bolha falha ainda usa ele).
        // Com o ciclo "gravar antes" o backend já persistiu a linha `failed`
        // e a devolve em `failedMessage`: troca a bolha otimista por ela
        // (sem duplicar). Backend antigo não manda o campo → só marca falha.
        const failedMessage = (err as { response?: { data?: { failedMessage?: Message } } })?.response?.data
          ?.failedMessage
        if (failedMessage && objectUrl) URL.revokeObjectURL(objectUrl) // a bolha passa a usar a URL do servidor
        if (conversaAtual.current !== conversationId) throw err
        setMessages((prev) => {
          if (failedMessage) {
            const withoutTemp = prev.filter((m) => m.id !== tempId)
            return withoutTemp.some((m) => m.id === failedMessage.id) ? withoutTemp : [...withoutTemp, failedMessage]
          }
          return prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        })
        // Re-throw so the caller (MessageInput / ChatWindow) can show a
        // toast and decide whether to keep the typed text.
        throw err
      }
    },
    [conversationId],
  )

  return {
    messages,
    loading,
    hasMore,
    fetchMore: () => fetchMessages(false),
    addIncomingMessage,
    updateMessageStatus,
    updateMediaThumbnail,
    markAnomaliesReviewed,
    sendMessage,
  }
}
