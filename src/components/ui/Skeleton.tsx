import { cn } from '@/lib/utils'

/**
 * Skeleton loaders — placeholders com pulse para carregamento de conteúdo.
 * Preferir sempre a spinners quando a forma do conteúdo é conhecida:
 * comunicam O QUE está carregando e reduzem layout shift.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-800', className)} aria-hidden="true" />
}

/** Bloco de texto — N linhas com larguras variadas. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4']
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={cn('h-3.5 animate-pulse rounded bg-surface-800', widths[i % widths.length])} />
      ))}
    </div>
  )
}

/** Card padrão — título + linhas de conteúdo. */
export function SkeletonCard({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('bg-surface-900 border border-surface-800 rounded-xl p-5', className)} aria-hidden="true">
      <div className="h-4 w-1/3 animate-pulse rounded bg-surface-800 mb-4" />
      <SkeletonText lines={lines} />
    </div>
  )
}

/** Linhas de tabela — respeita o nº de colunas para não "pular" no load real. */
export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 animate-pulse rounded-full bg-surface-800 flex-shrink-0" />
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={c}
              className={cn('h-3.5 animate-pulse rounded bg-surface-800', c === 0 ? 'w-1/4' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Lista de itens (ex.: conversas, contatos) — avatar + duas linhas. */
export function SkeletonList({ items = 6, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('space-y-1', className)} aria-hidden="true">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="w-9 h-9 animate-pulse rounded-full bg-surface-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-800" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-800/70" />
          </div>
        </div>
      ))}
    </div>
  )
}
