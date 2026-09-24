import { Tabs } from '@/components/ui/Tabs'
import { StageRail } from '../primitives/StageRail'
import { StageBoardStrip, StageKanbanColumn, StageTerminalColumn } from '../primitives/StageKanban'
import { DEMO_STAGES } from '../demoData'
import type { StageLayout } from '../types'
import { STEP, dealsAt, leadStageAt } from './funilScript'

const OPEN_STAGES = DEMO_STAGES.filter((s) => !s.terminal)
const TERMINAL_STAGES = DEMO_STAGES.filter((s) => s.terminal)

function Strip({ open }: { open: number }) {
  return (
    <StageBoardStrip>
      <span className="inline-flex items-center gap-1 text-3xs font-semibold px-1.5 py-0.5 rounded-full bg-surface-900 border border-surface-700 text-surface-300">
        Vendas
      </span>
      <span>Negócios com valor — fecham em Ganho ou Perdido.</span>
      <span className="text-surface-600">·</span>
      <span>{open} abertos · 0 ganhos hoje · 0 perdidos</span>
    </StageBoardStrip>
  )
}

/** Cena "Funis" — função PURA do passo (roteiro em `funilScript.ts`). */
export function FunilScene({ step, layout }: { step: number; layout: StageLayout }) {
  const byStage = dealsAt(step)
  const openCount = OPEN_STAGES.reduce((n, s) => n + byStage[s.id].length, 0)
  const lifted = step === STEP.press ? 'd-marina' : null
  const entering = step === STEP.enter || step === STEP.ai || step === STEP.dropped ? 'd-marina' : null
  const targetDeal = step >= STEP.cursor && step < STEP.dropped ? 'd-marina' : null

  if (layout === 'compact') {
    // Um funil por vez (padrão kanban de celular): a coluna onde o negócio está.
    const activeId = leadStageAt(step) ?? 's-novo'
    const stage = DEMO_STAGES.find((s) => s.id === activeId)!
    return (
      <div className="flex-1 min-w-0 flex flex-col bg-surface-900">
        <div className="px-3 pt-2 border-b border-surface-700 flex-shrink-0">
          <Tabs
            label="Etapas do funil (demonstração)"
            value={activeId}
            onChange={() => {}}
            tabs={OPEN_STAGES.map((s) => ({ id: s.id, label: s.label, count: byStage[s.id].length }))}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-3 py-3">
          <StageKanbanColumn
            key={stage.id}
            stage={stage}
            deals={byStage[stage.id]}
            liftedId={lifted}
            targetDealId={targetDeal}
            enteringId={entering}
            columnTarget={stage.id === 's-proposta' ? 'col-proposta' : undefined}
            className="w-full"
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <StageRail active="funil" />
      <div className="flex-1 min-w-0 flex flex-col bg-surface-900">
        <Strip open={openCount} />
        <div className="flex gap-[10px] px-4 py-3 flex-1 min-h-0 overflow-hidden">
          {OPEN_STAGES.map((s) => (
            <StageKanbanColumn
              key={s.id}
              stage={s}
              deals={byStage[s.id]}
              liftedId={lifted}
              targetDealId={targetDeal}
              enteringId={entering}
              columnTarget={s.id === 's-proposta' ? 'col-proposta' : undefined}
            />
          ))}
          <StageTerminalColumn>
            {TERMINAL_STAGES.map((s) => (
              <StageKanbanColumn key={s.id} stage={s} deals={byStage[s.id]} />
            ))}
          </StageTerminalColumn>
        </div>
      </div>
    </>
  )
}
