import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { formatHourLabel, STATUS_CHIP_VAR, STATUS_LABEL, type ScheduleEvent } from './scheduleMock'

interface ScheduleEventBlockProps {
  event: ScheduleEvent
  top: number
  height: number
  /** Posição/largura em % dentro da coluna do dia — divide o espaço com
   *  outros eventos que se sobrepõem no mesmo horário (README 3.8/SCHED-
   *  EVENT-13), em vez de cada bloco ocupar a coluna inteira e cobrir os
   *  outros. */
  lane: { left: number; width: number }
  selected: boolean
  onClick: () => void
}

// `forwardRef` — o popover de detalhe precisa da posição real do bloco
// (getBoundingClientRect) para se ancorar embaixo dele.
export const ScheduleEventBlock = forwardRef<HTMLButtonElement, ScheduleEventBlockProps>(
  function ScheduleEventBlock({ event, top, height, lane, selected, onClick }, ref) {
    const cancelled = event.status === 'cancelado'
    const showChip = !cancelled && height >= 46

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        style={{
          top,
          height,
          left: `calc(${lane.left}% + 4px)`,
          width: `calc(${lane.width}% - 8px)`,
          borderLeftColor: event.isCampaign ? undefined : event.color,
        }}
        className={cn(
          'absolute rounded-xs border bg-surface-800/95 px-2 py-[5px] text-left overflow-hidden transition-colors',
          'border-surface-700 border-l-[3px] hover:border-surface-600',
          event.isCampaign && 'border-dashed border-l bg-surface-800/50',
          cancelled && 'opacity-55',
          selected && 'border-brand-500 ring-[3px] ring-accent-soft',
        )}
      >
        <div className={cn('text-[11.5px] font-semibold text-surface-100 truncate', cancelled && 'line-through')}>
          {event.title}
        </div>
        <div className="text-2xs text-surface-400 truncate mt-px">
          {formatHourLabel(event.startMinutes)}–{formatHourLabel(event.endMinutes)} · {event.agent}
        </div>
        {cancelled && (
          <div className="text-2xs text-danger truncate mt-px">cancelado pelo contato</div>
        )}
        {showChip && (
          <span
            className="color-chip inline-flex items-center rounded-xs border px-1 py-px text-[10px] font-semibold mt-1"
            style={{ ['--chip']: STATUS_CHIP_VAR[event.status] } as React.CSSProperties}
          >
            {STATUS_LABEL[event.status]}
          </span>
        )}
      </button>
    )
  },
)
