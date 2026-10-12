import { useEffect, useRef, useState } from 'react'
import { getSocket } from '@/services/socket'
import { ACTIVITY_INVALIDATE_EVENT, type ActivityInvalidateDetail } from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { fetchUserActivity } from '@/services/userActivityApi'
import { fetchAgentActions } from '@/services/agentActivityApi'
import { eventoDaAcaoDaIa, eventoDaAtividade, juntarDuplicados, type EventoDaConversa } from '@/lib/eventosDaConversa'

/** O que o hook precisa saber das mensagens: a última e se a lista está carregando. */
export interface GatilhoDeMensagens {
  ultima: { id: string; conversationId: string } | null
  carregando: boolean
}

type Fase = 'esperando' | 'carregando' | 'pronta'

/**
 * T4 fase 1 — eventos da conversa a partir do activity-feed da conversa e das
 * ações da IA no CRM. Relê quando chega mensagem nova (`mensagens`), porque um
 * handoff ou uma pausa quase sempre vem junto com uma mensagem. Falha de uma
 * das fontes não derruba a outra (os eventos são complemento da conversa).
 *
 * SCRUM-1253 (PO, 06/10): pausa, atribuição e status SEM mensagem nova não
 * mudavam o `gatilho`, e o evento só aparecia ao trocar de conversa. Agora
 * relê também pelos mesmos canais da Timeline do painel: o evento local
 * `oryon:activity-invalidate` (ações do próprio operador) e os eventos de
 * socket da conversa (outros operadores e a IA).
 */
export function useEventosDaConversa(conversationId: string | null, mensagens: GatilhoDeMensagens, meuNome?: string | null): EventoDaConversa[] {
  const [eventos, setEventos] = useState<EventoDaConversa[]>([])
  const [releitura, setReleitura] = useState(0)
  // 1ª carga de cada conversa sem espera: sai junto com a Timeline do painel e
  // as duas dividem o mesmo pedido (lib/preBusca). As releituras seguem com 400 ms.
  const primeira = useRef<string | null>(null)

  useEffect(() => {
    setEventos([])
  }, [conversationId])

  // Revisão 11/10: o gatilho era `messages.length` — a troca J/K (N → 0 → M)
  // disparava uma 2ª leitura e a 1ª mensagem de uma conversa vazia (0 → 1) era
  // ignorada. Agora: cada conversa espera a 1ª carga terminar (carregando →
  // pronta) e, a partir daí, só a mudança do id da ÚLTIMA mensagem — e da
  // própria conversa — conta como mensagem nova. Página antiga (fetchMore)
  // entra no começo da lista e não muda a última.
  const [novas, setNovas] = useState(0)
  const ultimaId = mensagens.ultima?.conversationId === conversationId ? mensagens.ultima.id : null
  const estado = useRef<{ conversa: string | null; fase: Fase; ultimaId: string | null }>({
    conversa: conversationId, fase: mensagens.carregando ? 'carregando' : 'esperando', ultimaId: null,
  })
  useEffect(() => {
    const e = estado.current
    if (e.conversa !== conversationId) {
      estado.current = { conversa: conversationId, fase: mensagens.carregando ? 'carregando' : 'esperando', ultimaId: null }
      return
    }
    if (e.fase === 'esperando') {
      if (mensagens.carregando) e.fase = 'carregando'
      return
    }
    if (e.fase === 'carregando') {
      if (!mensagens.carregando) { e.fase = 'pronta'; e.ultimaId = ultimaId }
      return
    }
    if (ultimaId && ultimaId !== e.ultimaId) {
      e.ultimaId = ultimaId
      setNovas((n) => n + 1)
    }
  }, [conversationId, mensagens.carregando, ultimaId])

  useEffect(() => {
    if (!conversationId) return
    let vivo = true
    const espera = primeira.current === conversationId ? 400 : 0
    primeira.current = conversationId
    const t = setTimeout(() => {
      void Promise.all([
        fetchUserActivity(conversationId).catch(() => []),
        fetchAgentActions(conversationId, 100).catch(() => []),
      ]).then(([atividade, acoes]) => {
        if (!vivo) return
        setEventos(juntarDuplicados([
          ...atividade.map((a) => eventoDaAtividade(a, meuNome)).filter((e): e is EventoDaConversa => e !== null),
          ...acoes.map(eventoDaAcaoDaIa),
        ]))
      })
    }, espera)
    return () => { vivo = false; clearTimeout(t) }
  }, [conversationId, novas, meuNome, releitura])

  useEffect(() => {
    if (!conversationId) return
    // Uma rajada de eventos (assumir = pausa + atribuição) vira uma releitura só:
    // o próprio fetch acima já espera 400 ms antes de ir ao backend.
    const reler = (id?: string) => { if (!id || id === conversationId) setReleitura((n) => n + 1) }
    const aoInvalidar = (e: Event) => reler((e as CustomEvent<ActivityInvalidateDetail>).detail?.conversationId)
    const daConversa = (p?: { conversationId?: string }) => reler(p?.conversationId)
    const doNegocio = () => reler()
    const CANAIS = ['conversation:assigned', 'conversation:resolved', 'conversation:status-updated', 'conversation:ai-pause-updated'] as const

    window.addEventListener(ACTIVITY_INVALIDATE_EVENT, aoInvalidar)
    const socket = getSocket()
    CANAIS.forEach((c) => socket.on(c, daConversa))
    // `deal:changed` traz contactId, não conversationId (mesma regra da Timeline).
    socket.on('deal:changed', doNegocio)
    return () => {
      window.removeEventListener(ACTIVITY_INVALIDATE_EVENT, aoInvalidar)
      CANAIS.forEach((c) => socket.off(c, daConversa))
      socket.off('deal:changed', doNegocio)
    }
  }, [conversationId])

  return eventos
}
