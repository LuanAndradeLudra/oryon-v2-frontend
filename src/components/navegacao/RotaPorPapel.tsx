import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { rotaPermitida } from '@/lib/rotasPorPapel'
import { isRouteVisible } from '@/config/featureFlags'
import { NavegarSePresente } from './NavegarSePresente'

/**
 * A rota também fecha pela URL (revisão final 04/10): quem não tem acesso
 * pelo papel ou pela flag da empresa vai para a Home, em vez de ver uma tela
 * vazia ou de erro gerada por um 403/erro do backend.
 */
export function RotaPorPapel({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const multiPipeline = useMultiPipeline()
  const { pathname } = useLocation()
  // Também a flag global da rota (build): tela desligada não abre pela URL —
  // Marketing, Automações, Nexus e Copilot mostravam erro quando digitados.
  if (!isRouteVisible(pathname, user?.email ?? null)) {
    return <NavegarSePresente to="/home" replace />
  }
  if (user && !rotaPermitida(pathname, { role: user.role, multiPipeline })) {
    return <NavegarSePresente to="/home" replace />
  }
  return <>{children}</>
}
