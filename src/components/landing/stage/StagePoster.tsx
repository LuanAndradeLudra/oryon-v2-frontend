import { StageBoard } from './StageBoard'
import { SCENES } from './scenes/registry'
import type { StagePosterProps } from './types'

/**
 * Quadro estático de uma cena (login, seções da landing, reduced-motion): o
 * mesmo estado por `frame`, sem NENHUM laço ambiente (`ambient={false}`) — é o
 * quadro parado mesmo, não uma versão "pausada" do palco vivo. Cena ainda não
 * implementada cai na de Conversas.
 */
export function StagePoster({ scene, frame = 'handoff', layout = 'desktop', className }: StagePosterProps) {
  const def = SCENES[scene] ?? SCENES.inbox!
  return <StageBoard def={def} layout={layout} frame={frame} ambient={false} className={className} />
}
