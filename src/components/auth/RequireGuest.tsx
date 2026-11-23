import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * As telas de quem ainda não entrou (o login). Quem CHEGA ao /login já logado vai para o app.
 *
 * ORY-94 (correção de 23/11): quem entra AQUI é levado pela própria tela de login ao destino — a
 * tela do OAuth (conectar um aplicativo de IA, aprovar uma ação) ou a página de onde veio. Antes,
 * a cópia do /login que fica na tela durante a transição (AnimatePresence) também reagia ao login
 * e mandava para /home por cima: a pessoa entrava e caía na plataforma, não no consentimento.
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { isAuthenticated, requiresPasswordChange } = useAuth()
  const [chegouLogado] = useState(isAuthenticated)
  if (isAuthenticated && chegouLogado) {
    return <Navigate to={requiresPasswordChange ? '/set-password' : '/home'} replace />
  }
  return <>{children}</>
}
