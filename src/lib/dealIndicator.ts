// F10 (SCRUM-883) — quais registros viram chip no cabeçalho da conversa.
import type { Deal } from '@/types'

/** Abertos sempre; fechados só os que nasceram NESTA conversa (é o desfecho dela). */
export function pickIndicatorDeals(deals: Deal[], conversationId?: string): Deal[] {
  return deals.filter(
    (d) =>
      d.status === 'open' ||
      (!!conversationId && d.originConversationId === conversationId && (d.status === 'won' || d.status === 'lost')),
  )
}
