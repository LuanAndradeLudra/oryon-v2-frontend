import { StageBoard } from './StageBoard'
import { SCENES } from './scenes/registry'
import type { StagePosterProps } from './types'

/**
 * Quadro estático de uma cena (login, seções da landing, reduced-motion): o mesmo
 * quadro do HeroStage congelado num passo (`frame`), sem timer, sem cursor e sem
 * entradas animadas. Cena ainda não implementada cai na de Conversas.
 */
export function StagePoster({ scene, frame = 'handoff', layout = 'desktop', className }: StagePosterProps) {
  const def = SCENES[scene] ?? SCENES.inbox!
  return <StageBoard def={def} layout={layout} step={def.posterStep[frame]} animate={false} playing={false} className={className} />
}
