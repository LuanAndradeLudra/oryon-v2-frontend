import { FUNIL_SR_DESCRIPTION } from '../demoData'
import { FunilScene } from './funil'
import type { SceneDef } from './types'

export const funilScene: SceneDef = {
  id: 'funil',
  title: 'Funis',
  liveFrame: 'humano',
  description: FUNIL_SR_DESCRIPTION,
  Scene: FunilScene,
}
