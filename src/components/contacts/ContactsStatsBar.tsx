import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, TrendingUp, Sparkles,
  AlertTriangle, Lightbulb, ArrowRight, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateCRMInsights, type DashboardInsight } from '@/services/copilotService'
import { useCopilotContext } from '@/contexts/CopilotContext'
import type { Contact } from '@/types'

// ─── Insight palette (mirrors AiInsightsSection) ──────────────────────────────

const TYPE_CONFIG = {
  alert: {
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Alerta',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
  },
  opportunity: {
    icon: <Lightbulb className="w-3 h-3" />,
    label: 'Oportunidade',
    bg: 'bg-status-active-bg',
    border: 'border-status-active-border',
    text: 'text-status-active',
  },
  trend: {
    icon: <TrendingUp className="w-3 h-3" />,
    label: 'Tendência',
    bg: 'bg-status-pending-bg',
    border: 'border-status-pending-border',
    text: 'text-status-pending',
  },
} satisfies Record<string, { icon: React.ReactNode; label: string; bg: string; border: string; text: string }>

const PRIORITY_DOT: Record<DashboardInsight['priority'], string> = {
  high:   'bg-red-400',
  medium: 'bg-status-pending',
  low:    'bg-surface-500',
}

// ─── Single insight row ───────────────────────────────────────────────────────

function InsightRow({ insight }: { insight: DashboardInsight }) {
  const { open } = useCopilotContext()
  const cfg = TYPE_CONFIG[insight.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.trend

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1.5 p-3 bg-surface-800 border border-surface-700 rounded-xl hover:border-surface-600 transition-colors"
    >
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
          cfg.bg, cfg.border, cfg.text,
        )}>
          {cfg.icon}
          {cfg.label}
        </span>
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[insight.priority])} />
      </div>
      <p className="text-xs font-semibold text-surface-100 leading-snug">{insight.title}</p>
      <p className="text-[11px] text-surface-400 leading-relaxed">{insight.body}</p>
      <button
        onClick={() => open(insight.question)}
        className="flex items-center gap-1 text-[11px] font-medium text-brand-400 hover:text-brand-300 transition-colors self-start mt-0.5"
      >
        Perguntar à IA
        <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </motion.div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-1.5 p-3 bg-surface-800 border border-surface-700 rounded-xl animate-pulse">
      <div className="h-4 w-20 bg-surface-800 rounded-full" />
      <div className="h-3 w-3/4 bg-surface-800 rounded" />
      <div className="h-3 w-full bg-surface-800 rounded" />
    </div>
  )
}

// ─── Total de contatos card ───────────────────────────────────────────────────

