import { useCallback } from 'react'
import { useContextMenuCtx, type ContextMenuEntry } from '@/components/ui/ContextMenu'

type ItemsBuilder = (e: React.MouseEvent) => ContextMenuEntry[]

export function useContextMenu(buildItems: ItemsBuilder) {
  const { open } = useContextMenuCtx()

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Respect opt-out for elements that want the browser's native menu.
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-allow-browser-menu]')) return

      e.preventDefault()
      e.stopPropagation()
      const items = buildItems(e)
      if (items.length > 0) {
        open(e.clientX, e.clientY, items)
      }
    },
    [buildItems, open],
  )

  return { onContextMenu }
}
