// ─── Stepper (horizontal) ──────────────────────────────────────────────────
// Lightweight section indicator for long forms (e.g. the skill template
// editor). Renders a row of bullets with optional check / number; clicking
// a bullet jumps to the matching section via `scrollIntoView`.
//
// Active state is computed via IntersectionObserver inside the consumer —
// this component just renders. Decoupling active-detection lets each
// consumer choose whether to track scroll, click, or both.

import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepperSection {
  id: string
  label: string
  /** Icon shown when the step is neither complete nor active. */
  icon?: LucideIcon
  /** True when the section's required fields are filled. Renders a check
   *  with the success colour. */
  complete: boolean
}

interface Props {
  sections: StepperSection[]
  /** Id of the currently focused section. Highlights the matching bullet. */
  active: string
  onJump: (id: string) => void
  className?: string
}

export function Stepper({ sections, active, onJump, className }: Props) {
  return (
    <nav aria-label="Seções do formulário" className={className}>
      {/* Each item except the last one becomes a flex container that grows
          to fill available space, with the connector taking what's left
          after the bullet+label. This stretches the stepper across the
          panel width instead of clumping all bullets to the left. */}
      <ol className="flex items-center w-full">
        {sections.map((section, idx) => {
          const isActive = section.id === active
          const isLast = idx === sections.length - 1
          return (
            <li
              key={section.id}
              className={cn('flex items-center min-w-0', !isLast && 'flex-1')}
            >
              <button
                type="button"
                onClick={() => onJump(section.id)}
                className={cn(
                  'group inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm flex-shrink-0',
                  isActive
                    ? 'bg-surface-800 text-surface-100 ring-1 ring-surface-600'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-900/60',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <Bullet
                  number={idx + 1}
                  complete={section.complete}
                  active={isActive}
                  Icon={section.icon}
                />
                <span className="font-medium whitespace-nowrap">{section.label}</span>
              </button>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'flex-1 h-px mx-3 transition-colors',
                    section.complete ? 'bg-status-active/50' : 'bg-surface-700',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Bullet({
  number,
  complete,
  active,
  Icon,
}: {
  number: number
  complete: boolean
  active: boolean
  Icon?: LucideIcon
}) {
  return (
    <span
      className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ring-1 transition-colors',
        complete
          ? 'bg-status-active-bg text-status-active ring-status-active-border'
          : active
            ? 'bg-brand-600 text-surface-950 ring-brand-500'
            : 'bg-surface-900 text-surface-400 ring-surface-700',
      )}
    >
      {complete ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : Icon ? <Icon className="w-3 h-3" /> : number}
    </span>
  )
}
