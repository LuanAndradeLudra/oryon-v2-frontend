import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Lock, Smile, Meh, Frown, HelpCircle, Sparkles, Loader2, RefreshCw, AlertTriangle, Target, ShieldAlert, Lightbulb, MessageSquareQuote, MessageCircle, ScanSearch, Crosshair, BarChart3, FileText, Settings2, Wand2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { contactsApi } from '@/services/api'
import { AiSuggestionsModal } from '../AiSuggestionsModal'
import type { Contact, ContactSentiment } from '@/types'

function formatDate(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const SENTIMENT_CONFIG: Record<ContactSentiment, { icon: React.ReactNode; label: string; chip: string; iconColor: string }> = {
  positive: { icon: <Smile className="w-3.5 h-3.5" />, label: 'Positivo', chip: 'var(--color-status-active)', iconColor: 'text-status-active' },
  neutral:  { icon: <Meh className="w-3.5 h-3.5" />,  label: 'Neutro',   chip: 'var(--color-status-muted)', iconColor: 'text-surface-300' },
  negative: { icon: <Frown className="w-3.5 h-3.5" />, label: 'Negativo', chip: 'var(--color-danger)', iconColor: 'text-red-400' },
  unknown:  { icon: <HelpCircle className="w-3.5 h-3.5" />, label: 'Indefinido', chip: 'var(--color-status-muted)', iconColor: 'text-surface-500' },
}

// ── Loading steps ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { text: 'Carregando histórico de conversas...', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { text: 'Analisando comportamento do contato...', icon: <ScanSearch className="w-3.5 h-3.5" /> },
  { text: 'Identificando dores e interesses...', icon: <Crosshair className="w-3.5 h-3.5" /> },
  { text: 'Mapeando objeções e resistências...', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { text: 'Qualificando perfil e lead score...', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { text: 'Extraindo informações de contexto...', icon: <FileText className="w-3.5 h-3.5" /> },
  { text: 'Preenchendo campos personalizados...', icon: <Settings2 className="w-3.5 h-3.5" /> },
  { text: 'Gerando estratégia de abordagem...', icon: <Wand2 className="w-3.5 h-3.5" /> },
]

function GeneratingState() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i < LOADING_STEPS.length - 1 ? i + 1 : i))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const progress = ((stepIndex + 1) / LOADING_STEPS.length) * 100

  return (
    <div className="px-4 py-6">
      {/* Orbital animation */}
      <div className="relative w-20 h-20 mx-auto mb-5">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-brand-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'rgb(var(--color-brand-400))', borderRightColor: 'rgb(var(--color-brand-400) / 0.3)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        {/* Inner ring */}
        <motion.div
          className="absolute inset-4 rounded-full border-2 border-transparent"
          style={{ borderBottomColor: 'rgb(var(--color-brand-500))', borderLeftColor: 'rgb(var(--color-brand-500) / 0.3)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        {/* Center pulse */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-brand-400" />
          </div>
        </motion.div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-brand-400"
            style={{ top: '50%', left: '50%' }}
            animate={{
              x: [0, Math.cos((i * 2 * Math.PI) / 3) * 34, 0],
              y: [0, Math.sin((i * 2 * Math.PI) / 3) * 34, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Title */}
      <p className="text-center text-sm font-semibold text-surface-200 mb-1">
        Configurando perfil com IA
      </p>
      <p className="text-center text-[11px] text-surface-500 mb-4">
        Sonnet está analisando as conversas do contato
      </p>

      {/* Progress bar */}
      <div className="h-1 bg-surface-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Current step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center gap-2"
        >
          <span className="text-brand-400">{LOADING_STEPS[stepIndex].icon}</span>
          <span className="text-[11px] text-surface-400">{LOADING_STEPS[stepIndex].text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Detail components ────────────────────────────────────────────────────────

function DetailList({ items, icon, colorClass }: { items: string[]; icon: React.ReactNode; colorClass: string }) {
  if (!items.length) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className={cn('flex items-start gap-2 text-[13px] leading-snug', colorClass)}
        >
          <span className="mt-0.5 flex-shrink-0">{icon}</span>
          <span>{item}</span>
        </motion.li>
      ))}
    </ul>
  )
}

function Section({ label, icon, iconColor, children, delay = 0 }: { label: string; icon: React.ReactNode; iconColor?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className={iconColor ?? 'text-neutral-500'}>{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
      {children}
    </motion.div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface AIContextCardProps {
  contact: Contact
  onRefresh?: () => void
}

export function AIContextCard({ contact, onRefresh }: AIContextCardProps) {
  const hasData = contact.aiUpdatedAt != null
  const [generating, setGenerating] = useState(false)
  const [justFinished, setJustFinished] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [suggestions, setSuggestions] = useState<{
    qualification: Record<string, unknown>
    info: Record<string, string>
    customFields: Record<string, string>
  } | null>(null)
  const [suggestionsMeta, setSuggestionsMeta] = useState<{
    stages: Array<{ key: string; label: string }>
    customFieldDefs: Array<{ key: string; label: string; type: string; options?: string[] }>
  } | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setJustFinished(false)
    try {
      const res = await contactsApi.generateAiProfile(contact.id)
      setJustFinished(true)
      setCollapsed(false)
      onRefresh?.()
      // Show suggestions modal if there are pending changes
      if (res.data.suggestions) {
        setSuggestions(res.data.suggestions)
        setSuggestionsMeta(res.data.meta ?? null)
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setGenerating(false)
    }
  }

  const handleSuggestionsApplied = () => {
    setSuggestions(null)
    onRefresh?.()
  }

  // Reset justFinished after animations complete
  useEffect(() => {
    if (justFinished) {
      const timer = setTimeout(() => setJustFinished(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [justFinished])

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
      {/* Card header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 transition-colors',
          hasData && !generating ? 'cursor-pointer hover:bg-surface-800/40' : '',
          (!collapsed || !hasData || generating) && 'border-b border-surface-800',
        )}
        onClick={hasData && !generating ? () => setCollapsed((v) => !v) : undefined}
      >
        <div className="flex items-center gap-2">
          {hasData && !generating && (
            <motion.span
              animate={{ rotate: collapsed ? 0 : 90 }}
              transition={{ duration: 0.2 }}
              className="text-surface-500"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.span>
          )}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-status-pending bg-status-pending-bg border border-status-pending-border rounded-full px-2.5 py-1">
            <Bot className="w-3 h-3" />
            IA Contextual
          </span>
          {contact.aiUpdatedAt && !generating && (
            <span className="text-[11px] text-surface-500">
              Atualizado em {formatDate(contact.aiUpdatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {hasData && !generating && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </button>
          )}
          <Lock className="w-3.5 h-3.5 text-surface-600 flex-shrink-0" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {generating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <GeneratingState />
          </motion.div>
        ) : !hasData ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-8 text-center"
          >
            <Bot className="w-8 h-8 text-surface-700 mx-auto mb-2" />
            <p className="text-sm font-medium text-surface-400">Nenhuma análise disponível</p>
            <p className="text-xs text-surface-600 mt-1 mb-3">Configure o perfil completo deste contato com base nas conversas.</p>
            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-surface-950 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'linear-gradient(40deg, #ffffff, #a8a8b4)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Configurar contato com IA
            </button>
          </motion.div>
        ) : !collapsed ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-5">
              {/* Summary */}
              {contact.aiSummary && (
                <Section label="Resumo analítico" icon={<Lightbulb className="w-3.5 h-3.5" />} iconColor="text-surface-500" delay={justFinished ? 0.1 : 0}>
                  <p className="text-[13px] text-white leading-relaxed">{contact.aiSummary}</p>
                </Section>
              )}

              {/* Sentiment */}
              {contact.aiSentiment && contact.aiSentiment !== 'unknown' && (
                <Section label="Sentimento geral das conversas" icon={SENTIMENT_CONFIG[contact.aiSentiment!].icon} iconColor={SENTIMENT_CONFIG[contact.aiSentiment!].iconColor} delay={justFinished ? 0.15 : 0}>
                  <span
                    className="color-chip inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
                    style={{ ['--chip']: SENTIMENT_CONFIG[contact.aiSentiment!].chip } as React.CSSProperties}
                  >
                    {SENTIMENT_CONFIG[contact.aiSentiment!].icon}{SENTIMENT_CONFIG[contact.aiSentiment!].label}
                  </span>
                </Section>
              )}

              {/* Pain Points — bubbles */}
              {(contact.aiPainPoints?.length ?? 0) > 0 && (
                <Section label="Dores identificadas" icon={<AlertTriangle className="w-3.5 h-3.5" />} iconColor="text-red-400" delay={justFinished ? 0.25 : 0}>
                  <div className="flex flex-wrap gap-2">
                    {contact.aiPainPoints!.map((item, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.25 }}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300"
                      >
                        {item}
                      </motion.span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Interests — bubbles */}
              {(contact.aiInterests?.length ?? 0) > 0 && (
                <Section label="Interesses demonstrados" icon={<Target className="w-3.5 h-3.5" />} iconColor="text-emerald-400" delay={justFinished ? 0.4 : 0}>
                  <div className="flex flex-wrap gap-2">
                    {contact.aiInterests!.map((item, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.25 }}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      >
                        {item}
                      </motion.span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Objections */}
              {(contact.aiObjections?.length ?? 0) > 0 && (
                <Section label="Objeções e resistências" icon={<ShieldAlert className="w-3.5 h-3.5" />} iconColor="text-amber-400" delay={justFinished ? 0.55 : 0}>
                  <DetailList
                    items={contact.aiObjections!}
                    icon={<span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />}
                    colorClass="text-amber-200/90"
                  />
                </Section>
              )}

              {/* Next Best Action */}
              {contact.aiNextBestAction && (
                <Section label="Estratégia de abordagem recomendada" icon={<Sparkles className="w-3.5 h-3.5" />} iconColor="text-brand-400" delay={justFinished ? 0.7 : 0}>
                  <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl px-3.5 py-3">
                    <p className="text-[13px] text-brand-300 leading-relaxed">{contact.aiNextBestAction}</p>
                  </div>
                </Section>
              )}

              {/* Last Interaction Summary */}
              {contact.aiLastInteractionSummary && (
                <Section label="Última interação" icon={<MessageSquareQuote className="w-3.5 h-3.5" />} iconColor="text-surface-500" delay={justFinished ? 0.85 : 0}>
                  <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl px-3.5 py-3">
                    <p className="text-[13px] text-surface-400 leading-relaxed italic">{contact.aiLastInteractionSummary}</p>
                  </div>
                </Section>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Suggestions confirmation modal */}
      {suggestions && (
        <AiSuggestionsModal
          contactId={contact.id}
          suggestions={suggestions}
          meta={suggestionsMeta}
          onClose={() => setSuggestions(null)}
          onApplied={handleSuggestionsApplied}
        />
      )}
    </div>
  )
}
