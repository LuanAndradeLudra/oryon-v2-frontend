// B2 (SCRUM-928) — stepper CLICÁVEL do cabeçalho da ficha. Mesma visual do
// stepper somente-leitura de `ContactPipelinesSection.tsx` (`stepperFor`),
// mas cada bolha normal chama `onMoveToStage` diretamente — fechar
// (won/lost) é ação separada no cabeçalho (Marcar ganho/perdido), não uma
// bolha do stepper, porque terminal SEMPRE pede motivo (A4) e não faz
// sentido ser "mais um passo" clicável na régua.
import { cn } from '@/lib/utils'
import { stepperFor } from '@/lib/contactPipelines'
import type { Deal, Pipeline, PipelineStage } from '@/types'

interface DealStageStepperProps {
  pipeline: Pick<Pipeline, 'stages'>
  deal: Pick<Deal, 'stageId' | 'status'>
  onMoveToStage: (stage: PipelineStage) => void
  disabled?: boolean
}

export function DealStageStepper({ pipeline, deal, onMoveToStage, disabled }: DealStageStepperProps) {
  const steps = stepperFor(pipeline, deal).filter((s) => s.state !== 'won' && s.state !== 'lost')
  const stagesById = new Map(pipeline.stages.map((s) => [s.id, s]))

  return (
    <ol className="flex items-center gap-1 flex-wrap" aria-label="Etapas do funil" data-testid="deal-stepper">
      {steps.map((s, i) => {
        const stage = stagesById.get(s.id)
        const current = s.state === 'current'
        const clickable = !disabled && !current && !!stage
        return (
          <li key={s.id} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => stage && onMoveToStage(stage)}
              title={clickable ? `Mover para "${s.label}"` : s.label}
              aria-current={current ? 'step' : undefined}
              data-testid={`deal-stepper-stage-${s.id}`}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border whitespace-nowrap transition-all',
                current && 'ring-2 ring-offset-1 ring-offset-surface-950',
                s.state === 'todo' && 'text-surface-500 border-surface-700',
                clickable && 'cursor-pointer hover:brightness-125',
                !clickable && !current && 'cursor-default',
              )}
              style={s.state === 'done' || current
                ? { color: s.color, borderColor: `${s.color}55`, backgroundColor: `${s.color}${current ? '26' : '14'}`, ...(current ? { ['--tw-ring-color' as string]: `${s.color}66` } : {}) }
                : undefined}
              data-state={s.state}
            >
              {s.label}
            </button>
            {i < steps.length - 1 && <span className="w-2 h-px bg-surface-700 flex-shrink-0" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
