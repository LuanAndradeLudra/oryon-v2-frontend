import { useLayoutEffect, useRef } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useStageScale } from './stageContext'

interface Props {
  /** Valor de `data-stage-target` do elemento que o cursor mira; `null` = sem alvo. */
  target: string | null
  /** Visível (fade) — fora disso fica na origem, transparente. */
  visible: boolean
  /** "Clique": scale .9 -> 1. */
  pressed: boolean
  /** Posição de repouso (coordenadas de desenho) antes de mirar o alvo. */
  origin?: { x: number; y: number }
  /** Muda a cada passo da cena: a posição do alvo é remedida. */
  measureKey: number
}

const DEFAULT_ORIGIN = { x: 860, y: 430 }
const GLIDE = { duration: 0.75, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }

/**
 * Cursor de demonstração: `motion.div` que desliza até o centro de
 * `[data-stage-target="..."]` (medido dentro do quadro, dividido pela escala). Só
 * transform/opacity. Decorativo (aria-hidden, sem pointer-events). A posição vive
 * em motion values — nenhum setState em efeito.
 */
export function StageCursor({ target, visible, pressed, origin = DEFAULT_ORIGIN, measureKey }: Props) {
  const scale = useStageScale()
  const hostRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(origin.x)
  const y = useMotionValue(origin.y)

  useLayoutEffect(() => {
    let tx = origin.x
    let ty = origin.y
    if (target) {
      const host = hostRef.current
      const el = host?.parentElement?.querySelector<HTMLElement>(`[data-stage-target="${target}"]`)
      if (!host || !el) return
      const h = host.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      // Ponta do cursor no centro do alvo (o SVG tem a ponta em 0,0).
      tx = (r.left - h.left) / scale + r.width / scale / 2
      ty = (r.top - h.top) / scale + r.height / scale / 2
    }
    const cx = animate(x, tx, GLIDE)
    const cy = animate(y, ty, GLIDE)
    return () => { cx.stop(); cy.stop() }
  }, [target, measureKey, scale, origin.x, origin.y, x, y])

  return (
    <div ref={hostRef} aria-hidden className="absolute inset-0 pointer-events-none z-20">
      <motion.div
        className="absolute left-0 top-0"
        style={{ x, y }}
        initial={false}
        animate={{ opacity: visible ? 1 : 0, scale: pressed ? 0.9 : 1 }}
        transition={{ opacity: { duration: 0.2 }, scale: { duration: 0.12 } }}
      >
        <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
          <path d="M1 1l0 16 4.4-4 3 7 3-1.3-3-6.8H14L1 1z" fill="var(--color-surface-50, #fff)" stroke="var(--color-surface-950, #000)" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
  )
}
