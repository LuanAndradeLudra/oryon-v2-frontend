import type { FC, ReactElement } from 'react'
import {
  User, Phone, CornerUpLeft, MousePointerClick, ListChecks,
  ClipboardList, ShoppingBag, Info, Megaphone, ExternalLink, Copy, Workflow, FileText, Video,
} from 'lucide-react'
import type { Message } from '@/types'
import { WhatsAppText } from '@/lib/whatsappFormatter'
import { cn } from '@/lib/utils'

/**
 * Extensible renderer registry for WhatsApp message types beyond the built-in
 * text/media set handled inline by MessageBubble. Adding support for a new
 * type = add a renderer here + (backend) one case in inbound-message.extractor.
 *
 * Anything the backend cannot classify arrives as type `unsupported` with a
 * legible `body`, so the graceful fallback (UnsupportedNotice) always renders
 * SOMETHING — a message never silently disappears from the chat.
 */

// ── Metadata shapes (mirror inbound-message.extractor.ts on the backend) ──────
interface ContactsMetadata {
  kind: 'contacts'
  contacts: Array<{
    name: string
    phones?: Array<{ phone: string | null; waId: string | null; type: string | null }>
    emails?: Array<{ email: string | null; type: string | null }>
    org?: string | null
  }>
}
interface InteractiveMetadata {
  kind: 'interactive'
  subtype: 'button_reply' | 'list_reply' | 'nfm_reply' | string
  buttonReply?: { id: string; title: string }
  listReply?: { id: string; title: string; description?: string }
  nfmReply?: { name: string | null; responseJson: unknown }
}
interface ButtonMetadata {
  kind: 'button'
  text: string
  payload: string | null
}
interface ReferralMetadata {
  referral?: { headline?: string | null; body?: string | null; sourceUrl?: string | null }
}
interface TemplateMetadata {
  kind: 'template'
  template: {
    name: string
    language: string
    headerType?: string | null
    headerText?: string | null
    headerMediaUrl?: string | null
    body: string
    footer?: string | null
    buttons?: Array<Record<string, unknown>>
  }
  variables?: Record<string, string>
}

function meta<T>(message: Message): T | null {
  return (message.metadata ?? null) as T | null
}

// ── Renderers ─────────────────────────────────────────────────────────────────

