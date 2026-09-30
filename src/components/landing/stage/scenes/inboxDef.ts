import { DEMO_AGENT_NAME, INBOX_SR_DESCRIPTION } from '../demoData'
import { InboxScene } from './inbox'
import type { SceneDef } from './types'

export const inboxScene: SceneDef = {
  id: 'inbox',
  title: 'Conversas',
  // Fix pontual (aprovado, descartável): 'final' não tem laço ambiente (o
  // handoff já terminou); 'ia' pulsa o chip do Agente com `.ambient-ring`. O
  // Hero novo (STORYBOARD-HERO.md) substitui esta cena por completo — não
  // investir mais aqui.
  liveFrame: 'ia',
  description: `${INBOX_SR_DESCRIPTION} O agente da demonstração se chama ${DEMO_AGENT_NAME}.`,
  Scene: InboxScene,
}
