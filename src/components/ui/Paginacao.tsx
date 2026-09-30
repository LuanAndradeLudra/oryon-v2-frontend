import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Rodapé de paginação para listas dentro de cartões: "21–40 de 56" e os dois
// botões. Some quando há uma página só — não ocupa espaço à toa.

interface Props {
  pagina: number
  paginas: number
  de: number
  ate: number
  total: number
  onPagina: (p: number) => void
  /** Nome do que se conta, para leitores de tela ("conversas", "pessoas"). */
  rotulo: string
  className?: string
}

const BOTAO = 'w-7 h-7 inline-flex items-center justify-center rounded-sm border border-[var(--bd2)] text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors disabled:opacity-40 disabled:pointer-events-none'

export function Paginacao({ pagina, paginas, de, ate, total, onPagina, rotulo, className }: Props) {
  if (paginas <= 1) return null
  return (
    <nav
      aria-label={`Páginas de ${rotulo}`}
      className={cn('flex items-center gap-2 h-10 px-3.5 border-t border-surface-700', className)}
    >
      <span className="text-[11.5px] text-surface-400 tabular-nums" aria-live="polite">
        {de}–{ate} de {total}
      </span>
      <span className="ml-auto text-[11.5px] text-surface-500 tabular-nums">{pagina}/{paginas}</span>
      <button type="button" className={BOTAO} onClick={() => onPagina(pagina - 1)} disabled={pagina <= 1} aria-label="Página anterior">
        <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button type="button" className={BOTAO} onClick={() => onPagina(pagina + 1)} disabled={pagina >= paginas} aria-label="Próxima página">
        <ChevronRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </nav>
  )
}
