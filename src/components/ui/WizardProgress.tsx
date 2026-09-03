// ─── WizardProgress ──────────────────────────────────────────────────────────
// Progress primitive for a linear, validated multi-step wizard (top % bar +
// numbered step row). Unlike `Stepper` — a free-jump section nav built for
// long scrollable forms (any section clickable, no percent bar, active state
// driven by IntersectionObserver) — a wizard step is gated: only *completed*
// steps are clickable, the current and future ones are not, because each
// step validates before the next unlocks. The two components serve different
// interaction models, so this stays separate rather than overloading Stepper
// with a `locked` mode only this consumer would use.

import { motion } from 'framer-motion'
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
  const progressPct = Math.round(((currentStep - 1) / (steps.length - 1)) * 100)

  return (
    <div className={className}>
      {/* Progress bar */}
      <div className="px-10 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">
            Etapa {currentStep} de {steps.length} — {steps[currentStep - 1]}
          </p>
          <p className="text-[10px] font-medium text-surface-500">
            {progressPct}% concluído
          </p>
        </div>
        <div className="h-1 bg-surface-800/60 rounded-full overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400"
          />
        </div>
      </div>

      {/* Horizontal step indicator */}
      <div className="px-10 pb-5 pt-2">
        <div className="flex items-start">
          {steps.map((label, i) => {
            const s = i + 1
            const isLast = s === steps.length
            const done = s < currentStep
            const active = s === currentStep
            return (
              <div key={s} className={cn('flex items-start', !isLast && 'flex-1')}>
                <button
                  type="button"
                  onClick={() => { if (done) onStepClick(s) }}
                  disabled={!done}
                  className={cn(
                    'flex flex-col items-center gap-1.5 w-[88px] flex-shrink-0',
                    done && 'cursor-pointer group',
                    !done && 'cursor-default',
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-300',
                    done && 'bg-brand-600 border-brand-600 text-surface-950 group-hover:scale-110',
                    active && 'bg-brand-600/15 border-brand-500 text-brand-400',
                    !done && !active && 'bg-surface-900 border-surface-700 text-surface-600',
                  )}>
                    {done ? <Check className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium text-center leading-tight max-w-full transition-colors duration-300',
                    active && 'text-surface-100',
                    done && !active && 'text-surface-500',
                    !done && !active && 'text-surface-600',
                  )}>{label}</span>
                  {active && (
                    <motion.div
                      layoutId="active-step-dot"
                      className="w-1 h-1 rounded-full bg-brand-500"
                    />
                  )}
                </button>
                {!isLast && (
                  <div className={cn(
                    'h-px flex-1 mt-3.5 mx-1 transition-colors duration-300',
                    done ? 'bg-brand-600/60' : 'bg-surface-800',
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
