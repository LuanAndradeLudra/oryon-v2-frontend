import { useAuth } from '@/contexts/AuthContext'
import { cobrancaOcultaPara } from '@/config/featureFlags'

/**
 * Tenant com cobrança fora do Oryon (`FF_OCULTAR_COBRANCA`, PO 12/10): esconde
 * o indicador de créditos, "Plano & faturamento", o atalho da busca e a URL
 * direta. Desmontar o indicador também evita a chamada de billing por trás dele.
 */
export function useCobrancaOculta(): boolean {
  const { featureFlags } = useAuth()
  return cobrancaOcultaPara(featureFlags)
}
