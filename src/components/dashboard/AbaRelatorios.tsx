import { useState, useEffect } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'

import { DateRangePicker }  from './DateRangePicker'
import { KpiGrid }          from './KpiGrid'
import { VolumeChart }      from './VolumeChart'
import { SalesFunnelCard }  from './SalesFunnelCard'
import { StatusDonut }      from './StatusDonut'
import { TagsChart }        from './TagsChart'
import { CsatChart }        from './CsatChart'
import { PeakHoursHeatmap } from './PeakHoursHeatmap'
import { AgentTable }       from './AgentTable'
import { ActivityFeed }     from './ActivityFeed'
import { AiInsightsSection } from './AiInsightsSection'
import { ErrorState } from '@/components/ui/ErrorState'
import { isFeatureVisible } from '@/config/featureFlags'
// import { MarketingFunnelSection } from './MarketingFunnelSection'
// Removido temporariamente — endpoint /api/analytics/marketing-funnel ainda nao
// existe no backend; trazer de volta quando o endpoint for implementado.

import {
  buildEmptySnapshot,
  type DateRange,
  type DashboardSnapshot,
  type KpiMetric,
  type ActivityEvent,
} from '@/types/dashboard'
import { formatActivity, pickActivityType } from './activityFormatter'
import type { HomeStats } from '@/types'
import { useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { ConnectedLineChip } from '@/components/layout/ConnectedLineChip'
import { usePrimaryConnectedLine } from '@/hooks/usePrimaryConnectedLine'
import { api } from '@/services/api'
import type { AbaDoPainel } from '@/lib/abaDoPainel'
import { CabecalhoDoPainel } from './CabecalhoDoPainel'


// Row shape returned by GET /activity-feed (mirrors the public shape from
// backend/src/modules/activity/activity.service.ts). The `metadata` bag
// carries the row's `details` JSONB (from/to for stage changes, enabled
// for automation toggles, etc.) plus enrichments resolved at request time
// (userName, tagName). We forward both to the formatter so it can produce
// the most informative sentence possible.
interface ActivityFeedApiRow {
  id: string
  type: string
  timestamp: string
  actor: string
  subject: string
  summary: string
  metadata?: Record<string, unknown>
}

/**
 * Convert raw backend rows into the closed `ActivityEvent` shape the
 * dashboard renders. Two concerns:
 *   1. ICON — pickActivityType maps known actions to one of the 8 curated
 *      icons in EVENT_CONFIG; everything else gets the generic
 *      'system_event' icon (no info lost — the text below carries it).
 *   2. TEXT — formatActivity produces an operator-friendly PT-BR
 *      sentence for EVERY action, even ones we don't have a dedicated
 *      formatter for. The sentence already includes the actor name, so
 *      the renderer can show `event.subject` directly without prefixing.
 *
 * `subject` here intentionally holds the FULL formatted sentence (not
 * just a name) so the ActivityFeed component can render it as-is.
 */
function mapActivityFeed(rows: ActivityFeedApiRow[]): ActivityEvent[] {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    // The backend's actorType comes nested under metadata. We normalise
    // it into one of three buckets — user/agent/system — so the timeline
    // can render the right icon (User / Bot / Cpu).
    const rawActorType = typeof r.metadata?.actorType === 'string' ? r.metadata.actorType : ''
    const actorType =
      rawActorType === 'user' ? 'user' as const :
      rawActorType === 'agent' ? 'agent' as const :
      'system' as const
    // For AI-agent rows the resolver in activity.service.ts may have left
    // `actor` empty (cross-DB lookup to agent_configs isn't wired yet).
    // Fall back to a generic "Agente IA" label so the panel never shows
    // "Sistema" for what was clearly a bot action.
    const actorName = r.actor
      || (actorType === 'agent' ? 'Agente IA' : 'Sistema')
    return {
      id: r.id,
      type: pickActivityType(r.type),
      actorName,
      actorType,
      subject: formatActivity({
        action: r.type,
        subject: r.subject,
        details: r.metadata,
      }),
      timestamp: r.timestamp,
    }
  })
}

