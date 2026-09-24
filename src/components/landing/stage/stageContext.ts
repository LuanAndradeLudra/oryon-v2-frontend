import { createContext, useContext } from 'react'
import { STAGE_DESIGN, type StageLayout } from './types'

/** Escala atual do quadro (px reais por px de desenho) — o cursor divide por ela. */
export const StageScaleContext = createContext(1)
export function useStageScale(): number {
  return useContext(StageScaleContext)
}

/** `animate` = false no poster e em reduced-motion: elementos já no lugar, sem entrada. */
export const StageMotionContext = createContext<{ animate: boolean }>({ animate: false })
export function useStageAnimate(): boolean {
  return useContext(StageMotionContext).animate
}

export function stageSize(layout: StageLayout): { width: number; height: number } {
  return layout === 'compact'
    ? { width: STAGE_DESIGN.compactWidth, height: STAGE_DESIGN.compactHeight }
    : { width: STAGE_DESIGN.width, height: STAGE_DESIGN.height }
}
