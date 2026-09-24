import { Tabs } from '@/components/ui/Tabs'
import { StageRail } from '../primitives/StageRail'
import { StageBoardStrip, StageKanbanColumn, StageTerminalColumn } from '../primitives/StageKanban'
import { DEMO_DEAL_LEAD, DEMO_DEALS_BASE, DEMO_STAGES, type DemoDeal } from '../demoData'
import type { StageFrameKey, StageLayout } from '../types'

const OPEN_STAGES = DEMO_STAGES.filter((s) => !s.terminal)
const TERMINAL_STAGES = DEMO_STAGES.filter((s) => s.terminal)

/** Coluna do negócio da cena em cada frame — nunca um passo, um estado fixo. */
const STAGE_AT: Record<StageFrameKey, string> = {
  inicio: 's-novo', ia: 's-qualificado', handoff: 's-qualificado', humano: 's-proposta', final: 's-proposta',
}
/** Moveu por conta da IA (chip âmbar) só enquanto está em Qualificado. */
const BY_AI: Record<StageFrameKey, boolean> = { inicio: false, ia: true, handoff: true, humano: false, final: false }

function dealsByStage(frame: StageFrameKey): Record<string, DemoDeal[]> {
  const out: Record<string, DemoDeal[]> = {}
  for (const s of DEMO_STAGES) out[s.id] = [...(DEMO_DEALS_BASE[s.id] ?? [])]
  const at = STAGE_AT[frame]
  out[at] = [{ ...DEMO_DEAL_LEAD, byAi: BY_AI[frame] }, ...out[at]]
  return out
}

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

/** Cena "Funis" — função PURA do frame: o negócio da demonstração já está numa
 *  coluna e o card ganha `.ambient-bob` (respiração), não um arraste simulado. */
export function FunilScene({ layout, frame }: { layout: StageLayout; frame: StageFrameKey }) {
  const byStage = dealsByStage(frame)
  const openCount = OPEN_STAGES.reduce((n, s) => n + byStage[s.id].length, 0)
  const activeId = STAGE_AT[frame]

  if (layout === 'compact') {
    const stage = DEMO_STAGES.find((s) => s.id === activeId)!
    return (
      <div className="flex-1 min-w-0 flex flex-col bg-surface-900">
        <div className="hidden lg:block px-3 pt-2 border-b border-surface-700 flex-shrink-0">
          <Tabs
            label="Etapas do funil (demonstração)"
            value={activeId}
            onChange={() => {}}
            tabs={OPEN_STAGES.map((s) => ({ id: s.id, label: s.label, count: byStage[s.id].length }))}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-1 py-1 lg:px-3 lg:py-3">
          <StageKanbanColumn key={stage.id} stage={stage} deals={byStage[stage.id]} focusDealId={DEMO_DEAL_LEAD.id} className="w-full" />
        </div>
      </div>
    )
  }

  return (
    <>
      <StageRail active="funil" />
      <div className="flex-1 min-w-0 flex flex-col bg-surface-900">
        <Strip open={openCount} />
        <div className="flex gap-[5px] lg:gap-[10px] px-1 py-1 lg:px-4 lg:py-3 flex-1 min-h-0 overflow-hidden">
          {OPEN_STAGES.map((s) => (
            <StageKanbanColumn key={s.id} stage={s} deals={byStage[s.id]} focusDealId={DEMO_DEAL_LEAD.id} />
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
