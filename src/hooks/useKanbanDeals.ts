import { useState, useEffect, useCallback } from 'react'
import { dealsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import type { Deal } from '@/types'

/**
 * Board de negócios de UM pipeline. Diferente de useKanbanContacts (paginado por
 * coluna), aqui buscamos todos os deals do pipeline de uma vez e agrupamos por
 * `stageId` — um board de negócios tem volume gerenciável por pipeline. Mutação
 * (arrastar card entre estágios) é otimista com rollback e usa o endpoint que
 * deriva o status no backend.
 */
export function useKanbanDeals(pipelineId: string | null) {
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!pipelineId) {
      setDealsByStage({})
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await dealsApi.board(pipelineId)
      const grouped: Record<string, Deal[]> = {}
      for (const d of res.data) {
        ;(grouped[d.stageId] ??= []).push(d)
      }
      setDealsByStage(grouped)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [pipelineId])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime: qualquer mudança de negócio no tenant recarrega o board (mesmo
  // padrão de deal:changed usado no Kanban de contatos e na ficha do contato).
  useEffect(() => {
    if (!pipelineId) return
    const socket = connectSocket()
    const onChanged = () => void load()
    socket.on('deal:changed', onChanged)
    return () => {
      socket.off('deal:changed', onChanged)
    }
  }, [pipelineId, load])

  /** Move um deal para outro estágio, otimista, com rollback em erro. */
  const moveStage = useCallback(async (deal: Deal, toStageId: string) => {
    if (deal.stageId === toStageId) return
    const fromStageId = deal.stageId

    setDealsByStage((prev) => {
      const next = { ...prev }
      next[fromStageId] = (next[fromStageId] ?? []).filter((d) => d.id !== deal.id)
      next[toStageId] = [{ ...deal, stageId: toStageId }, ...(next[toStageId] ?? [])]
      return next
    })

    try {
      const res = await dealsApi.moveStage(deal.id, toStageId)
      // Reconcilia com o servidor (status/closedAt podem ter mudado ao entrar
      // num estágio terminal).
      setDealsByStage((prev) => {
        const next = { ...prev }
        next[toStageId] = (next[toStageId] ?? []).map((d) => (d.id === deal.id ? res.data : d))
        return next
      })
    } catch (err) {
      // Rollback: devolve o card ao estágio de origem.
      setDealsByStage((prev) => {
        const next = { ...prev }
        next[toStageId] = (next[toStageId] ?? []).filter((d) => d.id !== deal.id)
        next[fromStageId] = [deal, ...(next[fromStageId] ?? [])]
        return next
      })
      throw err
    }
  }, [])

  return { dealsByStage, loading, error, moveStage, refetch: load }
}
