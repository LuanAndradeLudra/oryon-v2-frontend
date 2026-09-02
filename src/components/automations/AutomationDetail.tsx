import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Pencil, Copy, Trash2, MoreVertical, Play, Clock, Zap, GitBranch,
  ChevronRight, ChevronDown, Check, Minus, Sparkles,
  Loader2, ExternalLink, CopyPlus, ArrowRightLeft,
} from 'lucide-react'
import type { Automation, AutomationRun, AutomationRunStatus } from '@/types'
import { automationsApi } from '@/services/api'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { relativeDate, formatFullTime, cn } from '@/lib/utils'
import {
  triggerSentence, conditionSentence, actionSentence, actionTypeLabel,
  agentBehaviorSentence, deriveAttention, type AttentionFlag,
} from './automationText'

// Seção do builder para deep-link (clicar Quando/Se/Então/IA no detalhe abre o
// builder já rolado até ali). O builder consome este tipo.
export type AutomationBuilderSection = 'gatilho' | 'condicoes' | 'acoes' | 'ia'

export interface AutomationDetailProps {
  automation: Automation
  onToggle: (a: Automation) => void
  onEdit: (a: Automation, section?: AutomationBuilderSection) => void
  onDuplicate: (a: Automation) => void
  onDuplicateToLine?: (a: Automation) => void
  onDelete: (a: Automation) => void
  onResolveWithAI?: (a: Automation, flag: AttentionFlag) => void
  /** Só no modo overlay (<xl) — mostra o X de fechar. */
  onClose?: () => void
  variant?: 'rail' | 'overlay'
}

// ── Labels de telemetria ─────────────────────────────────────────────────────

const RUN_STATUS: Record<AutomationRunStatus, { label: string; text: string; dot: string }> = {
  success: { label: 'Sucesso', text: 'text-status-active', dot: 'bg-status-active' },
  partial: { label: 'Parcial', text: 'text-warning',       dot: 'bg-warning' },
  failed:  { label: 'Falhou',  text: 'text-danger',        dot: 'bg-danger' },
  running: { label: 'Rodando', text: 'text-status-open',   dot: 'bg-status-open' },
}