// DASH-HEADER-01: "Terça, 15 set · atualizado há 20 s" — dia da semana curto
// capitalizado (date-fns EEEE dá "terça-feira" completo em pt-BR, não bate).
const WEEKDAYS_SHORT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatUpdatedSubtitle(lastUpdated: Date, now: Date): string {
  const dia = `${WEEKDAYS_SHORT[lastUpdated.getDay()]}, ${lastUpdated.getDate()} ${MESES_ABREV[lastUpdated.getMonth()]}`
  const diffSec = Math.max(0, Math.floor((now.getTime() - lastUpdated.getTime()) / 1000))
  const ago = diffSec < 60 ? `${diffSec} s` : diffSec < 3600 ? `${Math.floor(diffSec / 60)} min` : `${Math.floor(diffSec / 3600)} h`
  return `${dia} · atualizado há ${ago}`
}

interface Props {
  aba: AbaDoPainel
  onAba: (a: AbaDoPainel) => void
  celular?: boolean
}

/**
 * Aba "Relatórios" do Dashboard (PO 27/09: os gráficos do período saem da
 * operação ao vivo). É o conteúdo que o Dashboard tinha, menos os três cartões
 * do "agora" — Fila agora, Equipe e Ao vivo —, que eram leituras erradas
 * (as 3 conversas mais recentes, "0 online", espera = tempo médio de
 * resposta) e foram refeitos na aba Agora com dado real.
 */
