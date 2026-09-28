import { useSyncExternalStore } from 'react'

/**
 * Um relógio só, compartilhado, que anda a cada minuto (28/09). As linhas da
 * lista de Conversas são `memo` e calculavam a espera com `Date.now()` na
 * renderização: "3 min sem resposta" e o vermelho aos 15 min só andavam na
 * próxima re-renderização por outro motivo. Um intervalo para a lista toda,
 * ligado só enquanto há alguém ouvindo.
 */
const ouvintes = new Set<() => void>()
let agora = Date.now()
let timer: ReturnType<typeof setInterval> | null = null

function assinar(o: () => void) {
  ouvintes.add(o)
  if (!timer) {
    agora = Date.now()
    timer = setInterval(() => {
      agora = Date.now()
      for (const x of ouvintes) x()
    }, 60_000)
  }
  return () => {
    ouvintes.delete(o)
    if (ouvintes.size === 0 && timer) { clearInterval(timer); timer = null }
  }
}

export function useRelogioDoMinuto(): number {
  return useSyncExternalStore(assinar, () => agora, () => agora)
}
