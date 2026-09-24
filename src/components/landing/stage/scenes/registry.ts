import type { StageScene } from '../types'
import type { SceneDef } from './types'
import { inboxScene } from './inboxDef'
import { funilScene } from './funilDef'

/**
 * Cenas implementadas. `disparo` entra aqui quando pronta — até lá o
 * HeroStage só oferece as abas das cenas que existem (nunca uma aba vazia).
 */
export const SCENES: Partial<Record<StageScene, SceneDef>> = {
  inbox: inboxScene,
  funil: funilScene,
}
