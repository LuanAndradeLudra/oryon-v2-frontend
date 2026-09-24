import type { ComponentType } from 'react'
import type { StageFrameKey, StageLayout, StageScene } from '../types'

/** Uma cena do palco: função PURA do passo + o roteiro de tempos. */
export interface SceneDef {
  id: StageScene
  /** Título do chrome ("Oryon · Conversas"). */
  title: string
  /** `delays[i]` = ms no passo `i` antes de ir ao `i + 1` (o último segura antes do loop). */
  delays: readonly number[]
  /** Passo estático de cada quadro do poster / reduced-motion. */
  posterStep: Record<StageFrameKey, number>
  /** Estado do cursor em cada passo. */
  cursor: (step: number) => { target: string | null; visible: boolean; pressed: boolean }
  /** Texto para leitor de tela (o quadro é aria-hidden). */
  description: string
  Scene: ComponentType<{ step: number; layout: StageLayout }>
}
