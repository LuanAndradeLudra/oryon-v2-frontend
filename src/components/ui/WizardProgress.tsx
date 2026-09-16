// ─── WizardProgress ──────────────────────────────────────────────────────────
// Breadcrumb de etapas pra wizard linear e travado — valores exatos da spec
// 2c (spec/2c-campanhas.md CAMP-WIZ-07..13, extraída do HTML do canvas):
//   concluída  18px, fundo --acsoft, check em --acs           (WIZ-08)
//   atual      18px, fundo --btn, número 10px/700 em --btntx  (WIZ-09)
//   futura     18px, borda de ênfase, sem fundo               (WIZ-12, README 3.6)
//   rótulo     12px/600; concluídas --tx2, atual --tx         (WIZ-10)
//   conector   1px SÓLIDO em acento, margem 0 10px            (WIZ-11 — o PNG
//              parece pontilhado por anti-aliasing; o HTML é sólido)
// Sem barra de progresso separada. Unlike `Stepper` — a free-jump section nav
// for long scrollable forms — a wizard step is gated: only *completed* steps
// are clickable, because each step validates before the next unlocks.

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
                'w-[18px] h-[18px] rounded-full flex items-center justify-center text-3xs font-bold flex-shrink-0 transition-colors duration-300',
                done && 'bg-accent-soft text-accent-dark group-hover:brightness-110',
                active && 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]',
                !done && !active && 'border border-[var(--bd2)] text-surface-400',
              )}>
                {done ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : s}
              </span>
              <span className={cn(
                'text-xs font-semibold whitespace-nowrap transition-colors duration-300',
                active ? 'text-surface-100' : 'text-surface-400',
              )}>{label}</span>
            </button>
            {!isLast && (
              <div className={cn('flex-1 min-w-4 h-px mx-2.5', done ? 'bg-brand-500' : 'bg-surface-700')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
