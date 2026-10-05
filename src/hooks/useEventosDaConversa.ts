import { useEffect, useState } from 'react'
import { fetchUserActivity } from '@/services/userActivityApi'
import { fetchAgentActions } from '@/services/agentActivityApi'
import { eventoDaAcaoDaIa, eventoDaAtividade, type EventoDaConversa } from '@/lib/eventosDaConversa'

/**
 * T4 fase 1 — eventos da conversa a partir do activity-feed da conversa e das
 * ações da IA no CRM. Relê quando chega mensagem nova (`gatilho`), porque um
 * handoff ou uma pausa quase sempre vem junto com uma mensagem. Falha de uma
 * das fontes não derruba a outra (os eventos são complemento da conversa).
 */
export function useEventosDaConversa(conversationId: string | null, gatilho: number, meuNome?: string | null): EventoDaConversa[] {
  const [eventos, setEventos] = useState<EventoDaConversa[]>([])

  useEffect(() => {
    setEventos([])
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    let vivo = true
    const t = setTimeout(() => {
      void Promise.all([
        fetchUserActivity(conversationId, 100).catch(() => []),
        fetchAgentActions(conversationId, 100).catch(() => []),
      ]).then(([atividade, acoes]) => {
        if (!vivo) return
        setEventos([
          ...atividade.map((a) => eventoDaAtividade(a, meuNome)).filter((e): e is EventoDaConversa => e !== null),
          ...acoes.map(eventoDaAcaoDaIa),
        ])
      })
    }, 400)
    return () => { vivo = false; clearTimeout(t) }
  }, [conversationId, gatilho, meuNome])

  return eventos
}
