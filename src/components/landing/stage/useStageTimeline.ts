import { useEffect, useState } from 'react'

interface Options {
  /** `delays[i]` = quanto o quadro fica no passo `i` antes de ir ao `i + 1` (ms). */
  delays: readonly number[]
  /** Só corre com `true`; `false` congela no passo atual. */
  playing: boolean
  /** Ao fim do último passo volta ao 0. Default true. */
  loop?: boolean
  /** Chamado uma vez ao terminar quando `loop` é false. */
  onEnd?: () => void
}

/**
 * Motor da cena: uma sequência de PASSOS inteiros, avançada por UM `setTimeout`
 * encadeado (cada passo agenda o próximo) — sem rAF, sem intervalos paralelos, e
 * o cleanup do efeito cancela o timer pendente (pausa, troca de cena, unmount).
 * A cena é uma função pura do passo: `render(step)`.
 */
export function useStageTimeline({ delays, playing, loop = true, onEnd }: Options): number {
  const [step, setStep] = useState(0)
  const last = delays.length - 1

  useEffect(() => {
    if (!playing) return
    const isLast = step >= last
    if (isLast && !loop) {
      onEnd?.()
      return
    }
    const timer = setTimeout(() => {
      setStep(isLast ? 0 : step + 1)
    }, delays[Math.min(step, last)])
    return () => clearTimeout(timer)
  }, [playing, step, last, loop, delays, onEnd])

  return step
}
