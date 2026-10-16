import { useState, useEffect, useCallback, useRef } from 'react'
import { messagesApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import { usarPreBusca } from '@/lib/preBusca'
import { applyStatusUpdate } from '@/lib/messageStatus'
import { filaDeEnvio as filaPadrao, type FilaDeEnvio } from '@/lib/filaDeEnvio'
import type { Message, SendMessageDto, SocketAnomalyReviewed, SocketMediaReady, SocketMessageStatus } from '@/types'

/** 1ª página + o que já está na tela e a página não trouxe (SCRUM-1161).
 *  Ao abrir a conversa a lista começa com as bolhas da fila; enquanto a
 *  página carrega, chegam confirmações de envio e mensagens do socket. A
 *  busca pode ter saído ANTES delas existirem no servidor — substituir a
 *  lista as apagava da tela. */
function mesclarPrimeiraPagina(pagina: Message[], naTela: Message[]): Message[] {
  const ids = new Set(pagina.map((m) => m.id))
  const faltando = naTela.filter((m) => !ids.has(m.id))
  return faltando.length ? [...pagina, ...faltando] : pagina
}

/** Troca a bolha temporária pela real NO MESMO LUGAR (SCRUM-1161): antes ia
 *  para o fim da lista e o documento "pulava" para baixo do texto enviado
 *  depois. A miniatura do navegador fica até a do servidor chegar
 *  (homologação 06/10, SCRUM-1253). */
function trocarPelaReal(lista: Message[], tempId: string, real: Message, miniatura?: string): Message[] {
  const comMiniatura = (m: Message) => (m.mediaThumbnailUrl ? m : { ...m, mediaThumbnailUrl: miniatura })
  if (lista.some((m) => m.id === real.id)) {
    // O eco do socket já trouxe a real: só tira a temporária.
    return lista.filter((m) => m.id !== tempId).map((m) => (m.id === real.id ? comMiniatura(m) : m))
  }
  if (!lista.some((m) => m.id === tempId)) return [...lista, comMiniatura(real)]
  return lista.map((m) => (m.id === tempId ? comMiniatura(real) : m))
}

/** `usuarioId`: o atendente desta aba — só o eco do socket de uma mensagem
 *  DELE pode ocupar o lugar de uma bolha temporária (ver addIncomingMessage). */
export function useMessages(conversationId: string | null, fila: FilaDeEnvio = filaPadrao, usuarioId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  // SCRUM-1253 (PO, 11/10): a transição da troca de conversa espera a 1ª
  // página DESTA conversa — sem isso a lista anterior aparecia por um quadro.
  const [carregadaPara, setCarregadaPara] = useState<string | null>(null)
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
      // A 1ª página pode já ter saído em paralelo com a lista (ver lib/preBusca).
      const pre = reset ? usarPreBusca<Awaited<ReturnType<typeof messagesApi.list>>>(`mensagens:${conversationId}`) : null
      // Pré-busca que falhou (ex.: 429 no boot) não pode deixar a conversa vazia: cai na busca normal.
      const buscar = () => withRetry(() => messagesApi.list(conversationId, page, 50))
      const { data } = await (pre ? pre.catch(buscar) : buscar())
      if (!valeAinda()) return
      if (reset) {
        const pagina = data.data.reverse()
        setMessages((naTela) => mesclarPrimeiraPagina(pagina, naTela))
        pageRef.current = 2
      } else {
        setMessages((prev) => [...data.data.reverse(), ...prev])
        pageRef.current = page + 1
      }
      setHasMore(data.data.length === 50)
    } finally {
      if (valeAinda()) {
        setLoading(false)
        // Também no erro: a conversa aparece (vazia) em vez de ficar invisível.
        if (reset) setCarregadaPara(conversationId)
      }
    }
  }, [conversationId])

  useEffect(() => {
    if (conversationId) {
      setMessages(fila.pendentes(conversationId))
      fetchMessages(true)
    }
  }, [conversationId, fetchMessages, fila])

  // Fila de envio (lib/filaDeEnvio): bolhas otimistas, confirmação e descarte.
  useEffect(() => {
    if (!conversationId) return
    return fila.assinar((e) => {
      if (e.conversationId !== conversationId) return
      if (e.tipo === 'mudou') {
        setMessages((prev) => (prev.some((m) => m.id === e.mensagem.id)
          ? prev.map((m) => (m.id === e.mensagem.id ? e.mensagem : m))
          : [...prev, e.mensagem]))
      } else if (e.tipo === 'confirmado') {
        setMessages((prev) => trocarPelaReal(prev, e.tempId, e.mensagem, e.clientThumbnailUrl))
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== e.tempId))
      }
    })
  }, [conversationId, fila])

  const addIncomingMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Deduplicate by id to prevent double-rendering from overlapping socket events
      if (prev.some((m) => m.id === message.id)) return prev
      // Eco do socket da mensagem que ESTA aba está enviando (chega antes da
      // resposta do POST): entra no lugar da bolha temporária, não no fim —
      // senão passava à frente das que ainda estão na fila. Casa por tipo e
      // texto; só uma mensagem por conversa está em envio de cada vez.
      const emEnvio = conversationId ? fila.emEnvio(conversationId) : undefined
      if (
        emEnvio && message.direction === 'outbound' && message.senderKind === 'operator'
        && (!usuarioId || (message.sentByUser?.id ?? message.sentByUserId) === usuarioId)
        && message.type === emEnvio.type && (message.body ?? null) === (emEnvio.body ?? null)
        && prev.some((m) => m.id === emEnvio.id)
      ) {
        return prev.map((m) => (m.id === emEnvio.id
          ? { ...message, mediaThumbnailUrl: message.mediaThumbnailUrl ?? emEnvio.mediaThumbnailUrl }
          : m))
      }
      return [...prev, message]
    })
  }, [conversationId, fila, usuarioId])

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

  /** Põe na fila de envio desta conversa e volta na hora (a bolha aparece
   *  como `sending`). Falhas chegam por `aoFalhar` — o envio continua mesmo
   *  se o atendente trocar de conversa. */
  const sendMessage = useCallback(
    (dto: SendMessageDto, aoFalhar?: (err: unknown) => void) => {
      if (!conversationId) return
      fila.enfileirar(conversationId, dto, aoFalhar)
    },
    [conversationId, fila],
  )

  return {
    messages,
    loading,
    carregadaPara,
    hasMore,
    fetchMore: () => fetchMessages(false),
    addIncomingMessage,
    updateMessageStatus,
    updateMediaThumbnail,
    markAnomaliesReviewed,
    sendMessage,
  }
}
