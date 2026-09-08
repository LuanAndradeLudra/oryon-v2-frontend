import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, TrendingUp, Sparkles, ChevronDown,
  AlertTriangle, Lightbulb, ArrowRight, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateCRMInsights, type DashboardInsight } from '@/services/copilotService'
import { useCopilotContext } from '@/contexts/CopilotContext'
import { isFeatureVisible } from '@/config/featureFlags'
import type { Contact } from '@/types'

// ─── Insight palette (mirrors AiInsightsSection) ──────────────────────────────

const TYPE_CONFIG = {
  alert: {
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Alerta',
    chip: 'var(--color-danger)',
  },
  opportunity: {
    icon: <Lightbulb className="w-3 h-3" />,
    label: 'Oportunidade',
    chip: 'var(--color-status-active)',
  },
  trend: {
    icon: <TrendingUp className="w-3 h-3" />,
    label: 'Tendência',
    chip: 'var(--color-status-pending)',
  },
} satisfies Record<string, { icon: React.ReactNode; label: string; chip: string }>

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
        <span
          className="color-chip inline-flex items-center gap-1 text-3xs font-semibold px-1.5 py-0.5 rounded-full border"
          style={{ ['--chip']: cfg.chip } as React.CSSProperties}
        >
          {cfg.icon}
          {cfg.label}
        </span>
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[insight.priority])} />
      </div>
      <p className="text-xs font-semibold text-surface-100 leading-snug">{insight.title}</p>
      <p className="text-2xs text-surface-400 leading-relaxed">{insight.body}</p>
      {isFeatureVisible('aiInsightsAskButton') && (
        <button
          onClick={() => open(insight.question)}
          className="flex items-center gap-1 text-2xs font-medium text-brand-400 hover:text-brand-300 transition-colors self-start mt-0.5"
        >
          Perguntar à IA
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
      )}
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

