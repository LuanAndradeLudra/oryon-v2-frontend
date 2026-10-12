import { useAuth } from '@/contexts/AuthContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { rotaPermitida } from '@/lib/rotasPorPapel'
import {
  isFeatureVisible as checkFeatureVisible,
  isRouteVisible as checkRouteVisible,
  type FeatureFlag,
} from '@/config/featureFlags'

/** Feature flags resolvidas com o e-mail do usuário logado . */
export function useFeatureVisibility() {
  const { user } = useAuth()
  const email = user?.email ?? null
  const multiPipeline = useMultiPipeline()

  return {
    userEmail: email,
    isFeatureVisible: (flag: FeatureFlag) => checkFeatureVisible(flag, email),
    // Revisão final 04/10: além da flag global, o papel e a flag da empresa.
    isRouteVisible: (href: string) => checkRouteVisible(href, email) && rotaPermitida(href, { role: user?.role, multiPipeline }),
  }
}
