import { Bot, UserCog } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { useStageAmbient } from '../stageContext'

/**
 * Cabeçalho do chat — ESPELHA `conversations/ChatWindow/ChatHeader.tsx:408-...`
 * (desktop: h-[52px], avatar 30, nome 13.5/700, subtítulo 11.5) e os controles de
 * `:361-378`:
 *   • IA no controle → chip âmbar "Agente IA no controle" (`.ambient-ring`
 *     enquanto ela responde de verdade — não um cursor falso clicando)
 *   • humano atendendo → `HandoffChip` de `AiHandoffBanner.tsx:200-215` (botão
 *     quadrado 28px, borda `color-chip` na cor de sucesso, ícone UserCog)
 * `StageHandoffStripe` ← `HandoffStripe` (AiHandoffBanner.tsx:284-296): linha de
 * 2px sob o cabeçalho — âmbar enquanto a IA responde, verde quando um humano assume.
 * Botões próprios (não `ui/Button`): a régua real (h-7/h-9) não tem par na
 * escala mobile deste palco (3.5/17.5px) — a Attio também não usa componentes
 * de produto no palco, escreve o pixel.
 */
interface HeaderProps {
  name: string
  phone: string
  /** true = a IA está no controle; false = humano atendendo. */
  aiInControl: boolean
}

export function StageChatHeader({ name, phone, aiInControl }: HeaderProps) {
  const ambient = useStageAmbient()
  return (
    <div className="conv-surface h-[26px] lg:h-[52px] flex items-center justify-between px-2 lg:px-4 border-b border-[0.5px] lg:border-[1px] border-surface-700 bg-surface-800 flex-shrink-0 gap-1 lg:gap-2.5">
      <div className="flex items-center gap-0.5 lg:gap-2.5 min-w-0">
        <span className="lg:hidden"><Avatar name={name} size="2xs" /></span>
        <span className="hidden lg:inline-block"><Avatar name={name} size="30" /></span>
        <div className="min-w-0 hidden lg:block">
          <h2 className="text-[13.5px] font-bold text-surface-100 truncate leading-tight">{name}</h2>
          <p className="text-[11.5px] leading-tight text-surface-400 truncate">{phone}</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 lg:gap-2 flex-shrink-0">
        {aiInControl ? (
          <span className="relative inline-flex items-center gap-0.5 lg:gap-1 h-[8.5px] lg:h-[17px] px-[3px] lg:px-1.5 rounded-[2.5px] lg:rounded-[5px] text-[5px] lg:text-[10px] font-semibold text-accent-amber bg-accent-amber/[.12] whitespace-nowrap">
            {ambient && <span aria-hidden className="absolute inset-0 rounded-[2.5px] lg:rounded-[5px] border border-warning ambient-ring" />}
            <Bot className="w-[5px] h-[5px] lg:w-2.5 lg:h-2.5" />
            <span className="hidden lg:inline">Agente IA no controle</span>
          </span>
        ) : (
          <span
            className="w-[8.5px] h-[8.5px] lg:w-[17px] lg:h-[17px] flex items-center justify-center rounded-[2.5px] lg:rounded-[5px] border color-chip"
            style={{ ['--chip']: 'var(--color-success)' } as React.CSSProperties}
          >
            <UserCog className="w-[5px] h-[5px] lg:w-2.5 lg:h-2.5" />
          </span>
        )}
      </div>
    </div>
  )
}

export function StageHandoffStripe({ aiInControl }: { aiInControl: boolean }) {
  return (
    <div
      aria-hidden
      className={cn('h-[1px] lg:h-[2px] w-full flex-shrink-0', aiInControl ? 'bg-warning/80' : 'bg-success/70')}
    />
  )
}
