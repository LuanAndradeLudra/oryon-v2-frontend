import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { LifeBuoy, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { SinoDaEquipe } from './SinoDaEquipe'

/**
 * SHELL da equipe de suporte da Oryon (SCRUM-1384). O papel `oryon_support`
 * só alcança a fila (o backend nega o resto: OryonSupportScopeGuard); o app
 * da empresa — menu, busca, contadores, chat interno — não carrega para ele.
 * O sino (SCRUM-1386) traz os avisos da fila: chamado novo, fala da empresa,
 * subida para P0/P1 e prazo vencido.
 */
export function ShellDaEquipeDeSuporte({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nome = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : ''
  const sair = async () => {
    await logout()
    navigate('/login', { replace: true })
  }
  return (
    <div className="h-[100dvh] flex flex-col bg-surface-950">
      <header className="relative h-12 px-4 flex items-center gap-3 border-b border-surface-800 bg-surface-900 flex-shrink-0 min-w-0">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-surface-100 whitespace-nowrap">
          <LifeBuoy className="w-4 h-4" aria-hidden />Oryon · Suporte
        </span>
        <span className="ml-auto text-xs text-surface-400 truncate">{nome}</span>
        <SinoDaEquipe />
        <Button size="sm" variant="ghost" leftIcon={<LogOut className="w-3.5 h-3.5" />} onClick={() => void sair()}>Sair</Button>
      </header>
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
    </div>
  )
}
