import { useEffect, useState, type RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Options {
  /** Elemento observado (o quadro). */
  targetRef: RefObject<Element | null>
  /** `false` = nunca liga os laços ambientes (poster). */
  autoplay: boolean
}

/** IntersectionObserver utilizável? (jsdom não tem um construtível.) */
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
 * Decide se os laços ambientes (`.ambient-ring`/`.ambient-bob`/`.ambient-roll`)
 * do quadro devem estar ligados: `autoplay` && reduced-motion NÃO ativo (o CSS
 * já os desliga sozinho, mas aplicar a classe só quando faz sentido evita um
 * `animation-play-state` pairando à toa) && >= 30 % do quadro na viewport &&
 * aba visível. Sem nenhum desses, os loops custam zero (CSS não roda fora da
 * tela nem em aba oculta de qualquer forma — isto é só higiene/diagnóstico).
 */
export function useStagePlayback({ targetRef, autoplay }: Options): { mode: 'live' | 'poster'; ambient: boolean; inView: boolean; tabVisible: boolean } {
  const reduced = useReducedMotion()
  const [observable] = useState(canObserve)
  const [inView, setInView] = useState(false)
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')

  const mode: 'live' | 'poster' = autoplay && !reduced && observable ? 'live' : 'poster'

  useEffect(() => {
    if (mode !== 'live') return
    const el = targetRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      // threshold .3 dispara nos dois sentidos; a razão de interseção decide (>= 30 % visível).
      for (const e of entries) setInView(e.isIntersecting && (e.intersectionRatio ?? 1) >= 0.3)
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [mode, targetRef])

  useEffect(() => {
    if (mode !== 'live') return
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [mode])

  return { mode, ambient: mode === 'live' && inView && tabVisible, inView, tabVisible }
}
