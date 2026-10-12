import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Tabs } from '@/components/ui/Tabs'
import { StageBoard } from './StageBoard'
import { SCENES } from './scenes/registry'
import { useStagePlayback } from './useStagePlayback'
import type { HeroStageProps, StageScene } from './types'

const SCENE_LABEL: Record<StageScene, string> = { inbox: 'Conversas', funil: 'Funis', disparo: 'Disparos' }

/**
 * Palco do hero (landing e login): o produto "operando" com dados de
 * demonstração — técnica da Attio (dissecção de 24/09/2026), não a timeline de
 * passos anterior. Cada cena é um estado ESTÁTICO impecável (`liveFrame`) mais
 * 2-3 laços ambientes em CSS puro; sem roteiro, sem cursor falso. `autoplay`
 * liga/desliga só os laços (via `ambient`); `loop` não se aplica mais a este
 * palco (não existe timeline para repetir) — mantido na prop por contrato.
 * Largura fluida: os primitivos internos trazem duas escalas literais
 * (mobile/`lg:`), então o mesmo DOM se ajusta sozinho, sem JS de layout.
 */
export function HeroStage({
  scene = 'inbox', scenes = ['inbox', 'funil', 'disparo'], autoplay = true, onSceneChange, className,
}: HeroStageProps) {
  const available = scenes.filter((s) => SCENES[s])
  const initial = available.includes(scene) ? scene : available[0]
  const [active, setActive] = useState<StageScene | undefined>(initial)
  const rootRef = useRef<HTMLDivElement>(null)
  const { mode, ambient, inView, tabVisible } = useStagePlayback({ targetRef: rootRef, autoplay })

  const def = active ? SCENES[active] : undefined
  if (!def || !active) return null

  const change = (next: StageScene) => {
    setActive(next)
    onSceneChange?.(next)
  }

  return (
    <div
      ref={rootRef}
      className={cn('w-full', className)}
      // Diagnóstico de medição: por que os laços ambientes estão (ou não) ligados.
      data-stage-mode={mode}
      data-stage-inview={inView ? 'true' : 'false'}
      data-stage-tab-visible={tabVisible ? 'true' : 'false'}
    >
      {available.length > 1 && (
        <Tabs
          label="Cena do produto"
          value={active}
          onChange={change}
          tabs={available.map((s) => ({ id: s, label: SCENE_LABEL[s] }))}
          className="mb-2"
        />
      )}
      <StageBoard def={def} layout="desktop" frame={def.liveFrame} ambient={ambient} />
    </div>
  )
}
