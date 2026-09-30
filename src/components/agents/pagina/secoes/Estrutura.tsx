import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { secaoPorId, type SecaoId } from '../secoesDoAgente'

/**
 * A anatomia comum das seções: título (o nome da seção na navegação), uma
 * frase do que ela decide e as ações à direita. Nada de caixa de informação
 * repetindo o parágrafo — a frase basta.
 */
export function CabecalhoDaSecao({ id, acoes, children }: { id: SecaoId; acoes?: ReactNode; children?: ReactNode }) {
  const s = secaoPorId(id)
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 id="titulo-secao" className="font-display text-base font-bold tracking-[-0.01em] text-surface-50">{s.rotulo}</h2>
        <p className="mt-1 max-w-[64ch] text-sm text-surface-400">{s.descricao}</p>
        {children}
      </div>
      {acoes && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  )
}

/** Um bloco dentro da seção (ex.: "No CRM", "Skills", "Integrações HTTP"). */
export function Bloco({
  titulo, descricao, acoes, children, className, recolhivel = false, abertoInicial = true,
}: {
  titulo: string
  descricao?: ReactNode
  acoes?: ReactNode
  children: ReactNode
  className?: string
  /** Bloco secundário que começa fechado (ex.: critérios de decisão). */
  recolhivel?: boolean
  abertoInicial?: boolean
}) {
  const idTitulo = useId()
  const idCorpo = useId()
  const [aberto, setAberto] = useState(abertoInicial)
  const mostrar = !recolhivel || aberto

  return (
    <section aria-labelledby={idTitulo} className={cn('border-t border-surface-700 pt-5 first:border-t-0 first:pt-0', className)}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {recolhivel ? (
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              aria-controls={idCorpo}
              className="group inline-flex items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <h3 id={idTitulo} className="text-sm font-semibold text-surface-100">{titulo}</h3>
              <ChevronDown className={cn('h-4 w-4 text-surface-500 transition-transform', aberto && 'rotate-180')} aria-hidden />
            </button>
          ) : (
            <h3 id={idTitulo} className="text-sm font-semibold text-surface-100">{titulo}</h3>
          )}
          {descricao && <p className="mt-0.5 max-w-[64ch] text-xs leading-relaxed text-surface-400">{descricao}</p>}
        </div>
        {acoes && mostrar && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {mostrar && <div id={idCorpo}>{children}</div>}
    </section>
  )
}
