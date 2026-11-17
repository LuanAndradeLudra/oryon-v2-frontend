import { useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CANVAS_MINIMO, gravarLargura, LARGURA_MAXIMA, LARGURA_MINIMA, LARGURA_PADRAO } from './paineisEncaixados'

/**
 * A vaga do painel, à direita do desenho: o canvas encolhe para dar lugar a ela
 * (nada fica escondido embaixo). A borda esquerda arrasta para mudar a largura
 * (e as setas, com o foco nela); dois cliques voltam ao padrão.
 */
export function PainelEncaixado({ largura, extra, onLargura, onSoltar, children }: {
  largura: number
  /** O que soma à largura sem ser ajustável (a coluna do celular). */
  extra: number
  onLargura: (v: number) => void
  /** A largura ficou (soltou a borda, setas ou dois cliques): o editor confere se o passo escolhido ficou à vista. */
  onSoltar?: () => void
  children: ReactNode
}) {
  const inicio = useRef<{ x: number; largura: number } | null>(null)
  const limitar = (v: number) => Math.round(Math.max(LARGURA_MINIMA, Math.min(LARGURA_MAXIMA, window.innerWidth - extra - CANVAS_MINIMO, v)))
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="jt-vaga-do-painel relative h-full min-h-0 shrink-0 border-l border-surface-700 bg-[var(--jt-moldura)]"
      style={{ width: largura + extra }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Largura do painel"
        aria-valuenow={largura}
        aria-valuemin={LARGURA_MINIMA}
        aria-valuemax={LARGURA_MAXIMA}
        tabIndex={0}
        title="Arraste para mudar a largura (dois cliques voltam ao padrão)"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); inicio.current = { x: e.clientX, largura } }}
        onPointerMove={(e) => { if (inicio.current) onLargura(limitar(inicio.current.largura + inicio.current.x - e.clientX)) }}
        onPointerUp={() => { if (inicio.current) { inicio.current = null; gravarLargura(largura); onSoltar?.() } }}
        onDoubleClick={() => { onLargura(LARGURA_PADRAO); gravarLargura(LARGURA_PADRAO); onSoltar?.() }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const v = limitar(largura + (e.key === 'ArrowLeft' ? 16 : -16))
          onLargura(v)
          gravarLargura(v)
          onSoltar?.()
        }}
        className="group absolute -left-[5px] top-0 bottom-0 z-40 w-[9px] cursor-col-resize touch-none focus-visible:outline-none"
      >
        <span aria-hidden className="absolute left-[3px] top-0 bottom-0 w-[3px] rounded-full bg-transparent transition-colors duration-150 group-hover:bg-brand-500 group-focus-visible:bg-brand-500 group-active:bg-brand-500" />
      </div>
      {children}
    </motion.div>
  )
}
