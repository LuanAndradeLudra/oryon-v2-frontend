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
  // Direção C: sem a faixa colorida de 3px à esquerda (a categoria já está
  // na cor do ladrilho), sem chip de categoria por linha (vira texto mudo
  // clicável), urgente = borda esquerda em perigo + chip de 18px. Ações
  // aparecem no hover como botões de ícone de 28px. Alvo: ~64px por item.
  return (
    <div
      onClick={onClick}
      role="listitem"
      aria-label={`${n.title}. ${n.isRead ? 'Lida' : 'Não lida'}. ${formatListTime(n.createdAt)}`}
      className={cn(
        'group relative flex items-start gap-2.5 pl-3 pr-2 py-2.5 border-b border-surface-700 cursor-pointer transition-colors',
        !n.isRead ? 'bg-[var(--sf2)]' : 'bg-transparent',
        'hover:bg-[var(--rowhover)]',
        isFocused && 'ring-1 ring-inset ring-brand-500',
        priority === 'urgent' && 'border-l-2 border-l-danger',
        '[@media(pointer:coarse)]:min-h-[64px]',
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mt-[9px] flex-none', !n.isRead ? 'bg-brand-500' : 'bg-transparent')} aria-hidden />
      {subject ? (
        <span className="relative flex-none">
          <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white', avatarColorFor(subject.name))} aria-hidden>
            {initialsOf(subject.name)}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-[var(--color-overlay)] bg-[var(--sf2)]">
            <Icon className="w-2 h-2 text-surface-300" />
          </span>
        </span>
      ) : (
        <button
          type="button"
          style={{ ['--chip']: style.chip } as React.CSSProperties}
          onClick={(e) => { e.stopPropagation(); onCategoryClick?.([n.type]) }}
          className="color-chip-soft w-7 h-7 rounded-xs flex items-center justify-center flex-none border hover:brightness-110"
          title={`Filtrar: ${style.label}`}
          aria-label={`Filtrar por ${style.label}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className={cn('text-[13px] leading-[18px] flex-1 min-w-0 truncate', !n.isRead ? 'font-semibold text-surface-50' : 'font-medium text-surface-200')}>
            {n.title}
          </p>
          {priority === 'urgent' && (
            <span
              style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
              className="color-chip-soft border inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-none"
            >
              Urgente
            </span>
          )}
          <span className="text-[11px] text-surface-500 tabular-nums flex-none group-hover:opacity-0 transition-opacity">{formatListTime(n.createdAt)}</span>
        </div>
        {n.description && (
          <p className={cn('text-xs leading-[17px] mt-0.5', !n.isRead ? 'text-surface-300 line-clamp-2' : 'text-surface-500 line-clamp-1')}>
            {n.description}
          </p>
        )}
      </div>
      {/* Ações no hover — 28px, --rowhover; ocupam o lugar do horário. */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {action && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(action.href) }}
            className={cn(
              'h-7 px-2 rounded-xs text-[11px] font-semibold mr-1',
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
            <Archive className="w-3.5 h-3.5" />
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