const ContactCard: FC<{ message: Message }> = ({ message }) => {
  const m = meta<ContactsMetadata>(message)
  const contacts = m?.contacts ?? []
  if (contacts.length === 0) {
    return <PlainNotice icon={User} text={message.body ?? 'Contato compartilhado'} />
  }
  return (
    <div className="flex flex-col gap-2 py-1 min-w-[200px] max-w-[280px]">
      {contacts.map((c, i) => {
        const phone = c.phones?.find((p) => p.phone || p.waId)
        const phoneText = phone?.phone ?? phone?.waId ?? null
        return (
          <div key={i} className="flex items-center gap-2.5 rounded-lg bg-current/5 px-2.5 py-2">
            <div className="w-9 h-9 rounded-full bg-current/15 flex items-center justify-center flex-shrink-0">
              <User className="w-4.5 h-4.5 opacity-80" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              {phoneText && (
                <p className="text-xs opacity-70 flex items-center gap-1 truncate">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  {phoneText}
                </p>
              )}
              {c.org && <p className="text-[11px] opacity-50 truncate">{c.org}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const InteractiveReply: FC<{ message: Message }> = ({ message }) => {
  const m = meta<InteractiveMetadata>(message)
  if (m?.subtype === 'list_reply' && m.listReply) {
    return (
      <ReplyChip icon={ListChecks} label="Selecionou">
        <span className="font-medium">{m.listReply.title}</span>
        {m.listReply.description && (
          <span className="block text-xs opacity-60">{m.listReply.description}</span>
        )}
      </ReplyChip>
    )
  }
  if (m?.subtype === 'nfm_reply') {
    const entries = flattenFlowResponse(m.nfmReply?.responseJson)
    return (
      <div className="py-1 min-w-[180px] max-w-[300px]">
        <div className="flex items-center gap-1.5 text-xs font-medium opacity-80 mb-1">
          <ClipboardList className="w-3.5 h-3.5" />
          Formulário respondido
        </div>
        {entries.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {entries.map(([k, v], i) => (
              <p key={i} className="text-sm">
                <span className="opacity-60">{k}: </span>
                {v}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm opacity-80">{message.body}</p>
        )}
      </div>
    )
  }
  // button_reply (default)
  const title = m?.buttonReply?.title ?? message.body ?? 'Resposta'
  return (
    <ReplyChip icon={CornerUpLeft} label="Respondeu">
      <span className="font-medium">{title}</span>
    </ReplyChip>
  )
}

const ButtonReply: FC<{ message: Message }> = ({ message }) => {
  const m = meta<ButtonMetadata>(message)
  return (
    <ReplyChip icon={MousePointerClick} label="Clicou no botão">
      <span className="font-medium">{m?.text ?? message.body ?? 'Botão'}</span>
    </ReplyChip>
  )
}

const OrderCard: FC<{ message: Message }> = ({ message }) => (
  <PlainNotice icon={ShoppingBag} text={message.body ?? 'Pedido recebido'} />
)

/** Substitute {{1}}, {{2}}… with resolved variable values. */
function subTemplateVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[n] ?? `{{${n}}}`)
}

const BUTTON_ICON: Record<string, typeof Info> = {
  URL: ExternalLink,
  PHONE_NUMBER: Phone,
  COPY_CODE: Copy,
  FLOW: Workflow,
  QUICK_REPLY: CornerUpLeft,
}

const BTN_BASE = 'flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium w-full'
const BTN_ACTION = 'bg-current/10 hover:bg-current/20 transition-colors cursor-pointer'
const BTN_STATIC = 'bg-current/10'

/** A single template button. URL / phone / copy-code are actionable for the
 *  operator (open link / dial / copy) — mirroring how WhatsApp inboxes handle
 *  outbound templates. QUICK_REPLY and FLOW stay as representations (the
 *  customer interacts with those on their own device). */
const TemplateButton: FC<{ btn: Record<string, unknown> }> = ({ btn }) => {
  const type = String(btn.type ?? 'QUICK_REPLY').toUpperCase()
  const Icon = BUTTON_ICON[type] ?? CornerUpLeft
  const text = String(btn.text ?? '')
  const url = typeof btn.url === 'string' ? btn.url : undefined
  const phone =
    typeof btn.phoneNumber === 'string' ? btn.phoneNumber
    : typeof btn.phone_number === 'string' ? btn.phone_number
    : undefined
  const code = typeof btn.code === 'string' ? btn.code : undefined
  const stop = (e: { stopPropagation(): void }) => e.stopPropagation()
  const inner = (
    <>
      <Icon className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </>
  )

  // URL — actionable only for static links (dynamic {{n}} aren't resolved yet).
  if (type === 'URL' && url && !url.includes('{{')) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={stop} title={url}
         className={cn(BTN_BASE, BTN_ACTION)}>{inner}</a>
    )
  }
  if (type === 'PHONE_NUMBER' && phone) {
    return (
      <a href={`tel:${phone}`} onClick={stop} title={phone}
         className={cn(BTN_BASE, BTN_ACTION)}>{inner}</a>
    )
  }
  if (type === 'COPY_CODE' && code) {
    return (
      <button type="button" title="Copiar código"
        onClick={(e) => { stop(e); void navigator.clipboard.writeText(code).catch(() => {}) }}
        className={cn(BTN_BASE, BTN_ACTION)}>{inner}</button>
    )
  }
  // Representation (quick_reply, flow, dynamic url, copy-code without value).
  return <div className={cn(BTN_BASE, BTN_STATIC)}>{inner}</div>
}

/** Outbound template — rendered natively in the platform palette (consistent
 *  with the other renderers): header + body (WhatsAppText) + footer + buttons.
 *  Flow/dynamic buttons appear as styled, non-clickable panels (representation). */
const TemplateMessage: FC<{ message: Message }> = ({ message }) => {
  const m = meta<TemplateMetadata>(message)
  const t = m?.template
  if (!t) return <PlainNotice icon={ClipboardList} text={message.body ?? 'Template'} />
  const vars = m?.variables ?? {}
  const bodyText = subTemplateVars(t.body ?? '', vars)
  const buttons = t.buttons ?? []

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px] max-w-[300px]">
      {/* Header */}
      {t.headerType === 'TEXT' && t.headerText && (
        <p className="text-sm font-semibold leading-snug">{subTemplateVars(t.headerText, vars)}</p>
      )}
      {t.headerType === 'IMAGE' && (
        t.headerMediaUrl
          ? <img src={t.headerMediaUrl} alt="" className="rounded-lg max-h-40 object-cover" />
          : <div className="rounded-lg bg-current/10 h-24 flex items-center justify-center text-xs opacity-50">Imagem</div>
      )}
      {t.headerType === 'VIDEO' && (
        <div className="rounded-lg bg-current/10 h-20 flex items-center justify-center gap-1.5 text-xs opacity-50">
          <Video className="w-4 h-4" /> Vídeo
        </div>
      )}
      {t.headerType === 'DOCUMENT' && (
        <div className="rounded-lg bg-current/10 px-2.5 py-2 flex items-center gap-2 text-xs opacity-70">
          <FileText className="w-4 h-4 flex-shrink-0" /> Documento
        </div>
      )}

      {/* Body */}
      {bodyText && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          <WhatsAppText text={bodyText} />
        </p>
      )}

      {/* Footer */}
      {t.footer && <p className="text-[11px] opacity-50">{t.footer}</p>}

      {/* Buttons */}
      {buttons.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-1 border-t border-current/10 pt-1.5">
          {buttons.map((b, i) => <TemplateButton key={i} btn={b} />)}
        </div>
      )}

      {/* Flow hint — the form opens on the customer's WhatsApp, not here. */}
      {buttons.some((b) => String((b as Record<string, unknown>).type ?? '').toUpperCase() === 'FLOW') && (
        <p className="text-[10px] opacity-50 italic">O cliente preenche o formulário no WhatsApp.</p>
      )}
    </div>
  )
}

const SystemNotice: FC<{ message: Message }> = ({ message }) => (
  <PlainNotice icon={Info} text={message.body ?? 'Evento do sistema'} muted />
)

const UnsupportedNotice: FC<{ message: Message }> = ({ message }) => (
  <PlainNotice icon={Info} text={message.body ?? 'Mensagem não suportada'} muted />
)

// ── Shared building blocks ──────────────────────────────────────────────────

const PlainNotice: FC<{ icon: typeof Info; text: string; muted?: boolean }> = ({
  icon: Icon,
  text,
  muted,
}) => (
  <div className={`flex items-center gap-2 py-1 ${muted ? 'opacity-70 italic' : ''}`}>
    <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
    <span className="text-sm">{text}</span>
  </div>
)

const ReplyChip: FC<{ icon: typeof Info; label: string; children: React.ReactNode }> = ({
  icon: Icon,
  label,
  children,
}) => (
  <div className="py-0.5">
    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-50 mb-0.5">
      <Icon className="w-3 h-3" />
      {label}
    </div>
    <div className="text-sm">{children}</div>
  </div>
)

/** Flatten a WhatsApp Flow response_json into [label, value] pairs, dropping
 *  the internal flow_token and prettifying the auto-generated screen keys. */
function flattenFlowResponse(raw: unknown): Array<[string, string]> {
  if (!raw || typeof raw !== 'object') return []
  const out: Array<[string, string]> = []
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k === 'flow_token') continue
    if (v == null || typeof v === 'object') continue
    const label = k
      .replace(/^screen_\d+_/i, '')
      .replace(/_\d+$/i, '')
      .replace(/_/g, ' ')
      .trim()
    out.push([label || k, String(v).replace(/_/g, ' ')])
  }
  return out
}

