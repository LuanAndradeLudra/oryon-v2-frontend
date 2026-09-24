import { useState } from 'react'
import { MessageSquare, Send, MoreHorizontal, ExternalLink, Copy, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { StageBadge } from './StageBadge'
import { cn, relativeDate, formatPhoneBR } from '@/lib/utils'
import type { Contact, TenantStage } from '@/types'

// Direção A da tela de Leads (DECISOES-PENDENTES #33, mockup-contatos.html):
// UMA pessoa por linha, 52px. O nome manda; o resto é mudo. Checkbox e ações só
// aparecem no hover/foco (e ficam sempre visíveis em ponteiro grosso, onde não
// existe hover). Telefone, etiquetas e estatísticas NÃO moram na linha — estão
// no painel.

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', website: 'Website',
  referral: 'Indicação', campaign: 'Campanha', manual: 'Manual', import: 'Importação',
  meta_ads: 'Meta Ads', google_ads: 'Google Ads', other: 'Outro',
}

/** Canal de origem do contato. A lista NÃO traz a linha WhatsApp (o contato não
 *  carrega `whatsappNumberId`) — o dado que existe é a fonte. Sem dado, nada. */
function sourceLabel(source?: string): string | undefined {
  if (!source) return undefined
  return SOURCE_LABEL[source] ?? source.replace(/_/g, ' ')
}

/** 2ª linha, texto mudo. A lista não traz o texto nem a direção da última
 *  mensagem (só `lastContactedAt`), então não há "Você:"/preview real. O que
 *  existe de verdade e diz o que aconteceu: o resumo da última interação (IA)
 *  e, na falta dele, empresa · cargo. Nada disso é inventado. */
function secondLine(c: Contact): string | undefined {
  if (c.aiLastInteractionSummary?.trim()) return c.aiLastInteractionSummary.trim()
  const org = [c.company, c.jobTitle].filter((x): x is string => !!x?.trim()).join(' · ')
  return org || undefined
}

export interface ContactListRowProps {
  contact: Contact
  stages: TenantStage[]
  /** Painel aberto neste contato — fundo + filete de 2px à esquerda. */
  active: boolean
  /** Marcado para ação em massa. */
  checked?: boolean
  /** Existe alguma linha marcada — checkboxes ficam visíveis em todas. */
  selectionMode?: boolean
  /** `touch` (mobile): SEM checkbox e SEM as 3 ações inline — a linha inteira é
   *  o alvo, as ações já estão no painel, e a coluna direita é só o "quando". */
  variant?: 'default' | 'touch'
  onOpen: (contact: Contact, e: React.MouseEvent) => void
  /** Sem isto não há checkbox (a página mobile não tem ação em massa). */
  onToggleSelect?: (id: string) => void
  onOpenConversation?: (contact: Contact) => void
  onSendTemplate?: (contact: Contact) => void
  /** Sem isto o item "Abrir ficha" some do menu Mais (ficha completa desligada). */
  onOpenProfile?: (contact: Contact) => void
}

const ICON_BTN =
  'w-7 h-7 rounded-xs inline-flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors'

