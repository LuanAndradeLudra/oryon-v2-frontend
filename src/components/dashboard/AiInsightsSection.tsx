import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateDashboardInsights, type DashboardInsight } from '@/services/copilotService'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { isFeatureVisible } from '@/config/featureFlags'
import type { KpiMetric } from '@/types/dashboard'

const TYPE_CONFIG = {
  alert: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Alerta',
    color: '#ef4444',
    chip: 'var(--color-danger)',
  },
  opportunity: {
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    label: 'Oportunidade',
    color: '#10b981',
    chip: 'var(--color-status-active)',
  },
  trend: {
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    label: 'Tendência',
    color: '#f59e0b',
    chip: 'var(--color-status-pending)',
  },
}

const PRIORITY_DOT: Record<DashboardInsight['priority'], string> = {
  high:   'bg-red-400',
  medium: 'bg-status-pending',
  low:    'bg-surface-500',
}

function InsightCard({ insight }: { insight: DashboardInsight }) {
  const { open } = useCopilotContext()
  const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.trend

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-surface-900 border rounded-xl p-4 flex flex-col gap-3',
        'border-surface-800 hover:border-surface-700 transition-colors',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('color-chip flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border')} style={{ ['--chip']: cfg.chip } as React.CSSProperties}>
            {cfg.icon}
            {cfg.label}
          </span>
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[insight.priority])} title={`Prioridade ${insight.priority}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-surface-100 leading-snug">{insight.title}</p>
        <p className="text-xs text-surface-400 leading-relaxed">{insight.body}</p>
      </div>

      {/* CTA — gated by aiInsightsAskButton flag. When off, the insight
          stays visible but the user can't bounce it into the Copilot. */}
      {isFeatureVisible('aiInsightsAskButton') && (
        <button
          onClick={() => open(insight.question)}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors self-start"
        >
          Perguntar à IA
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 flex flex-col gap-3 animate-pulse">
      <div className="h-5 w-24 bg-surface-800 rounded-full" />
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-3/4 bg-surface-800 rounded" />
        <div className="h-3 w-full bg-surface-800 rounded" />
        <div className="h-3 w-2/3 bg-surface-800 rounded" />
      </div>
      <div className="h-3 w-24 bg-surface-800 rounded" />
    </div>
  )
}

interface AiInsightsSectionProps {
  kpis: KpiMetric[]
}

export function AiInsightsSection({ kpis }: AiInsightsSectionProps) {
  const [insights, setInsights] = useState<DashboardInsight[]>([])
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)
  // Track the kpis identity to re-fetch when date range changes
  const kpisKeyRef = useRef<string>('')

  useEffect(() => {
    if (!kpis.length) return

    // Use first KPI value as a cheap change-detection key
    const key = kpis[0]?.value + '_' + kpis.length
    if (loadedRef.current && kpisKeyRef.current === key) return

    kpisKeyRef.current = key
    loadedRef.current = true
    setLoading(true)

    generateDashboardInsights(kpis).then((result) => {
      setInsights(result)
      setLoading(false)
    })
  }, [kpis])

  const refresh = () => {
    setLoading(true)
    generateDashboardInsights(kpis).then((result) => {
      setInsights(result)
      setLoading(false)
    })
  }

  // Don't render section if insights never loaded and we got nothing
  if (!loading && insights.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-black" />
          </div>
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-widest">Insights da IA</p>
        </div>
        {!loading && (
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
            title="Regenerar insights"
          >
            <RefreshCw className="w-3 h-3" />
            Atualizar
          </button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="wait">
          {loading ? (
            <>
              <SkeletonCard key="sk1" />
              <SkeletonCard key="sk2" />
              <SkeletonCard key="sk3" />
            </>
          ) : (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
