import { useState, useEffect, useCallback } from 'react'
import { pipelinesApi } from '@/services/api'
import { PipelineStagesManager } from './PipelineStagesManager'
import type { Pipeline } from '@/types'

/** Wrapper de Configurações pra `PipelineStagesManager` — a mesma gestão de
 *  estágios de funil que já existia (só) dentro do drawer "Configurar" da
 *  página de Contatos ganha aqui uma segunda entrada, em Configurações →
 *  CRM, junto do Roteamento por Canal (os dois mexem no mesmo eixo: funil de
 *  negócio). `PipelineStagesManager` exige `pipelines`/`onChanged` como
 *  props — como toda seção de Configurações renderiza sem props, este
 *  wrapper busca a lista sozinho, no mesmo padrão do `PipelineRoutingSettings`. */
export function PipelineStagesSettings() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPipelines = useCallback(() => {
    return pipelinesApi.list()
      .then((res) => setPipelines(res.data ?? []))
      .catch(() => setPipelines([]))
  }, [])

  useEffect(() => {
    fetchPipelines().finally(() => setLoading(false))
  }, [fetchPipelines])

  if (loading) {
    return <p className="text-sm text-surface-500 text-center py-10">Carregando…</p>
  }

  return <PipelineStagesManager pipelines={pipelines} onChanged={fetchPipelines} />
}
