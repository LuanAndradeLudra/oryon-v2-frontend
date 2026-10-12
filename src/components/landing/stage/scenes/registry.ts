import type { StageScene } from '../types'
import type { SceneDef } from './types'
import { inboxScene } from './inboxDef'
import { funilScene } from './funilDef'
import { disparoScene } from './disparoDef'

/**
 * Cenas implementadas. O HeroStage só oferece as abas das cenas que existem (nunca uma aba vazia).
 */
export const SCENES: Partial<Record<StageScene, SceneDef>> = {
  inbox: inboxScene,
  funil: funilScene,
  disparo: disparoScene,
}