// ── Referral banner (rendered separately, above content, when present) ────────

export const ReferralBanner: FC<{ message: Message }> = ({ message }) => {
  const ref = meta<ReferralMetadata>(message)?.referral
  if (!ref || (!ref.headline && !ref.body)) return null
  return (
    <div className="mb-1.5 flex items-start gap-2 rounded-lg bg-current/5 px-2.5 py-1.5 border-l-2 border-current/30">
      <Megaphone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide opacity-50">Veio de um anúncio</p>
        {ref.headline && <p className="text-xs font-medium truncate">{ref.headline}</p>}
      </div>
    </div>
  )
}

// ── Registry ────────────────────────────────────────────────────────────────

const RENDERERS: Partial<Record<Message['type'], FC<{ message: Message }>>> = {
  contacts: ContactCard,
  interactive: InteractiveReply,
  button: ButtonReply,
  order: OrderCard,
  system: SystemNotice,
  template: TemplateMessage,
  unsupported: UnsupportedNotice,
}

/** Message types whose display is fully owned by a dedicated renderer — the
 *  bubble must NOT additionally render the plain-text body for these (avoids
 *  rendering the synthetic "[…]" body twice). Includes the registry types plus
 *  `location` (rendered inline by MediaContent, but now carries a legible
 *  body that would otherwise duplicate under the map pin). */
export const STRUCTURED_TYPES: ReadonlySet<Message['type']> = new Set<Message['type']>([
  ...(Object.keys(RENDERERS) as Message['type'][]),
  'location',
  'reaction',
])

/** Render a registered renderer for the message type, or null if none. */
export function renderExtendedContent(message: Message): ReactElement | null {
  const Renderer = RENDERERS[message.type]
  return Renderer ? <Renderer message={message} /> : null
}
