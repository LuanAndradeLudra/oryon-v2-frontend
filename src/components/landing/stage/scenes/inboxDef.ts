import { DEMO_AGENT_NAME, INBOX_SR_DESCRIPTION } from '../demoData'
import { InboxScene } from './inbox'
import { DELAYS, STEP } from './inboxScript'
import type { SceneDef } from './types'

/** Definição da cena Conversas (roteiro + quadros do poster + cursor). */
export const inboxScene: SceneDef = {
  id: 'inbox',
  title: 'Conversas',
  delays: DELAYS,
  posterStep: { inicio: STEP.chatOpen, ia: STEP.ai, handoff: STEP.guard, humano: STEP.human, final: STEP.read },
  cursor: (step) => ({
    target: step >= STEP.cursor && step <= STEP.human ? 'assumir' : null,
    visible: step >= STEP.cursor && step <= STEP.human,
    pressed: step === STEP.press,
  }),
  description: `${INBOX_SR_DESCRIPTION} O agente da demonstração se chama ${DEMO_AGENT_NAME}.`,
  Scene: InboxScene,
}
