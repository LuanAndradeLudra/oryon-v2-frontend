// ─── PendingApprovalBar + ApprovalModal ───────────────────────────────────────
// Claude Code-style approval UX:
//   • A sticky bar lives above the composer with a count of pending approvals
//     and the first tool label for context.
//   • Clicking the bar (anywhere) opens a fullscreen modal hosting
//     ApprovalReviewPanel — the same review form we already built.
//   • After resolution, the bar disappears naturally (the underlying tool
//     call record flips status, so the selector filters it out).
//
// This moves the approval UI out of the chat stream entirely. A compact
// chip stays in the chat at the point of emission (pending / approved /
// denied), expandable for audit — that's InChatApprovalChip below.

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Check, Clock, Loader2, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CopilotMessage, ToolCallRecord } from '@/contexts/CopilotContext'
import { ApprovalReviewPanel } from './ApprovalReviewPanel'
import { TOOL_LABEL } from './CopilotMessage'

interface PendingApprovalBarProps {
  messages: CopilotMessage[]
  onResolveBatch: (batchTcId: string, approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => void
}

/** Walks every message for tool-call records that represent a pending batch
 *  approval. Reverse chronological so the newest pending is first (which is
 *  what the bar surfaces). */
function derivePending(messages: CopilotMessage[]): ToolCallRecord[] {
  const out: ToolCallRecord[] = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const tcs = messages[i].toolCalls ?? []
    for (const tc of tcs) {
      if (
        tc.name === '__approval_batch__' &&
        (tc.approvalStatus === 'pending' || tc.approvalStatus === 'submitting')
      ) {
        out.push(tc)
      }
    }
  }
  return out
}

