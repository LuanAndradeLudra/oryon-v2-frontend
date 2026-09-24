import { FUNIL_SR_DESCRIPTION } from '../demoData'
import { FunilScene } from './funil'
import { DELAYS, STEP } from './funilScript'
import type { SceneDef } from './types'

/** Definição da cena Funis (roteiro + quadros do poster + cursor). */
export const funilScene: SceneDef = {
  id: 'funil',
  title: 'Funis',
  delays: DELAYS,
  // 'humano'/'final' = negócio já em Proposta; 'ia' = movido pelo Agente IA.
  posterStep: { inicio: STEP.enter, ia: STEP.ai, handoff: STEP.press, humano: STEP.dropped, final: STEP.hold },
  cursor: (step) => ({
    target: step >= STEP.cursor && step < STEP.hold ? (step >= STEP.dropped ? 'col-proposta' : 'deal-d-marina') : null,
    visible: step >= STEP.cursor && step < STEP.hold,
    pressed: step === STEP.press,
  }),
  description: FUNIL_SR_DESCRIPTION,
  Scene: FunilScene,
}
