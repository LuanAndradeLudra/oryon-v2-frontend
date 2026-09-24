import { useEffect, useState, type RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Options {
  /** Elemento observado (o quadro). */
  targetRef: RefObject<Element | null>
  /** `false` = comporta-se como poster. */
  autoplay: boolean
}

/** IntersectionObserver utilizável? (jsdom não tem um construtível → poster.) */
function canObserve(): boolean {
  if (typeof IntersectionObserver === 'undefined') return false
  try {
    new IntersectionObserver(() => {}).disconnect()
    return true
  } catch {
    return false
  }
}

/**
 * Quando o palco anima:
 *   • `mode: 'poster'` — reduced-motion, `autoplay=false` ou ambiente sem
 *     IntersectionObserver (jsdom): quadro estático, nunca tem timer.
 *   • `playing` — modo animado E ≥ 30 % do quadro na viewport E aba visível.
 *     Fora disso a timeline congela (zero timers, zero trabalho).
 */
export function useStagePlayback({ targetRef, autoplay }: Options): { mode: 'play' | 'poster'; playing: boolean; inView: boolean; tabVisible: boolean } {
  const reduced = useReducedMotion()
  const [observable] = useState(canObserve)
  const [inView, setInView] = useState(false)
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')

  const mode: 'play' | 'poster' = autoplay && !reduced && observable ? 'play' : 'poster'

  useEffect(() => {
    if (mode !== 'play') return
    const el = targetRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      // threshold .3 dispara nos dois sentidos; `isIntersecting` fica true com 1 px,
      // então a razão é que decide (≥ 30 % visível).
      for (const e of entries) setInView(e.isIntersecting && (e.intersectionRatio ?? 1) >= 0.3)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [mode, targetRef])

  useEffect(() => {
    if (mode !== 'play') return
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [mode])

  return { mode, playing: mode === 'play' && inView && tabVisible, inView, tabVisible }
}
