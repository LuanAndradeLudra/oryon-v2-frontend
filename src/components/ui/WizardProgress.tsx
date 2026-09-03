// ─── WizardProgress ─────────────────────────────────────────────────────────
// Numbered step indicator for linear, modal wizards with per-step gated
// validation (e.g. CampaignWizard, AgentBuilderWizard). Unlike `Stepper`
// (which lets you jump to any section, built for long scrollable forms),
// this primitive only lets you click BACK into an already-completed step —
// forward navigation always goes through the wizard's own "Próximo" gate,
// so `canAdvance`-style validation is never bypassed.

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WizardProgressStep {
  label: string
}

interface Props {
  steps: WizardProgressStep[]
  /** 1-based index of the current step. */
  current: number
  /** Called when a completed step's bullet is clicked. Only steps before
   *  `current` are clickable — there is no way to jump ahead. Omit to
   *  render a purely decorative (non-interactive) indicator. */
  onStepClick?: (step: number) => void
  className?: string
}

export function WizardProgress({ steps, current, onStepClick, className }: Props) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {steps.map((step, idx) => {
        const n = idx + 1
        const isDone = n < current
        const isCurrent = n === current
        const isLast = idx === steps.length - 1
        const clickable = isDone && !!onStepClick
        return (
          <div key={step.label + n} className="flex-1 flex items-center gap-1.5">
            <button
              type="button"
              disabled={!clickable}
              onClick={clickable ? () => onStepClick!(n) : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                isDone ? 'bg-brand-600 text-surface-950' :
                isCurrent ? 'bg-brand-600/20 border-2 border-brand-500 text-brand-400' :
                            'bg-surface-800 text-surface-500',
                clickable && 'cursor-pointer hover:brightness-110',
                !clickable && 'cursor-default',
              )}
            >
              {isDone ? <Check className="w-3 h-3" /> : n}
            </button>
            <span className={cn('text-xs transition-colors', isCurrent ? 'text-surface-200' : 'text-surface-600')}>
              {step.label}
            </span>
            {!isLast && <div className={cn('flex-1 h-px', isDone ? 'bg-brand-600/50' : 'bg-surface-700')} />}
          </div>
        )
      })}
    </div>
  )
}
