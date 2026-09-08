// B2 (SCRUM-928) — probabilidade efetiva e valor ponderado, calculados no
// FRONTEND a partir do deal cru (`GET /deals/:id` não os enriquece — só as
// leituras de board/read-model no backend fazem isso, e a ficha busca o deal
// sozinho). Espelha exatamente `deal-probability.ts` do backend (B1/SCRUM-927,
// D0-7): terminal (isWon/isLost) → 100/0 fixos; senão o OVERRIDE do negócio
// (`deal.probability`) e, na falta dele, o default da ETAPA
// (`stage.probability`); nada configurado → `null`. O ponderado de um negócio
// sem probabilidade configurada é o PRÓPRIO VALOR (equivale a 100%), nunca
// `null` — um `null` no meio da soma faria o total por etapa não fechar com o
// total do funil.
import type { Deal, PipelineStage } from '@/types'

export interface DealProbability {
  /** Probabilidade EFETIVA (0-100), ou `null` se não configurada. */
  effective: number | null
  /** Houve override OU default de etapa configurado? (`effective !== null`). */
  configured: boolean
  /** `amountCents * (effective ?? 100) / 100`, arredondado. */
  weightedAmountCents: number
}

export function effectiveProbability(
  deal: Pick<Deal, 'status' | 'probability'>,
  stage: Pick<PipelineStage, 'isWon' | 'isLost' | 'probability'> | null | undefined,
): number | null {
  if (stage?.isWon || deal.status === 'won') return 100
  if (stage?.isLost || deal.status === 'lost') return 0
  if (deal.probability != null && Number.isFinite(deal.probability)) return deal.probability
  if (stage?.probability != null && Number.isFinite(stage.probability)) return stage.probability
  return null
}

export function dealProbability(
  deal: Pick<Deal, 'status' | 'probability' | 'amountCents'>,
  stage: Pick<PipelineStage, 'isWon' | 'isLost' | 'probability'> | null | undefined,
): DealProbability {
  const effective = effectiveProbability(deal, stage)
  const weightedAmountCents = Math.round(deal.amountCents * (effective ?? 100) / 100)
  return { effective, configured: effective !== null, weightedAmountCents }
}
