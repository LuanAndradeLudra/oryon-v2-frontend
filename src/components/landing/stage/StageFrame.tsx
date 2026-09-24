import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { StageLayout } from './types'
import { STAGE_DEMO_LABEL } from './demoLabel'
import { StageAmbientProvider } from './StageMotion'

interface FrameProps {
  layout: StageLayout
  /** Título da janela, na barra de topo (lg apenas — ver DOTS abaixo). */
  title: string
  /** Laços ambientes ligados (autoplay && !reduced-motion) — vira `data-stage-ambient`. */
  ambient: boolean
  /** Texto para leitor de tela: o quadro em si é `aria-hidden`. */
  description: string
  className?: string
  children: ReactNode
}

/**
 * Moldura do palco — dissecção do HTML real de attio.com (24/09/2026), não
 * screenshot/vídeo nem `transform: scale`: DOM remontado, largura FLUIDA
 * (`w-full`), com um único bloco de conteúdo cujos elementos trazem DOIS
 * conjuntos de medidas literais (mobile e `lg:`, razão 2×) — o texto fica
 * nítido em qualquer tela, ao contrário do frame de 1120×640 escalado que o
 * PO reprovou.
 *
 * Janela de navegador (medida na Attio): cantos arredondados só no TOPO, SEM
 * borda/canto inferior — a tela é cortada embaixo, como se continuasse. Barra
 * de topo com 3 pontos (não temos abas reais a fechar) e o nome da tela,
 * visível só em `lg` (a barra de 26px do mobile não cabe texto).
 */
export function StageFrame({ layout, title, ambient, description, className, children }: FrameProps) {
  return (
    <StageAmbientProvider ambient={ambient}>
      <div
        aria-hidden
        data-stage-layout={layout}
        data-stage-ambient={ambient ? 'true' : 'false'}
        className={cn(
          'relative w-full overflow-hidden rounded-t-[13px] border border-[var(--frame-stroke)] border-b-0',
          'bg-surface-900 shadow-[var(--frame-shadow)] pointer-events-none select-none',
          className,
        )}
      >
        <div
          className="h-[26px] lg:h-[34px] flex-shrink-0 flex items-center gap-1.5 px-2.5 lg:px-3.5"
          style={{ background: 'var(--frame-chrome)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          <span className="w-1.5 h-1.5 rounded-full bg-surface-600" />
          <span className="hidden lg:inline text-[10.5px] font-semibold text-surface-400 ml-1.5">Oryon · {title}</span>
          <span className="ml-auto text-[6px] lg:text-[9.5px] font-semibold text-surface-500 whitespace-nowrap">{STAGE_DEMO_LABEL}</span>
        </div>
        {/* Altura medida na Attio (460px em lg); metade no mobile — o mesmo
            fator 2× dos elementos internos, então nada dentro precisa de
            regra própria de corte. */}
        <div className="relative h-[230px] lg:h-[460px] flex overflow-hidden">
          {children}
        </div>
      </div>
      <p className="sr-only">{description}</p>
    </StageAmbientProvider>
  )
}
