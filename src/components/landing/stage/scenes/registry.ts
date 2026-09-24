import type { StageScene } from '../types'
import type { SceneDef } from './types'
import { inboxScene } from './inboxDef'

/**
 * Cenas implementadas. `funil` e `disparo` entram aqui quando prontas — até lá o
 * HeroStage só oferece as abas das cenas que existem (nunca uma aba vazia).
 */
export const SCENES: Partial<Record<StageScene, SceneDef>> = {
  inbox: inboxScene,
}
