import { Bot, AlertTriangle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { DEMO_TAG_COLORS, type DemoConversation } from '../demoData'

/**
 * Linha da lista de Conversas — ESPELHA `conversations/ConversationList/
 * ConversationItem.tsx:119-270` classe a classe (o real não é importado: puxaria
 * useAuth/useContextMenu/sockets para a página pública). Se a linha real mudar,
 * mudar aqui junto.
 *   • container      ← :119-135 (linha cheia, ativa = --rowhover + inset 2px brand)
 *   • avatar 36      ← :143
 *   • nome/hora      ← :151-186 (13px/600 + 11px)
 *   • prévia + badge ← :195-218 (Badge unread)
 *   • chip IA neutro ← :221-233 (surface-200 sobre surface-700 — NÃO âmbar)
 *   • chip humano    ← :229-238 (accent-green sobre accent-green/12)
 *   • "Verificação pendente" ← :268-273 (status-pending + AlertTriangle)
 */
interface Props {
  conversation: DemoConversation
  active?: boolean
  /** "Você" no chip humano (o operador da demonstração assumiu). */
  humanIsYou?: boolean
  /** Selo âmbar "Verificação pendente" (guard reteve uma mensagem). */
  pendingReview?: boolean
}

export function StageConvRow({ conversation, active = false, humanIsYou = false, pendingReview = false }: Props) {
  const { name, preview, actor, time, unread, tags } = conversation
  const operatorPreview = preview.startsWith('Você: ')
  return (
    <div
      className={cn(
        'relative w-full flex items-start gap-2.5 px-3 py-2.5 text-left',
        'border-b border-surface-700',
        active && 'bg-[var(--rowhover)] shadow-[inset_2px_0_0_0_var(--color-brand-500)]',
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar name={name} size="36" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-surface-100 truncate">{name}</span>
          <span className="text-[11px] text-surface-500 flex-shrink-0">{time}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 text-xs text-surface-400">
            <span className="truncate">
              {operatorPreview && <span className="text-surface-500">Você: </span>}
              {operatorPreview ? preview.slice('Você: '.length) : preview}
            </span>
          </div>
          {unread ? <Badge variant="unread" className="flex-shrink-0">{unread}</Badge> : null}
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {actor === 'ai' ? (
              <span className="inline-flex items-center gap-1 h-[17px] px-1.5 rounded-[5px] text-[10.5px] font-bold text-surface-200 bg-surface-700 flex-shrink-0">
                <Bot className="w-3 h-3" />
                IA
              </span>
            ) : actor === 'human' ? (
              <span className="inline-flex items-center h-[17px] px-1.5 rounded-[5px] text-[10.5px] font-bold text-accent-green bg-accent-green/[.12] truncate">
                {humanIsYou ? 'Você' : 'Atendente'}
              </span>
            ) : null}
            {tags && tags.length > 0 && (
              <span className="inline-flex items-center gap-1 flex-shrink-0">
                {tags.slice(0, 2).map((t, i) => (
                  <i key={t} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEMO_TAG_COLORS[i % DEMO_TAG_COLORS.length] }} aria-hidden />
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0 pl-2 text-[10.5px]">
            {pendingReview && (
              <span className="inline-flex items-center gap-1 font-semibold text-status-pending whitespace-nowrap">
                <AlertTriangle className="w-3 h-3" />
                Verificação pendente
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
