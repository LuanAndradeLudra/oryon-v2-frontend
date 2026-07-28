// ─── Conversation filter predicate (SCRUM-561) ───────────────────────────────
// "Would this conversation appear in the list under the currently active
// filters?"
//
// Extracted from the inline chain inside `fetchAndPrependConversation` so BOTH
// realtime paths can share it:
//
//   * PREPEND  — a socket event names a conversation not in the loaded list.
//                Fetch it and insert only if it matches.
//   * EVICT    — a socket patch changes a conversation so it no longer matches.
//                Remove it, or the operator sees a row that contradicts the
//                filter it is sitting under (a "Pendente" badge in the
//                "Abertas" tab).
//
// The eviction half did not exist at all before this: nothing in the hook ever
// removed a row on predicate violation.
//
// It mirrors the backend's `applyListFilters`, so a realtime insert lands where
// the next refetch would also put it. When the two drift, the symptom is a row
// that appears and then vanishes — or worse, never appears.

import { getAwaitingReply, isAiActive } from '@/lib/conversationSignals'
import type { Conversation, ConversationFilters, User } from '@/types'

export function conversationMatchesFilters(
  conv: Conversation,
  f: ConversationFilters,
  currentUser?: User | null,
): boolean {
  if (f.status && f.status !== 'all' && conv.status !== f.status) return false
  if (f.whatsappNumberId && conv.whatsappNumber?.id !== f.whatsappNumberId) return false
  if (f.contactId && conv.contact?.id !== f.contactId) return false

  if (f.assignedTo === 'unassigned' && conv.assignedUser) return false
  if (f.assignedTo === 'me' && currentUser && conv.assignedUser?.id !== currentUser.id) return false
  // UUID branch — the "Equipe" picker lets the operator filter to a specific
  // colleague's queue (e.g. taking over Maria's conversations after she logs
  // off). Same realtime gate as the static buckets above.
  if (f.assignedTo
      && f.assignedTo !== 'me'
      && f.assignedTo !== 'unassigned'
      && f.assignedTo !== 'all'
      && conv.assignedUser?.id !== f.assignedTo) return false

  if (f.aiHandling === 'active' && !isAiActive(conv)) return false
  if (f.aiHandling === 'paused' && isAiActive(conv)) return false
  if (f.unreadOnly && conv.unreadCount === 0) return false
  if (f.awaitingReply && !getAwaitingReply(conv)) return false
  if (f.untagged && conv.tags && conv.tags.length > 0) return false
  if (f.needsReview && !conv.hasRecentAnomaly) return false

  // Period filter — same comparison the backend uses (>= start, < end) so the
  // realtime path stays consistent with the paginated list.
  if (f.startDate && conv.lastMessageAt && conv.lastMessageAt < f.startDate) return false
  if (f.endDate && conv.lastMessageAt && conv.lastMessageAt >= f.endDate) return false

  return true
}
