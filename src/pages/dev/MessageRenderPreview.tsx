import type { Message } from '@/types'
import { MessageList } from '@/components/conversations/ChatWindow/MessageList'

/**
 * DEV-ONLY visual harness for WhatsApp message rendering.
 *
 * Mounts the real <MessageList>/<MessageBubble> with a hardcoded set of mock
 * messages covering every supported type (inbound + outbound, reply/context,
 * referral, contacts, interactive replies, Flow, button, order, system,
 * unsupported, location, reaction). No backend / DB / auth required.
 *
 * Open at /dev/messages while running `npm run dev`. This route is only
 * registered when import.meta.env.DEV is true, so it never ships to prod.
 */

const base = Date.now() - 1000 * 60 * 30
let seq = 0
function at(): string {
  seq += 1
  return new Date(base + seq * 1000 * 60).toISOString()
}

function mk(partial: Partial<Message> & Pick<Message, 'type' | 'direction'>): Message {
  const id = `mock-${seq + 1}`
  const sentAt = at()
  return {
    id,
    conversationId: 'conv-mock',
    wamid: `wamid.${id}`,
    status: 'delivered',
    sentAt,
    createdAt: sentAt,
    ...partial,
  } as Message
}

const original = mk({ type: 'text', direction: 'inbound', body: 'Bom dia! Gostaria de confirmar minha consulta de amanhã.' })

const MESSAGES: Message[] = [
  original,
  mk({ type: 'text', direction: 'outbound', body: 'Olá! Claro, vou verificar para você. 😊', sentByUser: { id: 'u1', firstName: 'Tamires', lastName: null } }),

  // Reply / context → ReplyQuoteBar resolves `original`
  mk({ type: 'text', direction: 'outbound', body: 'Sua consulta está confirmada para amanhã às 14h.', contextWamid: original.wamid!, contextFrom: '5524999990000', sentByUser: { id: 'u1', firstName: 'Tamires', lastName: null } }),

  // Reply to a message NOT in the loaded window → graceful "Mensagem original"
  mk({ type: 'text', direction: 'inbound', body: 'Perfeito, obrigado!', contextWamid: 'wamid.NOT_LOADED' }),

  // Contacts (vCard)
  mk({
    type: 'contacts', direction: 'inbound', body: '[Contato: Dra. Ana Lima, +55 24 98888-1111]',
    metadata: { kind: 'contacts', contacts: [{ name: 'Dra. Ana Lima', phones: [{ phone: '+55 24 98888-1111', waId: '5524988881111', type: 'CELL' }], org: 'Clínica Itaipava' }] },
  }),

  // Interactive — button reply
  mk({
    type: 'interactive', direction: 'inbound', body: '[Cliente respondeu: Confirmar]',
    metadata: { kind: 'interactive', subtype: 'button_reply', buttonReply: { id: 'b1', title: 'Confirmar' } },
  }),

  // Interactive — list reply
  mk({
    type: 'interactive', direction: 'inbound', body: '[Cliente selecionou: Quarta 14:00]',
    metadata: { kind: 'interactive', subtype: 'list_reply', listReply: { id: 'l1', title: 'Quarta 14:00', description: 'Dr. Sylvio — Neurologia' } },
  }),

  // Interactive — Flow (nfm_reply)
  mk({
    type: 'interactive', direction: 'inbound', body: '[Formulário (Flow) respondido]',
    metadata: { kind: 'interactive', subtype: 'nfm_reply', nfmReply: { name: 'flow', responseJson: { screen_0_Selecione_uma_opo_0: 'Sim, irei comparecer.', flow_token: '19062001' } } },
  }),

  // Template quick-reply button click
  mk({
    type: 'button', direction: 'inbound', body: '[Cliente clicou: CONFIRMAR]',
    metadata: { kind: 'button', text: 'CONFIRMAR', payload: 'CONFIRM_APPT' },
  }),

  // Order (catalog)
  mk({
    type: 'order', direction: 'inbound', body: '[Pedido: 2 item(ns)]',
    metadata: { kind: 'order', catalogId: 'cat1', items: [{ productRetailerId: 'p1', quantity: 1, itemPrice: 150, currency: 'BRL' }, { productRetailerId: 'p2', quantity: 1, itemPrice: 89.9, currency: 'BRL' }] },
  }),

  // System event
  mk({
    type: 'system', direction: 'inbound', body: '[Sistema: O número de WhatsApp do cliente mudou]',
    metadata: { kind: 'system', event: 'user_changed_number', body: 'O número de WhatsApp do cliente mudou' },
  }),

  // Unsupported / future type — graceful fallback
  mk({
    type: 'unsupported', direction: 'inbound', body: '[Mensagem não suportada: some_future_type]',
    metadata: { kind: 'unsupported', rawType: 'some_future_type' },
  }),

  // Referral (Click-to-WhatsApp ad) → ReferralBanner above the text
  mk({
    type: 'text', direction: 'inbound', body: 'Vi o anúncio de vocês, quero saber mais!',
    metadata: { kind: 'text', referral: { headline: 'Check-up completo com 30% off', body: 'Agende já', sourceUrl: 'https://fb.com/ad/123' } },
  }),

  // Location → map pin (body suppressed, no duplicate text)
  mk({
    type: 'location', direction: 'inbound', body: '[Localização: Clínica Itaipava]',
    metadata: { kind: 'location', latitude: -22.3, longitude: -43.2, name: 'Clínica Itaipava' },
  }),

  // Reaction
  mk({ type: 'reaction', direction: 'inbound', body: '👍', reactionEmoji: '👍', reactionTargetWamid: original.wamid }),

  // Image with caption (media — may not load without auth; layout still renders)
  mk({ type: 'image', direction: 'inbound', body: 'Exame anexado', mediaCaption: 'Exame anexado', mediaUrl: '/uploads/mock/exam.jpg' }),
]

export function MessageRenderPreview() {
  return (
    <div className="h-screen w-screen flex flex-col bg-surface-950">
      <div className="px-4 py-3 border-b border-surface-800 text-surface-200 text-sm font-medium">
        DEV — Preview de renderização de mensagens ({MESSAGES.length} mocks)
      </div>
      <MessageList messages={MESSAGES} loading={false} hasMore={false} isTyping={false} onLoadMore={() => {}} />
    </div>
  )
}
