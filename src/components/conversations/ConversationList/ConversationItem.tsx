import { memo, useCallback } from 'react'
import {
  ExternalLink, Phone, Copy,
  Bot, Megaphone, Users, AlertTriangle, Workflow,
} from 'lucide-react'
import { cn, chatRelTime, getInitials, truncate } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useContextMenu } from '@/hooks/useContextMenu'
import { estadoDaIA, getAssignment, getAwaitingReply } from '@/lib/conversationSignals'
import { useLinhasDaIA } from '@/hooks/useLinhasComIA'
import { useRelogioDoMinuto } from '@/hooks/useRelogioDoMinuto'
import { renderHighlightedSnippet } from '@/lib/searchHighlight'
import { GUARD_LIST_BADGE_TITLE } from '@/lib/guardReason'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { Conversation } from '@/types'
import { dataCurta, esperaCurta, tomDaEspera } from '@/lib/tempoCurto'
import { PreviewDaMensagem } from './PreviewDaMensagem'
import { SeloForaDoFiltro } from '@/components/ui/SeloForaDoFiltro'

/** Icon shown before the preview indicating who sent the last message.
 *  Client (inbound) shows no icon — the contact avatar already implies it. */
const SENDER_META: Record<'operator' | 'ai' | 'campaign' | 'rule', { icon: typeof Bot; title: string; className: string }> = {
  ai:       { icon: Bot,       title: 'Última mensagem enviada pela IA',                 className: 'text-surface-400' },
  campaign: { icon: Megaphone, title: 'Enviada por campanha ou automação',              className: 'text-surface-400' },
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
  const { contact, lastMessagePreview, lastMessageSenderKind, lastMessageType, lastMessageMeta, lastMessageAt, unreadCount, assignedUser, tags, hasRecentAnomaly, status, searchSnippet } =
    conversation
  const currentUserId = useAuth().user?.id

  const hasUnread = unreadCount > 0 && !isActive
  const assignment = getAssignment(conversation)
  const linhasDaIA = useLinhasDaIA()
  // O relógio compartilhado faz a espera andar sozinha (a linha é memo).
  const agora = useRelogioDoMinuto()
  const awaiting = getAwaitingReply(conversation, linhasDaIA.linhasComIA, agora)
  const estadoIA = estadoDaIA(conversation, linhasDaIA)

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
          ? 'conv-item-ativa bg-[var(--rowhover)] shadow-[inset_2px_0_0_0_var(--color-brand-500)]'
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
              // Homologação 06/10 (SCRUM-1253, PO escolheu a opção B): a conversa
              // ABERTA fica na lista mesmo fora do filtro (assumir na Fila não a
              // tira de baixo do operador; J/K não perde a posição) — mas o selo
              // diz isso com todas as letras, em vez de só repetir o status.
              <SeloForaDoFiltro
                title={`Esta conversa não corresponde ao filtro atual (status: ${statusLabel(conversation.status)}). Fica visível porque está aberta.`}
              />
            )}
            <span className="text-[11px] text-surface-500">
              {dataCurta(lastMessageAt, agora)}
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
            {/* SCRUM-1096 — quando o match veio do CONTEÚDO da mensagem (não do
                nome/telefone do contato), o trecho destacado substitui o
                preview padrão. O SenderIndicator some junto: ele descreve
                quem mandou a ÚLTIMA mensagem, e o trecho aqui pode ser de
                qualquer mensagem antiga que bateu — misturar os dois confundiria. */}
            {searchSnippet ? (
              <span className="truncate">{renderHighlightedSnippet(searchSnippet)}</span>
            ) : (
              <>
                {/* Com a origem (C2: "Campanha · X"…) o próprio preview já traz o ícone. */}
                {lastMessageSenderKind === 'operator' || lastMessageMeta ? null : <SenderIndicator kind={lastMessageSenderKind} />}
                <span className="truncate">
                  {lastMessageSenderKind === 'operator' && <span className="text-surface-500">Você: </span>}
                  <PreviewDaMensagem text={lastMessagePreview || '…'} contexto={{ tipo: lastMessageType, meta: lastMessageMeta, remetente: lastMessageSenderKind }} />
                </span>
              </>
            )}
          </div>
          {hasUnread && (
            <Badge variant="unread" className="flex-shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>

        {/* Row 3 — R2-1D-LIST (RODADA-2.md): à esquerda os chips de ator
            + pontos das etiquetas; à direita só texto colorido de estado.
            28/09: IA e responsável são DOIS eixos — o chip "IA" escondia o
            responsável, aparecia em linha sem agente e em conversa que a IA
            já tinha passado para a equipe (ver estadoDaIA). */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {status === "resolved" ? (
              /* PO, 23/09: mesma tinta leve do status no menu do cabeçalho
                 (verde translúcido), não mais o chip neutro. */
              <span className="inline-flex items-center h-5 px-1.5 rounded-[6px] text-[11px] font-semibold bg-cstatus-resolved/[.14] text-cstatus-resolved flex-shrink-0">
                Resolvida
              </span>
            ) : status === "pending" ? (
              /* SCRUM-1253 (PO, 06/10): "Pendente" é o STATUS — selo próprio,
                 na mesma forma do "Resolvida" (âmbar = cor de Pendente). Ele
                 substitui o antigo "IA passou", que era o mesmo pendente lido
                 por outro ângulo (pendente + IA sem pausa) e confundia. */
              <span className="inline-flex items-center h-5 px-1.5 rounded-[6px] text-[11px] font-semibold bg-cstatus-pending/[.14] text-cstatus-pending flex-shrink-0">
                {/* SCRUM-1253 (PO, 06/10 — D11): o selo diz PARA QUEM a conversa
                    espera. Fila = pendentes sem responsável. */}
                {!assignedUser ? 'Na fila'
                  : assignedUser.id === currentUserId ? 'Aguardando você'
                  : `Aguardando ${truncate(assignedUser.firstName, 12)}`}
              </span>
            ) : null}
            {/* Revisão 11/10: "IA" só quando a IA está respondendo de fato. Em
                'passou' (pendente: a IA passou para a equipe) o selo de status
                já diz "Na fila"/"Aguardando <nome>" — o chip "IA respondendo"
                ali mentia. */}
            {status !== "resolved" && estadoIA === 'atendendo' ? (
              <span
                // PO, 23/09: IA é neutro (cinza claro no escuro, cinza mais
                // escuro no claro — os tokens surface-* invertem por tema), não
                // âmbar: âmbar agora é a cor do status "Pendente".
                // SCRUM-1253 (PO, 06/10): sem pílula — só o ícone e "IA". A
                // pílula cinza sumia na linha selecionada; sem fundo, não há
                // contraste a perder.
                className="inline-flex items-center gap-1 h-5 text-[11px] font-normal text-surface-400 flex-shrink-0"
                title="IA respondendo nesta conversa"
              >
                <Bot className="w-3 h-3" />
                IA
              </span>
            ) : null}
            {status !== "resolved" && assignment === "human" && assignedUser && status !== "pending" ? (
              <span
                // SCRUM-1253 (PO, 06/10): mini avatar do operador (forma e
                // gradiente do <Avatar kind="operator">) + nome neutro. O selo
                // verde saiu — brigava com o "Resolvida", que fica como o único
                // selo verde da linha. Iniciais para qualquer operador.
                className="inline-flex items-center gap-1 min-w-0 h-5 text-[11px] font-normal text-surface-400"
                title={`Atribuída a ${assignedUser.firstName}${assignedUser.lastName ? " " + assignedUser.lastName : ""}`}
              >
                <span className="avatar-operador w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[7.5px] font-semibold" aria-hidden>
                  {getInitials(`${assignedUser.firstName} ${assignedUser.lastName ?? ""}`.trim())}
                </span>
                <span className="truncate">{assignedUser.id === currentUserId ? "Você" : truncate(assignedUser.firstName, 12)}</span>
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

          <div className="flex items-center gap-2 ml-auto flex-shrink-0 pl-2 text-[11px]">
            {hasRecentAnomaly && (
              <span className="inline-flex items-center gap-1 font-semibold text-status-pending whitespace-nowrap" title={GUARD_LIST_BADGE_TITLE}>
                <AlertTriangle className="w-3 h-3" />
                Verificação pendente
              </span>
            )}
            {awaiting && (() => {
              // SCRUM-1253 (PO, 06/10): urgência em degraus — ver tomDaEspera.
              const tom = tomDaEspera(awaiting.minutes)
              return (
                <span
                  className={cn('inline-flex items-center gap-1 whitespace-nowrap', tom === 'atencao' ? 'text-status-pending font-medium' : 'text-surface-400')}
                  title={`Cliente aguardando resposta há ${chatRelTime(lastMessageAt)}`}
                >
                  {tom === 'atrasada' && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-danger" />}
                  {esperaCurta(awaiting.minutes)} sem resposta
                </span>
              )
            })()}
          </div>
        </div>
      </div>
    </button>
  )
})
