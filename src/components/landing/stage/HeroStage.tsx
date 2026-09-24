import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Tabs } from '@/components/ui/Tabs'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { StageBoard } from './StageBoard'
import { SCENES } from './scenes/registry'
import type { SceneDef } from './scenes/types'
import { useStagePlayback } from './useStagePlayback'
import { useStageTimeline } from './useStageTimeline'
import type { HeroStageProps, StageLayout, StageScene } from './types'

const SCENE_LABEL: Record<StageScene, string> = { inbox: 'Conversas', funil: 'Funis', disparo: 'Disparos' }

/** Cena animada: dona da timeline (um `setTimeout` encadeado). Remonta a cada troca de cena. */
function AnimatedScene({ def, layout, playing, loop }: { def: SceneDef; layout: StageLayout; playing: boolean; loop: boolean }) {
  const step = useStageTimeline({ delays: def.delays, playing, loop })
  return <StageBoard def={def} layout={layout} step={step} animate playing={playing} showCursor />
}

/**
 * Palco do hero (landing e login): o produto "operando" com dados de
 * demonstração. Anima só quando visível (>= 30 % na viewport, aba ativa); com
 * reduced-motion, `autoplay=false` ou sem IntersectionObserver mostra o poster
 * (quadro "handoff" estático). Abaixo de 768px usa o layout `compact`.
 */
export function HeroStage({
  scene = 'inbox', scenes = ['inbox', 'funil', 'disparo'], autoplay = true, loop = true, onSceneChange, className,
}: HeroStageProps) {
  const available = scenes.filter((s) => SCENES[s])
  const initial = available.includes(scene) ? scene : available[0]
  const [active, setActive] = useState<StageScene | undefined>(initial)
  const rootRef = useRef<HTMLDivElement>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const layout: StageLayout = isDesktop ? 'desktop' : 'compact'
  const { mode, playing } = useStagePlayback({ targetRef: rootRef, autoplay })

  const def = active ? SCENES[active] : undefined
  if (!def || !active) return null

  const change = (next: StageScene) => {
    setActive(next)
    onSceneChange?.(next)
  }

  return (
    <div ref={rootRef} className={cn('w-full', className)}>
      {available.length > 1 && (
        <Tabs
          label="Cena do produto"
          value={active}
          onChange={change}
          tabs={available.map((s) => ({ id: s, label: SCENE_LABEL[s] }))}
          className="mb-2"
        />
      )}
      {mode === 'poster' ? (
        <StageBoard def={def} layout={layout} step={def.posterStep.handoff} animate={false} playing={false} />
      ) : (
        <AnimatedScene key={`${active}-${layout}`} def={def} layout={layout} playing={playing} loop={loop} />
      )}
    </div>
  )
}
