// ─── Mini-calendário com pontos de densidade ───────────────────────────────
// `react-day-picker` v10 — a versão instalada NÃO tem `DayContent` (isso é API
// da v8). Os slots da v10 são `Day` (a célula) e `DayButton` (o botão dentro
// dela); os pontos vão no `DayButton`, e a navegação de mês reusa o padrão de
// `ConversationList/ConversationFilters.tsx`, o único outro DayPicker do app —
// para não existir um segundo dialeto de calendário aqui dentro.
import { createContext, useContext, useMemo } from 'react'
import { DayPicker, useDayPicker, type DayButtonProps, type MonthCaptionProps } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { dayAriaLabel, densityByDay, MAX_DOTS, type DayDensity } from './densityDots'
import { statusColor, statusLabel } from './agendaStatus'
import type { Campaign } from '@/types'
import 'react-day-picker/style.css'

interface DensityCalendarProps {
  campaigns: Campaign[]
  month: Date
  onMonthChange: (d: Date) => void
  selected: Date | undefined
  onSelect: (d: Date | undefined) => void
}

// `DayButton` é instanciado pelo DayPicker, não por nós, então não há como
// passar o mapa por prop. Um contexto resolve sem variável de módulo mutável
// (que vazaria entre duas agendas montadas ao mesmo tempo).
const DensityCtx = createContext<Map<string, DayDensity>>(new Map())

export function DensityCalendar({
  campaigns, month, onMonthChange, selected, onSelect,
}: DensityCalendarProps) {
  const density = useMemo(() => densityByDay(campaigns), [campaigns])

  const daysWithEvents = useMemo(
    () => [...density.keys()].map((k) => {
      const [y, m, d] = k.split('-').map(Number)
      return new Date(y, m - 1, d)
    }),
    [density],
  )

  return (
    <DensityCtx.Provider value={density}>
    <DayPicker
      mode="single"
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={onSelect}
      locale={ptBR}
      numberOfMonths={1}
      showOutsideDays
      hideNavigation
      modifiers={{ hasEvents: daysWithEvents }}
      components={{ MonthCaption: MonthCaptionWithNav, DayButton: DensityDayButton }}
      className="text-surface-200"
      classNames={{
        month_grid: 'w-full table-fixed',
        weekday: 'text-[9.5px] text-surface-500 font-bold uppercase tracking-[0.08em] pb-1.5',
        day: 'text-center',
        outside: 'text-surface-600',
        today: 'font-bold',
        selected: 'rounded-[9px]',
      }}
    />
    </DensityCtx.Provider>
  )
}

function MonthCaptionWithNav({ calendarMonth }: MonthCaptionProps) {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker()
  return (
    <div className="flex items-center justify-between pb-2">
      <span className="font-bold text-sm text-surface-100 capitalize">
        {format(calendarMonth.date, 'MMMM yyyy', { locale: ptBR })}
      </span>
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          aria-label="Mês anterior"
          className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-surface-300 hover:bg-surface-700 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          aria-label="Próximo mês"
          className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-surface-300 hover:bg-surface-700 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  )
}

function DensityDayButton({ day, modifiers, className, ...props }: DayButtonProps) {
  const density = useContext(DensityCtx).get(format(day.date, 'yyyy-MM-dd'))
  const isToday = Boolean(modifiers.today)
  const label = format(day.date, "d 'de' MMMM", { locale: ptBR })

  return (
    <button
      {...props}
      // O rótulo diz o TOTAL do dia, mesmo quando só 3 pontos cabem — quem
      // usa leitor de tela não perde o 4º disparo por limite de pixel.
      aria-label={dayAriaLabel(label, density)}
      className={cn(
        'h-[34px] w-full rounded-[9px] flex flex-col items-center justify-center gap-0.5',
        'text-xs tabular-nums transition-colors',
        isToday ? 'bg-brand-500 text-surface-950 font-bold' : 'text-surface-300 hover:bg-surface-800',
        modifiers.selected && !isToday && 'outline outline-1 outline-surface-600 bg-surface-800',
        className,
      )}
    >
      {day.date.getDate()}
      <span className="flex gap-0.5 h-1" aria-hidden="true">
        {density?.colors.slice(0, MAX_DOTS).map((color, i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full"
            // No dia de hoje o fundo é a cor da marca; os pontos coloridos
            // sumiriam nele, então viram furos escuros com opacidade.
            style={isToday
              ? { backgroundColor: 'var(--color-surface-950)', opacity: 0.6 }
              : { backgroundColor: color }}
          />
        ))}
      </span>
    </button>
  )
}

/** Legenda dos pontos — os 4 estados que o mockup lista. */
export function DensityLegend() {
  // `paused` entra: está em 3º no STATUS_URGENCY, acima de `scheduled`, então
  // um dia com uma pausada pinta um ponto — e ponto fora da legenda é cor que
  // ninguém decifra, ainda mais no claro, vizinho do âmbar de `sending`.
  const shown = ['sent', 'sending', 'paused', 'scheduled', 'failed'] as const
  return (
    <div className="flex gap-2.5 flex-wrap text-[10.5px] text-surface-500">
      {shown.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span
            className="w-[5px] h-[5px] rounded-full inline-block"
            style={{ backgroundColor: statusColor(s) }}
          />
          {statusLabel(s).toLowerCase()}
        </span>
      ))}
    </div>
  )
}
