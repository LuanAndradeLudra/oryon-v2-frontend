import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { StageLayout } from './types'
import { STAGE_DEMO_LABEL } from './demoLabel'
import { StageScaleContext, stageSize } from './stageContext'

interface FrameProps {
  layout: StageLayout
  /** Título da janela (esquerda do chrome), ex.: "Conversas". */
  title: string
  /** Estado da timeline — vira `data-stage-playing` (a medição usa esse atributo). */
  playing: boolean
  /** Texto para leitor de tela: o quadro em si é `aria-hidden`. */
  description: string
  className?: string
  children: ReactNode
}

/**
 * Moldura do palco: desenha SEMPRE no tamanho de design (1120×640, ou 360×560 no
 * `compact`) e escala por `transform: scale()` para caber na largura do contêiner
 * (ResizeObserver). Assim as telas não reflowam nem trocam de breakpoint ao
 * redimensionar. Chrome de 32px com o rótulo permanente "Dados de demonstração"
 * (P14). Sombra só aqui (`overlay-frame`), pointer-events none, sem foco.
 */
export function StageFrame({ layout, title, playing, description, className, children }: FrameProps) {
  const { width, height } = stageSize(layout)
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setScale(w / width)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  return (
    <div
      ref={outerRef}
      className={cn('relative w-full', className)}
      style={{ aspectRatio: `${width} / ${height}` }}
      data-stage-frame
      data-stage-layout={layout}
    >
      <div
        aria-hidden
        data-stage-playing={playing ? 'true' : 'false'}
        className="absolute left-0 top-0 rounded-lg border overlay-frame bg-surface-900 overflow-hidden pointer-events-none select-none flex flex-col"
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <div className="h-8 flex-shrink-0 flex items-center justify-between px-3 border-b border-surface-700 bg-surface-900">
          <span className="text-[11px] font-semibold text-surface-400">Oryon · {title}</span>
          <Badge>{STAGE_DEMO_LABEL}</Badge>
        </div>
        <div className="relative flex-1 min-h-0 flex">
          <StageScaleContext.Provider value={scale}>{children}</StageScaleContext.Provider>
        </div>
      </div>
      <p className="sr-only">{description}</p>
    </div>
  )
}