export function AbaRelatorios({ aba, onAba, celular = false }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  // PL-C2-FAR-2 (P6): antes, uma falha de rede/backend caía no catch e virava
  // um snapshot zerado igual ao de "sem atividade ainda" — o operador não
  // tinha como distinguir "não há nada pra ver" de "o dashboard quebrou".
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [now, setNow] = useState(() => new Date())
  const primaryLine = usePrimaryConnectedLine()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5000)
    return () => clearInterval(id)
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    setError(false)
    try {
      // Fetch full snapshot + activity feed from backend. The activity feed
      // lives on its own endpoint (`/activity-feed`) because it powers more
      // than just the dashboard widget; we map its rows below into the
      // narrower ActivityEvent shape the dashboard component understands.
      //
      // The activity widget shows the LAST 4 HOURS only — older activity
      // belongs to the dedicated audit screen, not the dashboard glance.
      // Limit raised to 100 because, with the AI agent actively replying,
      // even a single hour can produce dozens of conversation_assigned /
      // resolved rows.
      const sinceIso = new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      // PL-C2-FAR-1: nem `/home/snapshot` nem `/home/stats` aceitam `range`
      // no backend (nenhum dos dois controllers declara @Query — conferido em
      // dashboard.controller.ts) — passar o período aqui não mudava nada;
      // o comentário antigo ("range scopes appointmentsScheduled/…") estava
      // errado. O período agora só filtra `VolumeChart` no cliente (abaixo).
      //
      // PL-C4-FAR-1: rede de segurança independente do interceptor de retry
      // de services/api.ts. Medição ao vivo do usuário (2026-09-22 21:0x):
      // com o teto em 35s, o erro só aparecia em ~38s — ou seja, é o TETO que
      // resolve, não a causa raiz (uma chamada com timeout de 30s deveria
      // estourar perto de 30s se estivesse mesmo sob o axios configurado).
      // Causa raiz segue aberta (ver commit da investigação), mas 35s é
      // tempo longo demais pro usuário — Intercom/Linear falham em ~10s.
      // 15s = o tempo de UMA tentativa (o retry de timeout já foi removido
      // no PL-C3-FAR-1/db31620, não são mais 3 tentativas de 30s cada).
      const hardTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('dashboard-fetch-timeout')), 15_000),
      )
      const [{ data: dbSnapshot }, { data: stats }, { data: activityFeedRes }] = await Promise.race([
        Promise.all([
          api.get('/home/snapshot').catch(() => ({ data: null })),
          api.get<HomeStats>('/home/stats'),
          api.get<{ data: ActivityFeedApiRow[] }>(`/activity-feed?since=${encodeURIComponent(sinceIso)}&limit=100`).catch(() => ({ data: { data: [] } })),
        ]),
        hardTimeout,
      ])

      // Start with empty structure, fill with real data
      const snap = buildEmptySnapshot()

      // Override ALL KPIs with real values (zero trend since no historical data)
      const s = stats
      const realKpis: Record<string, number> = {
        'total_conversations':      s.totalConversations ?? ((s.conversationsOpen ?? 0) + (s.conversationsResolvedToday ?? 0) + (s.queueCount ?? 0)),
        'active_conversations':     s.conversationsOpen ?? 0,
        'queued':                   s.queueCount ?? 0,
        'resolved':                 s.conversationsResolvedToday ?? 0,
        'abandoned':                0,
        'resolution_rate':          s.totalConversations ? Math.round(((s.conversationsResolvedToday ?? 0) / Math.max(s.totalConversations, 1)) * 100) : 0,
        'abandon_rate':             0,
        'first_response_time':      (s.avgResponseMinutes ?? 0) * 60,
        'avg_resolution_time':      0,
        'sla_compliance':           0,
        'csat':                     0,
        'nps':                      0,
        'recontact_rate':           0,
        'msgs_received':            s.messagesReceivedToday ?? 0,
        'msgs_sent':                s.messagesSentToday ?? 0,
        'new_contacts':             s.newContactsThisWeek ?? 0,
        'bot_deflection':           0,
        'bot_resolved':             0,
        'agents_online':            s.agentsOnline ?? 0,
        'team_utilization':         0,
        'campaign_sent':            0,
        'campaign_delivery_rate':   0,
        'campaign_read_rate':       0,
        'campaign_reply_rate':      0,
        'campaign_ctr':             0,
        'campaign_optout_rate':     0,
        'appointments_scheduled':   s.appointmentsScheduled ?? 0,
        'appointments_cancelled':   s.appointmentsCancelled ?? 0,
      }
      snap.kpis = snap.kpis.map((kpi: KpiMetric) => {
        const val = realKpis[kpi.id]
        return val !== undefined ? { ...kpi, value: val, trend: 0 } : { ...kpi, value: 0, trend: 0 }
      })

      // Override status donut with real data
      if (dbSnapshot?.statusDistribution) {
        const sd = dbSnapshot.statusDistribution
        snap.statusDistribution = {
          open: sd.open ?? 0, pending: sd.pending ?? 0,
          resolved: sd.resolved ?? 0, abandoned: sd.abandoned ?? 0,
        }
      } else {
        snap.statusDistribution = { open: s.conversationsOpen ?? 0, pending: s.queueCount ?? 0, resolved: s.conversationsResolvedToday ?? 0, abandoned: 0 }
      }

      // Override tag volumes with real data
      if (dbSnapshot?.tagVolumes?.length > 0) {
        snap.tagVolumes = dbSnapshot.tagVolumes
      } else {
        snap.tagVolumes = []
      }

      // Override agent metrics with real data
      if (dbSnapshot?.agentMetrics?.length > 0) {
        snap.agentMetrics = dbSnapshot.agentMetrics
      } else {
        snap.agentMetrics = []
      }

      // Override realtime strip
      snap.realtime = {
        agentsOnline:        s.agentsOnline ?? 0,
        activeConversations: s.conversationsOpen ?? 0,
        queueSize:           s.queueCount ?? 0,
        avgWaitSeconds:      (s.avgResponseMinutes ?? 0) * 60,
      }

      // Volume / heatmap / csatChart now come from the backend snapshot.
      // The previous code zeroed them out as a guard against mock data; with
      // the backend producing real values they pass straight through. Each
      // is defaulted to [] when the backend omits it (e.g. csatChart while
      // the satisfaction-survey feature isn't shipped).
      snap.volumeChart = Array.isArray(dbSnapshot?.volumeChart) ? dbSnapshot.volumeChart : []
      snap.heatmap     = Array.isArray(dbSnapshot?.heatmap)     ? dbSnapshot.heatmap     : []
      snap.csatChart   = Array.isArray(dbSnapshot?.csatChart)   ? dbSnapshot.csatChart   : []

      // Activity feed comes from /activity-feed (separate endpoint). The
      // mapper drops rows whose `type` isn't in the dashboard's renderer
      // catalog so the component never crashes on unknown actions.
      snap.activityFeed = mapActivityFeed(activityFeedRes?.data ?? [])

      setSnapshot(snap)
      setLastUpdated(new Date())
    } catch (err) {
      // PL-C2-FAR-2: não substitui por um snapshot zerado (isso é o que
      // causava o bug — ver ErrorState.tsx). O estado de erro cobre a tela
      // (abaixo) com "Tentar de novo"; nenhum número falso é mostrado.
      // PL-C4-FAR-1: log explícito — antes este catch não deixava rastro
      // nenhum no console, dificultando diagnosticar por que o erro nao
      // aparecia visualmente.
      console.error('[DashboardPage] fetchDashboard falhou:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // PL-C2-FAR-1: `dateRange` saiu daqui — não refaz fetch nenhum (nada no
  // backend variava com ele; ver comentário em fetchDashboard). Trocar o
  // período agora só refiltra `VolumeChart` no cliente, sem round-trip.
  useEffect(() => { fetchDashboard() }, [])
  const refresh = () => { fetchDashboard() }

  const [personalizando, setPersonalizando] = useState(false)

  // Linha da aba: Personalizar (os indicadores do topo) · período · atualizar.
  const dateAndRefreshActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPersonalizando(true)}
        disabled={!snapshot}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-[var(--bd2)] text-xs font-semibold text-surface-300 hover:text-surface-100 hover:bg-[var(--rowhover)] disabled:opacity-50 disabled:pointer-events-none transition-colors"
        title="Escolher e ordenar os indicadores do topo"
      >
        <Settings2 className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Personalizar</span>
        <span className="sr-only sm:hidden">Personalizar indicadores</span>
      </button>
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      <button
        onClick={refresh}
        className="w-7 h-7 inline-flex items-center justify-center rounded-sm border border-[var(--bd2)] text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors"
        title="Atualizar"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )

  // DASH-HEADER-03 → 27/09: com as abas, período e atualizar voltam para a
  // linha da aba (a TopBar os escondia no celular).

  // DASH-HEADER-01: subtítulo dinâmico "Terça, 15 set · atualizado há Ns" no
  // lugar do texto fixo da rota — `now` tickando a cada 5s mantém o "há Ns" vivo.
  useRegisterTopBarSubtitle(
    <>
      {formatUpdatedSubtitle(lastUpdated, now)}
      {primaryLine.connected && (
        <span className="ml-3"><ConnectedLineChip>WhatsApp conectado</ConnectedLineChip></span>
      )}
    </>,
    [lastUpdated, now, primaryLine.connected],
  )

  const cabecalho = <CabecalhoDoPainel aba={aba} onAba={onAba} direita={dateAndRefreshActions} />

  if (loading) {
    return (
      <div className="space-y-3.5" aria-busy="true" aria-label="Carregando os relatórios">
        {cabecalho}
        <div className="h-[104px] bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: celular ? 4 : 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="space-y-3.5">
        {cabecalho}
        <ErrorState onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      {cabecalho}
      <KpiGrid metrics={snapshot.kpis} customizerOpen={personalizando} onCustomizerClose={() => setPersonalizando(false)} />

      {/* Seção desligada por padrão (flag dashboardAiInsights) — não
          montar evita a chamada generateDashboardInsights() e o gasto
          de tokens. */}
      {isFeatureVisible('dashboardAiInsights') && (
        <AiInsightsSection kpis={snapshot.kpis} />
      )}

      <div className="grid grid-cols-12 gap-3.5 items-start">
        <div className="col-span-12 xl:col-span-8">
          <VolumeChart data={snapshot.volumeChart} range={dateRange} onRangeChange={setDateRange} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <StatusDonut data={snapshot.statusDistribution} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3.5 items-start">
        <div className="col-span-12 xl:col-span-8">
          <SalesFunnelCard />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <ActivityFeed events={snapshot.activityFeed} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TagsChart data={snapshot.tagVolumes} />
        <CsatChart data={snapshot.csatChart} />
      </div>

      <PeakHoursHeatmap data={snapshot.heatmap} />

      <AgentTable agents={snapshot.agentMetrics} />

      {/* <MarketingFunnelSection dateRange={dateRange} /> — endpoint backend nao existe ainda */}
    </div>
  )
}
