// D2 (SCRUM-935) — destino da entrada "Funis" da navegação: ela não sabe de
// antemão qual funil abrir, então este redirector busca a lista e cai no
// funil padrão do tenant. Mantém a entrada de nav estática (1 clique) sem
// precisar pré-carregar pipelines no NavSidebar/BottomTabBar/MorePage.
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { pipelinesApi } from '@/services/api'
import { getDefaultPipeline } from '@/lib/utils'
import type { Pipeline } from '@/types'

export function PipelinesIndexPage() {
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    pipelinesApi.list()
      .then((res) => { if (alive) setPipelines(res.data ?? []) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os funis.</p>
      </div>
    )
  }

  if (pipelines === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const target = getDefaultPipeline(pipelines)
  return <Navigate to={target ? `/pipelines/${target.id}` : '/contacts'} replace />
}