export function ContactListRow({
  contact, stages, active, checked = false, selectionMode = false, variant = 'default',
  onOpen, onToggleSelect, onOpenConversation, onSendTemplate, onOpenProfile,
}: ContactListRowProps) {
  const touch = variant === 'touch'
  const [menuOpen, setMenuOpen] = useState(false)
  const name = contact.displayName || formatPhoneBR(contact.waId) || 'Sem nome'
  const line2 = secondLine(contact)
  const canal = sourceLabel(contact.source)
  const when = relativeDate(contact.lastContactedAt)

  return (
    <div
      className={cn(
        'group relative h-[52px] flex items-center gap-3 pl-3 pr-2.5 rounded-sm transition-colors',
        active ? 'bg-[var(--sel)]' : 'hover:bg-[var(--rowhover)]',
        // Filete de seleção: 2px, marca, recuado 14px do topo/base (mockup A); fundo --sel.
        active && 'before:content-[""] before:absolute before:left-0 before:top-3.5 before:bottom-3.5 before:w-0.5 before:rounded-full before:bg-brand-500',
      )}
      data-testid="contact-list-row"
      data-contact-id={contact.id}
    >
      {/* Alvo de clique da linha inteira. Os controles abaixo ficam ACIMA dele
          (z-10) — evita botão dentro de botão e mantém um único tab stop por
          linha para abrir o painel. */}
      <button
        type="button"
        data-contact-open={contact.id}
        aria-label={`Abrir ${name}`}
        aria-current={active ? 'true' : undefined}
        onClick={(e) => onOpen(contact, e)}
        className="absolute inset-0 rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      />

      {!touch && onToggleSelect && (
        <span
          className={cn(
            'relative z-10 flex-shrink-0 w-[14px] transition-opacity',
            checked || selectionMode
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100',
          )}
        >
          <Checkbox
            checked={checked}
            onChange={() => onToggleSelect(contact.id)}
            aria-label={`Selecionar ${name}`}
          />
        </span>
      )}

      <div className="relative pointer-events-none flex-shrink-0">
        <Avatar name={name} imageUrl={contact.profilePicUrl} size="sm" />
      </div>

      <div className="relative pointer-events-none flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-[18px] text-surface-100 truncate">{name}</p>
        {line2 && <p className="text-xs leading-4 text-surface-400 truncate">{line2}</p>}
      </div>

      {contact.stage && (
        <div className="relative pointer-events-none flex-shrink-0">
          <StageBadge stage={contact.stage} stages={stages} size="sm" />
        </div>
      )}

      {/* Touch: coluna direita = só o "quando", auto-width, sempre visível. */}
      {touch && (
        <span
          className="pointer-events-none flex-shrink-0 text-[11.5px] text-surface-400 tabular-nums whitespace-nowrap"
          title={contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleString('pt-BR') : undefined}
        >
          {when}
        </span>
      )}

      {/* "quando · canal" à direita — vira as ações no hover/foco. Ponteiro
          grosso não tem hover: as ações ficam sempre visíveis. */}
      {!touch && (
      <div className="relative flex-shrink-0 w-[130px] flex justify-end">
        <span
          className={cn(
            'pointer-events-none text-[11.5px] text-surface-400 tabular-nums whitespace-nowrap truncate',
            menuOpen ? 'hidden' : 'group-hover:hidden group-focus-within:hidden [@media(pointer:coarse)]:hidden',
          )}
          title={contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleString('pt-BR') : undefined}
        >
          {when}
          {canal && <span className="text-surface-500"> · {canal}</span>}
        </span>
        <div
          className={cn(
            'z-10 items-center gap-0.5',
            menuOpen ? 'flex' : 'hidden group-hover:flex group-focus-within:flex [@media(pointer:coarse)]:flex',
          )}
        >
          {onOpenConversation && (
            <button type="button" className={ICON_BTN} title="Abrir conversa" aria-label={`Abrir conversa com ${name}`} onClick={() => onOpenConversation(contact)}>
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          {onSendTemplate && (
            <button type="button" className={ICON_BTN} title="Enviar template" aria-label={`Enviar template para ${name}`} onClick={() => onSendTemplate(contact)}>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          <Dropdown
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            align="right"
            className="w-48"
            anchor={
              <button
                type="button"
                className={ICON_BTN}
                title="Mais"
                aria-label={`Mais ações — ${name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="px-1 py-1 flex flex-col gap-0.5">
              {onOpenProfile && (
                <DropdownItem onClick={() => { setMenuOpen(false); onOpenProfile(contact) }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir ficha
                </DropdownItem>
              )}
              {contact.waId && (
                <DropdownItem onClick={() => { setMenuOpen(false); navigator.clipboard.writeText(contact.waId).catch(() => {}) }}>
                  <Phone className="w-3.5 h-3.5" /> Copiar telefone
                </DropdownItem>
              )}
              <DropdownItem onClick={() => { setMenuOpen(false); navigator.clipboard.writeText(name).catch(() => {}) }}>
                <Copy className="w-3.5 h-3.5" /> Copiar nome
              </DropdownItem>
            </div>
          </Dropdown>
        </div>
      </div>
      )}
    </div>
  )
}
