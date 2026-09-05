// ─── Command Deck · dados ──────────────────────────────────────────────────
// Junta o que já existe (`listAgents`, passado de fora pela AgentsPage) com os
// endpoints do BE.7/AS.2 que AINDA NÃO EXISTEM no backend. Toda chamada nova
// passa por `withFallback` (services/withFallback.ts): 404/501 viram
// `available: false` em vez de erro, e a tela some com o dado em vez de
// mostrar zero — "não disponível" e "zero" são coisas diferentes.
//
// Polling (decidido em coord/A1-plano.md, aprovado pelo Maestro):
//   live + feed → 20s, só com a aba visível     pulse → 60s
//   metrics/health → 1x por agente no mount (janela de dias não muda a cada
//   minuto); health é rechecado se a aba ficou oculta por mais de 5 min.
//
// Os dados por agente ficam guardados junto da CHAVE da lista que os produziu
// (`{ key, data }`) e são descartados na leitura quando a lista muda. Isso
// evita duas coisas de uma vez: o `setState` síncrono dentro de efeito que a
// regra `react-hooks/set-state-in-effect` proíbe, e a janela em que o card de
// um agente novo herdaria a métrica de outro.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { agentsOpsApi, agentDraftApi } from '@/services/agentsOpsApi'
import { withFallback } from '@/services/withFallback'
import { conversationsApi, whatsappNumbersApi } from '@/services/api'
import type { AgentConfig } from '@/services/agentsApi'
import type {
  AgentsLiveResponse,
  AgentsPulse,
  AgentFeedItem,
  AgentMetrics,
  AgentHealth,
} from '@/types/agentsOps'
import type { Accent } from '@/components/ui/accentColor'
import { daysSince } from './deckFormat'

// ── Regra de Atenção ──────────────────────────────────────────────────────

export type DeckAttentionKind = 'token_expiring' | 'paused' | 'untested'

export interface DeckAttentionItem {
  id: string
  kind: DeckAttentionKind
  accent: Accent
  agentId: string
  agentName: string
  title: string
  description: string
}

const PAUSED_AFTER_DAYS = 2 // "pausado há mais de 48h"
const UNTESTED_AFTER_DAYS = 7

/** Ordem = criticidade, igual à hierarquia de cor do mockup. */
const KIND_ORDER: Record<DeckAttentionKind, number> = { token_expiring: 0, paused: 1, untested: 2 }

/**
 * Deriva a coluna "Atenção" 100% no cliente. É a fonte ÚNICA hoje: o BE.7 não
 * tem endpoint de atenção, então isto não é um fallback temporário de um dado
 * melhor — é a regra. Quando `health` não está disponível (AS.2/AS.3 ainda não
 * implantados), a regra de token simplesmente não gera item: ausência de dado
 * não vira alerta falso.
 */
export function deriveAttention(
  agents: AgentConfig[],
  health: Record<string, AgentHealth>,
): DeckAttentionItem[] {
  const items: DeckAttentionItem[] = []

  for (const agent of agents) {
    const warnings = health[agent.id]?.tool_warnings ?? []
    for (const w of warnings) {
      const expired = w.kind === 'token_expired' || new Date(w.expires_at).getTime() < Date.now()
      items.push({
        id: `${agent.id}:token:${w.tool_id}`,
        kind: 'token_expiring',
        accent: 'rose',
        agentId: agent.id,
        agentName: agent.name,
        title: expired
          ? `Token de uma ferramenta de ${agent.name} expirou`
          : `Token de uma ferramenta de ${agent.name} está expirando`,
        description: expired
          ? 'A ferramenta parou de responder até o token ser renovado.'
          : 'Renove antes do vencimento para o agente não perder a ferramenta.',
      })
    }

    if (agent.status === 'paused') {
      const days = daysSince(agent.updated_at)
      if (days !== null && days >= PAUSED_AFTER_DAYS) {
        items.push({
          id: `${agent.id}:paused`,
          kind: 'paused',
          accent: 'amber',
          agentId: agent.id,
          agentName: agent.name,
          title: `${agent.name} pausado há ${days} dias`,
          // Sem contagem de fila aqui de propósito: a fila só é conhecida
          // quando a linha do agente é resolvível (ver a seção de fila no
          // hook), e um número inventado seria pior que nenhum.
          description: 'Enquanto estiver pausado, ninguém está respondendo as conversas dele.',
        })
      }
    }

    if (agent.status === 'active') {
      const days = daysSince(agent.last_tested_at)
      if (days === null || days >= UNTESTED_AFTER_DAYS) {
        items.push({
          id: `${agent.id}:untested`,
          kind: 'untested',
          accent: 'blue',
          agentId: agent.id,
          agentName: agent.name,
          title: days === null ? `${agent.name} nunca foi testado` : `${agent.name} sem teste há ${days} dias`,
          description: 'Rode uma conversa no simulador para conferir o comportamento atual.',
        })
      }
    }
  }

  return items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

// ── Polling com aba visível ───────────────────────────────────────────────

function useVisibleInterval(fn: () => void, ms: number, enabled: boolean) {
  // Ref atualizada em efeito (nunca durante o render, react-hooks/refs): o
  // intervalo é montado uma vez e sempre chama a versão mais recente de `fn`.
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fnRef.current()
    }, ms)
    return () => window.clearInterval(id)
  }, [ms, enabled])
}

