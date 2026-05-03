import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

export interface TableSelection<T> {
  selectedIds: Set<string>
  selectedItems: T[]
  count: number
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>
}

export function useTableSelection<T>(items: T[], getId: (item: T) => string): TableSelection<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId],
  )

  return {
    selectedIds,
    selectedItems,
    count: selectedIds.size,
    isSelected,
    toggle,
    selectAll,
    clear,
    setSelectedIds,
  }
}