function TotalCard({ contacts, total }: { contacts: Contact[]; total: number }) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const newThisWeek = contacts.filter((c) => new Date(c.createdAt).getTime() > weekAgo).length
  const withTags    = contacts.filter((c) => (c.tags?.length ?? 0) > 0).length
  const withOptIn   = contacts.filter((c) => c.optIn).length

  const bySource: Record<string, number> = {}
  contacts.forEach((c) => { if (c.source) bySource[c.source] = (bySource[c.source] ?? 0) + 1 })
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const SOURCE_LABEL: Record<string, string> = {
    whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook',
    website: 'Website', referral: 'Indicação', campaign: 'Campanha', manual: 'Manual',
  }

  return (
    <div className="bg-surface-900 rounded-xl px-4 py-2.5 border border-surface-700/50 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 border border-surface-700">
          <Users className="w-3 h-3 text-brand-400" />
        </div>
        <p className="text-[11px] text-surface-500">Total de contatos</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="text-xl font-bold text-surface-100 leading-none">{total.toLocaleString('pt-BR')}</p>
        <div className="flex flex-col items-end gap-0.5 pb-0.5">
          <span className="text-[10px] text-status-active">+{newThisWeek} esta semana</span>
          <span className="text-[10px] text-surface-500">{withOptIn} opt-in · {withTags} c/ etiquetas</span>
        </div>
      </div>

      {topSources.length > 0 && (
        <div className="flex flex-col gap-1 pt-0.5 border-t border-surface-700/50">
          {topSources.map(([src, count]) => (
            <div key={src} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-surface-500 truncate">{SOURCE_LABEL[src] ?? src}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500/60"
                    style={{ width: `${Math.round((count / total) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-surface-400 w-4 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Estágio predominante card ────────────────────────────────────────────────

function StageCard({ contacts }: { contacts: Contact[] }) {
  const byStage: Record<string, number> = {}
  contacts.forEach((c) => { const s = c.stage ?? 'lead'; byStage[s] = (byStage[s] ?? 0) + 1 })
  const sorted = Object.entries(byStage).sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  const maxCount = sorted[0]?.[1] ?? 1

  return (
    <div className="bg-surface-900 rounded-xl px-4 py-2.5 border border-surface-700/50 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 border border-surface-700">
          <TrendingUp className="w-3 h-3 text-brand-400" />
        </div>
        <p className="text-[11px] text-surface-500">Estágio predominante</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="text-xl font-bold text-surface-100 leading-none">
          {top ? top[0].charAt(0).toUpperCase() + top[0].slice(1) : '—'}
        </p>
        {top && <span className="text-[10px] text-surface-500 pb-0.5">{top[1]} contatos</span>}
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-col gap-1 pt-0.5 border-t border-surface-700/50">
          {sorted.slice(0, 3).map(([stage, count]) => (
            <div key={stage} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-surface-500 truncate capitalize">{stage}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500/60"
                    style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-surface-400 w-4 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

interface ContactsStatsBarProps {
  contacts: Contact[]
  total: number
}

export function ContactsStatsBar({ contacts, total }: ContactsStatsBarProps) {
  const [insights, setInsights] = useState<DashboardInsight[]>([])
  const [loading, setLoading]   = useState(true)
  const loadedRef = useRef(false)

  // Derived stats for AI insights
  const byStage: Record<string, number> = {}
  contacts.forEach((c) => { const s = c.stage ?? 'lead'; byStage[s] = (byStage[s] ?? 0) + 1 })

  const tagCounts: Record<string, { name: string; count: number }> = {}
  contacts.forEach((c) =>
    c.tags?.forEach((t) => {
      if (!tagCounts[t.id]) tagCounts[t.id] = { name: t.name, count: 0 }
      tagCounts[t.id].count++
    })
  )
  const topTags = Object.values(tagCounts).sort((a, b) => b.count - a.count)

  const bySource: Record<string, number> = {}
  contacts.forEach((c) => { if (c.source) bySource[c.source] = (bySource[c.source] ?? 0) + 1 })

  // Pass current derived stats explicitly to avoid stale closure
  const runFetch = (stats: Parameters<typeof generateCRMInsights>[0]) => {
    setLoading(true)
    generateCRMInsights(stats)
      .then(setInsights)
      .finally(() => setLoading(false))
  }

  const fetchInsights = () => {
    runFetch({ total, byStage, bySource, topTags: topTags.map(({ name, count }) => ({ name, count })) })
  }

  // Fetch insights only on initial mount (not on every contact change to avoid API costs)
  const insightsFetchedRef = useRef(false)
  useEffect(() => {
    if (contacts.length === 0) {
      setInsights([])
      setLoading(false)
      return
    }
    if (!insightsFetchedRef.current) {
      insightsFetchedRef.current = true
      fetchInsights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length > 0])

  return (
    // Em mobile so o card de Insights IA aparece (Total e Estagio sao
    // redundantes com o kanban/lista). Em desktop, 3 cards lado-a-lado.
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 px-4 py-2.5 border-b border-surface-800">
      <div className="hidden md:block">
        <TotalCard contacts={contacts} total={total} />
      </div>
      <div className="hidden md:block">
        <StageCard contacts={contacts} />
      </div>

      {/* AI insights — col-span-2 em desktop, ocupa toda largura em mobile */}
      <div className="md:col-span-2 bg-surface-900 rounded-xl border border-surface-700/60 px-4 py-2.5 flex flex-col gap-2 relative overflow-hidden">
        {/* amber accent top stripe */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-600/60 to-transparent rounded-t-xl" />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3 h-3 text-black" />
            </div>
            <p className="text-[11px] font-semibold text-brand-400/70 uppercase tracking-widest">Insights da IA</p>
          </div>
          {!loading && (
            <button
              onClick={fetchInsights}
              className="flex items-center gap-1 text-[11px] text-brand-400/60 hover:text-brand-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </button>
          )}
        </div>

        {/* Insight rows */}
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence>
            {loading ? (
              <>
                <SkeletonRow key="sk1" />
                <SkeletonRow key="sk2" />
              </>
            ) : insights.length === 0 ? (
              <p key="empty" className="col-span-2 text-xs text-surface-600 text-center py-2">
                Sem dados suficientes para gerar insights.
              </p>
            ) : (
              insights.map((ins) => <InsightRow key={ins.id} insight={ins} />)
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
