import { DISPARO_SR_DESCRIPTION } from '../demoData'
import { DisparoScene } from './disparo'
import type { SceneDef } from './types'

export const disparoScene: SceneDef = {
  id: 'disparo',
  title: 'Disparos',
  liveFrame: 'humano',
  description: DISPARO_SR_DESCRIPTION,
  Scene: DisparoScene,
}
