import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Revisão do épico ORY-94 (2ª rodada) — nas telas do OAuth, com qual conta a pessoa está
 * decidindo, e a troca de conta (o pedido pode ser de outra conta).
 */
export function ContaDaSessao({ className }: { className?: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  if (!user) return null
  const outraConta = async () => {
    await logout()
    navigate('/login', { replace: true, state: { from: location } })
  }
  return (
    <p className={className ?? 'text-xs text-surface-400'}>
      Conectado como <span className="text-surface-200 break-all">{user.email}</span>.{' '}
      <button type="button" className="underline underline-offset-2 hover:text-surface-200" onClick={() => void outraConta()}>
        Usar outra conta
      </button>
    </p>
  )
}
