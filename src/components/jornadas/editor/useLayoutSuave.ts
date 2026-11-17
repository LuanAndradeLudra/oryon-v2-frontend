import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { VersaoDaJornada } from '@/services/jornadas/tipos'

type Layout = VersaoDaJornada['graph']['layout']

const DURACAO_MS = 320
const reduzirMovimento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Quando o desenho se reorganiza por uma ação (inserir no meio, apagar e
 * religar, Organizar, desfazer), os passos deslizam até o lugar novo em vez de
 * pular. As ligações acompanham, porque a posição muda a cada quadro.
 *
 * Só anima quando `marcar()` foi chamado antes da mudança: o arrasto e a
 * primeira montagem passam direto, sem atraso nenhum.
 */
export function useLayoutSuave(layout: Layout): { exibido: Layout; marcar: () => void } {
  const [quadro, setQuadro] = useState<Layout | null>(null)
  const quadroRef = useRef<Layout | null>(null)
  const anteriorRef = useRef(layout)
  const animarRef = useRef(false)

  useLayoutEffect(() => {
    // Se uma animação estava no meio, a próxima parte de onde os passos estão.
    const de = quadroRef.current ?? anteriorRef.current
    anteriorRef.current = layout
    const pintar = (l: Layout | null) => { quadroRef.current = l; setQuadro(l) }
    const animar = animarRef.current
    animarRef.current = false
    const mudou = Object.entries(layout).some(([id, p]) => de[id] && (de[id].x !== p.x || de[id].y !== p.y))
    if (!animar || !mudou || reduzirMovimento()) {
      if (quadroRef.current) pintar(null)
      return
    }

    const quadroEm = (e: number): Layout => {
      const saida: Layout = {}
      for (const [id, p] of Object.entries(layout)) {
        const o = de[id] ?? p
        saida[id] = { x: o.x + (p.x - o.x) * e, y: o.y + (p.y - o.y) * e }
      }
      return saida
    }
    pintar(quadroEm(0))
    const inicio = performance.now()
    let raf = 0
    const passo = (t: number) => {
      const k = Math.min(1, (t - inicio) / DURACAO_MS)
      if (k >= 1) { pintar(null); return }
      pintar(quadroEm(1 - Math.pow(1 - k, 3))) // sai rápido e assenta devagar
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [layout])

  const marcar = useCallback(() => { animarRef.current = true }, [])
  return { exibido: quadro ?? layout, marcar }
}

export const DURACAO_DO_DESLIZE_MS = DURACAO_MS
