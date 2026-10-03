import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { HeroCapitulo, HeroCapituloId } from './heroStory'

/**
 * A LINHA DE CAPÍTULOS — o índice da demonstração, numa linha só.
 *
 * Substitui a caixa de legenda acima do palco (que tirava ~110 px das telas):
 * quatro nomes de capítulo em texto pequeno, o atual aceso com uma barra fina
 * enchendo no ritmo da cena. Clicar pula para o capítulo. O que acontece em
 * cada momento é dito pelas ANOTAÇÕES dentro do palco, presas à ação.
 */
export function HeroCapitulosLinha({
  capitulos, ativo, duracoes, rodando, chaveProgresso, onIr, className,
}: {
  capitulos: readonly HeroCapitulo[]
  ativo: HeroCapituloId
  duracoes: Record<HeroCapituloId, number>
  rodando: boolean
  chaveProgresso: string | number
  onIr: (c: HeroCapitulo) => void
  className?: string
}) {
  const semMovimento = useReducedMotion()
  const iAtivo = capitulos.findIndex((c) => c.id === ativo)

  return (
    <nav aria-label="Capítulos da demonstração" className={cn('flex justify-center', className)}>
      <style>{'@keyframes hero-linha-progresso{from{transform:scaleX(0)}to{transform:scaleX(1)}}'}</style>
      <ol className="grid w-full grid-cols-2 gap-x-3 gap-y-2.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-1">
        {capitulos.map((c, i) => {
          const eAtivo = i === iAtivo
          return (
            <li key={c.id} className="flex min-w-0 items-center">
              {i > 0 && <span aria-hidden className="mx-2 hidden h-3 w-px bg-surface-700 sm:block" />}
              <button
                type="button"
                onClick={() => onIr(c)}
                aria-current={eAtivo ? 'step' : undefined}
                title={c.valor}
                className={cn(
                  'relative rounded-md px-1.5 py-1 text-left text-[12px] font-medium leading-tight tracking-[-0.005em] transition-colors duration-300 sm:text-[12.5px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)]',
                  eAtivo ? 'text-surface-50' : 'text-surface-500 hover:text-surface-300',
                )}
              >
                <span className={cn('mr-1.5 tabular-nums text-[11px]', eAtivo ? 'text-[var(--landing-destaque)]' : 'text-surface-500')}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {c.titulo}
                {eAtivo && (
                  <span aria-hidden className="absolute inset-x-1.5 -bottom-[3px] h-[2px] overflow-hidden rounded-full bg-surface-700">
                    <span
                      key={`${c.id}-${chaveProgresso}`}
                      className="absolute inset-0 bg-brand-400"
                      style={semMovimento ? undefined : {
                        transformOrigin: 'left',
                        animation: `hero-linha-progresso ${duracoes[c.id]}ms linear forwards`,
                        animationPlayState: rodando ? 'running' : 'paused',
                      }}
                    />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
