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
import { Check, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCallRecord } from '@/contexts/CopilotContext'
import {
  ApprovalItemPreview,
  TOOL_ICON,
  TOOL_LABEL,
  DESTRUCTIVE_TOOLS,
} from './CopilotMessage'
import { emFrase } from '@/lib/emFrase'

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
      className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-800"
    >
      {/* Header */}
      {(
        <div className="flex-shrink-0 border-b border-surface-700 px-5 pt-4 pb-3 pr-12">
          <h2 className="text-base font-semibold text-surface-50">
            {items.length === 1 ? 'Revise a ação antes de aprovar' : `Revise as ${items.length} ações antes de aprovar`}
          </h2>
          <p className="mt-0.5 text-xs text-surface-400">
            Desmarque o que não quer que o Copilot faça. Você pode editar os campos.
            {remainingLabel && <span className={cn('ml-1', isExpired ? 'text-danger font-semibold' : '')}>· {remainingLabel.toLowerCase()}</span>}
          </p>
        </div>
      )}

      {/* Scrollable item list */}
      <div className="flex-1 divide-y divide-surface-700 overflow-y-auto">
        {items.map((item) => {
          const Icon = TOOL_ICON[item.name] ?? ShieldAlert
          const label = TOOL_LABEL[item.name] ?? item.name
          const isDestructive = DESTRUCTIVE_TOOLS.has(item.name)
          const isChecked = selected.has(item.id)

          return (
            <div key={item.id} className={cn('transition-opacity', isChecked ? '' : 'opacity-40')}>
              {(
                <button
                  onClick={() => toggle(item.id)}
                  role="checkbox"
                  aria-checked={isChecked}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--rowhover)]"
                >
                  <span className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                    isChecked
                      ? isDestructive ? 'bg-danger border-danger' : 'bg-brand-600 border-brand-600'
                      : 'bg-surface-800 border-surface-500',
                  )}>
                    {isChecked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[6px]', isDestructive ? 'bg-danger/10 text-danger' : 'bg-[var(--sf2)] text-surface-300')}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[13px] font-semibold text-surface-100">{emFrase(label)}</span>
                  {isDestructive && (
                    <span className="ml-auto inline-flex items-center h-5 px-1.5 rounded-[6px] text-xs font-semibold text-danger bg-danger/10 border border-danger/25">
                      Não dá para desfazer
                    </span>
                  )}
                </button>
              )}

              {isChecked && (
                <div className="px-4 pb-3 pt-0.5">
                  <div className="ml-[56px] rounded-[8px] border border-surface-700 bg-[var(--sf2)] p-3">
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
      {(
        <div className="flex flex-shrink-0 items-center gap-2 border-t border-surface-700 px-5 py-3">
          <p className="mr-auto min-w-0 flex-1 text-xs text-surface-400">
            {[...selected].some((id) => DESTRUCTIVE_TOOLS.has(items.find((i) => i.id === id)?.name ?? ''))
              ? <span className="text-danger font-semibold">Inclui uma exclusão que não dá para desfazer.</span>
              : `${selected.size} de ${items.length} selecionada${items.length > 1 ? 's' : ''}`}
          </p>
          <button
            onClick={onReject}
            disabled={isSubmitting}
            className="h-8 flex-shrink-0 whitespace-nowrap rounded-[6px] border border-surface-700 bg-surface-800 px-3 text-[13px] font-medium text-surface-200 transition-colors hover:bg-[var(--rowhover)] disabled:cursor-not-allowed disabled:opacity-40"
            title="O Copilot não executa nenhuma destas ações"
          >
            Recusar tudo
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0 || isSubmitting || isExpired}
            className={cn(
              'h-8 flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-[6px] px-3.5 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              selected.size > 0 && [...selected].every((id) => DESTRUCTIVE_TOOLS.has(items.find((i) => i.id === id)?.name ?? ''))
                ? 'bg-danger hover:bg-danger/90'
                : 'bg-brand-600 hover:bg-brand-500',
            )}
          >
            {isExpired ? 'Expirou' : isSubmitting ? 'Enviando…' : selected.size === 0 ? 'Nada selecionado'
              : selected.size === 1 ? 'Aprovar 1 ação' : `Aprovar ${selected.size} ações`}
          </button>
        </div>
      )}
    </motion.div>
  )
}
