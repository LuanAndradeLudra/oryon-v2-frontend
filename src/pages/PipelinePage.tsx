// D2 (SCRUM-935) — /pipelines/:id com abas Board/Relatórios. O funil ganhou
// uma tela própria (antes vivia dentro de /contacts, atrás de um segmented
// control) para caber os relatórios (D1/934) sem espremer o board.
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, LayoutGrid, BarChart3 } from 'lucide-react'
import { pipelinesApi } from '@/services/api'
import { getDefaultPipeline, getActivePipelines, cn } from '@/lib/utils'
import { pipelineKindOf, pipelineKindOption } from '@/lib/pipelineKinds'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { PipelineBoardTab } from '@/components/deals/PipelineBoardTab'
import { PipelineReportsTab } from '@/components/deals/reports/PipelineReportsTab'
import type { Pipeline } from '@/types'

type Tab = 'board' | 'reports'

export function PipelinePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'reports' ? 'reports' : 'board'

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchPipelines = useCallback(() => {
    setLoading(true)
    setError(false)
    return pipelinesApi.list()
      .then((res) => setPipelines(res.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void fetchPipelines() }, [fetchPipelines])

  const setTab = (next: Tab) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'board') params.delete('tab')
      else params.set('tab', next)
      return params
    }, { replace: true })
  }

  if (!id) return <Navigate to="/home" replace />

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os funis.</p>
        <button onClick={fetchPipelines} className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2">
          Tentar novamente
        </button>
      </div>
    )
  }

  const pipeline = pipelines.find((p) => p.id === id)

  // Id inválido/arquivado (link antigo, funil excluído desde então) — cai
  // pro funil padrão do tenant, mesmo fallback que o antigo /contacts?pipeline=
  // já fazia. Sem nenhum funil disponível, não há pra onde cair: volta pra Home.
  if (!pipeline || pipeline.isArchived) {
    const fallback = getDefaultPipeline(pipelines)
    if (fallback) return <Navigate to={`/pipelines/${fallback.id}${tab === 'reports' ? '?tab=reports' : ''}`} replace />
    return <Navigate to="/home" replace />
  }

  const kindOption = pipelineKindOption(pipelineKindOf(pipeline))
  const KindIcon = kindOption.icon

  const header = (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-800 flex-shrink-0 flex-wrap">
      {!isMobile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
      )}
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
      <KindIcon className="w-4 h-4 text-surface-400 flex-shrink-0" aria-hidden />
      <h1 className="text-sm font-semibold text-surface-100 truncate">{pipeline.name}</h1>

      {/* Trocar de funil rápido — só quando há mais de um. */}
      {getActivePipelines(pipelines).length > 1 && (
        <select
          value={pipeline.id}
          onChange={(e) => navigate(`/pipelines/${e.target.value}${tab === 'reports' ? '?tab=reports' : ''}`)}
          aria-label="Trocar de funil"
          className="text-xs px-2 py-1 rounded-lg bg-surface-900 border border-surface-800 text-surface-300 focus:outline-none focus:border-brand-500"
        >
          {getActivePipelines(pipelines).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1 bg-surface-900 border border-surface-800 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setTab('board')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'board' ? 'bg-surface-700 text-surface-100 shadow-sm' : 'text-surface-400 hover:text-surface-200',
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Board
        </button>
        <button
          type="button"
          onClick={() => setTab('reports')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'reports' ? 'bg-surface-700 text-surface-100 shadow-sm' : 'text-surface-400 hover:text-surface-200',
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Relatórios
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {isMobile && <MobilePageHeader title={pipeline.name} />}
      {header}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'board' ? (
          <PipelineBoardTab pipeline={pipeline} pipelines={pipelines} onDealsChanged={fetchPipelines} />
        ) : (
          <PipelineReportsTab pipeline={pipeline} />
        )}
      </div>
    </div>
  )
}
