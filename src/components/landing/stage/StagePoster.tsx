import { cn } from '@/lib/utils'
import { STAGE_DESIGN, STAGE_DEMO_LABEL, type StagePosterProps } from './types'

/**
 * STUB do dia 0 (orquestrador): quadro estático com a proporção certa para o
 * login e as seções da landing. O Cartógrafo substitui pelo poster real
 * (mesmo quadro do HeroStage congelado num frame) mantendo props e export.
 */
export function StagePoster({ scene, frame = 'handoff', layout = 'desktop', className }: StagePosterProps) {
  const w = layout === 'compact' ? STAGE_DESIGN.compactWidth : STAGE_DESIGN.width
  const h = layout === 'compact' ? STAGE_DESIGN.compactHeight : STAGE_DESIGN.height
  return (
    <div
      aria-hidden
      data-stage-stub
      className={cn('relative w-full rounded-lg border border-surface-700 bg-surface-900 flex items-center justify-center text-surface-500 text-xs', className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      {scene} · {frame} · {STAGE_DEMO_LABEL} (stub)
    </div>
  )
}
