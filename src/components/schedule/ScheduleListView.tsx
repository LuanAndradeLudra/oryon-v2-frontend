import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { CalendarX } from 'lucide-react'
import { formatDayLong, formatHourLabel, type ScheduleEvent, type ScheduleWeekDay } from './scheduleMock'
import { ScheduleStatusChip } from './ScheduleChips'

interface ScheduleListViewProps {
  days: ScheduleWeekDay[]
  events: ScheduleEvent[]
}

export function ScheduleListView({ days, events }: ScheduleListViewProps) {
  const byDay = days
    .map((day) => ({
      day,
      items: events
        .filter((e) => e.dayIndex === day.dayIndex)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    }))
    .filter((group) => group.items.length > 0)

  if (byDay.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyState icon={CalendarX} title="Nenhum agendamento nesta semana" hint="Ajuste os filtros de agente ou tipo." />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-5">
      {byDay.map(({ day, items }) => (
        <div key={day.dayIndex}>
          <div className="text-2xs font-bold uppercase tracking-wide text-surface-500 mb-1.5">
            {day.label} · {formatDayLong(day.date)}
            {day.isToday && <span className="ml-1.5 text-brand-400">HOJE</span>}
          </div>
          <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
            {items.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-900/40">
                <span
                  className="w-1.5 self-stretch rounded-full flex-shrink-0"
                  style={{ background: event.isCampaign ? 'var(--color-surface-600)' : event.color }}
                  aria-hidden
                />
                <div className="w-[104px] flex-shrink-0 text-2xs text-surface-400 tabular-nums">
                  {formatHourLabel(event.startMinutes)} – {formatHourLabel(event.endMinutes)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[13px] font-semibold text-surface-100 truncate', event.status === 'cancelado' && 'line-through opacity-70')}>
                    {event.title}
                  </div>
                  <div className="text-2xs text-surface-500 truncate">{event.agent}</div>
                </div>
                <ScheduleStatusChip status={event.status} className="text-[11px] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
