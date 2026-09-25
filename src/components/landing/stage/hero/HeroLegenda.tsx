import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { HeroCapitulo, HeroCapituloId } from './heroStory'

/**
 * A LEGENDA — o que está acontecendo, dito como no cinema.
 *
 * Pedido do PO (24/09): o visitante precisa entender cada cena e o valor que
 * ela entrega, com algo "mais cinematográfico" que uma grade de capítulos
 * embaixo do palco. A resposta é uma legenda de filme:
 *
 *  • uma caixa TRANSLÚCIDA no topo do palco, logo acima das telas, no lugar
 *    que era dos botões do Hero (decisão do PO, 24/09) — aparece já na
 *    primeira dobra, como o título de cena de um filme;
 *  • em cima, o capítulo ("02 · Atendimento com IA") e a trilha: quatro
 *    segmentos, o ativo enchendo no ritmo da cena (e parando junto com ela).
 *    Cada segmento é clicável e pula a demonstração para o capítulo;
 *  • no meio, a NARRAÇÃO do momento em corpo grande, entrando palavra por
 *    palavra do desfoque para o nítido — o texto "revela" junto com a tela;
 *  • embaixo, o VALOR do capítulo, em uma frase.
 *
 * O cartão tem largura fixa e altura estável (a narração troca por cima de
 * um espaço reservado): nada nele empurra o palco ou "pula" de tamanho.
 */
export function HeroLegenda({
  capitulos, ativo, batida, duracoes, rodando, chaveProgresso, onIr, compacta = false, className,
}: {
  capitulos: readonly HeroCapitulo[]
  ativo: HeroCapituloId
  batida: string
  duracoes: Record<HeroCapituloId, number>
  rodando: boolean
  chaveProgresso: string | number
  onIr: (c: HeroCapitulo) => void
  /** Celular: sem sobrepor a âncora, fonte menor. */
  compacta?: boolean
  className?: string
}) {
  const semMovimento = useReducedMotion()
  const i = Math.max(0, capitulos.findIndex((c) => c.id === ativo))
  const cap = capitulos[i]
  const palavras = batida.split(' ')

  return (
    <div
      className={cn(
        // Caixa TRANSLÚCIDA (pedido do PO): vidro fosco sobre a atmosfera do
        // palco — diferente das molduras das telas, que são opacas.
        'hero-legenda relative rounded-[20px] backdrop-blur-xl backdrop-saturate-150',
        'bg-white/[.045] ring-1 ring-white/[.10] [[data-theme=light]_&]:bg-white/[.55] [[data-theme=light]_&]:ring-black/[.07]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_20px_50px_-24px_rgba(0,0,0,.6)]',
        '[[data-theme=light]_&]:shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_10px_30px_-12px_rgba(11,13,24,.12)]',
        compacta ? 'px-4 pt-3.5 pb-4' : 'px-6 pt-4 pb-5',
        className,
      )}
    >
      <style>{'@keyframes hero-legenda-progresso{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>

      {/* ── Capítulo + trilha ── */}
      <div className="flex items-center gap-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={cap.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: semMovimento ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn('flex-shrink-0 font-semibold uppercase tracking-[.14em] text-brand-400', compacta ? 'text-[10.5px]' : 'text-[11.5px]')}
          >
            {String(i + 1).padStart(2, '0')} · {cap.titulo}
          </motion.p>
        </AnimatePresence>
        <nav aria-label="Capítulos da demonstração" className="ml-auto flex flex-1 max-w-[260px] items-center gap-1.5">
          {capitulos.map((c, j) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onIr(c)}
              aria-label={`Ir para: ${c.titulo}`}
              aria-current={j === i ? 'step' : undefined}
              className="group relative flex-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)] rounded-full"
            >
              <span className="relative block h-[3px] overflow-hidden rounded-full bg-surface-700 transition-colors group-hover:bg-surface-600">
                {j < i && <span className="absolute inset-0 bg-brand-400/80" />}
                {j === i && (
                  <span
                    key={`${c.id}-${chaveProgresso}`}
                    className="absolute inset-0 bg-brand-400"
                    style={semMovimento
                      ? undefined
                      : {
                          transformOrigin: 'left',
                          animation: `hero-legenda-progresso ${duracoes[c.id]}ms linear forwards`,
                          animationPlayState: rodando ? 'running' : 'paused',
                        }}
                  />
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Narração: palavra por palavra, do desfoque para o nítido ── */}
      <div className={cn('relative mt-2', compacta ? 'min-h-[46px]' : 'min-h-[34px]')}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={batida}
            className={cn(
              'font-display font-semibold tracking-[-0.015em] text-surface-50 text-balance',
              compacta ? 'text-[17px] leading-[1.3]' : 'text-[23px] leading-[1.35]',
            )}
            initial="oculto"
            animate="visivel"
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: semMovimento ? 0 : 0.28, ease: 'easeIn' } }}
            variants={{ visivel: { transition: { staggerChildren: semMovimento ? 0 : 0.045 } } }}
            aria-live="polite"
          >
            {palavras.map((p, k) => (
              <span key={k}>
                <motion.span
                  className="inline-block"
                  variants={{
                    oculto: { opacity: 0, y: 10, filter: 'blur(8px)' },
                    visivel: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: semMovimento ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  {p}
                </motion.span>
                {k < palavras.length - 1 ? ' ' : ''}
              </span>
            ))}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── O valor do capítulo ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={cap.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: semMovimento ? 0 : 0.4 }}
          className={cn('mt-1.5 text-surface-400 leading-snug', compacta ? 'text-[12.5px]' : 'text-[14px]')}
        >
          {cap.valor}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
