import { StageFrame } from './StageFrame'
import { StageCursor } from './StageCursor'
import { StageMotionProvider } from './StageMotion'
import type { SceneDef } from './scenes/types'
import type { StageLayout } from './types'

interface BoardProps {
  def: SceneDef
  layout: StageLayout
  step: number
  /** Entradas animadas (false no poster e em reduced-motion). */
  animate: boolean
  /** Timeline correndo — vira `data-stage-playing`. */
  playing: boolean
  /** Mostra o cursor de demonstração (só no HeroStage animado). */
  showCursor?: boolean
  className?: string
}

/** Quadro completo de UMA cena num passo: moldura + cena (+ cursor). */
export function StageBoard({ def, layout, step, animate, playing, showCursor = false, className }: BoardProps) {
  const cursor = def.cursor(step)
  return (
    <StageMotionProvider animate={animate}>
      <StageFrame layout={layout} title={def.title} playing={playing} description={def.description} className={className}>
        <def.Scene step={step} layout={layout} />
        {showCursor && (
          <StageCursor target={cursor.target} visible={cursor.visible} pressed={cursor.pressed} measureKey={step} />
        )}
      </StageFrame>
    </StageMotionProvider>
  )
}
