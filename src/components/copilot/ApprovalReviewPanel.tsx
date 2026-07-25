// ─── ApprovalReviewPanel ──────────────────────────────────────────────────────
// The body of an approval review: list of tool calls + editable previews +
// approve/cancel actions. Previously lived inside BatchApprovalCard in
// CopilotMessage.tsx, coupled to inline rendering. Extracted so the same UI
// can render in TWO locations:
//   1. ApprovalModal — fullscreen modal triggered from PendingApprovalBar
//   2. (optionally) inline — not currently used, but kept flexible
//
// This component is PURELY presentational: no backend coupling, no SSE. The
// caller (bar + modal) owns the ToolCallRecord and wires onResolve/onCancel
// to useCopilot.resolveBatch.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, CheckCheck, Clock, Loader2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCallRecord } from '@/contexts/CopilotContext'
import {
  ApprovalItemPreview,
  TOOL_ICON,
  TOOL_LABEL,
  DESTRUCTIVE_TOOLS,
} from './CopilotMessage'

interface ApprovalReviewPanelProps {
  tc: ToolCallRecord
  onResolve: (approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => void
  /** When rendered in a modal, the modal wants a "Cancelar" that rejects the
   *  batch AND closes the modal. We distinguish reject (resolves with empty
   *  approvedIds) from close (just dismiss modal without deciding). */
  onReject: () => void
}

export function ApprovalReviewPanel({ tc, onResolve, onReject }: ApprovalReviewPanelProps) {
  const items = tc.batchItems ?? []
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((i) => i.id)))
  const [edits, setEdits] = useState<Record<string, Record<string, unknown>>>({})

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleFieldChange = (itemId: string, key: string, val: string) => {
    let parsed: unknown = val
    try { if (val.startsWith('[') || val.startsWith('{')) parsed = JSON.parse(val) } catch { /* keep as string */ }
    setEdits((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [key]: parsed },
    }))
  }

  const isSubmitting = tc.approvalStatus === 'submitting'

  const handleConfirm = () => {
    if (isSubmitting) return
    const approvedIds = [...selected]
    const filteredEdits: Record<string, Record<string, unknown>> = {}
    for (const id of approvedIds) {
      if (edits[id] && Object.keys(edits[id]).length > 0) {
        filteredEdits[id] = edits[id]
      }
    }
    onResolve(approvedIds, Object.keys(filteredEdits).length > 0 ? filteredEdits : undefined)
  }

  const allDestructive = items.every((i) => DESTRUCTIVE_TOOLS.has(i.name))
  const hasDestructive = items.some((i) => DESTRUCTIVE_TOOLS.has(i.name))

  // Countdown — same semantics as before.
  const expiresAt = tc.approvalExpiresAt
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const t = setInterval(() => setNowMs(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [expiresAt])
  const remainingMs = expiresAt ? Math.max(0, expiresAt - nowMs) : null
  const remainingLabel = remainingMs === null
    ? null
    : remainingMs === 0
      ? 'Expirou — peça ao copiloto para refazer'
      : remainingMs < 60_000
        ? `Expira em ${Math.ceil(remainingMs / 1000)}s`
        : `Expira em ${Math.ceil(remainingMs / 60_000)} min`
  const isExpired = remainingMs === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-surface-700/50 bg-surface-900/70"
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-surface-800/60 px-4 py-3">
        <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 text-brand-400" />
        <span className="text-xs font-medium text-surface-300">
          {items.length === 1 ? 'Aprovação necessária' : `${items.length} ações requerem aprovação`}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {remainingLabel && (
            <span className={cn(
              'flex items-center gap-1 text-[10px]',
              isExpired ? 'text-danger' : 'text-surface-500',
            )}>
              <Clock className="h-3 w-3" />
              {remainingLabel}
            </span>
          )}
          <span className="text-[10px] text-surface-500">Edite os campos antes de aprovar</span>
        </div>
      </div>

      {/* Scrollable item list */}
      <div className="flex-1 divide-y divide-surface-800/40 overflow-y-auto">
        {items.map((item) => {
          const Icon = TOOL_ICON[item.name] ?? ShieldAlert
          const label = TOOL_LABEL[item.name] ?? item.name
          const isDestructive = DESTRUCTIVE_TOOLS.has(item.name)
          const isChecked = selected.has(item.id)

          return (
            <div key={item.id} className={cn('transition-opacity', isChecked ? '' : 'opacity-40')}>
              <button
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-800/20"
              >
                <div className={cn(
                  'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors',
                  isChecked
                    ? isDestructive ? 'bg-surface-600 border-surface-500' : 'bg-brand-600 border-brand-500'
                    : 'bg-transparent border-surface-600',
                )}>
                  {isChecked && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-surface-700/60 bg-surface-800/60">
                  <Icon className="h-3 w-3 text-surface-400" />
                </div>
                <span className={cn('text-xs font-medium', isDestructive ? 'text-surface-300' : 'text-surface-200')}>
                  {label}
                </span>
              </button>

              {isChecked && (
                <div className="px-4 pb-3 pt-0.5">
                  <div className="ml-[52px] rounded-lg border border-surface-700/40 bg-surface-800/30 p-3">
                    <ApprovalItemPreview
                      item={item}
                      editedInput={edits[item.id] ?? {}}
                      onFieldChange={handleFieldChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 gap-2 border-t border-surface-800/60 bg-surface-900/40 px-4 py-3">
        <button
          onClick={onReject}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-surface-700/60 bg-surface-800/40 px-3 py-2 text-xs font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0 || isSubmitting || isExpired}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            allDestructive || (hasDestructive && selected.size > 0 && [...selected].every((id) => {
              const item = items.find((i) => i.id === id)
              return item && DESTRUCTIVE_TOOLS.has(item.name)
            }))
              ? 'border border-surface-600/60 bg-surface-700 text-surface-200 hover:bg-surface-600'
              : 'bg-brand-600 text-surface-950 hover:bg-brand-500',
          )}
        >
          {isExpired ? (
            <>
              <Clock className="h-3.5 w-3.5" />
              Expirou
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckCheck className="h-3.5 w-3.5" />
              {selected.size === 0
                ? 'Nenhuma selecionada'
                : Object.keys(edits).length > 0
                  ? 'Aprovar com edições'
                  : selected.size < items.length
                    ? `Aprovar ${selected.size} de ${items.length}`
                    : 'Aprovar tudo'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
