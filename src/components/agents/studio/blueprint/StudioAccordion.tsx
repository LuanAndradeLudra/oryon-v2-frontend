import { useEffect, useRef } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEP_LABELS, type WizardData } from '../types'
import { stepSummary } from './stepSummary'

/**
 * Coluna esquerda do Studio (A3): as 8 etapas como acordeão, só a atual
 * aberta, concluídas clicáveis com marca e resumo.
 *
 * NÃO é o `ui/CollapsibleSection` (decisão do Maestro em `coord/A3-decisoes.md`
 * §2): este componente tem regra de wizard — quem manda no que está aberto é o
 * `step` do `useStudioDraft`, não um estado interno, e a navegação é limitada
 * às etapas já visitadas. O colapsável genérico guarda o próprio `open` em
 * localStorage, que é exatamente o contrário do que se quer aqui.
 *
 * `StudioStepItem` mora neste arquivo por só ser usado aqui.
 */

interface StudioAccordionProps {
  /** Etapa atual, 1-based (o `step` do hook). */
  step: number
  data: WizardData
  /** Corpo de cada etapa, na ordem — 8 entradas. */
  bodies: React.ReactNode[]
  /** Chamado ao clicar numa etapa já concluída. */
  onJump: (step: number) => void
}

export function StudioAccordion({ step, data, bodies, onJump }: StudioAccordionProps) {
  return (
    <div className="h-full overflow-y-auto border-r border-surface-800 bg-surface-950/50 px-4 py-5 flex flex-col gap-1.5">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        return (
          <StudioStepItem
            key={label}
            n={n}
            label={label}
            summary={stepSummary(n, data)}
            state={n < step ? 'done' : n === step ? 'current' : 'todo'}
            onJump={() => onJump(n)}
          >
            {bodies[i]}
          </StudioStepItem>
        )
      })}
    </div>
  )
}

type StepState = 'done' | 'current' | 'todo'

function StudioStepItem({
  n, label, summary, state, onJump, children,
}: {
  n: number
  label: string
  summary: string
  state: StepState
  onJump: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const open = state === 'current'

  // A etapa que abre precisa ficar visível — sem isso, avançar da 7 para a 8
  // deixa o corpo aberto fora da área rolável da coluna e parece que nada
  // aconteceu. (Mesma classe de comportamento que sumiu na extração da W0.3 e
  // que dump de DOM não pega: por isso tem teste.)
  useEffect(() => {
    // `?.()` no metodo tambem: rolagem e enfeite e nao pode derrubar a pagina
    // pelo error boundary onde `scrollIntoView` nao existe (jsdom, e alguns
    // navegadores antigos).
    if (open) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [open])

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border transition-colors',
        open ? 'border-surface-700 bg-surface-800' : 'border-transparent',
      )}
    >
      <button
        type="button"
        onClick={state === 'done' ? onJump : undefined}
        disabled={state !== 'done'}
        aria-expanded={open}
        aria-controls={`studio-step-${n}`}
        className={cn(
          'w-full grid grid-cols-[26px_1fr_auto] gap-2.5 items-center px-3 py-2.5 text-left text-[13.2px] font-semibold transition-colors rounded-lg',
          open ? 'text-surface-50' : 'text-surface-400',
          state === 'done' && 'hover:text-surface-200 cursor-pointer',
          state === 'todo' && 'cursor-default',
        )}
      >
        <span
          className={cn(
            'w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center text-[10.5px] font-bold transition-colors',
            state === 'done'   && 'bg-brand-600 border-brand-600 text-surface-950',
            state === 'current'&& 'bg-brand-500/15 border-brand-500 text-brand-400',
            state === 'todo'   && 'bg-surface-900 border-surface-700 text-surface-600',
          )}
        >
          {state === 'done' ? <Check className="w-3 h-3" aria-hidden /> : n}
        </span>

        <span className="min-w-0">
          {label}
          {state !== 'current' && summary && (
            <>
              <br />
              <span className="text-[11px] font-medium text-surface-500">{summary}</span>
            </>
          )}
        </span>

        <ChevronDown
          aria-hidden
          className={cn('w-4 h-4 transition-transform', open ? 'rotate-180 text-surface-400' : 'text-surface-600')}
        />
      </button>

      {open && (
        <div id={`studio-step-${n}`} role="region" aria-label={label} className="px-3 pb-3.5 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}
