import { useNavigate } from 'react-router-dom'
import { Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/hooks/useNotifications'
import {
  CATEGORY_STYLE, categoryOf, priorityOf, contactSubject, inlineActionFor, formatListTime, avatarColorFor, initialsOf,
} from '@/lib/notificationsUx'
import { iconFor } from './notificationsMeta'

/**
 * Item de notificação — SCRUM-1097 (23/09). Extraído do TopBar para ser a
 * MESMA peça no popover do sino (desktop) e na página /notifications
 * (mobile): antes eram duas UIs sem nada em comum (inventário do Farol).
 * Direção C: sem faixa colorida de 3px, sem chip de categoria por linha (o
 * ladrilho colorido já diz a categoria e é clicável = filtra), urgente =
 * borda esquerda em perigo + chip 18px, ações no hover em 28px.
 */
export function NotificationItem({
  n,
  onClick,
  onArchive,
  onMarkUnread,
  onCategoryClick,
  isFocused = false,
}: {
  n: AppNotification
  onClick: () => void
  onArchive?: () => void
  onMarkUnread?: () => void
  onCategoryClick?: (types: string[]) => void
  isFocused?: boolean
}) {
  const navigate = useNavigate()
  const category = categoryOf(n.type)
  const style = CATEGORY_STYLE[category]
  const priority = priorityOf(n)
  const Icon = iconFor(n.type)
  const subject = contactSubject(n)
  const action = inlineActionFor(n)
  const urgente = priority === 'urgent'
  // v2 (23/09, feedback do PO: "não gosto do visual e dos ícones"). Gramática
  // dos inboxes modernos (Linear, Notion, Vercel, GitHub): MONOCROMÁTICO —
  // nada de ladrilho colorido por categoria; o único elemento visual é o
  // ator (avatar com iniciais) ou, sem ator, um ícone mudo num disco de
  // 28px na cor da superfície. Não lida = peso 600 + ponto de 6px. Linha
  // como "pílula" dentro da lista (margem lateral, raio 7, hover em
  // --rowhover), sem divisor entre itens. Urgente = ponto e disco em perigo.
  return (
    <div
      onClick={onClick}
      role="listitem"
      aria-label={`${n.title}. ${n.isRead ? 'Lida' : 'Não lida'}. ${formatListTime(n.createdAt)}`}
      className={cn(
        'group relative mx-2 my-0.5 flex items-start gap-3 pl-2.5 pr-2 py-2 rounded-sm cursor-pointer transition-colors',
        'hover:bg-[var(--rowhover)]',
        isFocused && 'ring-1 ring-inset ring-brand-500',
        '[@media(pointer:coarse)]:min-h-[64px]',
      )}
    >
      {/* Ponto de não lida — alinhado ao meio do avatar/disco. */}
      <span
        className={cn('absolute left-0 top-[19px] w-1.5 h-1.5 rounded-full', !n.isRead ? (urgente ? 'bg-danger' : 'bg-brand-500') : 'bg-transparent')}
        aria-hidden
      />
      {subject ? (
        <span className="relative flex-none mt-0.5">
          <span
            className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white', avatarColorFor(subject.name))}
            aria-hidden
          >
            {initialsOf(subject.name)}
          </span>
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCategoryClick?.([n.type]) }}
          title={`Filtrar: ${style.label}`}
          aria-label={`Filtrar por ${style.label}`}
          className={cn(
            'w-7 h-7 mt-0.5 rounded-full flex items-center justify-center flex-none border transition-colors',
            urgente
              ? 'border-danger/40 text-danger bg-[var(--sf2)]'
              : 'border-surface-700 bg-[var(--sf2)] text-surface-400 hover:text-surface-100',
          )}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className={cn('text-[13px] leading-[18px] flex-1 min-w-0 truncate', !n.isRead ? 'font-semibold text-surface-50' : 'font-medium text-surface-200')}>
            {n.title}
          </p>
          <span className="text-[11px] text-surface-500 tabular-nums flex-none group-hover:opacity-0 transition-opacity">
            {formatListTime(n.createdAt)}
          </span>
        </div>
        {n.description && (
          <p className={cn('text-xs leading-[17px] mt-px', !n.isRead ? 'text-surface-300 line-clamp-2' : 'text-surface-500 line-clamp-1')}>
            {n.description}
          </p>
        )}
        {urgente && (
          <p className="text-[11px] leading-[16px] text-danger font-medium mt-0.5">Urgente</p>
        )}
      </div>
      {/* Ações no hover — ocupam o lugar do horário. */}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {action && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(action.href) }}
            className={cn(
              'h-7 px-2 rounded-xs text-[11px] font-semibold mr-0.5',
              action.variant === 'primary'
                ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] hover:brightness-90'
                : 'text-surface-200 hover:bg-[var(--rowhover)]',
            )}
          >
            {action.label}
          </button>
        )}
        {onMarkUnread && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkUnread() }}
            className="w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9"
            title="Marcar como não lida (U)"
            aria-label="Marcar como não lida"
          >
            <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
          </button>
        )}
        {onArchive && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onArchive() }}
            className="w-7 h-7 rounded-xs flex items-center justify-center text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9"
            title="Arquivar (E)"
            aria-label="Arquivar"
          >
            <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  )
}

/** Kbd do rodapé de atalhos — 18px, raio 4 (--radius-2xs, canvas RAD-09). */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-2xs border border-[var(--bd2)] bg-surface-900 text-surface-400 font-mono text-[10.5px] leading-none">
      {children}
    </span>
  )
}