// ─── Total de contatos card (detalhe expandido) ───────────────────────────────

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
    <div className="bg-surface-900 rounded-xl px-4 py-2.5 border border-surface-700/50 flex flex-col gap-2 w-full h-full">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 border border-surface-700">
          <Users className="w-3 h-3 text-brand-400" />
        </div>
        <p className="text-2xs text-surface-500">Total de contatos</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="text-xl font-bold text-surface-100 leading-none">{total.toLocaleString('pt-BR')}</p>
        <div className="flex flex-col items-end gap-0.5 pb-0.5">
          <span className="text-3xs text-status-active">+{newThisWeek} esta semana</span>
          <span className="text-3xs text-surface-500">{withOptIn} opt-in · {withTags} c/ etiquetas</span>
        </div>
      </div>

      {topSources.length > 0 && (
        <div className="flex flex-col gap-1 pt-0.5 border-t border-surface-700/50">
          {topSources.map(([src, count]) => (
            <div key={src} className="flex items-center justify-between gap-2">
              <span className="text-3xs text-surface-500 truncate">{SOURCE_LABEL[src] ?? src}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500/60 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.round((count / total) * 100)}%` }}
                  />
                </div>
                <span className="text-3xs font-medium text-surface-400 w-4 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Estágio predominante card (detalhe expandido) ────────────────────────────

function StageCard({
  contacts,
  stageCounts,
}: {
  contacts: Contact[]
  stageCounts?: Record<string, number>
}) {
  const byStage: Record<string, number> = stageCounts ?? {}
  if (!stageCounts) {
    contacts.forEach((c) => { const s = c.stage ?? 'lead'; byStage[s] = (byStage[s] ?? 0) + 1 })
  }
  const sorted = Object.entries(byStage)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
  const top = sorted[0]
  const maxCount = sorted[0]?.[1] ?? 1

  return (
    <div className="bg-surface-900 rounded-xl px-4 py-2.5 border border-surface-700/50 flex flex-col gap-2 w-full h-full">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 border border-surface-700">
          <TrendingUp className="w-3 h-3 text-brand-400" />
        </div>
        <p className="text-2xs text-surface-500">Situação predominante</p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="text-xl font-bold text-surface-100 leading-none">
          {top ? top[0].charAt(0).toUpperCase() + top[0].slice(1) : '—'}
        </p>
        {top && <span className="text-3xs text-surface-500 pb-0.5">{top[1]} contatos</span>}
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-col gap-1 pt-0.5 border-t border-surface-700/50">
          {sorted.slice(0, 3).map(([stage, count]) => (
            <div key={stage} className="flex items-center justify-between gap-2">
              <span className="text-3xs text-surface-500 truncate capitalize">{stage}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500/60 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="text-3xs font-medium text-surface-400 w-4 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Barra de estatísticas colapsável ─────────────────────────────────────────
//
// Colapsada por padrão: uma linha-resumo fina + seta. Ao expandir, revela os
// detalhes (fonte / estágio) e os Insights da IA (quando a flag está ligada).
// A escolha do usuário é lembrada em localStorage.

const COLLAPSE_KEY = 'crm-stats-collapsed'

interface ContactsStatsBarProps {
  contacts: Contact[]
  total: number
  /** Totais reais por estágio (do useKanbanContacts) — usados na linha-resumo
   *  e no card de estágio quando disponíveis. */
  stageCounts?: Record<string, number>
}

export function ContactsStatsBar({ contacts, total, stageCounts }: ContactsStatsBarProps) {
  const insightsEnabled = isFeatureVisible('crmAiInsights')
  const [insights, setInsights] = useState<DashboardInsight[]>([])
  const [loading, setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof localStorage === 'undefined') return true
    const saved = localStorage.getItem(COLLAPSE_KEY)
    return saved === null ? true : saved === '1'
  })

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* storage indisponível */ }
  }, [collapsed])

  // ── Números da linha-resumo ──────────────────────────────────────────────
  const withTags  = contacts.filter((c) => (c.tags?.length ?? 0) > 0).length
  const withOptIn = contacts.filter((c) => c.optIn).length

  const byStageTop: Record<string, number> = stageCounts ?? {}
  if (!stageCounts) contacts.forEach((c) => { const s = c.stage ?? 'lead'; byStageTop[s] = (byStageTop[s] ?? 0) + 1 })
  const topStage = Object.entries(byStageTop).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0]
  const topStageLabel = topStage ? topStage[0].charAt(0).toUpperCase() + topStage[0].slice(1) : '—'

  // ── Insights da IA (só busca quando expandido, pra não gastar tokens à toa) ─
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

  const runFetch = (stats: Parameters<typeof generateCRMInsights>[0]) => {
    setLoading(true)
    generateCRMInsights(stats).then(setInsights).finally(() => setLoading(false))
  }
  const fetchInsights = () => {
    runFetch({ total, byStage, bySource, topTags: topTags.map(({ name, count }) => ({ name, count })) })
  }

  const insightsFetchedRef = useRef(false)
  useEffect(() => {
    // Só busca quando: flag ligada + painel expandido + há contatos + ainda não buscou.
    if (!insightsEnabled || collapsed) { setLoading(false); return }
    if (contacts.length === 0) { setInsights([]); setLoading(false); return }
    if (!insightsFetchedRef.current) {
      insightsFetchedRef.current = true
      fetchInsights()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, contacts.length > 0, insightsEnabled])

  return (
    <div className="border-b border-surface-800">
      {/* Linha-resumo (sempre visível) — clique alterna o detalhe */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-surface-900/40 transition-colors"
      >
        <div className="w-5 h-5 rounded-md bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-3 h-3 text-brand-400" />
        </div>
        <p className="text-xs text-surface-400 truncate min-w-0">
          <span className="font-semibold text-surface-100">{total.toLocaleString('pt-BR')}</span> contatos
          <span className="text-surface-600"> · </span>{withOptIn} opt-in
          <span className="text-surface-600"> · </span>{withTags} c/ etiquetas
          <span className="text-surface-600"> · predominante </span>
          <span className="font-semibold text-surface-100">{topStageLabel}{topStage ? ` (${topStage[1].toLocaleString('pt-BR')})` : ''}</span>
        </p>
        <span className="ml-auto flex items-center gap-1 text-2xs text-surface-500 flex-shrink-0">
          {collapsed ? 'Ver resumo' : 'Ocultar'}
          <ChevronDown className={cn('w-4 h-4 transition-transform', !collapsed && 'rotate-180')} />
        </span>
      </button>

      {/* Detalhe (colapsável) */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="stats-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={cn('grid grid-cols-1 gap-2.5 px-4 pb-2.5 items-stretch', insightsEnabled ? 'md:grid-cols-4' : 'md:grid-cols-2')}>
              <TotalCard contacts={contacts} total={total} />
              <StageCard contacts={contacts} stageCounts={stageCounts} />

              {insightsEnabled && (
                <div className="md:col-span-2 bg-surface-900 rounded-xl border border-surface-700/60 px-4 py-2.5 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-600/60 to-transparent rounded-t-xl" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-black" />
                      </div>
                      <p className="text-2xs font-semibold text-brand-400/70 uppercase tracking-widest">Insights da IA</p>
                    </div>
                    {!loading && (
                      <button
                        onClick={fetchInsights}
                        className="flex items-center gap-1 text-2xs text-brand-400/60 hover:text-brand-300 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Atualizar
                      </button>
                    )}
                  </div>

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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
