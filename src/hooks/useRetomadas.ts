import { useAuth } from '@/contexts/AuthContext'
import { retomadasEnabled } from '@/config/featureFlags'

/**
 * Gate da tela "Planos de ação" (retomadas, 07/11). `true` só quando o backend listou
 * `FF_RETOMADAS` no `/auth/me` para a unidade. Desligada (ou sessão ainda não hidratada):
 * some o item do menu, a rota volta para o início e nenhuma chamada a `/follow-ups` sai.
 */
export function useRetomadas(): boolean {
  const { featureFlags } = useAuth()
  return retomadasEnabled(featureFlags)
}
