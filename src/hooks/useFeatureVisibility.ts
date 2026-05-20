import { useAuth } from '@/contexts/AuthContext'
import {
  isBetaTester as checkBetaTester,
  isFeatureVisible as checkFeatureVisible,
  isRouteVisible as checkRouteVisible,
  type FeatureFlag,
} from '@/config/featureFlags'

/** Feature flags resolvidas com o e-mail do usuário logado (beta testers). */
export function useFeatureVisibility() {
  const { user } = useAuth()
  const email = user?.email ?? null

  return {
    userEmail: email,
    isBetaTester: () => checkBetaTester(email),
    isFeatureVisible: (flag: FeatureFlag) => checkFeatureVisible(flag, email),
    isRouteVisible: (href: string) => checkRouteVisible(href, email),
  }
}
