// ─── Ponte do socket compartilhado no nível do app (SCRUM-1210) ───────────────
// Antes, os sinais de cobrança só eram ouvidos dentro do useSocket, que só a
// ConversationsPage monta: fora da tela de conversas o saldo não atualizava e
// a suspensão/reativação da conta não chegava aos portões. Agora a ponte vive
// enquanto houver sessão (montada uma vez no App):
//
//   billing:balance-updated → window 'billing:balance-updated' (useBilling)
//   billing:account-state   → window 'billing:account-state'   (useAccountState)
//   auth:expired            → renova a sessão e reconecta o MESMO socket
//
// O sinal é seco por decisão de segurança (a sala é do tenant inteiro e ler
// billing exige business_admin): a ponte não repassa payload.
// No cleanup saem só OS NOSSOS handlers (`off(evento, fn)`); o socket é
// compartilhado (NavSidebar, BottomTabBar, telas) e não é desconectado aqui —
// quem desconecta é o logout (AuthContext).

import { useEffect } from 'react'
import { connectSocket } from '@/services/socket'
import { attemptRefresh, clearSessionAndRedirect } from '@/services/api'

const relay = (name: string) => () => {
  try {
    window.dispatchEvent(new CustomEvent(name))
  } catch { /* window indisponível (SSR etc.) */ }
}

export function useAppSocketBridge(enabled: boolean, sessionKey?: string | null) {
  useEffect(() => {
    if (!enabled) return
    const socket = connectSocket()
    const onBalance = relay('billing:balance-updated')
    const onAccountState = relay('billing:account-state')
    // Token expirado numa conexão ativa: renova a sessão HTTP primeiro (o
    // `auth` do socket busca um ws-token novo a cada `.connect()`, mas essa
    // busca depende do cookie de sessão) e reconecta a MESMA instância, para
    // os listeners das telas continuarem presos a ela.
    const onAuthExpired = () => {
      console.warn('[socket] Token expired — refreshing session and reconnecting')
      socket.disconnect()
      attemptRefresh().then((ok) => {
        if (ok) socket.connect()
        else clearSessionAndRedirect()
      })
    }
    socket.on('billing:balance-updated', onBalance)
    socket.on('billing:account-state', onAccountState)
    socket.on('auth:expired', onAuthExpired)
    return () => {
      socket.off('billing:balance-updated', onBalance)
      socket.off('billing:account-state', onAccountState)
      socket.off('auth:expired', onAuthExpired)
    }
  }, [enabled, sessionKey])
}
