import { Bot, Check, CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Banner } from '@/components/ui/Banner'
import { cn } from '@/lib/utils'
import { StageReveal } from '../StageMotion'

/**
 * Bolha de mensagem — ESPELHA `conversations/ChatWindow/MessageBubble.tsx`:
 *   • linha        ← :765-775 ('group flex items-end gap-2', outbound = row-reverse)
 *   • coluna       ← :788 (max-w-[65%])
 *   • bolha        ← :805-806 (raio 10, cauda 3px na 1ª do grupo; bg-bubble-in/out)
 *   • avatar 24    ← `SenderAvatar` :66-89 (contato = Avatar xs; IA = tile
 *                    .avatar-operador + Bot; operador = Avatar kind="operator")
 *   • rodapé/hora  ← :850-870 (10.5px) + `StatusIcon` :112-117 (Check / CheckCheck)
 * Sem MessageBubble real: ele arrasta WhatsAppText, registry de renderers, menu
 * de contexto e mutações. Texto sempre completo (sem typewriter — a cena é um
 * estado estático, não um roteiro); entrada por `.reveal` (desfoque -> nítido).
 */
export type StageSender =
  | { kind: 'contact'; name: string }
  | { kind: 'ai' }
  | { kind: 'operator'; name: string }

interface BubbleProps {
  sender: StageSender
  text: string
  time: string
  status?: 'sent' | 'delivered' | 'read'
  /** 1ª bolha do grupo: mostra avatar + cauda de 3px. */
  first?: boolean
  /** Escalona a entrada (`.reveal`) em relação às bolhas anteriores. */
  delayMs?: number
}

function SenderAvatar({ sender, small }: { sender: StageSender; small: boolean }) {
  const size = small ? '2xs' : ('xs' as const)
  if (sender.kind === 'contact') return <Avatar name={sender.name} size={size} />
  if (sender.kind === 'operator') return <Avatar name={sender.name} size={size} kind="operator" />
  return (
    <div className="w-[10px] h-[10px] lg:w-6 lg:h-6 rounded-[30%] avatar-operador flex items-center justify-center flex-shrink-0">
      <Bot className="w-[5px] h-[5px] lg:w-3.5 lg:h-3.5" strokeWidth={1.75} />
    </div>
  )
}

function StatusIcon({ status }: { status: 'sent' | 'delivered' | 'read' }) {
  const cls = 'w-[4.5px] h-[4.5px] lg:w-3 lg:h-3'
  if (status === 'sent') return <Check className={cn(cls, 'text-bubble-out-time')} />
  if (status === 'delivered') return <CheckCheck className={cn(cls, 'text-bubble-out-time')} />
  return <CheckCheck className={cn(cls, 'text-brand-300')} />
}

export function StageBubble({ sender, text, time, status, first = true, delayMs = 0 }: BubbleProps) {
  const isOutbound = sender.kind !== 'contact'
  return (
    <StageReveal className="mt-1.5 lg:mt-3" delayMs={delayMs}>
      <div className={cn('flex items-end gap-1 lg:gap-2', isOutbound ? 'flex-row-reverse' : 'flex-row')}>
        {first ? (
          <>
            <span className="lg:hidden"><SenderAvatar sender={sender} small /></span>
            <span className="hidden lg:inline-block"><SenderAvatar sender={sender} small={false} /></span>
          </>
        ) : (
          <div className="w-[10px] h-[10px] lg:w-6 lg:h-6 flex-shrink-0" aria-hidden />
        )}
        <div className={cn('flex flex-col max-w-[65%] min-w-0', isOutbound ? 'items-end' : 'items-start')}>
          <div
            className={cn(
              'relative px-1.5 py-1 lg:px-3 lg:py-2 rounded-[5px] lg:rounded-[10px]',
              isOutbound
                ? 'bubble-out-surface bg-bubble-out text-bubble-out-fg'
                : 'bubble-in-elevate bg-bubble-in text-[color:var(--color-bubble-in-fg,#f1f5f9)]',
              first && isOutbound && 'rounded-br-[1.5px] lg:rounded-br-[3px]',
              first && !isOutbound && 'rounded-bl-[1.5px] lg:rounded-bl-[3px]',
            )}
            style={isOutbound ? { boxShadow: 'var(--bubble-shadow-soft)' } : undefined}
          >
            <p className="text-[6px] lg:text-sm leading-[8px] lg:leading-[1.45] whitespace-pre-wrap break-words">
              {text}
            </p>
            <div className="flex items-center gap-1 lg:gap-2 mt-px lg:mt-[3px]">
              <div className="flex items-center gap-0.5 lg:gap-1 ml-auto">
                <span className={cn('text-[4.5px] lg:text-[10.5px]', isOutbound ? 'text-bubble-out-time' : 'text-surface-500')}>{time}</span>
                {isOutbound && status && <StatusIcon status={status} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StageReveal>
  )
}

/**
 * Linha de guarda — a mensagem da IA foi RETIDA pela verificação e a conversa
 * passa a um atendente. O texto vem de `guardReasonTimelineLabel` (guardReason.ts:
 * 164-168), a mesma frase da linha do tempo real. Peça: `ui/Banner` (warning).
 */
export function StageGuardLine({ label, sub, delayMs = 0 }: { label: string; sub: string; delayMs?: number }) {
  return (
    <StageReveal className="mt-1.5 lg:mt-3" delayMs={delayMs}>
      <Banner variant="warning" className="mx-auto max-w-[90%] lg:max-w-[85%] !text-[5px] lg:!text-xs !px-1 lg:!px-2.5 !py-0.5 lg:!py-[9px] !gap-0.5 lg:!gap-2 [&_svg]:w-[5px] [&_svg]:h-[5px] lg:[&_svg]:w-3.5 lg:[&_svg]:h-3.5">
        <span className="min-w-0">
          <span className="font-semibold">{label}</span>
          <span className="block opacity-80">{sub}</span>
        </span>
      </Banner>
    </StageReveal>
  )
}
