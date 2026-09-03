import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, BarChart3, TrendingUp, Users, MessageCircle, ShoppingCart,
  AlertTriangle, CheckCircle2, Sparkles, ChevronRight,
  ThumbsDown, Target, Zap, Megaphone, Globe, Crown, Filter, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { campaignsApi } from '@/services/api'
import { generateCampaignInsights } from '@/services/copilotService'
import { useChartColors } from '@/hooks/useChartColors'
import type { ChartColors } from '@/components/dashboard/utils'
import type { Campaign, CampaignAnalytics, CampaignConversionEvent, CampaignAttributionBreakdown, CampaignConversationSummary } from '@/types'
import type { CampaignInsight } from '@/services/copilotService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return '0%'
  return Math.round((num / den) * 100) + '%'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Tint temático — alpha via color-mix (funciona com var() e hex, nos dois temas). */
function tint(color: string, pctVal: number) {
  return `color-mix(in srgb, ${color} ${pctVal}%, transparent)`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-surface-500">
        <span style={{ color }} className="opacity-70">{icon}</span>
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-surface-600">{sub}</p>}
    </div>
  )
}

// ── Conversion type config ────────────────────────────────────────────────────

// color = chave de useChartColors() — usado em SVG (Recharts), onde var() não funciona
const CONV_CONFIG: Record<CampaignConversionEvent['type'], { label: string; color: keyof ChartColors; icon: React.ReactNode }> = {
  replied:      { label: 'Respondeu',       color: 'cyan',   icon: <MessageCircle className="w-3.5 h-3.5" /> },
  clicked_link: { label: 'Clicou no link',  color: 'purple', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  stage_changed:{ label: 'Avançou no CRM',  color: 'brand',  icon: <ChevronRight className="w-3.5 h-3.5" /> },
  purchase:     { label: 'Comprou',         color: 'online', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
}

const CHURN_COLOR_KEYS: (keyof ChartColors)[] = ['danger', 'away', 'brand', 'purple', 'axis']
const CHURN_LABELS: Record<string, string> = {
  optOut:        'Opt-out / descadastro',
  blocked:       'Bloqueou como spam',
  invalidNumber: 'Número inválido',
  undelivered:   'Falha de entrega',
  noInteraction: 'Sem interação (soft)',
}

// ── AI Insights section ───────────────────────────────────────────────────────

const INSIGHT_COLORS: Record<CampaignInsight['type'], string> = {
  alert:       'var(--color-accent-rose)',
  opportunity: 'var(--color-accent-green)',
  trend:       'var(--color-accent-blue)',
  success:     'var(--color-accent-violet)',
}

const INSIGHT_BG: Record<CampaignInsight['type'], string> = {
  alert:       tint('var(--color-accent-rose)', 9),
  opportunity: tint('var(--color-accent-green)', 9),
  trend:       tint('var(--color-accent-blue)', 9),
  success:     tint('var(--color-accent-violet)', 9),
}

function AiInsightsSection({ campaign, analytics }: { campaign: Campaign; analytics: CampaignAnalytics }) {
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const result = await generateCampaignInsights(
        campaign.name,
        campaign.stats as unknown as Record<string, unknown>,
        analytics.churnBreakdown as unknown as Record<string, unknown>,
      )
      setInsights(result)
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }, [campaign, analytics])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-surface-200">Análise da IA</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            loading
              ? 'bg-surface-800 border-surface-700 text-surface-500 cursor-not-allowed'
              : 'bg-brand-600/20 border-brand-600 text-brand-300 hover:bg-brand-600/30',
          )}
        >
          {loading ? (
            <><Spinner className="w-3 h-3" />Analisando...</>
          ) : generated ? (
            <><Sparkles className="w-3 h-3" />Reanalisar</>
          ) : (
            <><Sparkles className="w-3 h-3" />Gerar análise</>
          )}
        </button>
      </div>

      {!generated && !loading && (
        <div className="flex flex-col items-center gap-2 py-6 border border-dashed border-surface-700 rounded-xl">
          <Sparkles className="w-6 h-6 text-surface-600" />
          <p className="text-xs text-surface-500 text-center max-w-xs">
            Clique em "Gerar análise" para que a IA avalie conversões, churn e engajamento desta campanha.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-surface-500">
          <Spinner className="w-4 h-4 text-brand-400" />
          Analisando métricas da campanha...
        </div>
      )}

      <AnimatePresence>
        {generated && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-2"
          >
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="p-3 rounded-xl border"
                style={{ backgroundColor: INSIGHT_BG[ins.type], borderColor: tint(INSIGHT_COLORS[ins.type], 19) }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: tint(INSIGHT_COLORS[ins.type], 15), color: INSIGHT_COLORS[ins.type] }}>
                    {ins.type === 'alert' ? <AlertTriangle className="w-3 h-3" /> :
                     ins.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
                     ins.type === 'opportunity' ? <Target className="w-3 h-3" /> :
                     <TrendingUp className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-200">{ins.title}</p>
                    <p className="text-[11px] text-surface-400 mt-0.5 leading-relaxed">{ins.body}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Zap className="w-3 h-3" style={{ color: INSIGHT_COLORS[ins.type] }} />
                      <span className="text-[10px]" style={{ color: INSIGHT_COLORS[ins.type] }}>{ins.action}</span>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                    ins.priority === 'high' ? 'bg-danger/20 text-danger' :
                    ins.priority === 'medium' ? 'bg-status-pending-bg text-status-pending' :
                    'bg-surface-700 text-surface-400',
                  )}>
                    {ins.priority === 'high' ? 'ALTA' : ins.priority === 'medium' ? 'MÉD' : 'BAIXA'}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Attribution config ────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  meta_ads:   { label: 'Meta Ads',   color: '#1877f2', icon: <Megaphone className="w-3 h-3" /> },
  google_ads: { label: 'Google Ads', color: '#EA4335', icon: <Globe className="w-3 h-3" /> },
  whatsapp:   { label: 'WhatsApp Orgânico', color: '#25D366', icon: <MessageCircle className="w-3 h-3" /> },
  manual:     { label: 'Manual / Lista', color: 'var(--color-status-muted)', icon: <Users className="w-3 h-3" /> },
}

