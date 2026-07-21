// Badge rendered on resource cards (templates, campaigns, automations)
// whose `needsWabaAssignment` flag is true — i.e. rows that Migration
// #045 carried over into a multi-WABA tenant without an explicit line.
//
// Clicking the badge is a hint, not a fix path — the real assignment
// happens in the resource's edit form, which the operator opens anyway.
// The badge's job is to make the gap visible before it bites: previewing
// to surface "you have a template that hasn't been routed to a line yet"
// at-a-glance rather than only at send/submit time.

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WabaAssignmentBadge({
  className,
  title,
  onClick,
}: {
  className?: string
  title?: string
  /** When provided, the badge renders as a button. Consumers pair this
   *  with the AssignWabaModal to let the operator fix the gap from the
   *  same card they spotted it on. */
  onClick?: (e: React.MouseEvent) => void
}) {
  const resolvedTitle =
    title ?? (onClick
      ? 'Linha WhatsApp não atribuída — clique para escolher'
      : 'Linha WhatsApp não atribuída')

  const baseClasses = cn(
    'color-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md border',
    'text-[10px] font-medium uppercase tracking-wide',
    onClick && 'cursor-pointer transition-colors',
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          // Prevent the click from bubbling to card-level handlers that
          // open the edit wizard — otherwise both fire and the operator
          // gets two UIs at once.
          e.stopPropagation()
          onClick(e)
        }}
        className={baseClasses}
        style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}
        title={resolvedTitle}
      >
        <AlertTriangle className="w-3 h-3" />
        Atribuir linha
      </button>
    )
  }

  return (
    <span className={baseClasses} style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties} title={resolvedTitle}>
      <AlertTriangle className="w-3 h-3" />
      Sem linha
    </span>
  )
}
