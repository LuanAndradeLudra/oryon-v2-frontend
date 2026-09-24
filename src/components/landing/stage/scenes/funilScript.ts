import { DEMO_DEAL_LEAD, DEMO_DEALS_BASE, DEMO_STAGES, type DemoDeal } from '../demoData'

/**
 * Roteiro da cena Funis (função pura do passo):
 *  0 quadro base                        4 clique: card "no ar" (rotate -1.5deg + sombra)
 *  1 negócio novo entra em Novo lead    5 solta em Proposta enviada (totais atualizam)
 *  2 Agente IA move p/ Qualificado      6 hold (cursor some) -> loop
 *  3 cursor mira o card
 */
export const STEP = { enter: 1, ai: 2, cursor: 3, press: 4, dropped: 5, hold: 6 } as const

export const DELAYS: number[] = [900, 900, 1400, 900, 420, 900, 3200]

export type DealsByStage = Record<string, DemoDeal[]>

/** Coluna onde o negócio da cena está em cada passo (null = ainda não entrou). */
export function leadStageAt(step: number): string | null {
  if (step < STEP.enter) return null
  if (step < STEP.ai) return 's-novo'
  if (step < STEP.dropped) return 's-qualificado'
  return 's-proposta'
}

export function dealsAt(step: number): DealsByStage {
  const out: DealsByStage = {}
  for (const s of DEMO_STAGES) out[s.id] = [...(DEMO_DEALS_BASE[s.id] ?? [])]
  const at = leadStageAt(step)
  if (at) {
    const deal: DemoDeal = { ...DEMO_DEAL_LEAD, byAi: step >= STEP.ai && step < STEP.dropped, time: step >= STEP.ai ? '1 min' : 'agora' }
    out[at] = [deal, ...out[at]]
  }
  return out
}
