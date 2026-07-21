import { useState, useEffect } from 'react'
import { RefreshCw, BarChart3, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'


import { RealtimeStrip }    from '@/components/dashboard/RealtimeStrip'
import { DateRangePicker }  from '@/components/dashboard/DateRangePicker'
import { KpiGrid }          from '@/components/dashboard/KpiGrid'
import { VolumeChart }      from '@/components/dashboard/VolumeChart'
import { StatusDonut }      from '@/components/dashboard/StatusDonut'
import { TagsChart }        from '@/components/dashboard/TagsChart'
import { CsatChart }        from '@/components/dashboard/CsatChart'
import { PeakHoursHeatmap } from '@/components/dashboard/PeakHoursHeatmap'
import { AgentTable }       from '@/components/dashboard/AgentTable'
import { ActivityFeed }     from '@/components/dashboard/ActivityFeed'
import { AiInsightsSection } from '@/components/dashboard/AiInsightsSection'
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
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { TipCard } from '@/components/ui/TipCard'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

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

export function DashboardPage() {
  const isMobile = useIsMobile()
  const { user: authUser } = useAuth()
  const { checklist, markDone } = useSetupChecklist(authUser?.id)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    axios.get<User>(`${API}/auth/me`).then((r) => setCurrentUser(r.data)).catch(() => {})
  }, [])

  const fetchDashboard = async () => {
    setLoading(true)
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
      const [{ data: dbSnapshot }, { data: stats }, { data: activityFeedRes }] = await Promise.all([
        axios.get(`${API}/home/snapshot`).catch(() => ({ data: null })),
        axios.get<HomeStats>(`${API}/home/stats`),
        axios.get<{ data: ActivityFeedApiRow[] }>(`${API}/activity-feed?since=${encodeURIComponent(sinceIso)}&limit=100`).catch(() => ({ data: { data: [] } })),
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
    } catch {
      setSnapshot(buildEmptySnapshot())
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => { fetchDashboard() }

  const dateAndRefreshActions = (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-surface-500 hidden sm:block">
        Atualizado às {format(lastUpdated, 'HH:mm', { locale: ptBR })}
      </span>
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      <button
        onClick={refresh}
        className="p-1.5 rounded-lg border border-surface-700 text-surface-400 hover:text-surface-200 hover:border-surface-600 transition-colors"
        title="Atualizar"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )

  // Em desktop registra no TopBar; em mobile renderiza inline acima do conteudo.
  useRegisterTopBarActions(
    isMobile ? null : dateAndRefreshActions,
    [dateRange, loading, lastUpdated, isMobile],
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {isMobile && <MobilePageHeader title="Dashboard" />}

        {/* Strip realtime — em mobile vira scroll horizontal para caber */}
        <div className={isMobile ? 'overflow-x-auto' : ''}>
          <RealtimeStrip status={snapshot?.realtime ? { agentsOnline: snapshot.realtime.agentsOnline, agentsTotal: snapshot.realtime.agentsOnline, activeConversations: snapshot.realtime.activeConversations, queued: snapshot.realtime.queueSize ?? 0, avgWaitSeconds: snapshot.realtime.avgWaitSeconds } : EMPTY_REALTIME_STATUS} />
        </div>

        {/* Mobile-only toolbar de filtros (date range + refresh) */}
        {isMobile && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/60 bg-surface-950/40">
            {dateAndRefreshActions}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-4 sm:px-6 sm:py-6 max-w-[1440px] mx-auto space-y-4 sm:space-y-5">

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
              <div className="space-y-5">
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="h-24 bg-surface-900 border border-surface-800 rounded-xl animate-pulse" />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 h-64 bg-surface-900 border border-surface-800 rounded-xl animate-pulse" />
                  <div className="h-64 bg-surface-900 border border-surface-800 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : snapshot && (
              <>
                <KpiGrid metrics={snapshot.kpis} />

                {/* Seção desligada por padrão (flag dashboardAiInsights) — não
                    montar evita a chamada generateDashboardInsights() e o gasto
                    de tokens. */}
                {isFeatureVisible('dashboardAiInsights') && (
                  <AiInsightsSection kpis={snapshot.kpis} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                  <div className="lg:col-span-2 h-full">
                    <VolumeChart data={snapshot.volumeChart} />
                  </div>
                  <StatusDonut data={snapshot.statusDistribution} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <TagsChart data={snapshot.tagVolumes} />
                  <CsatChart data={snapshot.csatChart} />
                </div>

                <PeakHoursHeatmap data={snapshot.heatmap} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <AgentTable agents={snapshot.agentMetrics} />
                  </div>
                  <ActivityFeed events={snapshot.activityFeed} />
                </div>

                {/* <MarketingFunnelSection dateRange={dateRange} /> — endpoint backend nao existe ainda */}

                <div className="h-2" />
              </>
            )}
          </div>
        </div>
      </div>
  )
}
