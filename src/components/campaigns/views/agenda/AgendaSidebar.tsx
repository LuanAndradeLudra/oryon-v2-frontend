// ─── Coluna esquerda (268px) ───────────────────────────────────────────────
// Calendário de densidade, os próximos 7 dias em números, filtros e o cartão
// de sugestão. As linhas do painel de 7 dias que dependem de contrato ainda
// inexistente (custo e limite da linha, ambos BE.5) não são renderizadas — mas
// o painel APARECE com a linha que tem dado real: "capacidade sem dado some"
// vale quando não há dado NENHUM, e o painel é traço da RUBRICA-ONDA-1 da D1
// (decisão do Maestro, 2026-09-06).
import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { addDays, startOfDay } from 'date-fns'
import { InsightCard } from '@/components/ui/InsightCard'
import { cn } from '@/lib/utils'
import { DensityCalendar, DensityLegend } from './DensityCalendar'
import { buildInsight } from './agendaInsight'
import { executionDate } from './agendaGrouping'
import type { Campaign } from '@/types'

interface AgendaSidebarProps {
  /** Todas as campanhas da janela — o calendário mostra densidade sem filtro. */
  all: Campaign[]
  /** As que passaram pelo filtro — alimentam o painel de 7 dias e o insight. */
  filtered: Campaign[]
  now: Date
  month: Date
  onMonthChange: (d: Date) => void
  selectedDay: Date | undefined
  onSelectDay: (d: Date | undefined) => void
  filters: React.ReactNode
}

export function AgendaSidebar({
  all, filtered, now, month, onMonthChange, selectedDay, onSelectDay, filters,
}: AgendaSidebarProps) {
  const insight = useMemo(() => buildInsight(filtered, now), [filtered, now])
  const sevenDayRows = useMemo(() => {
    const rows: SevenDayRow[] = [
      { label: 'Disparos agendados', value: String(countScheduledNext7(filtered, now)) },
    ]
    // Aqui entram, quando a BE.5 existir: "Mensagens previstas", "Custo
    // estimado" e "Limite da linha · pior dia". Nenhuma delas tem fonte hoje.
    return rows
  }, [filtered, now])

  return (
    <aside className="border-r border-surface-800 px-[18px] py-5 bg-surface-900/50 flex flex-col gap-4 overflow-y-auto min-w-0">
      <DensityCalendar
        campaigns={all}
        month={month}
        onMonthChange={onMonthChange}
        selected={selectedDay}
        onSelect={onSelectDay}
      />
      <DensityLegend />

      <NextSevenDays rows={sevenDayRows} />

      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-surface-400 mb-2">
          Filtrar
        </div>
        {filters}
      </div>

      {insight && (
        <InsightCard
          className="mt-auto"
          tone="dashed"
          icon={<Sparkles />}
          title={insight.title}
          description={insight.description}
        />
      )}
    </aside>
  )
}

function countScheduledNext7(campaigns: Campaign[], now: Date): number {
  const from = startOfDay(now)
  const to = addDays(from, 7)
  return campaigns.filter((c) => {
    if (c.status !== 'scheduled') return false
    const at = executionDate(c)
    return at !== null && at >= from && at < to
  }).length
}

/**
 * O painel dos "Próximos 7 dias".
 *
 * O mockup tem 4 linhas. Três delas não têm de onde sair hoje:
 *  - "Mensagens previstas" exigiria contar o público de cada agendada
 *    (`stats.total` só existe depois do envio) — a contagem que a agenda faz
 *    é só a do dia selecionado, e somar 7 dias de POSTs de segmento na
 *    abertura da tela é custo que ninguém vê até a base crescer (decisão 3);
 *  - "Custo estimado" e "Limite da linha" dependem da BE.5, que não existe.
 *
 * A que sobra — "Disparos agendados" — sai do próprio registro de campanha, sem
 * contrato nenhum, então é desenhada. O painel volta inteiro com a BE.5, e some
 * de vez se um dia nem essa sobrar.
 */
interface SevenDayRow { label: string; value: string }

/** Zero linhas não é painel: aí sim ele some, em vez de virar um título solto. */
const MIN_SEVEN_DAY_ROWS = 1

function NextSevenDays({ rows }: { rows: SevenDayRow[] }) {
  if (rows.length < MIN_SEVEN_DAY_ROWS) return null

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-surface-400 mb-2">
        Próximos 7 dias
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn(
              'flex justify-between items-center text-xs text-surface-300',
              'px-2 py-1.5 rounded-[8px] bg-surface-800 border border-surface-700',
            )}
          >
            <span>{row.label}</span>
            <b className="font-mono text-[11.5px] text-surface-100 tabular-nums">{row.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
