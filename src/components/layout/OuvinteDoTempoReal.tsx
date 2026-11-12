import { useEffect } from 'react'
import { connectSocket } from '@/services/socket'

/**
 * Retomadas (06/11): o ouvinte do socket que vale em QUALQUER tela do app (fica no AppShell).
 * Antes, `notification:new` só virava evento de janela com a tela de Conversas aberta — o sino
 * das outras telas não via o aviso chegar. Agora:
 *  - `notification:new` / `notification:updated` → evento de janela (o `useNotifications` escuta e
 *    tira repetidos pelo id);
 *  - `follow-ups:mudou` → evento de janela; a tela de Planos de ação e o menu releem.
 * O socket é o mesmo de sempre (`connectSocket` devolve a conexão única do app).
 */
export function OuvinteDoTempoReal() {
  useEffect(() => {
    const socket = connectSocket()
    const repassar = (nome: string) => (p: unknown) => {
      try {
        window.dispatchEvent(new CustomEvent(nome, { detail: p }))
      } catch { /* sem janela */ }
    }
    const novo = repassar('notification:new')
    const mudou = repassar('notification:updated')
    const planos = repassar('follow-ups:mudou')
    // 12/11: ler/arquivar notificação em outra aba ou aparelho → o sino desta aba relê.
    const sincronizar = repassar('notifications:sync')
    socket.on('notification:new', novo)
    socket.on('notification:updated', mudou)
    socket.on('follow-ups:mudou', planos)
    socket.on('notifications:sync', sincronizar)
    return () => {
      socket.off('notification:new', novo)
      socket.off('notification:updated', mudou)
      socket.off('follow-ups:mudou', planos)
      socket.off('notifications:sync', sincronizar)
    }
  }, [])
  return null
}
