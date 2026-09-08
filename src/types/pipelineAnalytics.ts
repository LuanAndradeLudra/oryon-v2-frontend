// ── Relatórios de funil (D1 · SCRUM-934, consumidos pela D2 · SCRUM-935) ────
// Espelha os contratos do backend (`backend/src/modules/deals/pipeline-analytics.types.ts`)
// — nenhum shape novo é inventado aqui, só o que `GET /analytics/pipelines/...`
// já devolve.

import type { PipelineKind } from '@/types'

/** Dinheiro é sempre BRL nesta fase. */
export interface MoneyBucket {
  count: number
  amountCents: number
  /** Σ (valor × probabilidade efetiva ÷ 100). Ausente em funil `process`. */
  weightedAmountCents: number
}

/** Bucket sem dinheiro — funil `process` (sem valores). */
export interface CountBucket {
  count: number
}

export function isMoneyBucket(bucket: MoneyBucket | CountBucket): bucket is MoneyBucket {
  return (bucket as MoneyBucket).amountCents !== undefined
}

export interface StageOverview {
  stageId: string
  stageKey: string
  stageLabel: string
  order: number
  /** Em aberto, HOJE — não filtrado pelo período. */
  open: MoneyBucket | CountBucket
}

/** Um motivo de desfecho agregado. Texto livre cai em `reason: 'outro'`. */
export interface CloseReasonBucket {
  /** `null` = negócio fechado sem motivo gravado (dado legado). */
  reason: string | null
  count: number
  /** Ausente em funil `process`. */
  amountCents?: number
  notes?: Array<{ dealId: string; note: string }>
}

export interface ClosedOverview {
  won: { total: CountBucket & { amountCents?: number }; byReason: CloseReasonBucket[] }
  lost: { total: CountBucket & { amountCents?: number }; byReason: CloseReasonBucket[] }
}

export interface StageConversion {
  fromStageId: string
  fromStageKey: string
  fromStageLabel: string
  enteredCount: number
  /** Entraram e ainda não saíram (nem fecharam) — não é "conversão zero". */
  stillHere: number
  outcomes: Array<{
    toStageId: string
    toStageKey: string
    toStageLabel: string
    count: number
    /** `count / enteredCount`, 0–1. */
    rate: number
  }>
}

export interface StageDuration {
  stageId: string
  stageKey: string
  stageLabel: string
  /** Só visitas CONCLUÍDAS entram na média. */
  completedVisits: number
  avgDays: number | null
}

/** Ciclo médio criação → fechamento — coorte de FECHAMENTO (won/lost com `closedAt` no período). */
export interface ClosedCycleCohort {
  avgDaysToClose: number | null
  closedCount: number
}

/**
 * DUAS coortes deliberadamente diferentes:
 * - `closedCohort`: negócios FECHADOS no período — mesma população de `closed`.
 * - `perStageCohort`: negócios CRIADOS no período — mesma população de `conversion`.
 * `perStageCohort[i].avgDays` NÃO explica `closedCohort.avgDaysToClose`.
 */
export interface CycleOverview {
  closedCohort: ClosedCycleCohort
  perStageCohort: StageDuration[]
}

export interface OwnerOverview {
  /** `null` = "Sem dono" — inclui dono desativado/soft-deletado. */
  ownerUserId: string | null
  ownerName: string
  open: MoneyBucket | CountBucket
  won: CountBucket & { amountCents?: number }
  lost: CountBucket & { amountCents?: number }
}

export interface PipelineOverview {
  pipelineId: string
  pipelineName: string
  pipelineKind: PipelineKind
  period: { from: string | null; to: string | null }
  ownerUserId: string | null
  stages: StageOverview[]
  totalOpen: MoneyBucket | CountBucket
  closed: ClosedOverview
  conversion: StageConversion[]
  cycle: CycleOverview
  byOwner: OwnerOverview[]
}

export interface PipelineSummaryItem {
  pipelineId: string
  name: string
  isDefault: boolean
  open: MoneyBucket
}
