import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { formatHourLabel, type ScheduleEvent } from './scheduleMock'
import { ScheduleStatusChip } from './ScheduleChips'

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
    const compact = height < 40

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
        {compact ? (
          // Bloco curto (mock: "Suporte · Lab Vida 14:00"): título + hora na mesma linha.
          <div className="text-[11.5px] font-semibold text-surface-100 truncate">
            <span className={cn(cancelled && 'line-through')}>{event.title}</span>{' '}
            <span className="font-normal text-surface-400">{formatHourLabel(event.startMinutes)}</span>
          </div>
        ) : (
          <>
            <div className={cn('text-[11.5px] font-semibold text-surface-100 truncate', cancelled && 'line-through')}>
              {event.title}
            </div>
            <div className={cn('text-2xs text-surface-400 mt-px', cancelled ? 'line-clamp-2' : 'truncate')}>
              {formatHourLabel(event.startMinutes)} – {formatHourLabel(event.endMinutes)}
              {cancelled ? ' · cancelado pelo contato' : ` · ${event.agent}`}
            </div>
          </>
        )}
        {showChip && <ScheduleStatusChip status={event.status} className="text-[10px] px-1 mt-1" />}
      </button>
    )
  },
)