export function PendingApprovalBar({ messages, onResolveBatch }: PendingApprovalBarProps) {
  const pending = useMemo(() => derivePending(messages), [messages])
  const [openBatchId, setOpenBatchId] = useState<string | null>(null)

  // Auto-close modal when the open batch gets resolved in the background.
  useEffect(() => {
    if (!openBatchId) return
    const stillPending = pending.find((tc) => tc.id === openBatchId)
    if (!stillPending) setOpenBatchId(null)
  }, [pending, openBatchId])

  if (pending.length === 0) return null

  const current = pending[0]
  const openBatch = openBatchId ? pending.find((tc) => tc.id === openBatchId) : null

  return (
    <>
      <AnimatePresence>
        <motion.button
          key={current.id}
          type="button"
          onClick={() => setOpenBatchId(current.id)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="w-full cursor-pointer rounded-xl border border-brand-500/30 bg-gradient-to-br from-brand-500/10 to-brand-500/5 px-4 py-3 text-left shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.4)] ring-1 ring-brand-500/10 backdrop-blur-sm transition-all hover:border-brand-400/50 hover:from-brand-500/15 hover:to-brand-500/10"
          aria-label="Abrir painel de aprovação"
        >
          <BarContent tc={current} extraCount={pending.length - 1} />
        </motion.button>
      </AnimatePresence>

      {openBatch && createPortal(
        <ApprovalModal
          tc={openBatch}
          onResolve={(approvedIds, editedInputs) => {
            onResolveBatch(openBatch.id, approvedIds, editedInputs)
            setOpenBatchId(null)
          }}
          onReject={() => {
            onResolveBatch(openBatch.id, [])
            setOpenBatchId(null)
          }}
          onClose={() => setOpenBatchId(null)}
        />,
        document.body,
      )}
    </>
  )
}

function BarContent({ tc, extraCount }: { tc: ToolCallRecord; extraCount: number }) {
  const items = tc.batchItems ?? []
  const firstLabel = items.length > 0 ? (TOOL_LABEL[items[0].name] ?? items[0].name) : 'Ação'
  const isSubmitting = tc.approvalStatus === 'submitting'

  // Countdown — same tick as the panel so the bar reflects expiration too.
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
      ? 'Expirou'
      : remainingMs < 60_000
        ? `${Math.ceil(remainingMs / 1000)}s`
        : `${Math.ceil(remainingMs / 60_000)} min`
  const isExpired = remainingMs === 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldAlert className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-100">
            Aprovação necessária
          </span>
          {items.length > 1 && (
            <span className="rounded-full bg-brand-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-brand-200">
              {items.length} ações
            </span>
          )}
          {extraCount > 0 && (
            <span className="rounded-full bg-surface-700/60 px-1.5 py-0.5 text-[10px] text-surface-300">
              +{extraCount} pendente{extraCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-surface-400">
          <span className="truncate">
            {items.length > 1 ? `${firstLabel} e mais ${items.length - 1}` : firstLabel}
          </span>
          {remainingLabel && (
            <span className={cn(
              'flex items-center gap-0.5 tabular-nums',
              isExpired ? 'text-danger' : 'text-surface-500',
            )}>
              <Clock className="h-2.5 w-2.5" />
              {remainingLabel}
            </span>
          )}
        </div>
      </div>
      <span className="flex-shrink-0 rounded-md bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-surface-950 shadow-sm">
        Revisar
      </span>
    </div>
  )
}

// ─── ApprovalModal ─────────────────────────────────────────────────────────
// Fullscreen modal hosting the review panel. Opens from the bar. Esc closes.
// Click on overlay closes (dismisses — doesn't resolve). The resolve/reject
// actions inside the panel close the modal as a side effect (handled by the
// PendingApprovalBar's callbacks above).

function ApprovalModal({
  tc,
  onResolve,
  onReject,
  onClose,
}: {
  tc: ToolCallRecord
  onResolve: (approvedIds: string[], editedInputs?: Record<string, Record<string, unknown>>) => void
  onReject: () => void
  onClose: () => void
}) {
  // ESC dismisses (doesn't decide). The operator has to explicitly click
  // Aprovar or Cancelar inside the panel to resolve the batch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="relative flex h-[88vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-surface-700/60 shadow-2xl"
      >
        {/* Close button in the top-right — does not decide, just dismisses */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg bg-surface-800/80 p-1.5 text-surface-400 backdrop-blur-sm transition-colors hover:bg-surface-700 hover:text-surface-100"
          aria-label="Fechar (sem decidir)"
        >
          <X className="h-4 w-4" />
        </button>
        <ApprovalReviewPanel tc={tc} onResolve={onResolve} onReject={onReject} />
      </motion.div>
    </motion.div>
  )
}

// ─── InChatApprovalChip ────────────────────────────────────────────────────
// Compact chip rendered AT the message position where the approval was
// emitted. Three variants: pending (awaiting decision), approved (resolved),
// denied (cancelled). Expandable to show the underlying tool labels for
// audit. Replaces the old inline BatchApprovalCard.

export function InChatApprovalChip({
  tc,
  onOpenModal,
}: {
  tc: ToolCallRecord
  /** Only meaningful for pending/submitting — the chat shows "↑ na barra" */
  onOpenModal?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const items = tc.batchItems ?? []
  const firstLabel = items.length > 0 ? (TOOL_LABEL[items[0].name] ?? items[0].name) : 'Ação'
  const summary = items.length > 1 ? `${firstLabel} e mais ${items.length - 1}` : firstLabel

  const status = tc.approvalStatus
  const isPending = status === 'pending' || status === 'submitting'
  const isApproved = status === 'approved'
  const isDenied = status === 'denied'

  const variant = isPending
    ? { bg: 'bg-brand-500/10 border-brand-500/30 text-brand-200', icon: ShieldAlert, label: 'Aguardando aprovação', hint: '↑ na barra acima' }
    : isApproved
      ? { bg: 'bg-success/10 border-success/20 text-success', icon: Check, label: items.length === 1 ? `${firstLabel} aprovado` : `${items.length} ações aprovadas`, hint: '' }
      : isDenied
        ? { bg: 'bg-surface-800/60 border-surface-700/60 text-surface-400', icon: X, label: items.length === 1 ? `${firstLabel} cancelado` : `${items.length} ações canceladas`, hint: '' }
        : { bg: 'bg-surface-800/40 border-surface-700/40 text-surface-400', icon: ShieldAlert, label: 'Aprovação', hint: '' }

  const Icon = variant.icon

  return (
    <div className={cn('rounded-lg border px-3 py-2 text-xs', variant.bg)}>
      <button
        type="button"
        onClick={() => {
          if (isPending && onOpenModal) onOpenModal()
          else setExpanded((v) => !v)
        }}
        className="flex w-full items-center gap-2 text-left"
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1 truncate font-medium">{variant.label}</span>
        {isPending && <span className="flex-shrink-0 text-[10px] italic opacity-70">{variant.hint}</span>}
        {!isPending && items.length > 0 && (
          <span className="flex-shrink-0 text-[10px] opacity-60">
            {expanded ? 'fechar' : 'detalhes'}
          </span>
        )}
      </button>

      {/* Expanded view for approved/denied — audit trail */}
      <AnimatePresence initial={false}>
        {expanded && !isPending && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 space-y-1 border-t border-current/10 pt-2 text-[11px] opacity-80">
              {items.map((item) => (
                <li key={item.id} className="truncate">
                  • {TOOL_LABEL[item.name] ?? item.name}
                </li>
              ))}
              {items.length === 0 && <li className="italic opacity-60">{summary}</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
