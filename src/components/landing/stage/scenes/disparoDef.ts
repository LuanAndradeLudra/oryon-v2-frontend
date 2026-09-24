import { DISPARO_SR_DESCRIPTION } from '../demoData'
import { DisparoScene } from './disparo'
import { DELAYS, STEP } from './disparoScript'
import type { SceneDef } from './types'

/** Definição da cena Disparos (roteiro + quadros do poster + cursor). */
export const disparoScene: SceneDef = {
  id: 'disparo',
  title: 'Disparos',
  delays: DELAYS,
  posterStep: { inicio: 0, ia: 0, handoff: STEP.press, humano: STEP.half, final: STEP.done },
  cursor: (step) => ({
    target: step >= STEP.cursor && step < STEP.sending ? 'disparar' : null,
    visible: step >= STEP.cursor && step < STEP.sending,
    pressed: step === STEP.press,
  }),
  description: DISPARO_SR_DESCRIPTION,
  Scene: DisparoScene,
}
