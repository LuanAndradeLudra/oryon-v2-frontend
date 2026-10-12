import { createContext, useContext } from 'react'

/**
 * Laços ambientes ligados? (`autoplay` E não-reduced-motion). As classes
 * `.ambient-*`/`.reveal` (index.css) já se desligam sozinhas em
 * `prefers-reduced-motion`; este contexto existe pra os primitivos saberem se
 * DEVEM pedir o loop — `autoplay=false` (poster) nem aplica a classe, em vez
 * de aplicá-la e torcer para o CSS medir a preferência de novo.
 */
export const StageAmbientContext = createContext(false)
export function useStageAmbient(): boolean {
  return useContext(StageAmbientContext)
}
