import { Bot, Check, CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Banner } from '@/components/ui/Banner'
import { cn } from '@/lib/utils'
import { StageEnter } from '../StageMotion'

/**
 * Bolha de mensagem — ESPELHA `conversations/ChatWindow/MessageBubble.tsx`:
 *   • linha        ← :765-775 ('group flex items-end gap-2', outbound = row-reverse)
 *   • coluna       ← :788 (max-w-[65%])
 *   • bolha        ← :805-806 (raio 10, cauda 3px na 1ª do grupo; bg-bubble-in/out)
 *   • avatar 24    ← `SenderAvatar` :66-89 (contato = Avatar xs; IA = tile
 *                    .avatar-operador + Bot; operador = Avatar kind="operator")
 *   • rodapé/hora  ← :850-870 (10.5px) + `StatusIcon` :112-117 (Check / CheckCheck)
 * Sem MessageBubble real: ele arrasta WhatsAppText, registry de renderers, menu
 * de contexto e mutações.
 */
export type StageSender =
  | { kind: 'contact'; name: string }
  | { kind: 'ai' }
  | { kind: 'operator'; name: string }

interface BubbleProps {
  sender: StageSender
  /** Texto exibido (o typewriter passa só o trecho já "digitado"). */
  text: string
  /** Restante do texto, invisível — mantém o tamanho final da bolha (sem reflow). */
  ghost?: string
  time: string
  status?: 'sent' | 'delivered' | 'read'
  /** 1ª bolha do grupo: mostra avatar + cauda de 3px. */
  first?: boolean
  /** Espaço acima (mt-3 quando muda o remetente, mt-1 dentro do grupo). */
  gap?: 'mt-3' | 'mt-1'
}

function SenderAvatar({ sender }: { sender: StageSender }) {
  if (sender.kind === 'contact') return <Avatar name={sender.name} size="xs" />
  if (sender.kind === 'operator') return <Avatar name={sender.name} size="xs" kind="operator" />
  return (
    <div className="w-6 h-6 rounded-[30%] avatar-operador flex items-center justify-center flex-shrink-0">
      <Bot className="w-3.5 h-3.5" strokeWidth={1.75} />
    </div>
  )
}

function StatusIcon({ status }: { status: 'sent' | 'delivered' | 'read' }) {
  if (status === 'sent') return <Check className="w-3 h-3 text-bubble-out-time" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-bubble-out-time" />
  return <CheckCheck className="w-3 h-3 text-brand-300" />
}

export function StageBubble({ sender, text, ghost, time, status, first = true, gap = 'mt-3' }: BubbleProps) {
  const isOutbound = sender.kind !== 'contact'
  return (
    <StageEnter className={gap}>
      <div className={cn('group flex items-end gap-2', isOutbound ? 'flex-row-reverse' : 'flex-row')}>
        {first ? <SenderAvatar sender={sender} /> : <div className="w-6 h-6 flex-shrink-0" aria-hidden />}
        <div className={cn('flex flex-col max-w-[65%] min-w-0', isOutbound ? 'items-end' : 'items-start')}>
          <div
            className={cn(
              'relative px-3 py-2 rounded-[10px]',
              isOutbound
                ? 'bubble-out-surface bg-bubble-out text-bubble-out-fg'
                : 'bubble-in-elevate bg-bubble-in text-[color:var(--color-bubble-in-fg,#f1f5f9)]',
              first && isOutbound && 'rounded-br-[3px]',
              first && !isOutbound && 'rounded-bl-[3px]',
            )}
            style={isOutbound ? { boxShadow: 'var(--bubble-shadow-soft)' } : undefined}
          >
            <p className="text-sm leading-[1.45] whitespace-pre-wrap break-words">
              {text}
              {ghost ? <span className="invisible">{ghost}</span> : null}
            </p>
            <div className="flex items-center gap-2 mt-[3px]">
              <div className="flex items-center gap-1 ml-auto">
                <span className={cn('text-[10.5px]', isOutbound ? 'text-bubble-out-time' : 'text-surface-500')}>{time}</span>
                {isOutbound && status && <StatusIcon status={status} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StageEnter>
  )
}

/**
 * Linha de guarda — a mensagem da IA foi RETIDA pela verificação e a conversa
 * passa a um atendente. O texto vem de `guardReasonTimelineLabel` (guardReason.ts:
 * 164-168), a mesma frase da linha do tempo real. Peça: `ui/Banner` (warning).
 */
export function StageGuardLine({ label, sub }: { label: string; sub: string }) {
  return (
    <StageEnter className="mt-3">
      <Banner variant="warning" className="mx-auto max-w-[85%]">
        <span className="min-w-0">
          <span className="font-semibold">{label}</span>
          <span className="block opacity-80">{sub}</span>
        </span>
      </Banner>
    </StageEnter>
  )
}
