import { useEffect, useMemo, useState } from 'react'
import { Loader2, KanbanSquare } from 'lucide-react'
import { pipelinesApi } from '@/services/api'
import { useKanbanDeals } from '@/hooks/useKanbanDeals'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { useToast } from '@/hooks/useToast'
import type { Pipeline, Deal } from '@/types'

export function DealsBoardPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadingPipelines, setLoadingPipelines] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let alive = true
    pipelinesApi
      .list()
      .then((res) => {
        if (!alive) return
        const list = res.data ?? []
        setPipelines(list)
        // Seleciona o pipeline padrão (ou o primeiro).
        const def = list.find((p) => p.isDefault) ?? list[0]
        setSelectedId(def?.id ?? null)
      })
      .catch(() => toast.error('Não foi possível carregar os pipelines.'))
      .finally(() => alive && setLoadingPipelines(false))
    return () => { alive = false }
    // Busca só na montagem; `toast` é estável na prática mas não deve ser dep
    // (identidade nova a cada render causaria loop de fetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? null,
    [pipelines, selectedId],
  )

  const { dealsByStage, loading, moveStage } = useKanbanDeals(selectedId)

  const handleMove = (deal: Deal, toStageId: string) => {
    moveStage(deal, toStageId).catch(() => toast.error('Não foi possível mover o negócio.'))
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

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <KanbanSquare className="w-8 h-8 text-surface-600" />
        <p className="text-sm">Nenhum pipeline de negócios configurado.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho: título + seletor de pipeline */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-5 h-5 text-brand-400" />
          <h1 className="text-sm font-semibold text-surface-100">Negócios</h1>
        </div>
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
      </div>

      <DealsBoard
        stages={sortedStages}
        dealsByStage={dealsByStage}
        onMoveStage={handleMove}
        loading={loading}
      />
    </div>
  )
}
