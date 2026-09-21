import { memo, useCallback } from 'react'
import {
  Camera, Mic, FileText, Video, MapPin, Sticker,
  ExternalLink, Phone, Copy,
  Bot, Megaphone, Users, AlertTriangle, Workflow,
} from 'lucide-react'
import { cn, chatRelTime, formatMessageTime, truncate } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useContextMenu } from '@/hooks/useContextMenu'
import { getAssignment, getAwaitingReply, isAiActive } from '@/lib/conversationSignals'
import { GUARD_LIST_BADGE_TITLE } from '@/lib/guardReason'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { Conversation } from '@/types'

const MEDIA_PREVIEW: Record<string, { icon: typeof Camera; label: string }> = {
  '[image]':    { icon: Camera,   label: 'Imagem' },
  '[imagen]':   { icon: Camera,   label: 'Imagem' },
  '[imagem]':   { icon: Camera,   label: 'Imagem' },
  '[photo]':    { icon: Camera,   label: 'Foto' },
  '[audio]':    { icon: Mic,      label: 'Áudio' },
  '[document]': { icon: FileText, label: 'Documento' },
  '[video]':    { icon: Video,    label: 'Vídeo' },
  '[location]': { icon: MapPin,   label: 'Localização' },
  '[sticker]':  { icon: Sticker,  label: 'Figurinha' },
}

function MessagePreview({ text }: { text: string }) {
  const key = text.trim().toLowerCase()
  const media = MEDIA_PREVIEW[key]
  if (media) {
    const Icon = media.icon
    return (
      <span className="inline-flex items-center gap-1">
        <Icon className="w-3.5 h-3.5 opacity-70" />
        <span>{media.label}</span>
      </span>
    )
  }
  return <>{truncate(text || '…', 52)}</>
}

/** Icon shown before the preview indicating who sent the last message.
 *  Client (inbound) shows no icon — the contact avatar already implies it. */
const SENDER_META: Record<'operator' | 'ai' | 'campaign' | 'rule', { icon: typeof Bot; title: string; className: string }> = {
  ai:       { icon: Bot,       title: 'Última mensagem enviada pela IA',                 className: 'text-surface-400' },
  campaign: { icon: Megaphone, title: 'Template enviado via campanha',                   className: 'text-surface-400' },
  operator: { icon: Users,     title: 'Enviada por um usuário da plataforma (Equipe)',   className: 'text-surface-400' },
  rule:     { icon: Workflow,  title: 'Resposta automática (encaminhamento/FAQ)',        className: 'text-surface-400' },
}

function SenderIndicator({ kind }: { kind?: Conversation['lastMessageSenderKind'] }) {
  if (!kind || kind === 'client') return null
  const meta = SENDER_META[kind]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span title={meta.title} className="inline-flex flex-shrink-0">
      <Icon className={cn('w-3.5 h-3.5', meta.className)} />
    </span>
  )
}

/** Human label for a conversation status — used by the "moved out of filter" pill. */
function statusLabel(status: Conversation['status']): string {
  return status === 'open' ? 'Aberta' : status === 'pending' ? 'Pendente' : status === 'resolved' ? 'Resolvida' : ''
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  /** True when this is the open conversation kept visible even though it no
   *  longer matches the active status filter (sticky until the operator opens
   *  another). Rendered dimmed + with a status pill so the mismatch is clear. */
  offFilter?: boolean
  onSelect: (conv: Conversation) => void
}

