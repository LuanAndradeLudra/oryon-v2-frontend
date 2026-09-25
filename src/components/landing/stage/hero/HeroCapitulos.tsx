import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { HeroCapitulo, HeroCapituloId } from './heroStory'

/**
 * OS CAPÍTULOS — a legenda da demonstração, embaixo do palco.
 *
 * Pedido do PO (24/09): o visitante precisa entender o que está acontecendo e
 * o valor de cada exibição. A legenda NÃO fica em cima do palco (lá ela
 * competiria com o H1 — erro de uma rodada anterior); fica embaixo, como uma
 * trilha de capítulos (padrão de heros de produto como Stripe e Linear):
 *
 *  • quatro capítulos lado a lado, cada um com título e o VALOR em uma frase;
 *  • o ativo acende, uma barra fina enche no ritmo do capítulo (e para junto
 *    com a demonstração quando ela pausa) e uma linha NARRA o momento — o que
 *    acabou de acontecer na tela ("O Agente IA responde na hora…");
 *  • clicar num capítulo pula a demonstração para ele.
 *
 * No celular, só o capítulo ativo aparece, com a trilha segmentada em cima.
 */
export function HeroCapitulos({
  capitulos, ativo, batida, duracoes, rodando, chaveProgresso, onIr, className,
}: {
  capitulos: readonly HeroCapitulo[]
  ativo: HeroCapituloId
  batida: string
  /** Duração de cada capítulo, em ms — o tempo da barra encher. */
  duracoes: Record<HeroCapituloId, number>
  /** A barra só anda com a demonstração andando. */
  rodando: boolean
  /** Muda quando o capítulo (re)começa — reinicia a barra. */
  chaveProgresso: string | number
  onIr: (c: HeroCapitulo) => void
  className?: string
}) {
  const semMovimento = useReducedMotion()
  const iAtivo = capitulos.findIndex((c) => c.id === ativo)

  const barra = (i: number, id: HeroCapituloId) => (
    <span aria-hidden className="relative block h-[2px] w-full overflow-hidden rounded-full bg-surface-700/70">
      {i < iAtivo && <span className="absolute inset-0 bg-brand-400/70" />}
      {i === iAtivo && (
        <span
          key={`${id}-${chaveProgresso}`}
          className="absolute inset-y-0 left-0 bg-brand-400"
          style={semMovimento
            ? { width: '100%' }
            : {
                width: '100%',
                transformOrigin: 'left',
                animation: `hero-capitulo-progresso ${duracoes[id]}ms linear forwards`,
                animationPlayState: rodando ? 'running' : 'paused',
              }}
        />
      )}
    </span>
  )

  const narracao = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={batida}
        initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
        transition={{ duration: semMovimento ? 0 : 0.32, ease: [0.22, 0.8, 0.2, 1] }}
        className="mt-2.5 flex items-start gap-2 text-[13px] font-medium leading-snug text-surface-100"
      >
        <span aria-hidden className="relative mt-[5px] flex h-2 w-2 flex-shrink-0">
          {!semMovimento && <span className="absolute inset-0 rounded-full bg-brand-400/60 animate-ping" />}
          <span className="relative h-2 w-2 rounded-full bg-brand-400" />
        </span>
        {batida}
      </motion.p>
    </AnimatePresence>
  )

  return (
    <nav aria-label="Capítulos da demonstração" className={cn('relative', className)}>
      <style>{'@keyframes hero-capitulo-progresso{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>

      {/* ── Celular: só o ativo, com a trilha segmentada ── */}
      <div className="sm:hidden">
        <div className="flex gap-1.5">{capitulos.map((c, i) => <span key={c.id} className="flex-1">{barra(i, c.id)}</span>)}</div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.12em] text-brand-400">
          {String(iAtivo + 1).padStart(2, '0')} · {capitulos[iAtivo]?.titulo}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-surface-400">{capitulos[iAtivo]?.valor}</p>
        {narracao}
      </div>

      {/* ── Desktop: os quatro lado a lado ── */}
      <ol className="hidden sm:grid grid-cols-4 gap-5">
        {capitulos.map((c, i) => {
          const eAtivo = i === iAtivo
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onIr(c)}
                aria-current={eAtivo ? 'step' : undefined}
                className={cn(
                  'group w-full text-left rounded-lg pt-0 pb-1 transition-opacity duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)] focus-visible:ring-offset-4 focus-visible:ring-offset-surface-950',
                  eAtivo ? 'opacity-100' : 'opacity-60 hover:opacity-90',
                )}
              >
                {barra(i, c.id)}
                <span className="mt-3 flex items-baseline gap-2">
                  <span className={cn('text-[11px] font-semibold tabular-nums tracking-[.08em]', eAtivo ? 'text-brand-400' : 'text-surface-500')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={cn('text-[14.5px] font-display font-semibold tracking-[-0.01em]', eAtivo ? 'text-surface-50' : 'text-surface-300')}>
                    {c.titulo}
                  </span>
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-surface-400">{c.valor}</span>
              </button>
              {eAtivo && narracao}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
