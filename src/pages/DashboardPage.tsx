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
import { MarketingFunnelSection } from '@/components/dashboard/MarketingFunnelSection'

import {
  buildEmptySnapshot,
  EMPTY_REALTIME_STATUS,
  type DateRange,
  type DashboardSnapshot,
  type KpiMetric,
} from '@/types/dashboard'
import type { HomeStats } from '@/types'
import type { User } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export function DashboardPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  if (isMobile) {
    return (
      <MobileFeatureGate
        open
        onClose={() => navigate('/home')}
        featureName="Dashboard"
        description="Dashboard tem KPIs com séries temporais, donut de status, heatmap de horários de pico, tabela de agentes e charts comparativos. Otimizado para tela larga. Abra no desktop para análise completa."
      />
    )
  }

  return <DashboardPageDesktop />
}

function DashboardPageDesktop() {
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
      // Fetch full snapshot from backend
      const [{ data: dbSnapshot }, { data: stats }] = await Promise.all([
        axios.get(`${API}/home/snapshot`).catch(() => ({ data: null })),
        axios.get<HomeStats>(`${API}/home/stats`),
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

      // Clear mock charts — show empty instead of fake data
      snap.volumeChart = []
      snap.csatTimeline = []
      snap.heatmap = []
      snap.activityFeed = []

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

  useRegisterTopBarActions(
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
    </div>,
    [dateRange, loading, lastUpdated],
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <RealtimeStrip status={snapshot?.realtime ? { agentsOnline: snapshot.realtime.agentsOnline, agentsTotal: snapshot.realtime.agentsOnline, activeConversations: snapshot.realtime.activeConversations, queued: snapshot.realtime.queueSize ?? 0, avgWaitSeconds: snapshot.realtime.avgWaitSeconds } : EMPTY_REALTIME_STATUS} />

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 max-w-[1440px] mx-auto space-y-5">

            {/* Setup card */}
            <AnimatePresence>
              {!checklist.dashboard && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-4 bg-brand-950/50 border border-brand-500/20 rounded-2xl px-5 py-4"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-100">Explore seu dashboard</p>
                    <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
                      Acompanhe KPIs, volume de atendimento, CSAT e performance da equipe em tempo real. Use os filtros de período para comparar resultados.
                    </p>
                  </div>
                  <button
                    onClick={() => markDone('dashboard')}
                    className="flex-shrink-0 text-surface-500 hover:text-surface-300 transition-colors mt-0.5"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
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

                <AiInsightsSection kpis={snapshot.kpis} />

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

                <MarketingFunnelSection dateRange={dateRange} />

                <div className="h-2" />
              </>
            )}
          </div>
        </div>
      </div>
  )
}
