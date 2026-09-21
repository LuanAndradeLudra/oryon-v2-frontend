import type { Message, MessageStatus, SocketMessageStatus } from '@/types'

/** Ordem de avanço do ciclo de entrega. `failed` fica fora: é regra própria. */
const RANK: Record<string, number> = { sending: 0, queued: 0, sent: 1, delivered: 2, read: 3 }

/** Só avança, nunca regride — o backend já garante isto, mas o socket pode
 *  entregar fora de ordem e um GET recente pode ter estado mais novo. */
export function shouldApplyStatus(current: MessageStatus, next: MessageStatus): boolean {
  // `failed` é terminal, como no backend (MessageStatusService): depois de
  // recarregar a tela o estado viria `failed` de qualquer forma.
  if (current === 'failed') return false
  if (next === 'failed') return current !== 'delivered' && current !== 'read'
  return (RANK[next] ?? 0) > (RANK[current] ?? 0)
}

/** `true` se o evento de socket diz respeito a esta mensagem (id OU wamid). */
export function matchesStatusPayload(m: Message, p: SocketMessageStatus): boolean {
  if (p.conversationId && m.conversationId !== p.conversationId) return false
  if (p.messageId && m.id === p.messageId) return true
  return !!p.wamid && m.wamid === p.wamid
}

export function applyStatusUpdate(m: Message, p: SocketMessageStatus): Message {
  if (!matchesStatusPayload(m, p) || !shouldApplyStatus(m.status, p.status)) return m
  const next: Message = { ...m, status: p.status }
  if (p.status === 'delivered' || p.status === 'read') next.deliveredAt = m.deliveredAt ?? p.deliveredAt ?? undefined
  if (p.status === 'read') next.readAt = m.readAt ?? p.readAt ?? undefined
  if (p.status === 'failed') {
    next.failedAt = p.failedAt ?? m.failedAt
    next.errorCode = p.errorCode ?? m.errorCode
    next.errorTitle = p.errorTitle ?? m.errorTitle
  }
  return next
}

/** Motivo legível da falha: campo do socket ou o `deliveryError` gravado. */
export function failureReason(m: Pick<Message, 'errorTitle' | 'deliveryError' | 'errorCode'>): string | null {
  if (m.errorTitle) return m.errorTitle
  const first = m.deliveryError?.errors?.[0]
  return first?.title ?? first?.message ?? null
}
