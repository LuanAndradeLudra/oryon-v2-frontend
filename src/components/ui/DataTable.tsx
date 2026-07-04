// ─── Data Table ──────────────────────────────────────────────────────────────
// Tabela genérica tipada com o visual canônico do app: sticky header, sort,
// seleção múltipla, skeleton de loading, empty/error states e hover row.
// Substitui as tabelas artesanais divergentes (contatos, campanhas, audit,
// admin) — cada uma redefinia padding/borda/hover à sua maneira.

import { useCallback, type ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonTable } from './Skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

export interface DataTableColumn<Row> {
  key: string
  header: ReactNode
  render: (row: Row) => ReactNode
  align?: 'left' | 'right' | 'center'
  /** Classe de largura opcional (ex.: 'w-40'). */
  widthClass?: string
  sortable?: boolean
  /** Esconde a coluna abaixo de um breakpoint (classe ex.: 'hidden lg:table-cell'). */
  responsiveClass?: string
}

export interface DataTableSort {
  key: string
  dir: 'asc' | 'desc'
}

interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  /** Empty state — ícone + título (+ dica) quando rows está vazio. */
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyHint?: string
  sort?: DataTableSort | null
  onSortChange?: (sort: DataTableSort) => void
  onRowClick?: (row: Row) => void
  /** Menu de contexto por linha (integrar com useContextMenu no caller). */
  onRowContextMenu?: (row: Row, e: React.MouseEvent) => void
  /** Seleção múltipla opcional. */
  selectedKeys?: Set<string>
  onToggleSelect?: (key: string) => void
  onToggleSelectAll?: () => void
  /** Linha destacada (ex.: item ativo). */
  activeKey?: string | null
  className?: string
  /** Densidade: default (py-2.5) ou compact (py-1.5). */
  dense?: boolean
}

export function DataTable<Row>({
  columns, rows, rowKey,
  loading, error, onRetry,
  emptyIcon, emptyTitle = 'Nada por aqui', emptyHint,
  sort, onSortChange,
  onRowClick, onRowContextMenu,
  selectedKeys, onToggleSelect, onToggleSelectAll,
  activeKey, className, dense,
}: DataTableProps<Row>) {
  const selectable = !!(selectedKeys && onToggleSelect)
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedKeys.has(rowKey(r)))

  const handleSort = useCallback((col: DataTableColumn<Row>) => {
    if (!col.sortable || !onSortChange) return
    const dir: 'asc' | 'desc' = sort?.key === col.key && sort.dir === 'desc' ? 'asc' : 'desc'
    onSortChange({ key: col.key, dir })
  }, [sort, onSortChange])

  if (loading) return <SkeletonTable rows={6} cols={Math.min(columns.length, 5)} className={className} />
  if (error) return <ErrorState onRetry={onRetry} className={className} />
  if (!rows.length && emptyIcon) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} className={className} />
  }

  const alignClass = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={cn('overflow-x-auto overflow-y-auto', className)}>
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-surface-900">
          <tr className="border-b border-surface-800">
            {selectable && (
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="accent-brand-500 cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2.5 text-[11px] font-medium text-surface-500 uppercase tracking-wide whitespace-nowrap',
                  alignClass(col.align),
                  col.widthClass,
                  col.responsiveClass,
                  col.sortable && 'cursor-pointer select-none hover:text-surface-300 transition-colors',
                )}
                onClick={() => handleSort(col)}
                aria-sort={sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sort?.key === col.key && (
                    sort.dir === 'asc'
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row)
            const selected = selectable && selectedKeys.has(key)
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onContextMenu={onRowContextMenu ? (e) => onRowContextMenu(row, e) : undefined}
                className={cn(
                  'border-b border-surface-800/60 transition-colors',
                  onRowClick && 'cursor-pointer',
                  activeKey === key
                    ? 'bg-brand-500/5'
                    : selected
                      ? 'bg-surface-800/60'
                      : 'hover:bg-surface-800/40',
                )}
              >
                {selectable && (
                  <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Selecionar linha"
                      checked={selected}
                      onChange={() => onToggleSelect(key)}
                      className="accent-brand-500 cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 text-surface-300',
                      dense ? 'py-1.5' : 'py-2.5',
                      alignClass(col.align),
                      col.responsiveClass,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