export const ConversationItem = memo(function ConversationItem({ conversation, isActive, offFilter = false, onSelect }: ConversationItemProps) {
  const { contact, lastMessagePreview, lastMessageSenderKind, lastMessageAt, unreadCount, assignedUser, tags, hasRecentAnomaly, status } =
    conversation
  const currentUserId = useAuth().user?.id

  const hasUnread = unreadCount > 0 && !isActive
  const aiActive = isAiActive(conversation)
  const assignment = getAssignment(conversation)
  const awaiting = getAwaitingReply(conversation)

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      { label: 'Abrir conversa', icon: ExternalLink, onClick: () => onSelect(conversation) },
    ]
    if (contact.waId) {
      items.push({
        label: 'Copiar telefone',
        icon: Phone,
        onClick: () => navigator.clipboard.writeText(contact.waId ?? '').catch(() => {}),
      })
    }
    items.push({
      label: 'Copiar nome',
      icon: Copy,
      onClick: () => navigator.clipboard.writeText(contact.displayName).catch(() => {}),
    })
    return items
  }, [conversation, contact, onSelect])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  // Densidade da lista (achado do relatório): o telefone completo tinha
  // linha própria, sempre visível, para um dado que só importa em raros
  // casos de desambiguação — agora só no title (hover/foco), sem custo de
  // espaço na leitura rápida. A informação continua acessível, só não
  // compete mais pela atenção em toda conversa da lista.
  const hoverTitle = contact.waId ? `${contact.displayName} · ${contact.waId}` : contact.displayName

  return (
    <button
      onClick={() => onSelect(conversation)}
      onContextMenu={onContextMenu}
      data-conv-id={conversation.id}
      title={hoverTitle}
      className={cn(
        // README 3.3: linha cheia, sem caixa/raio por item — só um estado de
        // fundo sutil. Ativa = --rowhover + acento inset 2px à esquerda
        // (substitui o hack de gradiente de borda do tema claro, removido de
        // index.css — CollapsibleSection/DataTable já usam este mesmo par).
        'relative w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-100',
        isActive
          ? 'bg-[var(--rowhover)] shadow-[inset_2px_0_0_0_var(--color-brand-500)]'
          : 'hover:bg-[var(--rowhover)]',
        offFilter && 'opacity-70',
      )}
    >
      {/* Avatar — sem o badge de canal do WhatsApp: toda conversa desta
          lista É WhatsApp (whatsappNumber é campo obrigatório em Conversation,
          e `channel` nunca é lido em nenhum lugar da UI hoje) — o selo
          repetia a mesma informação em 100% das linhas, sem distinguir nada. */}
      <div className="relative flex-shrink-0">
        <Avatar name={contact.displayName} imageUrl={contact.profilePicUrl} size="36" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + time */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          {/* CONV-LIST-16/17 (spec/1d-conversas.GAPS.md): peso 600 sempre —
              não-lida se sinaliza só pelo badge, o mock é explícito que o
              nome NÃO muda de peso/cor entre lida/não-lida. */}
          <span className="text-[13px] font-semibold text-surface-100 truncate">
            {contact.displayName}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {offFilter && (
              <span
                className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/25"
                title={`Movida para "${statusLabel(conversation.status)}" — não corresponde mais ao filtro atual`}
              >
                {statusLabel(conversation.status)}
              </span>
            )}
            <span className="text-[11px] text-surface-500">
              {formatMessageTime(lastMessageAt)}
            </span>
          </div>
        </div>

        {/* O número do WhatsApp saiu da linha própria fixa (era a "Row 2") —
            fica disponível via `title` no botão inteiro (hover/foco), não
            mais sempre visível. Ver reasoning acima e no PR/commit. */}

        {/* Row 2 (era Row 3): message preview + unread badge */}
        <div className="flex items-center justify-between gap-2">
          <div className={cn(
            'flex items-center gap-1 min-w-0 text-xs',
            'text-surface-400'
          )}>
            {lastMessageSenderKind === 'operator' ? null : <SenderIndicator kind={lastMessageSenderKind} />}
            <span className="truncate">
              {lastMessageSenderKind === 'operator' && <span className="text-surface-500">Você: </span>}
              <MessagePreview text={lastMessagePreview || '…'} />
            </span>
          </div>
          {hasUnread && (
            <Badge variant="unread" className="flex-shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>

        {/* Row 3 — R2-1D-LIST (RODADA-2.md): à esquerda UM chip de ator
            (IA âmbar OU humano verde OU "Resolvida" neutro, mutuamente
            exclusivos como no mock) + pontos das etiquetas; à direita só
            texto colorido de estado (sem ícone): espera, verificação. */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {status === "resolved" ? (
              <span className="inline-flex items-center h-[17px] px-1.5 rounded-[5px] border border-surface-700 bg-surface-900 text-[10.5px] font-semibold text-surface-400 flex-shrink-0">
                Resolvida
              </span>
            ) : aiActive ? (
              <span
                className="inline-flex items-center gap-1 h-[17px] px-1.5 rounded-[5px] text-[10.5px] font-bold text-accent-amber bg-accent-amber/[.12] flex-shrink-0"
                title="IA respondendo nesta conversa"
              >
                <Bot className="w-3 h-3" />
                IA
              </span>
            ) : assignment === "human" && assignedUser ? (
              <span
                className="inline-flex items-center h-[17px] px-1.5 rounded-[5px] text-[10.5px] font-bold text-accent-green bg-accent-green/[.12] truncate"
                title={`Atribuída a ${assignedUser.firstName}${assignedUser.lastName ? " " + assignedUser.lastName : ""}`}
              >
                {assignedUser.id === currentUserId ? "Você" : truncate(assignedUser.firstName, 12)}
              </span>
            ) : null}

            {/* Etiquetas como PONTO, não como pílula: preservam o código de cor
                sem competir com os sinais de ESTADO. Nome completo no title. */}
            {tags && tags.length > 0 && (
              <span className="inline-flex items-center gap-1 flex-shrink-0" title={tags.map((t) => t.name).join(" · ")}>
                {tags.slice(0, 2).map((tag) => (
                  <i key={tag.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} aria-hidden />
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0 pl-2 text-[10.5px]">
            {hasRecentAnomaly && (
              <span className="inline-flex items-center gap-1 font-semibold text-status-pending whitespace-nowrap" title={GUARD_LIST_BADGE_TITLE}>
                <AlertTriangle className="w-3 h-3" />
                Verificação pendente
              </span>
            )}
            {awaiting && (() => {
              // Urgência progressiva: âmbar vira vermelho quando a espera passa de 15min.
              const waitMin = (Date.now() - new Date(lastMessageAt).getTime()) / 60000
              const critical = waitMin >= 15
              return (
                <span
                  className={cn("font-semibold whitespace-nowrap", critical ? "text-danger" : "text-status-pending")}
                  title={`Cliente aguardando resposta há ${chatRelTime(lastMessageAt)}`}
                >
                  {chatRelTime(lastMessageAt)} sem resposta
                </span>
              )
            })()}
          </div>
        </div>
      </div>
    </button>
  )
})
