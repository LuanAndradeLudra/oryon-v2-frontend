import { useEffect, useMemo, useState, useCallback } from 'react'
import { Loader2, KanbanSquare, Plus, Trash2 } from 'lucide-react'
import { pipelinesApi } from '@/services/api'
import { useKanbanDeals } from '@/hooks/useKanbanDeals'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { CreatePipelineModal } from '@/components/deals/CreatePipelineModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import type { Pipeline, Deal } from '@/types'

/** Estágios provisionados automaticamente para todo pipeline novo — mesmo
 *  conjunto do backfill do pipeline default (migration da Fase 1). Sem
 *  editor de estágios nesta v1; o admin ajusta depois via API se precisar. */
const DEFAULT_STAGES = [
  { label: 'Novo' },
  { label: 'Em negociação' },
  { label: 'Proposta enviada' },
  { label: 'Ganho', isWon: true },
  { label: 'Perdido', isLost: true },
]

export function DealsBoardPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingPipelines, setLoadingPipelines] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const fetchPipelines = useCallback((selectId?: string) => {
    return pipelinesApi
      .list()
      .then((res) => {
        const list = res.data ?? []
        setPipelines(list)
        const wanted = selectId && list.find((p) => p.id === selectId)
        const def = wanted || list.find((p) => p.isDefault) || list[0]
        setSelectedId(def?.id ?? null)
        return list
      })
      .catch(() => {
        toast('Não foi possível carregar os pipelines.', 'error')
        return []
      })
  }, [toast])

  useEffect(() => {
    let alive = true
    fetchPipelines().finally(() => alive && setLoadingPipelines(false))
    return () => { alive = false }
    // Busca só na montagem; `fetchPipelines`/`toast` são estáveis na prática
    // mas não devem ser dep (identidade nova a cada render causaria loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? null,
    [pipelines, selectedId],
  )

  const { dealsByStage, loading, moveStage } = useKanbanDeals(selectedId)

  const handleMove = (deal: Deal, toStageId: string) => {
    moveStage(deal, toStageId).catch(() => toast('Não foi possível mover o negócio.', 'error'))
  }

  const handleCreatePipeline = async (data: { name: string; color: string }) => {
    let created
    try {
      const res = await pipelinesApi.create({ name: data.name, color: data.color })
      created = res.data
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      throw new Error(typeof msg === 'string' ? msg : 'Erro ao criar pipeline.')
    }
    // Provisiona os estágios padrão — best-effort sequencial (poucos itens, ordem importa).
    for (const stage of DEFAULT_STAGES) {
      await pipelinesApi.createStage(created.id, stage).catch(() => {})
    }
    await fetchPipelines(created.id)
    toast('Pipeline criado com sucesso.', 'success')
  }

  const handleDeletePipeline = async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await pipelinesApi.remove(selectedId)
      toast('Pipeline excluído.', 'success')
      setDeleteConfirmOpen(false)
      await fetchPipelines()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Erro ao excluir pipeline.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const sortedStages = useMemo(
    () => (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.order - b.order),
    [selectedPipeline],
  )

  if (loadingPipelines) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Cabeçalho: título + seletor de pipeline + ações */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-800 min-w-0">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-5 h-5 text-brand-400" />
          <h1 className="text-sm font-semibold text-surface-100">Negócios</h1>
        </div>
        <div className="flex items-center gap-2">
          {pipelines.length > 0 && (
            <>
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="text-sm bg-surface-900 border border-surface-700 rounded-lg px-3 py-1.5 text-surface-100 focus:outline-none focus:border-brand-500"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.isDefault ? ' (padrão)' : ''}
                  </option>
                ))}
              </select>
              {selectedPipeline && !selectedPipeline.isDefault && (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  title="Excluir pipeline"
                  className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Novo pipeline
          </button>
        </div>
      </div>

      {pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
          <KanbanSquare className="w-8 h-8 text-surface-600" />
          <p className="text-sm">Nenhum pipeline de negócios configurado.</p>
        </div>
      ) : (
        <DealsBoard
          stages={sortedStages}
          dealsByStage={dealsByStage}
          onMoveStage={handleMove}
          loading={loading}
        />
      )}

      <CreatePipelineModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreatePipeline}
      />

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeletePipeline}
        title="Excluir pipeline"
        description={`Tem certeza que deseja excluir "${selectedPipeline?.name}"? Só é possível excluir pipelines sem negócios.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />
    </div>
  )
}
