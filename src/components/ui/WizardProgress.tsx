// ─── WizardProgress ──────────────────────────────────────────────────────────
// Breadcrumb de etapas pra wizard linear e travado (tela 2c): círculos
// pequenos (check = concluída, número = atual/futura) ligados por traço fino
// pontilhado, sem barra de progresso separada — o breadcrumb inteiro já
// comunica isso. Unlike `Stepper` — a free-jump section nav built for long
// scrollable forms (any section clickable, active state driven by
// IntersectionObserver) — a wizard step is gated: only *completed* steps are
// clickable, because each step validates before the next unlocks.

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardProgressProps {
  /** Step labels, in order. Position in the array = step number (1-indexed). */
  steps: string[]
  /** Current step, 1-indexed. */
  currentStep: number
  /** Called when the user clicks an already-completed step to jump back.
   *  Never called for the current or a future (locked) step. */
  onStepClick: (step: number) => void
  className?: string
}

export function WizardProgress({ steps, currentStep, onStepClick, className }: WizardProgressProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((label, i) => {
        const s = i + 1
        const isLast = s === steps.length
        const done = s < currentStep
        const active = s === currentStep
        return (
          <div key={s} className={cn('flex items-center gap-2', !isLast && 'flex-1')}>
            <button
              type="button"
              onClick={() => { if (done) onStepClick(s) }}
              disabled={!done}
              className={cn(
                'flex items-center gap-1.5 flex-shrink-0',
                done && 'cursor-pointer group',
                !done && 'cursor-default',
              )}
            >
              <span className={cn(
                'w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-colors duration-300',
                done && 'bg-brand-600 text-surface-950 group-hover:brightness-110',
                active && 'bg-brand-500 text-surface-950',
                !done && !active && 'bg-surface-800 text-surface-500',
              )}>
                {done ? <Check className="w-2.5 h-2.5" /> : s}
              </span>
              <span className={cn(
                'text-[11px] font-medium whitespace-nowrap transition-colors duration-300',
                active && 'text-surface-100 font-semibold',
                done && !active && 'text-surface-400',
                !done && !active && 'text-surface-600',
              )}>{label}</span>
            </button>
            {!isLast && (
              <div className="flex-1 min-w-4 border-t border-dashed border-surface-700" />
            )}
          </div>
        )
      })}
    </div>
  )
}
