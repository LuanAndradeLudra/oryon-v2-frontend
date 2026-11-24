import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Revisão do épico ORY-94 (2ª rodada) — nas telas do OAuth, com qual conta a pessoa está
 * decidindo, e a troca de conta (o pedido pode ser de outra conta).
 *
 * Revisão do épico (18/11, 3ª rodada): no consentimento (`recomecarNoAplicativo`), o pedido fica
 * preso à 1ª conta que o abriu, e voltar a ele com outra conta sempre dava "não está mais
 * disponível". Lá a troca é sair e conectar de novo pelo aplicativo (o login não volta ao pedido).
 */
export function ContaDaSessao({ className, recomecarNoAplicativo = false }: { className?: string; recomecarNoAplicativo?: boolean }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  if (!user) return null
  const outraConta = async () => {
    await logout()
    // Revisão de 23/11 (baixos): recomeçando pelo aplicativo, o login segue para o app — com a
    // página recarregada, para a CSP restrita do /oauth/* não valer no app inteiro (imagens de
    // outra origem, como a mídia das mensagens, deixavam de carregar).
    if (recomecarNoAplicativo) {
      window.location.replace('/login')
      return
    }
    navigate('/login', { replace: true, state: { from: location } })
  }
  const botao = (texto: string) => (
    <button type="button" className="underline underline-offset-2 hover:text-surface-200" onClick={() => void outraConta()}>
      {texto}
    </button>
  )
  return (
    <p className={className ?? 'text-xs text-surface-400'}>
      Conectado como <span className="text-surface-200 break-all">{user.email}</span>.{' '}
      {recomecarNoAplicativo ? <>Para usar outra conta, {botao('saia da Oryon')} e conecte de novo pelo aplicativo.</> : botao('Usar outra conta')}
    </p>
  )
}
