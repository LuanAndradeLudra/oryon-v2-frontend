import { StageFrame } from './StageFrame'
import type { SceneDef } from './scenes/types'
import type { StageFrameKey, StageLayout } from './types'

interface BoardProps {
  def: SceneDef
  layout: StageLayout
  frame: StageFrameKey
  /** Laços ambientes ligados (false no poster). */
  ambient: boolean
  className?: string
}

/** Quadro completo de UMA cena num estado: moldura de janela + cena estática. */
export function StageBoard({ def, layout, frame, ambient, className }: BoardProps) {
  return (
    <StageFrame layout={layout} title={def.title} ambient={ambient} description={def.description} className={className}>
      <def.Scene layout={layout} frame={frame} ambient={ambient} />
    </StageFrame>
  )
}
