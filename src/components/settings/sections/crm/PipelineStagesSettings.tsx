import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { PipelineStagesManager } from './PipelineStagesManager'

/** Wrapper de Configurações pra `PipelineStagesManager` — a mesma gestão de
 *  estágios de funil que já existia (só) dentro do drawer "Configurar" da
 *  página de Contatos ganha aqui uma segunda entrada, em Configurações →
 *  CRM, junto do Roteamento por Canal (os dois mexem no mesmo eixo: funil de
 *  negócio). Consome o cache de funis compartilhado (`CRMConfigContext`,
 *  SCRUM-293) em vez de um fetch próprio — `refetchPipelines` do contexto já
 *  é a assinatura exata que `onChanged` precisa. */
export function PipelineStagesSettings() {
  const { pipelines, loadingPipelines, refetchPipelines } = useCRMConfig()

  if (loadingPipelines) {
    return <p className="text-sm text-surface-500 text-center py-10">Carregando…</p>
  }

  return <PipelineStagesManager pipelines={pipelines} onChanged={refetchPipelines} />
}
