import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ScheduleEventBlock } from './ScheduleEventBlock'
import { ScheduleEventPopover } from './ScheduleEventPopover'
import {
  HOUR_START,
  HOUR_END,
  NOW_LINE,
  type ScheduleEvent,
  type ScheduleWeekDay,
} from './scheduleMock'

const ROW_HEIGHT = 64
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const GRID_HEIGHT = HOURS.length * ROW_HEIGHT

/** Divide a coluna do dia entre eventos que se sobrepõem no horário (README
 *  3.8/SCHED-EVENT-13) — sem isso um bloco cobre o outro por completo em vez
 *  de dividir a largura. Agrupa em "clusters" de eventos mutuamente
 *  sobrepostos, empacota cada cluster em lanes (1ª lane livre, estilo
 *  Google Calendar) e devolve left/width em % por evento. */
function layoutLanes(dayEvents: ScheduleEvent[]): Map<string, { left: number; width: number }> {
  const sorted = [...dayEvents].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)
  const result = new Map<string, { left: number; width: number }>()
  let cluster: ScheduleEvent[] = []
  let clusterEnd = -Infinity

  const flushCluster = () => {
    if (cluster.length === 0) return
    const laneEnds: number[] = []
    const eventLane = new Map<string, number>()
    for (const e of cluster) {
      let laneIdx = laneEnds.findIndex((end) => end <= e.startMinutes)
      if (laneIdx === -1) { laneIdx = laneEnds.length; laneEnds.push(e.endMinutes) }
      else laneEnds[laneIdx] = e.endMinutes
      eventLane.set(e.id, laneIdx)
    }
    const laneCount = laneEnds.length
    for (const e of cluster) {
      const laneIdx = eventLane.get(e.id)!
      result.set(e.id, { left: (laneIdx / laneCount) * 100, width: (1 / laneCount) * 100 })
    }
    cluster = []
  }

  for (const e of sorted) {
    if (cluster.length > 0 && e.startMinutes >= clusterEnd) {
      flushCluster()
      clusterEnd = -Infinity
    }
    cluster.push(e)
    clusterEnd = Math.max(clusterEnd, e.endMinutes)
  }
  flushCluster()
  return result
}

interface ScheduleWeekGridProps {
  days: ScheduleWeekDay[]
  events: ScheduleEvent[]
}

export function ScheduleWeekGrid({ days, events }: ScheduleWeekGridProps) {
  const [selected, setSelected] = useState<{ event: ScheduleEvent; date: Date; rect: DOMRect } | null>(null)
  const blockRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const openEvent = (event: ScheduleEvent, date: Date) => {
    const el = blockRefs.current[event.id]
    if (!el) return
    setSelected({ event, date, rect: el.getBoundingClientRect() })
  }

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="grid"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        {/* Cabeçalho de dia */}
        <div className="h-11 border-b border-r border-surface-700" />
        {days.map((day) => (
          <div
            key={day.dayIndex}
            className={cn(
              'h-11 flex flex-col items-center justify-center border-b border-r border-surface-700 last:border-r-0',
              day.isToday && 'bg-accent-soft',
              day.isWeekend && !day.isToday && 'bg-[var(--sf2)]',
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">{day.label}</span>
            <span className="text-sm font-semibold text-surface-100 leading-tight">
              {day.dayNumber}
              {day.isToday && (
                <span className="ml-1 text-3xs font-bold text-brand-400 align-top">HOJE</span>
              )}
            </span>
          </div>
        ))}

        {/* Rótulos de hora */}
        <div className="border-r border-surface-700" style={{ height: GRID_HEIGHT }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-b border-surface-700 text-right pr-1.5 text-2xs text-surface-500"
              style={{ height: ROW_HEIGHT }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Colunas de dia */}
        {days.map((day) => {
          const dayEvents = events.filter((e) => e.dayIndex === day.dayIndex)
          const lanes = layoutLanes(dayEvents)
          const showNowLine = day.isToday && day.dayIndex === NOW_LINE.dayIndex
          return (
            <div
              key={day.dayIndex}
              className={cn(
                'relative border-r border-surface-700 last:border-r-0',
                day.isToday && 'bg-accent-soft',
                day.isWeekend && !day.isToday && 'bg-[var(--sf2)]',
              )}
              style={{ height: GRID_HEIGHT }}
            >
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-surface-700"
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {showNowLine && (
                <div
                  className="absolute left-0 right-0 h-[2px] bg-danger z-10"
                  style={{ top: (NOW_LINE.minutes / 60) * ROW_HEIGHT }}
                >
                  <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-danger" />
                </div>
              )}

              {dayEvents.map((event) => {
                const top = (event.startMinutes / 60) * ROW_HEIGHT
                const height = Math.max(((event.endMinutes - event.startMinutes) / 60) * ROW_HEIGHT, 22)
                return (
                  <ScheduleEventBlock
                    key={event.id}
                    ref={(el) => { blockRefs.current[event.id] = el }}
                    event={event}
                    top={top}
                    height={height}
                    lane={lanes.get(event.id) ?? { left: 0, width: 100 }}
                    selected={selected?.event.id === event.id}
                    onClick={() => openEvent(event, day.date)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {selected && (
        <ScheduleEventPopover
          event={selected.event}
          date={selected.date}
          anchorRect={selected.rect}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
