// ─── Empty State ───────────────────────────────────────────────────────────
// Replaces three near-duplicates that lived inline in SkillsTab,
// SkillTemplatesPage and AssignSkillPage. Keeps the same dashed-border card
// look the project already used; just hoists the props and the action area
// so each caller stays declarative.

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Action =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never }

interface Props {
  icon: LucideIcon
  title: string
  hint?: string
  /** Optional CTA — renders an `<a>` if `href` is set, else a `<button>`. */
  action?: Action
  /** Override outer padding when a tighter empty area is needed. */
  className?: string
  /** Override the icon's default `text-surface-600` — e.g. a categorical
   *  accent token (`{ color: 'var(--color-accent-violet)' }`) when the empty
   *  state is about a specific themed feature (agentes IA, funil de
   *  processo…). Inline style, not a class, to match how accent tokens are
   *  used elsewhere in the app (chips, MiniBar) — Tailwind isn't configured
   *  for `var(--color-accent-*)` as a class name here. */
  iconStyle?: React.CSSProperties
}

export function EmptyState({ icon: Icon, title, hint, action, className, iconStyle }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-16 px-6 rounded-xl bg-surface-900/40 border border-dashed border-surface-700',
        className,
      )}
    >
      <Icon className="w-10 h-10 text-surface-600 mb-3" style={iconStyle} strokeWidth={1.5} />
      <p className="text-surface-300 font-medium mb-1">{title}</p>
      {hint && <p className="text-sm text-surface-500 max-w-md">{hint}</p>}
      {action && (
        <div className="mt-4">
          {'href' in action && action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-medium transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-surface-950 text-xs font-semibold transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
