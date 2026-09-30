import { useNavigate } from 'react-router-dom'
import { Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/hooks/useNotifications'
import {
  CATEGORY_STYLE, categoryOf, contactSubject, inlineActionFor, formatListTime, avatarColorFor, initialsOf,
} from '@/lib/notificationsUx'
import { iconFor } from './notificationsMeta'
import { sentenceFor, toneFor } from './notificationSentence'

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
  const Icon = iconFor(n.type)
  const subject = contactSubject(n)
  const action = inlineActionFor(n)
  const sentence = sentenceFor(n)
  const tone = toneFor(n, sentence)
  // v3 — direção A (23/09): frase estruturada (ator · ação · estado ·
  // contexto). A ÚNICA cor da linha é o estado: perigo (falha/segurança),
  // aviso (aguardando você), ok (concluído); informativo não tem cor.
  const tom = {
    danger: { dot: 'bg-danger', disc: 'border-danger/40 text-danger', text: 'text-danger' },
    warn:   { dot: 'bg-warning', disc: 'border-warning/40 text-warning', text: 'text-warning' },
    ok:     { dot: 'bg-success', disc: 'border-success/40 text-success', text: 'text-success' },
  } as const
  const t = tone ? tom[tone] : null
  const avatarName = subject?.name ?? (sentence.actor && !sentence.object ? sentence.actor : undefined)
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
      <span
        className={cn('absolute left-0 top-[19px] w-1.5 h-1.5 rounded-full', !n.isRead ? (t ? t.dot : 'bg-brand-500') : 'bg-transparent')}
        aria-hidden
      />
      {avatarName ? (
        <span
          className={cn('w-7 h-7 mt-0.5 rounded-full flex-none flex items-center justify-center text-[11px] font-semibold text-white', avatarColorFor(avatarName))}
          aria-hidden
        >
          {initialsOf(avatarName)}
        </span>
      ) : onCategoryClick ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCategoryClick([n.type]) }}
          title={`Filtrar: ${style.label}`}
          aria-label={`Filtrar por ${style.label}`}
          className={cn(
            'w-7 h-7 mt-0.5 rounded-full flex items-center justify-center flex-none border bg-[var(--sf2)] transition-colors',
            t ? t.disc : 'border-surface-700 text-surface-400 hover:text-surface-100',
          )}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      ) : (
        // Sem handler o disco é só marca do tipo (as seções já categorizam):
        // um <button> sem ação seria alvo morto no toque (achado do Farol).
        <span
          title={style.label}
          aria-hidden
          className={cn(
            'w-7 h-7 mt-0.5 rounded-full flex items-center justify-center flex-none border bg-[var(--sf2)]',
            t ? t.disc : 'border-surface-700 text-surface-400',
          )}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className={cn('text-[13px] leading-[18px] flex-1 min-w-0 truncate', n.isRead ? 'text-surface-300' : 'text-surface-200')}>
            {sentence.actor && <span className={cn(n.isRead ? 'font-medium text-surface-200' : 'font-semibold text-surface-50')}>{sentence.actor}</span>}
            {sentence.object && <span className={cn(n.isRead ? 'font-medium text-surface-200' : 'font-semibold text-surface-50')}>{sentence.object}</span>}
            {sentence.action && <span> {sentence.action}</span>}
          </p>
          <span className="text-[11px] text-surface-500 tabular-nums flex-none group-hover:opacity-0 [@media(pointer:coarse)]:group-hover:opacity-100 [@media(hover:none)]:group-hover:opacity-100 transition-opacity">
            {formatListTime(n.createdAt)}
          </span>
        </div>
        {(sentence.state || sentence.excerpt || sentence.context) && (
          <p className={cn('text-xs leading-[17px] mt-px truncate', n.isRead ? 'text-surface-500' : 'text-surface-400')}>
            {sentence.state && <span className={cn('font-medium', t ? t.text : '')}>{sentence.state.text}</span>}
            {!sentence.state && sentence.excerpt && <span>{sentence.excerpt}</span>}
            {sentence.context && <span className="text-surface-500">{(sentence.state || sentence.excerpt) ? ' · ' : ''}{sentence.context}</span>}
          </p>
        )}
      </div>
      {/* Toque (pointer: coarse / hover: none) não tem hover: as ações passam a
          coluna estática à direita, sempre visíveis, com alvos de 36px. */}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity [@media(pointer:coarse)]:static [@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:self-start [@media(pointer:coarse)]:ml-1 [@media(hover:none)]:static [@media(hover:none)]:opacity-100 [@media(hover:none)]:self-start [@media(hover:none)]:ml-1">
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
