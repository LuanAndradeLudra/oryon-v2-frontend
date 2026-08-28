import { useAuth } from '@/contexts/AuthContext'
import { multiPipelineEnabled } from '@/config/featureFlags'

/**
 * Gate de UI dos múltiplos funis (SCRUM-498).
 *
 * `true` só quando o backend listou `FF_MULTI_PIPELINE` no `/auth/me` para o
 * tenant. `false` cobre os três casos em que a UI de funis NÃO pode aparecer:
 * backend sem o módulo (campo ausente), módulo em produção com flag
 * desligado para o tenant, e sessão ainda não hidratada.
 *
 * Par do `useFeatureVisibility` (flags de build): este é por tenant e vem do
 * servidor. Componente que consome: esconde a superfície E evita a chamada de
 * API por trás dela — nunca só um dos dois.
 */
export function useMultiPipeline(): boolean {
  const { featureFlags } = useAuth()
  return multiPipelineEnabled(featureFlags)
}
