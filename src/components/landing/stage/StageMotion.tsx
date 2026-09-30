import type { ReactNode } from 'react'
import { StageAmbientContext } from './stageContext'

export function StageAmbientProvider({ ambient, children }: { ambient: boolean; children: ReactNode }) {
  return <StageAmbientContext.Provider value={ambient}>{children}</StageAmbientContext.Provider>
}

/**
 * Entrada de um bloco do quadro: desfoque -> nítido (`.reveal`, index.css),
 * não deslizamento — técnica da Attio (dissecção de 24/09), mais "cara" que
 * `transform`. `delayMs` escalona irmãos (`--d`). Roda uma vez, no mount; sem
 * timeline nem passo, então não há por que reexecutar.
 */
export function StageReveal({ children, className, delayMs = 0 }: { children: ReactNode; className?: string; delayMs?: number }) {
  return (
    <div className={className ? `reveal ${className}` : 'reveal'} style={{ ['--d' as string]: `${delayMs}ms` }}>
      {children}
    </div>
  )
}