/** Estado que só vale para a lista de agentes que o produziu. */
interface Keyed<T> {
  key: string
  data: T
}

// ── Hook ──────────────────────────────────────────────────────────────────

export interface DeckData {
  live: AgentsLiveResponse
  liveAvailable: boolean
  pulse: AgentsPulse | null
  pulseAvailable: boolean
  feed: AgentFeedItem[]
  feedAvailable: boolean
  metrics: Record<string, AgentMetrics>
  queue: Record<string, number>
  attention: DeckAttentionItem[]
}

const EMPTY_LIVE: AgentsLiveResponse = {}
const EMPTY_FEED: AgentFeedItem[] = []
const EMPTY_PULSE: AgentsPulse = { resolvedByAiPct: 0, conversations: 0, goal: 0, transferred: 0 }
const EMPTY_METRICS: Record<string, AgentMetrics> = {}
const EMPTY_QUEUE: Record<string, number> = {}
const EMPTY_HEALTH: Record<string, AgentHealth> = {}

export function useDeckData(agents: AgentConfig[], enabled: boolean): DeckData {
  const [live, setLive] = useState<Keyed<AgentsLiveResponse>>({ key: '', data: EMPTY_LIVE })
  const [liveAvailable, setLiveAvailable] = useState(true)
  const [pulse, setPulse] = useState<AgentsPulse | null>(null)
  const [pulseAvailable, setPulseAvailable] = useState(true)
  const [feed, setFeed] = useState<AgentFeedItem[]>(EMPTY_FEED)
  const [feedAvailable, setFeedAvailable] = useState(true)
  const [metrics, setMetrics] = useState<Keyed<Record<string, AgentMetrics>>>({ key: '', data: EMPTY_METRICS })
  const [health, setHealth] = useState<Keyed<Record<string, AgentHealth>>>({ key: '', data: EMPTY_HEALTH })
  const [queue, setQueue] = useState<Keyed<Record<string, number>>>({ key: '', data: EMPTY_QUEUE })

  // String estável: o array de agentes é recriado a cada render da página, mas
  // os efeitos abaixo só devem re-disparar quando o CONJUNTO de ids mudar.
  const agentIdsKey = useMemo(() => agents.map((a) => a.id).sort().join(','), [agents])

  // Espelho da lista para os efeitos/intervalos, escrito em efeito e não
  // durante o render (react-hooks/refs). Declarado ANTES dos efeitos que leem
  // `agentsRef`, então roda primeiro no mesmo commit.
  const agentsRef = useRef(agents)
  useEffect(() => { agentsRef.current = agents })

  const keyRef = useRef(agentIdsKey)
  useEffect(() => { keyRef.current = agentIdsKey })

  // ── /live ──
  const loadLive = useCallback(async () => {
    const key = keyRef.current
    const ids = agentsRef.current.map((a) => a.id)
    if (ids.length === 0) return
    try {
      const res = await withFallback(() => agentsOpsApi.live(ids).then((r) => r.data), EMPTY_LIVE)
      setLive({ key, data: res.data })
      setLiveAvailable(res.available)
    } catch {
      // 401/403/500/rede: mantém o último valor bom em vez de piscar a UI. Não
      // marca `available: false` — isso significaria "o backend não tem essa
      // feature", que não é o caso aqui.
    }
  }, [])

  // ── /feed ──
  const loadFeed = useCallback(async () => {
    try {
      const res = await withFallback(() => agentsOpsApi.feed(20).then((r) => r.data), EMPTY_FEED)
      setFeed(res.data)
      setFeedAvailable(res.available)
    } catch { /* idem loadLive */ }
  }, [])

  // ── /pulse ──
  const loadPulse = useCallback(async () => {
    try {
      const res = await withFallback(() => agentsOpsApi.pulse().then((r) => r.data), EMPTY_PULSE)
      setPulse(res.available ? res.data : null)
      setPulseAvailable(res.available)
    } catch { /* idem loadLive */ }
  }, [])

  useEffect(() => {
    if (!enabled) return
    // Busca inicial das 3 fontes de tempo real. O `setState` de cada uma
    // acontece DEPOIS de um `await`, num microtask posterior ao commit — não
    // há cascata de renders síncrona. A regra abaixo não modela `await` e
    // marca qualquer fetch-no-mount (53 ocorrências iguais no repo hoje).
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadLive()
    void loadFeed()
    void loadPulse()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [enabled, agentIdsKey, loadLive, loadFeed, loadPulse])

  useVisibleInterval(() => { void loadLive(); void loadFeed() }, 20_000, enabled)
  useVisibleInterval(() => { void loadPulse() }, 60_000, enabled)

  // ── /:agentId/metrics — 1x por agente, sem polling ──
  // Ativo usa 7d (rótulo "7 dias" no card, decisão do Maestro: o contrato não
  // tem janela "hoje", então a UI não finge que tem). Pausado usa 30d, que é o
  // que o rodapé do card pausado mostra no mockup.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const key = agentIdsKey
    const list = agentsRef.current.filter((a) => a.status !== 'draft')

    void Promise.all(
      list.map(async (agent) => {
        const range = agent.status === 'paused' ? '30d' : '7d'
        try {
          const res = await withFallback(
            () => agentsOpsApi.metrics(agent.id, range).then((r) => r.data),
            null as AgentMetrics | null,
          )
          return { id: agent.id, metrics: res.data }
        } catch {
          return { id: agent.id, metrics: null }
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const data: Record<string, AgentMetrics> = {}
      for (const r of results) if (r.metrics) data[r.id] = r.metrics
      setMetrics({ key, data })
    })

    return () => { cancelled = true }
  }, [enabled, agentIdsKey])

  // ── health (token expirando) — 1x por agente + recheck após 5 min oculto ──
  const loadHealth = useCallback(async () => {
    const key = keyRef.current
    const results = await Promise.all(
      agentsRef.current.map(async (agent) => {
        try {
          const res = await withFallback(() => agentDraftApi.health(agent.id), null as AgentHealth | null)
          return [agent.id, res.data] as const
        } catch {
          return [agent.id, null] as const
        }
      }),
    )
    const data: Record<string, AgentHealth> = {}
    for (const [id, h] of results) if (h) data[id] = h
    setHealth({ key, data })
  }, [])

  useEffect(() => {
    if (!enabled) return
    void loadHealth()
  }, [enabled, agentIdsKey, loadHealth])

  useEffect(() => {
    if (!enabled) return
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
      if (hiddenAt !== null && Date.now() - hiddenAt > 5 * 60_000) void loadHealth()
      hiddenAt = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled, loadHealth])

  // ── Fila do agente pausado ────────────────────────────────────────────────
  // Decisão do Maestro: reusar `GET /conversations` (endpoint existente)
  // filtrado pela linha do agente. ACHADO: `GET /meta/numbers` não serializa o
  // `agentId` da linha (a coluna existe na entidade, o controller não a
  // devolve) e a rota é admin-only, então o vínculo agente→linha só é
  // resolvível casando `channels.whatsapp.number` com `displayPhoneNumber`.
  // Quando isso não resolve (usuário não-admin, ou agente sem número gravado
  // no `channels`), a fila fica ausente e o card omite a métrica — nunca
  // mostra 0 por engano.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const key = agentIdsKey
    const paused = agentsRef.current.filter((a) => a.status === 'paused' && a.channels?.whatsapp?.number)
    if (paused.length === 0) return

    const digits = (v: string) => v.replace(/\D/g, '')

    void (async () => {
      let numbers: Awaited<ReturnType<typeof whatsappNumbersApi.list>>['data']
      try {
        numbers = (await whatsappNumbersApi.list()).data
      } catch {
        return // 403 (não-admin) ou linha indisponível: sem fila, sem alarde.
      }
      if (cancelled) return

      const entries = await Promise.all(
        paused.map(async (agent) => {
          const wanted = digits(agent.channels?.whatsapp?.number ?? '')
          if (!wanted) return null
          const line = numbers.find((n) => {
            const d = digits(n.displayPhoneNumber)
            return d.endsWith(wanted) || wanted.endsWith(d)
          })
          if (!line) return null
          try {
            const res = await conversationsApi.list({ whatsappNumberId: line.id, status: 'open' }, 1, 1)
            return [agent.id, res.data.total] as const
          } catch {
            return null
          }
        }),
      )
      if (cancelled) return
      const data: Record<string, number> = {}
      for (const e of entries) if (e) data[e[0]] = e[1]
      setQueue({ key, data })
    })()

    return () => { cancelled = true }
  }, [enabled, agentIdsKey])

  // Só entrega o que foi buscado para ESTA lista de agentes.
  const healthForList = health.key === agentIdsKey ? health.data : EMPTY_HEALTH
  const attention = useMemo(() => deriveAttention(agents, healthForList), [agents, healthForList])

  return {
    live: live.key === agentIdsKey ? live.data : EMPTY_LIVE,
    liveAvailable,
    pulse,
    pulseAvailable,
    feed,
    feedAvailable,
    metrics: metrics.key === agentIdsKey ? metrics.data : EMPTY_METRICS,
    queue: queue.key === agentIdsKey ? queue.data : EMPTY_QUEUE,
    attention,
  }
}
