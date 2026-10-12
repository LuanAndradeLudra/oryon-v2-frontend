import { contactsApi } from '@/services/api'
import type { Conversation } from '@/types'

// ── Entrada em conversa a partir de um contato ("Nova conversa") ─────────────
// Responde às duas perguntas do fluxo: "já existe conversa aberta com este
// contato?" (→ abrir) e "posso mandar mensagem livre agora?" (janela de 24h).

/** Janela de atendimento do WhatsApp (24h) em ms. */
export const WHATSAPP_WINDOW_MS = 86_400_000

/**
 * Quanto falta da janela de 24h, em ms (≤ 0 = fechada). ÚNICA fonte da conta:
 * o composer do chat (ChatWindow) e a "Nova conversa" usam esta função — a regra
 * é a do produto hoje, contada a partir de `lastMessageAt` (a última mensagem da
 * conversa; o backend ainda não expõe `lastInboundAt`, ver `whatsappWindow.ts`).
 */
export function windowMsLeft(lastMessageAt: string, now: number = Date.now()): number {
  return WHATSAPP_WINDOW_MS - (now - new Date(lastMessageAt).getTime())
}

export interface ConversationEntry {
  /** Conversa ATIVA (status `open` ou `pending`) mais recente do contato; `null` se não há. */
  openConversationId: string | null
  /** Janela de 24h aberta na conversa mais recente do contato (qualquer status) — mesma regra do composer. */
  windowOpen: boolean
  /**
   * Quando o cliente mandou a última mensagem, SE isso é conhecido: o backend só
   * informa o remetente da ÚLTIMA mensagem (`lastMessageSenderKind`), então é
   * `lastMessageAt` quando foi o cliente e `null` caso contrário — nunca um
   * palpite.
   */
  lastInboundAt: string | null
}

const ACTIVE = new Set<Conversation['status']>(['open', 'pending'])

const byRecent = (a: Conversation, b: Conversation) =>
  new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()

/** Parte pura de `resolveConversationEntry` (testável sem rede). */
export function pickConversationEntry(conversations: Conversation[], now: number = Date.now()): ConversationEntry {
  const sorted = [...conversations].sort(byRecent)
  const latest = sorted[0]
  const active = sorted.find((c) => ACTIVE.has(c.status))
  return {
    openConversationId: active?.id ?? null,
    windowOpen: latest ? windowMsLeft(latest.lastMessageAt, now) > 0 : false,
    lastInboundAt: latest && latest.lastMessageSenderKind === 'client' ? latest.lastMessageAt : null,
  }
}

/** Busca as conversas do contato e resolve a entrada. Erro de rede propaga (quem chama trata). */
export async function resolveConversationEntry(contactId: string): Promise<ConversationEntry> {
  const { data } = await contactsApi.getConversations(contactId)
  return pickConversationEntry(data.data ?? [])
}
