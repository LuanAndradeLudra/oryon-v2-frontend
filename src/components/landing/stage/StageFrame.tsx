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
  /**
   * Altura do conteúdo (abaixo do chrome). Default = a régua das cenas de
   * board (Conversas/Funis/Disparos: 230/460px). O Hero (STORYBOARD-HERO.md)
   * usa a própria — mudar a câmera do Hero NÃO pode alterar `StagePoster`
   * (login, seções), e vice-versa: dois contratos de tamanho, uma moldura só.
   */
  contentHeightClassName?: string
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
export function StageFrame({ layout, title, ambient, description, className, contentHeightClassName = 'h-[230px] lg:h-[460px]', children }: FrameProps) {
  return (
    <StageAmbientProvider ambient={ambient}>
      <div
        aria-hidden
        /**
         * `inert`, não só `aria-hidden` + `pointer-events-none`.
         *
         * Medido em 24/09: o palco tinha **43 elementos focáveis** por dentro
         * (botões da barra de filtros, o campo de mensagem, os cards do
         * quadro). Quem navega por teclado caía em 43 paradas mortas no meio
         * da landing — e `aria-hidden` sobre conteúdo focável é, ele mesmo,
         * uma violação de ARIA. `inert` tira tudo da ordem de tabulação e da
         * árvore de acessibilidade de uma vez; a descrição em `sr-only` logo
         * abaixo continua sendo o que o leitor de tela recebe.
         */
        inert
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
          {/* `surface-400`, não `500`: medido em 24/09 no tema escuro, o selo
              ficava em 4,45:1 — 0,05 abaixo de AA. E 9px no celular, não 6px:
              medido em 390px, 6px é ilegível. É a divulgação de P14 ("nada
              falso na tela"); tem de ser legível, não decorativa. */}
          <span className="ml-auto text-[9px] lg:text-[9.5px] font-semibold text-surface-400 whitespace-nowrap">{STAGE_DEMO_LABEL}</span>
        </div>
        <div className={cn('relative flex h-full overflow-hidden', contentHeightClassName)}>
          {children}
        </div>
      </div>
      <p className="sr-only">{description}</p>
    </StageAmbientProvider>
  )
}
