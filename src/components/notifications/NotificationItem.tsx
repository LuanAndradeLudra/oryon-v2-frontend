import { useNavigate } from 'react-router-dom'
import { Archive, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
 * borda esquerda em perigo + chip 18px. Ação principal em linha própria;
 * arquivar/não lida no lugar do horário (SCRUM-1253, 11/10).
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
        'group relative mx-2 my-0.5 flex items-start gap-3 pl-2.5 pr-2 py-2 rounded-[6px] cursor-pointer transition-colors',
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
          <p className={cn('text-[13px] leading-[18px] flex-1 min-w-0 line-clamp-2', n.isRead ? 'text-surface-300' : 'text-surface-200')}>
            {sentence.actor && <span className={cn(n.isRead ? 'font-medium text-surface-200' : 'font-semibold text-surface-50')}>{sentence.actor}</span>}
            {sentence.object && <span className={cn(n.isRead ? 'font-medium text-surface-200' : 'font-semibold text-surface-50')}>{sentence.object}</span>}
            {sentence.action && <span> {sentence.action}</span>}
          </p>
        </div>
        {(sentence.state || sentence.excerpt || sentence.context) && (
          <p className={cn('text-xs leading-[17px] mt-px truncate', n.isRead ? 'text-surface-500' : 'text-surface-400')}>
            {sentence.state && <span className={cn('font-medium', t ? t.text : '')}>{sentence.state.text}</span>}
            {!sentence.state && sentence.excerpt && <span>{sentence.excerpt}</span>}
            {sentence.context && <span className="text-surface-500">{(sentence.state || sentence.excerpt) ? ' · ' : ''}{sentence.context}</span>}
          </p>
        )}
        {action && (
          // SCRUM-1253 (PO, 11/10): a ação principal tem linha própria, sempre
          // visível — antes flutuava no hover e cobria o título.
          // Botão da plataforma (28px): a ação principal em acento suave (teal),
          // as demais em neutro — o mesmo vocabulário do resto do app.
          <Button
            size="sm"
            variant={action.variant === 'primary' ? 'secondary' : 'neutral'}
            className="mt-2"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden />}
            onClick={(e) => { e.stopPropagation(); navigate(action.href) }}
          >
            {action.label}
          </Button>
        )}
      </div>
      {/* SCRUM-1253 (PO, 11/10): coluna de largura fixa. O horário dá lugar às
          ações secundárias no hover/foco — sem invadir o texto nem mudar a
          altura. No toque (sem hover), horário em cima e ações embaixo, 36px. */}
      <div className="flex-none w-[60px] flex flex-col items-end gap-1">
        <span className="text-xs text-surface-500 tabular-nums leading-[18px] group-hover:hidden group-focus-within:hidden [@media(hover:none)]:!block">
          {formatListTime(n.createdAt)}
        </span>
        <div className="hidden group-hover:flex group-focus-within:flex [@media(hover:none)]:!flex items-center gap-0.5 -mt-0.5">
          {onMarkUnread && (
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              className="[@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9"
              title="Marcar como não lida (U)"
              aria-label="Marcar como não lida"
              onClick={(e) => { e.stopPropagation(); onMarkUnread() }}
            >
              <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
            </Button>
          )}
          {onArchive && (
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              className="[@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9"
              title="Arquivar (E)"
              aria-label="Arquivar"
              onClick={(e) => { e.stopPropagation(); onArchive() }}
            >
              <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Kbd do rodapé de atalhos — 18px, raio 4 (--radius-2xs, canvas RAD-09). */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-2xs border border-[var(--bd2)] bg-surface-900 text-surface-400 font-mono text-[11px] leading-none">
      {children}
    </span>
  )
}
