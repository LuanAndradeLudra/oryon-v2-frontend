import { DEMO_AGENT_NAME, INBOX_SR_DESCRIPTION } from '../demoData'
import { InboxScene } from './inbox'
import type { SceneDef } from './types'

export const inboxScene: SceneDef = {
  id: 'inbox',
  title: 'Conversas',
  liveFrame: 'final',
  description: `${INBOX_SR_DESCRIPTION} O agente da demonstração se chama ${DEMO_AGENT_NAME}.`,
  Scene: InboxScene,
}
