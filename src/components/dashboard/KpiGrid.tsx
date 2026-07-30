import { useState, useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Settings2, X, RotateCcw, Check,
  MessageSquare, MessageCircle, Clock, CheckCircle2, XCircle,
  Target, Zap, Timer, ShieldCheck, Star, ThumbsUp, RefreshCw,
  ArrowDownLeft, ArrowUpRight, UserPlus, Bot, Users, Activity,
  Send, Eye, Reply, MousePointer, AlertTriangle, UserX, Radio, Megaphone,
  DollarSign, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { KpiId, KpiMetric } from '@/types/dashboard'
import { KPI_CATALOG, DEFAULT_KPI_SLOTS } from '@/types/dashboard'

const KPI_ICONS: Record<KpiId, React.ReactNode> = {
  total_conversations:  <MessageSquare className="w-4 h-4" />,
  active_conversations: <MessageCircle className="w-4 h-4" />,
  queued:               <Clock className="w-4 h-4" />,
  resolved:             <CheckCircle2 className="w-4 h-4" />,
  abandoned:            <XCircle className="w-4 h-4" />,
  resolution_rate:      <Target className="w-4 h-4" />,
  abandon_rate:         <XCircle className="w-4 h-4" />,
  first_response_time:  <Zap className="w-4 h-4" />,
  avg_resolution_time:  <Timer className="w-4 h-4" />,
  sla_compliance:       <ShieldCheck className="w-4 h-4" />,
  csat:                 <Star className="w-4 h-4" />,
  nps:                  <ThumbsUp className="w-4 h-4" />,
  recontact_rate:       <RefreshCw className="w-4 h-4" />,
  msgs_received:        <ArrowDownLeft className="w-4 h-4" />,
  msgs_sent:            <ArrowUpRight className="w-4 h-4" />,
  new_contacts:         <UserPlus className="w-4 h-4" />,
  bot_deflection:       <Bot className="w-4 h-4" />,
  bot_resolved:         <Bot className="w-4 h-4" />,
  agents_online:        <Users className="w-4 h-4" />,
  team_utilization:     <Activity className="w-4 h-4" />,
  // Campanhas
  campaign_sent:          <Send className="w-4 h-4" />,
  campaign_delivery_rate: <CheckCircle2 className="w-4 h-4" />,
  campaign_read_rate:     <Eye className="w-4 h-4" />,
  campaign_reply_rate:    <Reply className="w-4 h-4" />,
  campaign_ctr:           <MousePointer className="w-4 h-4" />,
  campaign_fail_rate:     <AlertTriangle className="w-4 h-4" />,
  campaign_optout_rate:   <UserX className="w-4 h-4" />,
  campaigns_active:       <Radio className="w-4 h-4" />,
  campaigns_total:        <Megaphone className="w-4 h-4" />,
  campaign_reach:         <Users className="w-4 h-4" />,
  // Marketing (Meta Ads + Google Ads)
  ads_leads_meta:         <Megaphone className="w-4 h-4" />,
  ads_leads_google:       <Target className="w-4 h-4" />,
  ads_total_spend:        <DollarSign className="w-4 h-4" />,
  ads_avg_cpl:            <DollarSign className="w-4 h-4" />,
  ads_avg_roas:           <BarChart2 className="w-4 h-4" />,
  ads_conversion_rate:    <TrendingUp className="w-4 h-4" />,
  ads_qualified_rate:     <CheckCircle2 className="w-4 h-4" />,
  ads_customer_rate:      <Star className="w-4 h-4" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  Atendimento: 'var(--color-accent-blue)',
  Velocidade:  'var(--color-accent-amber)',
  Qualidade:   'var(--color-accent-green)',
  Volume:      'var(--color-accent-cyan)',
  Bot:         'var(--color-accent-violet)',
  Equipe:      'var(--color-status-muted)',
  Disparos:    'var(--color-warning)',
  Marketing:   '#1877f2',
}


const LS_KEY = 'oryon:dashboard:kpi-slots'

function loadSlots(): KpiId[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as KpiId[]
  } catch { /* ignore */ }
  return DEFAULT_KPI_SLOTS
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ metric, hero }: { metric: KpiMetric; hero?: boolean }) {
  const isGood =
    (metric.trend > 0 && metric.trendIsGood === 'up') ||
    (metric.trend < 0 && metric.trendIsGood === 'down')
  const isBad =
    (metric.trend > 0 && metric.trendIsGood === 'down') ||
    (metric.trend < 0 && metric.trendIsGood === 'up')

  const trendColor = isGood ? 'text-online' : isBad ? 'text-danger' : 'text-surface-500'
  const catColor = hero ? 'var(--color-accent-dark)' : (CATEGORY_COLORS[metric.category] ?? 'var(--color-accent-blue)')

  return (
    <div
      className={cn(
        'card-glow bg-surface-900 border rounded-xl flex flex-col',
        hero
          ? 'border-surface-700/80 p-5 gap-3'
          : 'border-surface-800 p-3.5 gap-2',
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn('rounded-lg flex items-center justify-center flex-shrink-0', hero ? 'w-8 h-8' : 'w-6 h-6')}
          style={{ backgroundColor: `color-mix(in srgb, ${catColor} 10%, transparent)`, color: catColor }}
        >
          {KPI_ICONS[metric.id]}
        </div>
        <span className={cn('font-medium leading-tight text-surface-400', hero ? 'text-sm' : 'text-xs')}>
          {metric.label}
        </span>
      </div>

      <div className={cn(
        'font-bold tabular-nums leading-none font-display',
        hero ? 'text-3xl kpi-hero-value' : 'text-xl text-surface-50',
      )}>
        {formatKpiValue(metric.value, metric.unit)}
        {metric.unit === 'csat_score' && metric.value !== null && (
          <span className={cn('font-normal text-surface-400 ml-1 font-sans', hero ? 'text-base' : 'text-sm')}>/ 5</span>
        )}
      </div>

      {metric.trend !== 0 && (
        <div className={cn('relative flex items-center gap-1 font-medium', hero ? 'text-sm' : 'text-xs', trendColor)}>
          {metric.trend > 0
            ? <TrendingUp className={hero ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
            : <TrendingDown className={hero ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
          <span>{metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%</span>
          {hero && <span className="text-surface-600 font-normal">vs. período anterior</span>}
        </div>
      )}
    </div>
  )
}

// ── Customizer (simple modal-style overlay) ───────────────────────────────────

function CustomizerPanel({
  open, onClose, activeSlots, onToggle, onReset,
}: {
  open: boolean
  onClose: () => void
  activeSlots: KpiId[]
  onToggle: (id: KpiId) => void
  onReset: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const count = activeSlots.length
  const MIN = 4; const MAX = 20
  const categories = [...new Set(KPI_CATALOG.map((d) => d.category))]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="kpi-customizer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            key="kpi-customizer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface-950 border-l overlay-frame z-50 flex flex-col"
          >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
          <div>
            <p className="text-sm font-semibold text-surface-100">Personalizar KPIs</p>
            <p className="text-xs text-surface-400 mt-0.5">{count} de {MAX} selecionados (mín. {MIN})</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: CATEGORY_COLORS[cat] ?? 'var(--color-status-muted)' }}>
                {cat}
              </p>
              <div className="flex flex-col gap-1">
                {KPI_CATALOG.filter((d) => d.category === cat).map((def) => {
                  const isActive = activeSlots.includes(def.id)
                  const disabled = isActive ? count <= MIN : count >= MAX
                  return (
                    <button
                      key={def.id}
                      onClick={() => !disabled && onToggle(def.id)}
                      disabled={disabled}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors',
                        isActive
                          ? disabled
                            ? 'border-transparent bg-brand-600/40 text-white/60 cursor-not-allowed'
                            : 'border-transparent bg-brand-600 text-white hover:bg-brand-500'
                          : disabled
                            ? 'border-surface-800 text-surface-600 cursor-not-allowed'
                            : 'border-surface-800 text-surface-300 hover:border-surface-700 hover:bg-surface-900/50',
                      )}
                    >
                      <span className={cn(
                        'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0',
                        isActive ? 'bg-brand-950 border-black/40' : 'border-surface-600',
                      )}>
                        {isActive && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                      </span>
                      <span className="text-xs font-medium">{def.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

            <div className="px-5 py-4 border-t border-surface-800">
              <button onClick={onReset} className="flex items-center gap-2 text-xs text-surface-400 hover:text-surface-200 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Redefinir padrão
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── KPI Grid ──────────────────────────────────────────────────────────────────

export function KpiGrid({
  metrics,
  headerCenter,
}: {
  metrics: KpiMetric[]
  headerCenter?: ReactNode
}) {
  const [slots, setSlots] = useState<KpiId[]>(loadSlots)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(slots)) } catch { /* ignore */ }
  }, [slots])

  const toggle = (id: KpiId) => {
    setSlots((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  const activeMetrics = slots
    .map((id) => metrics.find((m) => m.id === id))
    .filter(Boolean) as KpiMetric[]

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest shrink-0">
          Métricas Principais
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-2 shrink-0">
          {headerCenter}
          <button
            onClick={() => setCustomizerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-surface-700/60 hover:border-surface-600 bg-surface-800 text-xs text-surface-400 hover:text-surface-200 transition-colors shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Personalizar
          </button>
        </div>
      </div>

      {/* Hierarquia visual: os 4 primeiros KPIs da seleção do usuário são o
          "hero row" (maiores, com contexto de tendência); o restante fica
          compacto abaixo. A ordem dos slots continua sendo a do usuário —
          reordenar no customizer muda o que é destaque. */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {activeMetrics.slice(0, 4).map((metric) => (
          <KpiCard key={metric.id} metric={metric} hero />
        ))}
      </div>

      {activeMetrics.length > 4 && (
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 mt-3">
          {activeMetrics.slice(4).map((metric) => (
            <KpiCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      <CustomizerPanel
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        activeSlots={slots}
        onToggle={toggle}
        onReset={() => setSlots(DEFAULT_KPI_SLOTS)}
      />
    </div>
  )
}
