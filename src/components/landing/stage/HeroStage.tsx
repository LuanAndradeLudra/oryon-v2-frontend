import { useState } from 'react'
import { cn } from '@/lib/utils'
import { STAGE_DESIGN, STAGE_DEMO_LABEL, type HeroStageProps, type StageScene } from './types'

const SCENE_LABEL: Record<StageScene, string> = { inbox: 'Conversas', funil: 'Funis', disparo: 'Disparos' }

/**
 * STUB do dia 0 (orquestrador): mantém o contrato e a proporção para a landing
 * construir em paralelo. O Cartógrafo substitui este arquivo pelo palco real
 * (frame escalado, timeline, cursor, cenas) sem mudar props nem exports.
 */
export function HeroStage({ scene = 'inbox', scenes = ['inbox', 'funil', 'disparo'], onSceneChange, className }: HeroStageProps) {
  const [active, setActive] = useState<StageScene>(scene)
  return (
    <div className={cn('w-full', className)} data-stage-stub>
      <div role="tablist" aria-label="Cena do produto" className="flex gap-1 mb-2">
        {scenes.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={active === s}
            onClick={() => { setActive(s); onSceneChange?.(s) }}
            className={cn('h-7 px-2.5 rounded-sm text-xs font-semibold', active === s ? 'bg-[var(--ink-bg)] text-[var(--ink-fg)]' : 'text-surface-400 hover:text-surface-100')}
          >
            {SCENE_LABEL[s]}
          </button>
        ))}
      </div>
      <div
        aria-hidden
        className="relative w-full rounded-lg border border-surface-700 bg-surface-900 flex items-center justify-center text-surface-500 text-sm"
        style={{ aspectRatio: `${STAGE_DESIGN.width} / ${STAGE_DESIGN.height}` }}
      >
        {SCENE_LABEL[active]} · {STAGE_DEMO_LABEL} (stub)
      </div>
    </div>
  )
}
