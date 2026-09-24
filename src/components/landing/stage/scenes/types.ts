import type { ComponentType } from 'react'
import type { StageFrameKey, StageLayout, StageScene } from '../types'

interface SceneProps {
  layout: StageLayout
  /** Estado estático a mostrar — nenhuma timeline: cada frame é uma ilustração pronta. */
  frame: StageFrameKey
  /** Laços ambientes ligados (a cena decide onde aplicar `.ambient-*`). */
  ambient: boolean
}

/** Uma cena do palco: estado ESTÁTICO por `frame`, sem roteiro nem cursor. */
export interface SceneDef {
  id: StageScene
  /** Título do chrome ("Oryon · Conversas"). */
  title: string
  /** Frame que o HeroStage (cena viva) usa por padrão — o estado mais completo/rico. */
  liveFrame: StageFrameKey
  /** Texto para leitor de tela (o quadro é aria-hidden). */
  description: string
  Scene: ComponentType<SceneProps>
}
