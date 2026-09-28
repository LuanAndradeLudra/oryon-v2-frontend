import type { Conversation } from '@/types'
import { esperaPessoa, type LinhasComIA } from '@/lib/filaAgora'

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

const SEM_LINHAS: LinhasComIA = new Set()

/**
 * "O cliente está esperando uma PESSOA — e há quanto tempo?"
 *
 * 28/09: a MESMA regra da fila do Dashboard (`esperaPessoa`, lib/filaAgora):
 * nenhuma pessoa respondeu desde a última mensagem e a IA não está cuidando
 * (linha sem IA ou IA pausada e o cliente falou por último — ou a IA passou a
 * conversa para a equipe, status pendente). Antes comparava só
 * `lastAgentReplyAt` (que só anda com mensagem HUMANA) com `lastMessageAt`
 * (qualquer remetente) — então toda conversa em que a IA ou uma campanha
 * falou por último aparecia "sem resposta".
 *
 * `linhasComIA` vem de `useLinhasComIA`; sem ele, nenhuma linha conta como
 * atendida por IA (erra para mostrar, nunca para esconder).
 *
 * Abaixo do limiar o chip piscaria a cada mensagem nova sem dizer urgência.
 */
export function getAwaitingReply(
  conv: Parameters<typeof esperaPessoa>[0],
  linhasComIA: LinhasComIA = SEM_LINHAS,
  now: number = Date.now(),
): { minutes: number } | null {
  if (!conv.lastMessageAt) return null
  if (!esperaPessoa(conv, linhasComIA, now)) return null
  const minutes = Math.floor((now - new Date(conv.lastMessageAt).getTime()) / 60_000)
  if (minutes < AWAITING_THRESHOLD_MIN) return null
  return { minutes }
}

/**
 * `conversation:assigned` chega em DOIS formatos (28/09): o das automações
 * (`assignedUserId` + `assignedUserName`, automations.processor.ts) e o que o
 * frontend esperava (`assignedTo`). A página lia só o segundo — e, com o
 * primeiro, apagava o dono da conversa aberta. A atribuição manual
 * (PATCH /assign) não emite evento nenhum (item no SCRUM-1161).
 */
export interface EventoDeAtribuicao {
  conversationId: string
  assignedTo?: Conversation['assignedUser'] | null
  assignedUserId?: string | null
  assignedUserName?: string | null
}

/** O novo dono: objeto, `null` (ficou sem dono) ou `undefined` (o evento não diz). */
export function donoDoEvento(p: EventoDeAtribuicao): Conversation['assignedUser'] | null | undefined {
  if (p.assignedTo !== undefined) return p.assignedTo ?? null
  if (p.assignedUserId === undefined) return undefined
  if (!p.assignedUserId) return null
  const [firstName = '', ...resto] = (p.assignedUserName ?? '').trim().split(/\s+/)
  return { id: p.assignedUserId, firstName, lastName: resto.join(' ') || null }
}
