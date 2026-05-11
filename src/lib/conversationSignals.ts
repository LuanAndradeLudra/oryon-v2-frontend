import type { Conversation } from '@/types'

/**
 * Helpers derived from the Conversation shape — kept pure (no React, no
 * formatting beyond raw numbers/strings) so the list UI and any future
 * surface (kanban card, notification, etc.) share the same rules.
 *
 * Two independent axes of state, surfaced as separate chips in the UI:
 *   1. WHO IS REPLYING NOW   → isAiActive (AI vs human)
 *   2. WHO OWNS THE CONVO    → getAssignment (assigned user vs nobody)
 *
 * Conflating these (as a previous version did) hides assignment whenever
 * the AI is active — but the "dona da conversa" still matters even while
 * the bot is answering, because handoff defaults to her.
 */

/** AI assignment vs no assignment — the conversation's owner irrespective
 *  of who is currently typing. */
export type AssignmentState = 'human' | 'unassigned'

/**
 * AI is considered active when there is no pause timestamp or the pause has
 * already elapsed. Mirrors the backend's `aiPausedUntil <= NOW()` predicate
 * used in the inbound handler and in the new aiHandling=active filter.
 */
export function isAiActive(conv: Pick<Conversation, 'aiPausedUntil'>): boolean {
  if (!conv.aiPausedUntil) return true
  return new Date(conv.aiPausedUntil).getTime() <= Date.now()
}

/**
 * Returns who owns the conversation — a human (assignedUser) or nobody.
 * This is independent of whether the AI is currently replying; an
 * assignment can exist even while the bot handles inbound messages.
 */
export function getAssignment(
  conv: Pick<Conversation, 'assignedUser'>,
): AssignmentState {
  return conv.assignedUser ? 'human' : 'unassigned'
}

/** Minutes the client has been waiting before we surface the "awaiting reply"
 *  chip. Lower than this the chip would flash on every fresh inbound message
 *  and add visual noise without conveying real urgency. */
const AWAITING_THRESHOLD_MIN = 2

/**
 * "Is the customer currently waiting for a reply, and for how long?"
 *
 * Returns null when the conversation is resolved/abandoned, when the agent
 * has already replied after the client's last message, or when the wait is
 * shorter than the threshold above. Otherwise returns the wait in minutes
 * so the UI can format it (e.g. via chatRelTime on lastMessageAt).
 *
 * Uses lastAgentReplyAt < lastMessageAt as the signal (exposed by the
 * backend list DTO). If lastAgentReplyAt is null the conversation has
 * never been touched by a human — the customer is by definition waiting.
 */
export function getAwaitingReply(
  conv: Pick<Conversation, 'status' | 'lastMessageAt' | 'lastAgentReplyAt'>,
): { minutes: number } | null {
  if (conv.status === 'resolved' || conv.status === 'abandoned') return null
  if (!conv.lastMessageAt) return null

  const lastMsgMs = new Date(conv.lastMessageAt).getTime()
  const lastReplyMs = conv.lastAgentReplyAt ? new Date(conv.lastAgentReplyAt).getTime() : 0
  if (lastReplyMs >= lastMsgMs) return null

  const minutes = Math.floor((Date.now() - lastMsgMs) / 60_000)
  if (minutes < AWAITING_THRESHOLD_MIN) return null
  return { minutes }
}