// run.triggerType vem como string do backend (evento que disparou aquela run).
function runTriggerLabel(t: string): string {
  const map: Record<string, string> = {
    message_received: 'Mensagem recebida',
    message_with_media: 'Mensagem com mídia',
    tag_added: 'Tag adicionada',
    tag_removed: 'Tag removida',
    stage_changed: 'Estágio alterado',
    scheduled: 'Agendado',
    contact_created: 'Contato criado',
    conversation_started: 'Conversa iniciada',
    conversation_resolved: 'Conversa resolvida',
    lead_score_changed: 'Lead score alterado',
    manual: 'Manual',
    webhook: 'Webhook',
  }
  return map[t] ?? t
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`
}

// ── Header menu (kebab) ──────────────────────────────────────────────────────

function DetailMenu({ automation, onEdit, onDuplicate, onDuplicateToLine, onDelete }: {
  automation: Automation
  onEdit: () => void
  onDuplicate: () => void
  onDuplicateToLine?: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [open])

  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors'

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
        title="Mais ações"
        aria-label="Mais ações"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-52 rounded-xl overlay-surface border py-1 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <button className={cn(item, 'text-surface-200 hover:bg-surface-700')} onClick={() => { setOpen(false); onEdit() }}>
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
            <button className={cn(item, 'text-surface-200 hover:bg-surface-700')} onClick={() => { setOpen(false); onDuplicate() }}>
              <CopyPlus className="w-3.5 h-3.5" /> Duplicar
            </button>
            {onDuplicateToLine && (
              <button className={cn(item, 'text-surface-200 hover:bg-surface-700')} onClick={() => { setOpen(false); onDuplicateToLine() }}>
                <ArrowRightLeft className="w-3.5 h-3.5" /> Duplicar para outra linha
              </button>
            )}
            <button className={cn(item, 'text-surface-200 hover:bg-surface-700')} onClick={() => { setOpen(false); navigator.clipboard?.writeText(automation.name).catch(() => {}) }}>
              <Copy className="w-3.5 h-3.5" /> Copiar nome
            </button>
            <div className="my-1 h-px bg-surface-700" />
            <button className={cn(item, 'text-danger hover:bg-danger/10')} onClick={() => { setOpen(false); onDelete() }}>
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Flow card (Quando / Se / Então / IA) ─────────────────────────────────────

function FlowSection({ eyebrow, icon, onClick, children }: {
  eyebrow: string
  icon: React.ReactNode
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full text-left group/sec rounded-lg -mx-1.5 px-1.5 py-1.5 transition-colors',
        onClick && 'hover:bg-surface-800/60 cursor-pointer',
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-surface-500">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-surface-500">{eyebrow}</span>
        {onClick && <Pencil className="w-2.5 h-2.5 text-surface-600 opacity-0 group-hover/sec:opacity-100 transition-opacity ml-auto" />}
      </div>
      <div className="text-xs text-surface-200 leading-relaxed pl-[18px]">{children}</div>
    </button>
  )
}

function FlowCard({ automation, onEdit }: {
  automation: Automation
  onEdit: (section?: AutomationBuilderSection) => void
}) {
  const conds = automation.conditions ?? []
  const acts = automation.actions ?? []
  const joiner = automation.conditionsLogic === 'or' ? 'ou' : 'e'

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-3.5 space-y-1">
      <FlowSection eyebrow="Quando" icon={<Zap className="w-3 h-3" />} onClick={() => onEdit('gatilho')}>
        {triggerSentence(automation)}
      </FlowSection>

      {conds.length > 0 && (
        <FlowSection eyebrow="Se" icon={<GitBranch className="w-3 h-3" />} onClick={() => onEdit('condicoes')}>
          {conds.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="text-surface-500 font-medium"> {joiner} </span>}
              {conditionSentence(c)}
            </span>
          ))}
        </FlowSection>
      )}

      <FlowSection eyebrow="Então" icon={<ChevronRight className="w-3 h-3" />} onClick={() => onEdit('acoes')}>
        {acts.length === 0 ? (
          <span className="text-warning">Nenhuma ação configurada</span>
        ) : (
          <ol className="space-y-0.5">
            {acts.map((a, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-surface-500 tabular-nums">{i + 1}.</span>
                <span>{actionSentence(a)}</span>
              </li>
            ))}
          </ol>
        )}
      </FlowSection>

      <div className="pt-1.5 mt-1 border-t border-surface-800">
        <button
          onClick={() => onEdit('ia')}
          className="w-full flex items-start gap-1.5 text-left rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-surface-800/60 transition-colors group/ia"
        >
          <Sparkles className="w-3 h-3 text-brand-400 flex-shrink-0 mt-0.5" />
          <span className="text-[11px] text-surface-400 leading-relaxed">{agentBehaviorSentence(automation)}</span>
          <Pencil className="w-2.5 h-2.5 text-surface-600 opacity-0 group-hover/ia:opacity-100 transition-opacity ml-auto flex-shrink-0 mt-0.5" />
        </button>
      </div>
    </div>
  )
}

// ── Run row (expansível → checklist por ação) ────────────────────────────────

function RunRow({ run, onOpenContact, onOpenConversation }: {
  run: AutomationRun
  onOpenContact: (id: string) => void
  onOpenConversation: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const st = RUN_STATUS[run.status]
  const actions = run.actionsExecuted ?? []
  const canExpand = actions.length > 0 || !!run.errorMessage

  return (
    <div className="border-b border-surface-800/60 last:border-0">
      <button
        onClick={() => canExpand && setOpen((v) => !v)}
        className={cn('w-full flex items-center gap-2.5 py-2 text-left', canExpand && 'cursor-pointer')}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', st.dot)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn('text-xs font-medium', st.text)}>{st.label}</span>
            <span className="text-[11px] text-surface-500 truncate">· {runTriggerLabel(run.triggerType)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {run.durationMs != null && <span className="text-[10px] text-surface-500 tabular-nums">{fmtDuration(run.durationMs)}</span>}
          <span className="text-[11px] text-surface-500 tabular-nums" title={formatFullTime(run.startedAt)}>{relativeDate(run.startedAt)}</span>
          {canExpand && (
            <ChevronDown className={cn('w-3 h-3 text-surface-600 transition-transform', open && 'rotate-180')} />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pb-2.5 pl-4 space-y-1.5">
              {run.errorMessage && (
                <p className="text-[11px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-2 py-1.5 leading-relaxed">
                  {run.errorMessage}
                </p>
              )}
              {actions.map((ac, i) => {
                const ok = ac.status === 'success'
                const failed = ac.status === 'failed'
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="flex-shrink-0 mt-0.5">
                      {ok ? <Check className="w-3 h-3 text-status-active" />
                        : failed ? <X className="w-3 h-3 text-danger" />
                        : <Minus className="w-3 h-3 text-surface-500" />}
                    </span>
                    <div className="min-w-0">
                      <span className={cn(failed ? 'text-danger' : 'text-surface-300')}>{actionTypeLabel(ac.type)}</span>
                      {ac.durationMs != null && <span className="text-surface-600 ml-1.5 tabular-nums">{fmtDuration(ac.durationMs)}</span>}
                      {ac.errorMessage && <p className="text-danger/80 mt-0.5">{ac.errorMessage}</p>}
                    </div>
                  </div>
                )
              })}
              {(run.contactId || run.conversationId) && (
                <div className="flex items-center gap-3 pt-0.5">
                  {run.conversationId && (
                    <button onClick={() => onOpenConversation(run.conversationId!)} className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors">
                      <ExternalLink className="w-2.5 h-2.5" /> ver conversa
                    </button>
                  )}
                  {run.contactId && (
                    <button onClick={() => onOpenContact(run.contactId!)} className="inline-flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors">
                      <ExternalLink className="w-2.5 h-2.5" /> ver contato
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function AutomationDetail({
  automation, onToggle, onEdit, onDuplicate, onDuplicateToLine, onDelete,
  onResolveWithAI, onClose, variant = 'rail',
}: AutomationDetailProps) {
  const navigate = useNavigate()
  const isActive = automation.status === 'active'
  const isDraft = automation.status === 'draft'
  const attention = deriveAttention(automation)

  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [runsError, setRunsError] = useState(false)
  const [failedOnly, setFailedOnly] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Refetch on selection change or filter toggle.
  useEffect(() => {
    let cancelled = false
    setRunsLoading(true); setRunsError(false); setRuns([]); setNextCursor(null)
    automationsApi.runs(automation.id, { failedOnly, limit: 20 })
      .then((res) => { if (!cancelled) { setRuns(res.data.data); setNextCursor(res.data.nextCursor) } })
      .catch(() => { if (!cancelled) setRunsError(true) })
      .finally(() => { if (!cancelled) setRunsLoading(false) })
    return () => { cancelled = true }
  }, [automation.id, failedOnly])

  const loadMore = useCallback(() => {
    if (!nextCursor) return
    setLoadingMore(true)
    automationsApi.runs(automation.id, { failedOnly, limit: 20, before: nextCursor })
      .then((res) => { setRuns((prev) => [...prev, ...res.data.data]); setNextCursor(res.data.nextCursor) })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [automation.id, failedOnly, nextCursor])

  const hasFailure = runs.some((r) => r.status === 'failed' || r.status === 'partial')
  const openContact = (id: string) => navigate(`/contacts?contact=${id}`)
  const openConversation = (id: string) => navigate(`/conversations?conversation=${id}`)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-start gap-2 px-4 py-3.5 border-b border-surface-800 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-surface-100 truncate">{automation.name}</h2>
            {isDraft && (
              <span className="color-chip inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0" style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}>
                Rascunho
              </span>
            )}
          </div>
          {automation.description && <p className="text-[11px] text-surface-400 mt-0.5 line-clamp-2">{automation.description}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Switch checked={isActive} onChange={() => onToggle(automation)} />
          <DetailMenu
            automation={automation}
            onEdit={() => onEdit(automation)}
            onDuplicate={() => onDuplicate(automation)}
            onDuplicateToLine={onDuplicateToLine ? () => onDuplicateToLine(automation) : undefined}
            onDelete={() => onDelete(automation)}
          />
          {variant === 'overlay' && onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Attention banner */}
        {attention.length > 0 && (
          <Banner variant="warning">
            <p className="font-semibold">Precisa de atenção</p>
            <p className="opacity-90 mt-0.5 text-xs">{attention[0].hint}</p>
            {onResolveWithAI && (
              <button
                onClick={() => onResolveWithAI(automation, attention[0])}
                className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-semibold text-white transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Resolver com IA
              </button>
            )}
          </Banner>
        )}

        {/* Flow */}
        <FlowCard automation={automation} onEdit={(section) => onEdit(automation, section)} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-900 border border-surface-800 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-surface-500 mb-1 flex items-center gap-1"><Play className="w-2.5 h-2.5" /> Execuções</p>
            <p className="text-sm font-display font-bold text-surface-100 tabular-nums">{automation.executionCount.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-surface-500 mb-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Última</p>
            <p className="text-xs font-medium text-surface-200 tabular-nums">{automation.lastExecutedAt ? relativeDate(automation.lastExecutedAt) : '—'}</p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-xl px-3 py-2.5 min-w-0">
            <p className="text-[10px] text-surface-500 mb-1">Linha</p>
            <WhatsappLineChip whatsappNumberId={automation.whatsappNumberId} />
            {!automation.whatsappNumberId && <p className="text-xs text-surface-400">—</p>}
          </div>
        </div>

        {/* Runs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Execuções recentes</h3>
            <button
              onClick={() => setFailedOnly((v) => !v)}
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors',
                failedOnly
                  ? 'bg-danger/10 border-danger/30 text-danger'
                  : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-surface-200',
              )}
            >
              Somente falhas
            </button>
          </div>

          {hasFailure && !failedOnly && (
            <Banner variant="danger" className="mb-2">Há execuções com falha na janela recente.</Banner>
          )}

          {runsLoading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 text-surface-500 animate-spin" /></div>
          ) : runsError ? (
            <p className="text-[11px] text-surface-500 py-4 text-center">Não foi possível carregar o histórico.</p>
          ) : runs.length === 0 ? (
            <p className="text-[11px] text-surface-500 py-4 text-center">
              {failedOnly ? 'Nenhuma falha na janela recente. 🎉' : 'Ainda sem execuções registradas.'}
            </p>
          ) : (
            <div className="bg-surface-900 border border-surface-800 rounded-xl px-3">
              {runs.map((run) => (
                <RunRow key={run.id} run={run} onOpenContact={openContact} onOpenConversation={openConversation} />
              ))}
              {nextCursor && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-[11px] text-brand-400 hover:text-brand-300 transition-colors flex items-center justify-center gap-1.5 border-t border-surface-800/60"
                >
                  {loadingMore ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                  Carregar mais
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
