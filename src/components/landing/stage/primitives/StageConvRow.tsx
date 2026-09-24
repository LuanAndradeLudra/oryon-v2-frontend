import { Bot, AlertTriangle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { DEMO_TAG_COLORS, type DemoConversation } from '../demoData'
import { useStageAmbient } from '../stageContext'

/**
 * Linha da lista de Conversas — ESPELHA `conversations/ConversationList/
 * ConversationItem.tsx:119-270` classe a classe (o real não é importado: puxaria
 * useAuth/useContextMenu/sockets para a página pública). Se a linha real mudar,
 * mudar aqui junto.
 *   • container      ← :119-135 (linha cheia, ativa = --rowhover + inset 2px brand)
 *   • avatar 36      ← :143 — DOIS `ui/Avatar` reais (18px mobile / 36px `lg:`,
 *     um escondido por vez): a técnica da Attio pede duas medidas literais, não
 *     um `transform: scale` sobre um único avatar (perderia nitidez).
 *   • nome/hora      ← :151-186 (13px/600 + 11px; aqui 6.5/5.5 no mobile)
 *   • prévia + badge ← :195-218 (contador não-lido — mesma técnica de 2 tamanhos)
 *   • chip IA neutro ← :221-233 (surface-200 sobre surface-700 — NÃO âmbar);
 *     `.ambient-ring` (index.css) enquanto a IA está respondendo de verdade.
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
  /** IA respondendo agora mesmo — pulso de atenção no chip. */
  aiLive?: boolean
}

export function StageConvRow({ conversation, active = false, humanIsYou = false, pendingReview = false, aiLive = false }: Props) {
  const ambient = useStageAmbient()
  const { name, preview, actor, time, unread, tags } = conversation
  const operatorPreview = preview.startsWith('Você: ')
  return (
    <div
      className={cn(
        'relative w-full flex items-start gap-1.5 lg:gap-2.5 px-1.5 lg:px-3 py-1.5 lg:py-2.5 text-left',
        'border-b border-[0.5px] lg:border-[1px] border-surface-700',
        active && 'bg-[var(--rowhover)] shadow-[inset_1px_0_0_0_var(--color-brand-500)] lg:shadow-[inset_2px_0_0_0_var(--color-brand-500)]',
      )}
    >
      <div className="relative flex-shrink-0">
        <span className="lg:hidden"><Avatar name={name} size="2xs" /></span>
        <span className="hidden lg:inline-block"><Avatar name={name} size="36" /></span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 lg:gap-2 mb-0.5">
          <span className="text-[6.5px] lg:text-[13px] leading-[9px] lg:leading-[18px] font-semibold text-surface-100 truncate">{name}</span>
          <span className="text-[5.5px] lg:text-[11px] text-surface-500 flex-shrink-0">{time}</span>
        </div>

        <div className="flex items-center justify-between gap-1 lg:gap-2">
          <div className="flex items-center gap-0.5 lg:gap-1 min-w-0 text-[5.5px] lg:text-xs text-surface-400">
            <span className="truncate">
              {operatorPreview && <span className="text-surface-500">Você: </span>}
              {operatorPreview ? preview.slice('Você: '.length) : preview}
            </span>
          </div>
          {unread ? (
            <span className="inline-flex items-center justify-center min-w-[6px] h-[6px] lg:min-w-[18px] lg:h-[18px] px-[2px] lg:px-[5px] rounded-full bg-brand-500 text-[var(--color-btn-primary-fg)] text-[4px] lg:text-[10.5px] font-bold tabular-nums flex-shrink-0">
              {unread}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5 lg:gap-1.5 mt-0.5 lg:mt-1">
          <div className="flex items-center gap-0.5 lg:gap-1.5 min-w-0">
            {actor === 'ai' ? (
              <span className="relative inline-flex items-center gap-0.5 lg:gap-1 h-[8.5px] lg:h-[17px] px-[3px] lg:px-1.5 rounded-[2.5px] lg:rounded-[5px] text-[5.25px] lg:text-[10.5px] font-bold text-surface-200 bg-surface-700 flex-shrink-0">
                {ambient && aiLive && <span aria-hidden className="absolute inset-0 rounded-[2.5px] lg:rounded-[5px] border border-surface-400 ambient-ring" />}
                <Bot className="w-[5px] h-[5px] lg:w-3 lg:h-3" />
                IA
              </span>
            ) : actor === 'human' ? (
              <span className="inline-flex items-center h-[8.5px] lg:h-[17px] px-[3px] lg:px-1.5 rounded-[2.5px] lg:rounded-[5px] text-[5.25px] lg:text-[10.5px] font-bold text-accent-green bg-accent-green/[.12] truncate">
                {humanIsYou ? 'Você' : 'Atendente'}
              </span>
            ) : null}
            {tags && tags.length > 0 && (
              <span className="inline-flex items-center gap-[2px] lg:gap-1 flex-shrink-0">
                {tags.slice(0, 2).map((t, i) => (
                  <i key={t} className="w-[3px] h-[3px] lg:w-1.5 lg:h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: DEMO_TAG_COLORS[i % DEMO_TAG_COLORS.length] }} aria-hidden />
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 lg:gap-2 ml-auto flex-shrink-0 pl-1 lg:pl-2 text-[5.25px] lg:text-[10.5px]">
            {pendingReview && (
              <span className="inline-flex items-center gap-0.5 lg:gap-1 font-semibold text-status-pending whitespace-nowrap">
                <AlertTriangle className="w-[5px] h-[5px] lg:w-3 lg:h-3" />
                <span className="hidden lg:inline">Verificação pendente</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
