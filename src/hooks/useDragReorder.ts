import { useRef, useState } from 'react'

/**
 * Mecânica de drag-and-drop para reordenar uma lista (drag handle por item,
 * highlight do item sobrevoado, computa a nova ordem no drop). Compartilhada
 * entre StagesManager (estágios do contato) e PipelineStagesManager (estágios
 * de funil) — antes cada um reimplementava esta lógica separadamente, então
 * um fix num (ex.: guard contra drop sem-op) não se propagava pro outro.
 *
 * O que persistir (API + estado otimista) fica a cargo de `onReorder`, que
 * recebe a lista já reordenada (sem `order` recalculado — quem chama decide
 * o formato final).
 */
export function useDragReorder<T>(items: T[], onReorder: (reordered: T[]) => void | Promise<void>) {
  const dragIdx = useRef<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }

  const handleDragEnd = () => {
    dragIdx.current = null
    setOverIdx(null)
  }

  const handleDrop = async (targetIdx: number) => {
    const fromIdx = dragIdx.current
    dragIdx.current = null
    setOverIdx(null)
    if (fromIdx === null || fromIdx === targetIdx) return

    const reordered = [...items]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    await onReorder(reordered)
  }

  return { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}
