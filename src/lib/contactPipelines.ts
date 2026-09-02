// F11 (SCRUM-884/885/886) — lógica pura da visão consolidada (pranchetas 6–7):
// chips "Funil · Etapa" da tabela, stepper por funil na ficha, linha compacta
// dos fechados e rótulo de "quem moveu". Sem React, sem API.
import type { ContactDealsPipelineSummary, Deal, Pipeline, PipelineKind, PipelineStage } from '@/types'
import { pipelineKindOf } from '@/lib/pipelineKinds'

export interface PipelineChip {
  pipelineId: string
  pipelineName: string
  color: string
  stageLabel: string | null
  kind: PipelineKind
}

/**
 * Etapa efetiva de um registro aberto neste funil: prefere `openStages` (C1/SCRUM-932,
 * formato novo — usa o primeiro registro aberto) e cai para o campo singular
 * `stageLabel` quando `openStages` não vier (backend atual do épico, pré-C1).
 * TODO(SCRUM-932): remover o fallback para `stageLabel` quando a C1 mesclar.
 */
export function effectiveOpenStageLabel(p: Pick<ContactDealsPipelineSummary, 'openStages' | 'stageLabel'>): string | null {
  if (p.openStages && p.openStages.length > 0) return p.openStages[0].stageLabel
  return p.stageLabel ?? null
}

/** Um chip por registro ABERTO (I1: no máx. 1 por funil). `kind` vem do cache de funis; sem ele, `sales`. */
export function openPipelineChips(byPipeline: ReadonlyArray<ContactDealsPipelineSummary>, pipelines: ReadonlyArray<Pipeline>): PipelineChip[] {
  return byPipeline
    .filter((p) => p.openCount > 0)
    .map((p) => {
      const pipe = pipelines.find((x) => x.id === p.pipelineId)
      return {
        pipelineId: p.pipelineId,
        pipelineName: p.pipelineName,
        color: pipe?.color ?? p.pipelineColor,
        stageLabel: effectiveOpenStageLabel(p),
        kind: pipe ? pipelineKindOf(pipe) : 'sales',
      }
    })
}

export type StepState = 'done' | 'current' | 'todo' | 'won' | 'lost'
export interface StepperStep { id: string; label: string; color: string; state: StepState }

/**
 * Passos do stepper de um registro: etapas normais em ordem; aberto → feitas /
 * atual / a fazer; fechado → todas feitas + o terminal em que parou.
 */
export function stepperFor(pipeline: Pick<Pipeline, 'stages'>, deal: Pick<Deal, 'stageId' | 'status'>): StepperStep[] {
  const sorted = [...pipeline.stages].sort((a, b) => a.order - b.order)
  const normal = sorted.filter((s) => !s.isWon && !s.isLost)
  const current = sorted.find((s) => s.id === deal.stageId)
  if (deal.status === 'open') {
    const idx = normal.findIndex((s) => s.id === deal.stageId)
    return normal.map((s, i) => ({ id: s.id, label: s.label, color: s.color, state: i < idx ? 'done' : i === idx ? 'current' : 'todo' }))
  }
  const steps: StepperStep[] = normal.map((s) => ({ id: s.id, label: s.label, color: s.color, state: 'done' }))
  if (current && (current.isWon || current.isLost)) {
    steps.push({ id: current.id, label: current.label, color: current.color, state: current.isWon ? 'won' : 'lost' })
  }
  return steps
}

/** Registros abertos primeiro (mais recente no topo); fechados por data de fechamento. */
export function splitDeals<T extends Pick<Deal, 'status' | 'closedAt' | 'createdAt' | 'updatedAt'>>(deals: ReadonlyArray<T>): { open: T[]; closed: T[] } {
  const ts = (v?: string | null) => (v ? new Date(v).getTime() : 0)
  const open = deals.filter((d) => d.status === 'open').sort((a, b) => ts(b.createdAt) - ts(a.createdAt))
  const closed = deals.filter((d) => d.status !== 'open').sort((a, b) => ts(b.closedAt ?? b.updatedAt) - ts(a.closedAt ?? a.updatedAt))
  return { open, closed }
}

/** "movido por" — nome do humano, ou o tipo de ator quando não humano. */
export function movedByLabel(deal: Pick<Deal, 'lastMovedByKind' | 'lastMovedByActorName' | 'createdByKind'>): string | null {
  const kind = deal.lastMovedByKind ?? (deal.createdByKind === 'ai' ? 'ai' : deal.createdByKind === 'automation' ? 'automation' : null)
  switch (kind) {
    case 'user': return deal.lastMovedByActorName ?? 'atendente'
    case 'ai': return 'IA'
    case 'automation':
    case 'journey': return 'automação'
    case 'campaign': return 'campanha'
    case 'system': return 'sistema'
    default: return null
  }
}

/** Etapas para o menu "Mover ▾": as normais que não são a atual, depois os terminais. */
export function moveTargets(pipeline: Pick<Pipeline, 'stages'>, currentStageId: string): { normal: PipelineStage[]; terminal: PipelineStage[] } {
  const sorted = [...pipeline.stages].sort((a, b) => a.order - b.order)
  return {
    normal: sorted.filter((s) => !s.isWon && !s.isLost && s.id !== currentStageId),
    terminal: sorted.filter((s) => s.isWon || s.isLost),
  }
}
