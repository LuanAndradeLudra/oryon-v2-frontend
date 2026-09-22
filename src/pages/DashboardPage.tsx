import { useState, useEffect } from 'react'
import { RefreshCw, BarChart3, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'


import { LiveNowCard }      from '@/components/dashboard/LiveNowCard'
import { DateRangePicker }  from '@/components/dashboard/DateRangePicker'
import { KpiGrid }          from '@/components/dashboard/KpiGrid'
import { VolumeChart }      from '@/components/dashboard/VolumeChart'
import { SalesFunnelCard }  from '@/components/dashboard/SalesFunnelCard'
import { TeamMiniCard }     from '@/components/dashboard/TeamMiniCard'
import { FilaAgoraCard }    from '@/components/dashboard/FilaAgoraCard'
import { StatusDonut }      from '@/components/dashboard/StatusDonut'
import { TagsChart }        from '@/components/dashboard/TagsChart'
import { CsatChart }        from '@/components/dashboard/CsatChart'
import { PeakHoursHeatmap } from '@/components/dashboard/PeakHoursHeatmap'
import { AgentTable }       from '@/components/dashboard/AgentTable'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { AiInsightsSection } from '@/components/dashboard/AiInsightsSection'
import { ErrorState } from '@/components/ui/ErrorState'
import { isFeatureVisible } from '@/config/featureFlags'
// import { MarketingFunnelSection } from '@/components/dashboard/MarketingFunnelSection'
// Removido temporariamente — endpoint /api/analytics/marketing-funnel ainda nao
// existe no backend; trazer de volta quando o endpoint for implementado.

import {
  buildEmptySnapshot,
  EMPTY_REALTIME_STATUS,
  type DateRange,
  type DashboardSnapshot,
  type KpiMetric,
  type ActivityEvent,
} from '@/types/dashboard'
import { formatActivity, pickActivityType } from '@/components/dashboard/activityFormatter'
import type { HomeStats } from '@/types'
import type { User } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions, useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ConnectedLineChip } from '@/components/layout/ConnectedLineChip'
import { usePrimaryConnectedLine } from '@/hooks/usePrimaryConnectedLine'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { TipCard } from '@/components/ui/TipCard'
import { api } from '@/services/api'


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

export function DashboardPage() {
  const isMobile = useIsMobile()
  const { user: authUser } = useAuth()
  const { checklist, markDone } = useSetupChecklist(authUser?.id)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
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

  useEffect(() => {
    api.get<User>('/auth/me').then((r) => setCurrentUser(r.data)).catch(() => {})
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

  const dateAndRefreshActions = (
    <div className="flex items-center gap-2">
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

  // DASH-HEADER-03: período + refresh saem do header do KpiGrid pro slot de
  // ações da TopBar (mesmo padrão de useRegisterTopBarActions das outras
  // levas — não mexe em layout/TopBar.tsx).
  useRegisterTopBarActions(dateAndRefreshActions, [dateRange, loading, lastUpdated])

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {isMobile && <MobilePageHeader title="Dashboard" />}

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3.5">

            {/* Setup card */}
            <AnimatePresence>
              {!checklist.dashboard && (
                <TipCard
                  icon={<BarChart3 className="w-4 h-4 text-brand-400" />}
                  title="Explore seu dashboard"
                  description="Acompanhe KPIs, volume de atendimento, CSAT e performance da equipe em tempo real. Use os filtros de período para comparar resultados."
                  onDismiss={() => markDone('dashboard')}
                />
              )}
            </AnimatePresence>

            {loading ? (
              /* Minimal skeleton */
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* Espelha o layout main + rail p/ evitar layout shift */}
                <div className="col-span-12 xl:col-span-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest shrink-0">
                      Métricas Principais
                    </p>
                    <div className="flex-1" />
                    <div className="h-8 w-[104px] bg-surface-800 border border-surface-700/60 rounded-lg animate-pulse shrink-0" />
                  </div>
                  <div className="h-[104px] bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
                  <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-24 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
                    ))}
                  </div>
                  <div className="h-72 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
                </div>
                <div className="col-span-12 xl:col-span-4 space-y-4 order-first xl:order-none">
                  <div className="h-40 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
                  <div className="h-72 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
                </div>
              </div>
            ) : error ? (
              <ErrorState onRetry={refresh} />
            ) : snapshot && (
              /* ── Layout do mock 1b (R2-DASH-08) ─────────────────────────
                 1) faixa de KPIs em LARGURA TOTAL; 2) grid 2/3 + 1/3: esquerda
                 Conversas por hora + Funil, direita Fila agora + Equipe;
                 3) seções extras (que o mock não tem, mas são produto real)
                 ABAIXO. */
              <div className="space-y-3.5">
                <KpiGrid metrics={snapshot.kpis} />

                {/* Seção desligada por padrão (flag dashboardAiInsights) — não
                    montar evita a chamada generateDashboardInsights() e o gasto
                    de tokens. */}
                {isFeatureVisible('dashboardAiInsights') && (
                  <AiInsightsSection kpis={snapshot.kpis} />
                )}

                <div className="grid grid-cols-12 gap-3.5 items-start">
                  <div className="col-span-12 xl:col-span-8 space-y-3.5">
                    <VolumeChart data={snapshot.volumeChart} range={dateRange} onRangeChange={setDateRange} />
                    <SalesFunnelCard />
                  </div>
                  <div className="col-span-12 xl:col-span-4 space-y-3.5">
                    <FilaAgoraCard />
                    <TeamMiniCard agents={snapshot.agentMetrics} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TagsChart data={snapshot.tagVolumes} />
                  <CsatChart data={snapshot.csatChart} />
                </div>

                <PeakHoursHeatmap data={snapshot.heatmap} />

                <AgentTable agents={snapshot.agentMetrics} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  <LiveNowCard status={snapshot.realtime ? { agentsOnline: snapshot.realtime.agentsOnline, agentsTotal: snapshot.realtime.agentsOnline, activeConversations: snapshot.realtime.activeConversations, queued: snapshot.realtime.queueSize ?? 0, avgWaitSeconds: snapshot.realtime.avgWaitSeconds } : EMPTY_REALTIME_STATUS} />
                  <StatusDonut data={snapshot.statusDistribution} />
                  <ActivityFeed events={snapshot.activityFeed} />
                </div>

                {/* <MarketingFunnelSection dateRange={dateRange} /> — endpoint backend nao existe ainda */}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
