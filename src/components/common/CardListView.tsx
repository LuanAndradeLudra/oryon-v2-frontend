import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardListViewProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderCard: (item: T) => ReactNode
  isLoading?: boolean
  emptyState?: ReactNode
  className?: string
  /** Extra classes applied to each <li>. Default empty. */
  itemClassName?: string
}

export function CardListView<T>({
  items,
  getKey,
  renderCard,
  isLoading,
  emptyState,
  className,
  itemClassName,
}: CardListViewProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10" role="status" aria-label="Carregando">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <>
        {emptyState ?? (
          <div className="text-center py-10 text-surface-500 text-sm">Nenhum item</div>
        )}
      </>
    )
  }

  return (
    <ul className={cn('flex flex-col gap-2 p-3', className)}>
      {items.map((item) => (
        <li key={getKey(item)} className={itemClassName}>
          {renderCard(item)}
        </li>
      ))}
    </ul>
  )
}
