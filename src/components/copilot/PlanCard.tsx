import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2, Circle, ChevronDown, ListChecks } from 'lucide-react'
import type { TaskPlan, PlanStep, PlanStepStatus } from '@/types/agent-events'
import type { ToolCallRecord } from '@/contexts/CopilotContext'
import { ToolCallChip } from './CopilotMessage'

interface PlanCardProps {
  plan: TaskPlan
  /** Phase 9 UX: tool calls of the same message; those with stepId are
   *  rendered inline under their matching step. */
  toolCalls?: ToolCallRecord[]
}

/** Phase 9: Visual representation of a TaskPlan. Each step is collapsible;
 *  functionality (auto expand/collapse, real-time chip updates, stepId
 *  tagging) is unchanged — this module only owns the presentation. */
function PlanCardImpl({ plan, toolCalls }: PlanCardProps) {
  // Defensive: some persisted messages carry toolCalls=null (not undefined),
  // which bypasses the default-value syntax and crashed the for-of below.
  const safeToolCalls: ToolCallRecord[] = Array.isArray(toolCalls) ? toolCalls : []
  const doneCount = plan.steps.filter((s) => s.status === 'done').length
  const failedCount = plan.steps.filter((s) => s.status === 'failed').length
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  // Group tool calls by step id (only those tagged with stepId)
  const callsByStep = new Map<string, ToolCallRecord[]>()
  for (const tc of safeToolCalls) {
    if (!tc.stepId) continue
    const arr = callsByStep.get(tc.stepId) ?? []
    arr.push(tc)
    callsByStep.set(tc.stepId, arr)
  }

  const headerLine = plan.rationale ?? `Plano de execução`

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="my-3 rounded-xl border border-surface-700/60 bg-surface-900/40 p-2 text-sm"
    >
      {/* Outer header — rationale + counter + toggle */}
      <button
        type="button"
        onClick={() => setHeaderCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-800/40"
      >
        <ListChecks className="h-4 w-4 flex-shrink-0 text-brand-400" />
        <span className="flex-1 truncate text-[13px] font-medium text-surface-100">
          {headerLine}
        </span>
        <span className="flex-shrink-0 text-xs text-surface-400">
          {doneCount}/{plan.steps.length}
          {failedCount > 0 && <span className="ml-1 text-red-400">• {failedCount}</span>}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 text-surface-500 transition-transform duration-200 ${headerCollapsed ? '-rotate-90' : 'rotate-0'}`}
        />
      </button>

      {/* Steps list */}
      <AnimatePresence initial={false}>
        {!headerCollapsed && (
          <motion.ol
            key="steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-1 space-y-1.5 overflow-hidden px-1 pb-1"
          >
            {plan.steps.map((step) => (
              <PlanStepCard key={step.id} step={step} calls={callsByStep.get(step.id) ?? []} />
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function PlanStepCard({ step, calls }: { step: PlanStep; calls: ToolCallRecord[] }) {
  // requires_setup blockers (e.g. "no WhatsApp line") are surfaced inside
  // tool_result chips. If we auto-collapse when the step transitions to
  // 'done', those CTA cards get hidden and the operator misses the
  // actionable next step. Keep the step expanded in that case regardless
  // of status.
  const hasSetupBlocker = calls.some((c) => {
    const r = c.result as Record<string, unknown> | null
    return !!r && typeof r === 'object' && 'requires_setup' in r
  })

  // Collapse state follows lifecycle, with manual override available.
  //   - running / failed: expanded
  //   - pending / done:   collapsed (unless blocked by setup — see above)
  const [collapsed, setCollapsed] = useState<boolean>(
    !hasSetupBlocker && (step.status === 'done' || step.status === 'pending'),
  )

  // Re-sync on status transitions (not after manual toggles for the current status)
  useEffect(() => {
    if (hasSetupBlocker) { setCollapsed(false); return }
    if (step.status === 'running' || step.status === 'failed') setCollapsed(false)
    else if (step.status === 'done') setCollapsed(true)
  }, [step.status, hasSetupBlocker])

  const hasContent = calls.length > 0 || Boolean(step.error)
  const clickable = hasContent

  // Compact "Tools: name1, name2, ..." line (always visible inside card header)
  const toolNames = calls.length > 0
    ? Array.from(new Set(calls.map((c) => c.name))).join(', ')
    : null

  return (
    <motion.li
      initial={{ opacity: 0, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-surface-700/50 bg-surface-900/50"
    >
      {/* Step header row */}
      <button
        type="button"
        onClick={() => { if (clickable) setCollapsed((v) => !v) }}
        disabled={!clickable}
        className={`flex w-full items-start gap-2 px-3 py-2 text-left ${clickable ? 'cursor-pointer hover:bg-surface-800/40' : 'cursor-default'} rounded-lg transition-colors`}
      >
        <StatusIcon status={step.status} />

        <div className="min-w-0 flex-1">
          <div className={`truncate text-[13px] font-medium ${step.status === 'failed' ? 'text-red-300' : 'text-surface-100'}`}>
            {step.title}
          </div>
          {toolNames && (
            <div className="mt-0.5 truncate text-[11px] text-surface-500">
              <span className="text-surface-600">Tools: </span>
              <span className="font-mono">{toolNames}</span>
            </div>
          )}
        </div>

        <AgentChip agent={step.agent} />
        <StatusBadge status={step.status} />
        {hasContent && (
          <ChevronDown
            className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-surface-500 transition-transform duration-200 ${collapsed ? '-rotate-90' : 'rotate-0'}`}
          />
        )}
      </button>

      {/* Expanded body — full ToolCallChips with preview + error text */}
      <AnimatePresence initial={false}>
        {!collapsed && hasContent && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 border-t border-surface-700/40 px-3 py-2">
              {calls.map((tc) => (
                <ToolCallChip key={tc.id} tc={tc} />
              ))}
              {step.error && (
                <div className="text-xs text-red-400">{truncate(step.error, 200)}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function StatusIcon({ status }: { status: PlanStepStatus }) {
  const base = 'mt-0.5 h-4 w-4 flex-shrink-0'
  switch (status) {
    case 'running':
      return <Loader2 className={`${base} animate-spin text-blue-400`} aria-label="Em execução" />
    case 'done':
      return <Check className={`${base} text-emerald-400`} aria-label="Concluído" />
    case 'failed':
      return <X className={`${base} text-red-400`} aria-label="Falhou" />
    case 'pending':
    default:
      return <Circle className={`${base} text-slate-500`} aria-label="Pendente" />
  }
}

const AGENT_LABEL: Record<string, string> = {
  crm_read: 'CRM',
  crm_write: 'CRM (escrita)',
  analytics: 'Analytics',
  artifact: 'Artefato',
  composer: 'Compositor',
  web: 'Web',
  agent_builder: 'Builder',
  planner: 'Planejador',
  orchestrator: 'Orq.',
}

function AgentChip({ agent }: { agent: string }) {
  return (
    <span className="flex-shrink-0 rounded bg-surface-800/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-surface-300">
      {AGENT_LABEL[agent] ?? agent}
    </span>
  )
}

function StatusBadge({ status }: { status: PlanStepStatus }) {
  const cls =
    status === 'done' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    : status === 'running' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    : status === 'failed' ? 'bg-red-500/15 text-red-300 border-red-500/30'
    : 'bg-surface-800/70 text-surface-400 border-surface-700/60'
  const label =
    status === 'done' ? 'CONCLUÍDO'
    : status === 'running' ? 'EM EXECUÇÃO'
    : status === 'failed' ? 'FALHOU'
    : 'PENDENTE'
  return (
    <span className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…'
}

export const PlanCard = memo(PlanCardImpl)
