import { Bot, UserCog } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Cabeçalho do chat — ESPELHA `conversations/ChatWindow/ChatHeader.tsx:408-...`
 * (desktop: h-[52px], avatar 30, nome 13.5/700, subtítulo 11.5) e os controles de
 * `:361-378`:
 *   • IA no controle → chip âmbar "Agente IA no controle" + Button primary sm "Assumir"
 *   • humano atendendo → `HandoffChip` de `AiHandoffBanner.tsx:200-215` (botão
 *     quadrado 28px, borda `color-chip` na cor de sucesso, ícone UserCog)
 * `StageHandoffStripe` ← `HandoffStripe` (AiHandoffBanner.tsx:284-296): linha de
 * 2px sob o cabeçalho — âmbar enquanto a IA responde, verde quando um humano assume.
 * `data-stage-target="assumir"` é o alvo do cursor da cena.
 */
interface HeaderProps {
  name: string
  phone: string
  /** true = a IA está no controle; false = humano atendendo. */
  aiInControl: boolean
  /** Botão "Assumir" pressionado (feedback do clique). */
  pressed?: boolean
}

export function StageChatHeader({ name, phone, aiInControl, pressed = false }: HeaderProps) {
  return (
    <div className="conv-surface h-[52px] flex items-center justify-between px-4 border-b border-surface-700 bg-surface-800 flex-shrink-0 gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={name} size="30" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 leading-tight">
            <h2 className="text-[13.5px] font-bold text-surface-100 truncate">{name}</h2>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] leading-tight text-surface-400">
            <span className="truncate">{phone}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {aiInControl ? (
          <>
            <span className="inline-flex items-center gap-1 h-7 px-2 rounded-sm text-xs font-semibold text-accent-amber bg-accent-amber/[.12] whitespace-nowrap">
              <Bot className="w-3.5 h-3.5" /> Agente IA no controle
            </span>
            <span data-stage-target="assumir" className={cn('inline-flex origin-center transition-transform duration-100', pressed && 'scale-90')}>
              <Button size="sm" variant="primary" tabIndex={-1}>Assumir</Button>
            </span>
          </>
        ) : (
          <span
            className="w-7 h-7 flex items-center justify-center rounded-sm border color-chip"
            style={{ ['--chip']: 'var(--color-success)' } as React.CSSProperties}
          >
            <UserCog className="w-4 h-4" />
          </span>
        )}
        <Button size="sm" variant="neutral" tabIndex={-1}>Resolver</Button>
      </div>
    </div>
  )
}

export function StageHandoffStripe({ aiInControl }: { aiInControl: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'h-[2px] w-full flex-shrink-0 transition-colors',
        aiInControl ? 'bg-warning/80' : 'bg-success/70',
      )}
    />
  )
}
