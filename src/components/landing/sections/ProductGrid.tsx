import { StagePoster } from '@/components/landing/stage'
import { cn } from '@/lib/utils'
import { productGrid, LANDING_ANCHORS } from '../landingCopy'

/**
 * Uma SEÇÃO por capacidade (Conversas com Agente IA · Funis · Disparos), cada
 * uma com o produto operando ao lado do texto — modelo medido no HTML da
 * Attio (24/09): elas não fazem grid de ícone+texto para o recurso principal,
 * dedicam a página inteira a ele. O lado do texto alterna a cada capacidade.
 * Leads e Relatórios não têm cena própria no palco (P14: nada de poster
 * fingido) — ficam numa lista compacta de 2 linhas, sem card, ao final.
 *
 * Corte de altura (medido: "produto" foi de 889 pra 1536 nas 3 seções — a
 * maior fatia da página): o quadro tinha `minmax(0,7fr)` — cresce com o
 * CONTÊINER, então cada seção ficava tão alta quanto a página é larga. Agora
 * o quadro tem largura FIXA (560px) e o texto ocupa o resto; a altura da
 * seção passa a depender só da altura do quadro nessa largura, não da tela.
 */
export function ProductGrid() {
  return (
    <section
      id={LANDING_ANCHORS.produto}
      data-section="produto"
      className="scroll-mt-16 border-t border-surface-700 bg-surface-950 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h2 className="max-w-[24ch] font-display font-extrabold tracking-[-0.02em] leading-[1.1] text-surface-50 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {productGrid.title}
        </h2>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-surface-400">{productGrid.lead}</p>

        <div className="mt-10 flex flex-col gap-10 sm:gap-12">
          {productGrid.capabilities.map((cap, i) => (
            <div
              key={cap.key}
              className={cn(
                'grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-10',
                // alterna o lado do texto: par = texto à esquerda, ímpar = à direita
                i % 2 === 1 && 'lg:[&>:first-child]:order-2',
              )}
            >
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold tracking-[-0.01em] text-surface-50">{cap.title}</h3>
                <p className="mt-2.5 max-w-[46ch] text-sm sm:text-base leading-relaxed text-surface-400">{cap.text}</p>
              </div>
              <div role="img" aria-label={cap.posterLabel} className="reveal w-full lg:w-[560px]" style={{ ['--d' as string]: '90ms' }}>
                <StagePoster scene={cap.scene} frame={cap.frame} />
              </div>
            </div>
          ))}
        </div>

        <ul className="mt-10 sm:mt-12 divide-y divide-surface-700 border-y border-surface-700">
          {productGrid.compact.map((item) => (
            <li key={item.key} className="grid gap-x-6 gap-y-0.5 py-3.5 md:grid-cols-[220px_minmax(0,1fr)] md:items-baseline">
              <h3 className="font-display text-[15px] font-bold tracking-[-0.01em] text-surface-50">{item.title}</h3>
              <p className="text-sm leading-relaxed text-surface-400">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
