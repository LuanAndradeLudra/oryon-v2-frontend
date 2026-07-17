import { useState, useEffect, useCallback, useMemo } from 'react'
import { dealsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import type { ContactFilters, Deal } from '@/types'

type BoardFilters = Pick<ContactFilters, 'search' | 'intent' | 'sentiment' | 'source' | 'tagId' | 'optIn'>

/**
 * Board de negócios de UM pipeline. Diferente de useKanbanContacts (paginado por
 * coluna), aqui buscamos todos os deals do pipeline de uma vez e agrupamos por
 * `stageId` — um board de negócios tem volume gerenciável por pipeline. Mutação
 * (arrastar card entre estágios) é otimista com rollback e usa o endpoint que
 * deriva o status no backend.
 *
 * `filters` — mesmo card de filtros da tabela de Contatos (busca/fonte/etiqueta/
 * intenção/sentimento/opt-in) — passa a valer para o board também, não só a tabela.
 */
export function useKanbanDeals(pipelineId: string | null, filters: BoardFilters = {}) {
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Serializado p/ dependência estável — `filters` é um objeto novo a cada
  // render de ContactsPage; sem isto o efeito refetch-aria em loop.
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])

  const load = useCallback(async () => {
    if (!pipelineId) {
      setDealsByStage({})
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await dealsApi.board(pipelineId, filters)
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
    // filtersKey (não `filters`) é a dependência estável — o objeto em si
    // muda de identidade a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId, filtersKey])

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

  /** Move um deal ABERTO pra OUTRO pipeline (SCRUM-293) — diferente de
   *  moveStage, não há "coluna de destino" local pra onde mover
   *  otimisticamente: o card só sai deste board depois que o servidor
   *  confirma (o board de destino é outro componente/room, atualizado via o
   *  próprio socket `deal:changed` que o backend agora emite pros dois
   *  pipelines). Erros propagam pro chamador tostar. */
  const movePipeline = useCallback(async (deal: Deal, toPipelineId: string) => {
    await dealsApi.movePipeline(deal.id, toPipelineId)
    setDealsByStage((prev) => {
      const next = { ...prev }
      next[deal.stageId] = (next[deal.stageId] ?? []).filter((d) => d.id !== deal.id)
      return next
    })
  }, [])

  return { dealsByStage, loading, error, moveStage, movePipeline, refetch: load }
}