function getPlatformCfg(source: string) {
  return PLATFORM_CONFIG[source] ?? { label: source, color: 'var(--color-status-muted)', icon: <Users className="w-3 h-3" /> }
}

// ── Outcome / Sentiment config ────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  converted:   { label: 'Convertido',    color: 'var(--color-accent-green)' },
  churned:     { label: 'Churn',         color: 'var(--color-accent-rose)' },
  pending:     { label: 'Em andamento',  color: 'var(--color-accent-amber)' },
  no_response: { label: 'Sem resposta',  color: 'var(--color-status-muted)' },
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positivo',  color: 'var(--color-accent-green)' },
  neutral:  { label: 'Neutro',    color: 'var(--color-status-muted)' },
  negative: { label: 'Negativo',  color: 'var(--color-accent-rose)' },
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'conversions' | 'churn' | 'attribution' | 'conversations'

// ── Main report drawer ────────────────────────────────────────────────────────

interface CampaignReportProps {
  campaign: Campaign
  onClose: () => void
}

export function CampaignReport({ campaign, onClose }: CampaignReportProps) {
  const navigate = useNavigate()
  const C = useChartColors()
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [conversations, setConversations] = useState<CampaignConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')

  const { stats } = campaign

  useEffect(() => {
    Promise.all([
      campaignsApi.getAnalytics(campaign.id),
      campaignsApi.getConversations(campaign.id),
    ])
      .then(([analyticsRes, convsRes]) => {
        setAnalytics(analyticsRes.data)
        setConversations(convsRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [campaign.id])

  // Derived metrics
  const deliveredRate = stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0
  const readRate      = stats.sent > 0 ? Math.round((stats.read / stats.sent) * 100) : 0
  const replyRate     = stats.read > 0 && stats.replied ? Math.round((stats.replied / stats.read) * 100) : 0
  const convRate      = stats.read > 0 && stats.conversions ? Math.round((stats.conversions / stats.read) * 100) : 0

  const funnelData = [
    { label: 'Enviadas',    value: stats.sent,      color: 'var(--color-accent-blue)' },
    { label: 'Entregues',   value: stats.delivered, color: 'var(--color-accent-cyan)' },
    { label: 'Lidas',       value: stats.read,      color: 'var(--color-accent-amber)' },
    { label: 'Responderam', value: stats.replied ?? 0, color: 'var(--color-accent-violet)' },
    { label: 'Convertidas', value: stats.conversions ?? 0, color: 'var(--color-accent-green)' },
  ]

  const churnColors = CHURN_COLOR_KEYS.map((k) => C[k])

  const churnPieData = analytics ? [
    { name: CHURN_LABELS.optOut,        value: analytics.churnBreakdown.optOut },
    { name: CHURN_LABELS.blocked,       value: analytics.churnBreakdown.blocked },
    { name: CHURN_LABELS.invalidNumber, value: analytics.churnBreakdown.invalidNumber },
    { name: CHURN_LABELS.undelivered,   value: analytics.churnBreakdown.undelivered },
    { name: CHURN_LABELS.noInteraction, value: analytics.churnBreakdown.noInteraction },
  ].filter((d) => d.value > 0) : []

  const totalChurn = churnPieData.reduce((s, d) => s + d.value, 0)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',       label: 'Visão Geral' },
    { id: 'conversions',    label: `Conversões (${stats.conversions ?? 0})` },
    { id: 'churn',          label: `Churn (${stats.churnCount ?? totalChurn})` },
    { id: 'attribution',    label: 'Atribuição' },
    { id: 'conversations',  label: `Conversas (${conversations.length})` },
  ]

  // Filtered conversations
  const filteredConvs = conversations.filter((c) => {
    if (outcomeFilter !== 'all' && c.outcome !== outcomeFilter) return false
    if (sentimentFilter !== 'all' && c.sentiment !== sentimentFilter) return false
    return true
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[600px] bg-surface-950 border-l overlay-frame flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-surface-100 truncate">{campaign.name}</h2>
            <p className="text-[11px] text-surface-500 mt-0.5">
              Relatório de desempenho · {stats.total} contatos · {campaign.sentAt ? fmtDate(campaign.sentAt) : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-xs text-surface-500">
            <Spinner className="w-5 h-5 text-brand-400" />
            Carregando dados...
          </div>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="px-5 py-3 border-b border-surface-800 flex-shrink-0">
              <div className="grid grid-cols-4 gap-2">
                <KpiCard label="Lidas"        value={`${readRate}%`}  sub={`${stats.read} de ${stats.sent}`}      color="var(--color-accent-amber)" icon={<BarChart3 className="w-3.5 h-3.5" />} />
                <KpiCard label="Responderam"  value={`${replyRate}%`} sub={`${stats.replied ?? 0} respostas`}       color="var(--color-accent-violet)" icon={<MessageCircle className="w-3.5 h-3.5" />} />
                <KpiCard label="Conversões"   value={`${convRate}%`}  sub={`${stats.conversions ?? 0} confirmadas`} color="var(--color-accent-green)" icon={<ShoppingCart className="w-3.5 h-3.5" />} />
                <KpiCard label="Churn"        value={totalChurn}      sub={`${pct(totalChurn, stats.sent)} do total`} color="var(--color-accent-rose)" icon={<ThumbsDown className="w-3.5 h-3.5" />} />
              </div>
              {stats.engagementScore !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-surface-500">Score de engajamento</span>
                  <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stats.engagementScore}%`,
                        background: stats.engagementScore >= 70 ? 'var(--color-accent-green)' : stats.engagementScore >= 40 ? 'var(--color-accent-amber)' : 'var(--color-accent-rose)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold" style={{
                    color: stats.engagementScore >= 70 ? 'var(--color-accent-green)' : stats.engagementScore >= 40 ? 'var(--color-accent-amber)' : 'var(--color-accent-rose)',
                  }}>{stats.engagementScore}/100</span>
                </div>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-surface-800 flex-shrink-0">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tab === t.id ? 'bg-surface-800 text-surface-100' : 'text-surface-500 hover:text-surface-300',
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-5 space-y-5"
                >
                  {/* ── OVERVIEW ── */}
                  {tab === 'overview' && (
                    <>
                      {/* Funnel */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Funil de engajamento</p>
                        <div className="space-y-2">
                          {funnelData.map((f, i) => (
                            <div key={f.label} className="flex items-center gap-3">
                              <span className="text-[11px] text-surface-400 w-24 flex-shrink-0">{f.label}</span>
                              <div className="flex-1 h-6 bg-surface-800 rounded-lg overflow-hidden relative">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(f.value / stats.sent) * 100}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.08 }}
                                  className="h-full rounded-lg flex items-center pl-2"
                                  style={{ backgroundColor: tint(f.color, 25), borderLeft: `3px solid ${f.color}` }}
                                >
                                  <span className="text-[10px] font-bold" style={{ color: f.color }}>{f.value}</span>
                                </motion.div>
                              </div>
                              <span className="text-[11px] text-surface-500 w-12 text-right flex-shrink-0">
                                {pct(f.value, stats.sent)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      {analytics && analytics.engagementTimeline.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-300 mb-3">Engajamento ao longo do tempo</p>
                          <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analytics.engagementTimeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                <defs>
                                  <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.away} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={C.away} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="gReplied" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="gConverted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.online} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={C.online} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.axis }} />
                                <YAxis tick={{ fontSize: 10, fill: C.axis }} />
                                <Tooltip contentStyle={{ background: C.surface8, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 11 }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="read"      name="Lidas"      stroke={C.away} fill="url(#gRead)"      strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="replied"   name="Responderam" stroke={C.purple} fill="url(#gReplied)"   strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="converted" name="Convertidas" stroke={C.online} fill="url(#gConverted)" strokeWidth={2} dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* AI Insights */}
                      {analytics && <AiInsightsSection campaign={campaign} analytics={analytics} />}
                    </>
                  )}

                  {/* ── CONVERSIONS ── */}
                  {tab === 'conversions' && analytics && (
                    <>
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-emerald-400">{stats.conversions ?? 0}</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Total de conversões</p>
                        </div>
                        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-brand-400">{convRate}%</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Taxa (lidas → converteu)</p>
                        </div>
                        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-amber-400">{pct(stats.conversions ?? 0, stats.sent)}</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Taxa sobre enviadas</p>
                        </div>
                      </div>

                      {/* Conversion type breakdown */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Por tipo de conversão</p>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(CONV_CONFIG).map(([type, cfg]) => ({
                                name: cfg.label,
                                value: analytics.conversionEvents.filter((e) => e.type === type).length,
                                fill: C[cfg.color],
                              }))}
                              margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} />
                              <YAxis tick={{ fontSize: 10, fill: C.axis }} />
                              <Tooltip contentStyle={{ background: C.surface8, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 11 }} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {Object.values(CONV_CONFIG).map((cfg, i) => (
                                  <Cell key={i} fill={C[cfg.color]} fillOpacity={0.8} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Events table */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-2">Eventos de conversão</p>
                        <div className="space-y-1.5">
                          {analytics.conversionEvents.map((ev, i) => {
                            const cfg = CONV_CONFIG[ev.type]
                            return (
                              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-surface-800 border border-surface-700 rounded-xl">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: tint(C[cfg.color], 12), color: C[cfg.color] }}>
                                  {cfg.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-surface-200">{ev.contactName}</p>
                                  {ev.detail && <p className="text-[10px] text-surface-500">{ev.detail}</p>}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-[10px] font-medium" style={{ color: C[cfg.color] }}>{cfg.label}</p>
                                  <p className="text-[9px] text-surface-600">{fmtDate(ev.convertedAt)}</p>
                                </div>
                              </div>
                            )
                          })}
                          {analytics.conversionEvents.length === 0 && (
                            <p className="text-xs text-surface-500 text-center py-6">Nenhum evento de conversão registrado</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── ATTRIBUTION ── */}
                  {tab === 'attribution' && analytics && analytics.attributionBreakdown && (
                    <>
                      {/* Best performer highlight */}
                      {(() => {
                        const best = [...analytics.attributionBreakdown].sort((a, b) => b.conversionRate - a.conversionRate)[0]
                        if (!best) return null
                        const cfg = getPlatformCfg(best.source)
                        return (
                          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                            style={{ backgroundColor: tint(cfg.color, 7), borderColor: tint(cfg.color, 19) }}>
                            <Crown className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold" style={{ color: cfg.color }}>Melhor origem: {cfg.label}</p>
                              <p className="text-[11px] text-surface-400 mt-0.5">
                                {best.conversionCount} conversões · {Math.round(best.conversionRate * 100)}% de taxa · {best.contactCount} contatos
                              </p>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Horizontal comparison bars */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Taxa de leitura por origem</p>
                        <div className="space-y-2.5">
                          {analytics.attributionBreakdown.map((ab: CampaignAttributionBreakdown) => {
                            const cfg = getPlatformCfg(ab.source)
                            return (
                              <div key={ab.source} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                    <span className="text-[11px] text-surface-300">{cfg.label}</span>
                                    <span className="text-[10px] text-surface-600">({ab.contactCount} contatos)</span>
                                  </div>
                                  <span className="text-[11px] font-bold" style={{ color: cfg.color }}>
                                    {Math.round(ab.readRate * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ab.readRate * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: cfg.color }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Taxa de conversão por origem</p>
                        <div className="space-y-2.5">
                          {analytics.attributionBreakdown.map((ab: CampaignAttributionBreakdown) => {
                            const cfg = getPlatformCfg(ab.source)
                            return (
                              <div key={ab.source} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                    <span className="text-[11px] text-surface-300">{cfg.label}</span>
                                  </div>
                                  <span className="text-[11px] font-bold" style={{ color: cfg.color }}>
                                    {Math.round(ab.conversionRate * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ab.conversionRate * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: tint(cfg.color, 80) }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Comparison table */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-2">Tabela comparativa</p>
                        <div className="overflow-x-auto rounded-xl border border-surface-700">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-surface-700 bg-surface-800">
                                <th className="text-left px-3 py-2 text-surface-400 font-medium">Origem</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Contatos</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Lidos</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Respostas</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Conversões</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Conv.%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.attributionBreakdown.map((ab: CampaignAttributionBreakdown, i: number) => {
                                const cfg = getPlatformCfg(ab.source)
                                const isLast = i === analytics.attributionBreakdown.length - 1
                                return (
                                  <tr key={ab.source} className={cn('transition-colors hover:bg-surface-800/50', !isLast && 'border-b border-surface-800')}>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                        <span className="text-surface-300 font-medium">{cfg.label}</span>
                                      </div>
                                      {ab.adCampaignName && (
                                        <p className="text-[10px] text-surface-600 mt-0.5 pl-4">{ab.adCampaignName}</p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right text-surface-300">{ab.contactCount}</td>
                                    <td className="px-3 py-2 text-right text-surface-300">{ab.readCount} <span className="text-surface-600">({Math.round(ab.readRate * 100)}%)</span></td>
                                    <td className="px-3 py-2 text-right text-surface-300">{ab.replyCount}</td>
                                    <td className="px-3 py-2 text-right font-bold" style={{ color: cfg.color }}>{ab.conversionCount}</td>
                                    <td className="px-3 py-2 text-right font-bold" style={{ color: cfg.color }}>{Math.round(ab.conversionRate * 100)}%</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CONVERSATIONS ── */}
                  {tab === 'conversations' && (
                    <>
                      {/* Outcome distribution */}
                      {conversations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-300 mb-3">Distribuição por resultado</p>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => {
                              const count = conversations.filter((c) => c.outcome === key).length
                              return (
                                <button
                                  key={key}
                                  onClick={() => setOutcomeFilter(outcomeFilter === key ? 'all' : key)}
                                  className={cn(
                                    'rounded-xl p-2.5 border text-center transition-all',
                                    outcomeFilter === key
                                      ? 'border-current'
                                      : 'bg-surface-800 border-surface-700 hover:border-surface-600',
                                  )}
                                  style={outcomeFilter === key ? { backgroundColor: tint(cfg.color, 9), borderColor: tint(cfg.color, 38), color: cfg.color } : undefined}
                                >
                                  <p className="text-base font-bold" style={{ color: cfg.color }}>{count}</p>
                                  <p className="text-[9px] text-surface-500 mt-0.5 leading-tight">{cfg.label}</p>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sentiment + filters row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                        <span className="text-[10px] text-surface-500">Sentimento:</span>
                        {['all', 'positive', 'neutral', 'negative'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSentimentFilter(s)}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                              sentimentFilter === s
                                ? 'bg-surface-700 border-surface-500 text-surface-200'
                                : 'border-surface-800 text-surface-500 hover:text-surface-300',
                            )}
                          >
                            {s === 'all' ? 'Todos' : SENTIMENT_CONFIG[s]?.label ?? s}
                          </button>
                        ))}
                        {(outcomeFilter !== 'all' || sentimentFilter !== 'all') && (
                          <button
                            onClick={() => { setOutcomeFilter('all'); setSentimentFilter('all') }}
                            className="ml-auto text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            Limpar filtros
                          </button>
                        )}
                      </div>

                      {/* Conversation list */}
                      <div className="space-y-2">
                        {filteredConvs.length === 0 && (
                          <div className="flex flex-col items-center py-8 gap-2 text-surface-500">
                            <MessageCircle className="w-6 h-6" />
                            <p className="text-xs">Nenhuma conversa encontrada com esses filtros</p>
                          </div>
                        )}
                        {filteredConvs.map((conv) => {
                          const outcomeCfg = OUTCOME_CONFIG[conv.outcome] ?? { label: conv.outcome, color: 'var(--color-status-muted)' }
                          const sentimentCfg = SENTIMENT_CONFIG[conv.sentiment] ?? { label: conv.sentiment, color: 'var(--color-status-muted)' }
                          const adCfg = conv.adSource ? getPlatformCfg(conv.adSource) : null
                          return (
                            <div key={conv.contactId} className="px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-xl space-y-1.5">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-surface-200">{conv.contactName}</span>
                                    <span className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                      style={{ ['--chip']: outcomeCfg.color } as React.CSSProperties}>
                                      {outcomeCfg.label}
                                    </span>
                                    <span className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                                      style={{ ['--chip']: sentimentCfg.color } as React.CSSProperties}>
                                      {sentimentCfg.label}
                                    </span>
                                    {adCfg && (
                                      <span className="color-chip flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                                        style={{ ['--chip']: adCfg.color } as React.CSSProperties}>
                                        {adCfg.icon}
                                        {conv.adCampaignName ?? adCfg.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-surface-400 mt-1 leading-relaxed line-clamp-2">{conv.lastMessageSnippet}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className="text-[9px] text-surface-600">{fmtDate(conv.lastMessageAt)}</span>
                                  <button
                                    onClick={() => { onClose(); navigate(`/contacts?contact=${conv.contactId}`) }}
                                    className="text-[9px] text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    CRM
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Sentiment summary chart */}
                      {conversations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-300 mb-3">Sentimento geral</p>
                          <div className="flex gap-2">
                            {Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => {
                              const count = conversations.filter((c) => c.sentiment === key).length
                              const pctVal = Math.round((count / conversations.length) * 100)
                              return (
                                <div key={key} className="flex-1 bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                                  <p className="text-lg font-bold" style={{ color: cfg.color }}>{pctVal}%</p>
                                  <p className="text-[10px] text-surface-500 mt-0.5">{cfg.label}</p>
                                  <p className="text-[10px] text-surface-600">{count} conversa{count !== 1 ? 's' : ''}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── CHURN ── */}
                  {tab === 'churn' && analytics && (
                    <>
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-danger">{totalChurn}</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Total churn</p>
                        </div>
                        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-amber-400">{pct(totalChurn, stats.sent)}</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Taxa de churn</p>
                        </div>
                        <div className="bg-surface-800 border border-surface-700 rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-surface-300">{pct(stats.optedOut ?? analytics.churnBreakdown.optOut + analytics.churnBreakdown.blocked, stats.sent)}</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Descadastraram</p>
                        </div>
                      </div>

                      {/* Pie + breakdown */}
                      {churnPieData.length > 0 && (
                        <div className="flex gap-4">
                          <div className="w-44 flex-shrink-0 h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={churnPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                                  dataKey="value" paddingAngle={3}>
                                  {churnPieData.map((_, i) => (
                                    <Cell key={i} fill={churnColors[i % churnColors.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: C.surface8, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-2">
                            {churnPieData.map((d, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[i % churnColors.length] }} />
                                <span className="text-[11px] text-surface-400 flex-1 truncate">{d.name}</span>
                                <span className="text-[11px] font-bold text-surface-200 flex-shrink-0">{d.value}</span>
                                <span className="text-[10px] text-surface-600 w-10 text-right flex-shrink-0">{pct(d.value, totalChurn)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interpretation */}
                      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 space-y-2.5">
                        <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Interpretação dos motivos</p>
                        {analytics.churnBreakdown.optOut > 0 && (
                          <div className="flex gap-2">
                            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[0] }} />
                            <p className="text-[11px] text-surface-400 leading-relaxed">
                              <strong className="text-surface-200">{analytics.churnBreakdown.optOut} opt-outs</strong>: contatos que clicaram em "parar de receber". Revise a relevância do conteúdo e a frequência dos envios para esse segmento.
                            </p>
                          </div>
                        )}
                        {analytics.churnBreakdown.blocked > 0 && (
                          <div className="flex gap-2">
                            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[1] }} />
                            <p className="text-[11px] text-surface-400 leading-relaxed">
                              <strong className="text-surface-200">{analytics.churnBreakdown.blocked} bloqueios</strong>: contatos que reportaram como spam. Taxa elevada pode impactar o quality score do número WABA.
                            </p>
                          </div>
                        )}
                        {analytics.churnBreakdown.noInteraction > 0 && (
                          <div className="flex gap-2">
                            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[4] }} />
                            <p className="text-[11px] text-surface-400 leading-relaxed">
                              <strong className="text-surface-200">{analytics.churnBreakdown.noInteraction} sem interação</strong>: entregue mas ignorado. Considere um follow-up ou retirar este segmento das próximas campanhas.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* AI insights on churn */}
                      {analytics && <AiInsightsSection campaign={campaign} analytics={analytics} />}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
