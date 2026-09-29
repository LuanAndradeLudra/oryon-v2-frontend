// UI estática de exemplo (SCRUM-1107, Leva 9 do épico de reestilização
// SCRUM-1097) — casca visual da tela de Agendamentos batendo com o mock
// (docs/design/restyle-2026/README.md seção 3.8). Não existe hoje nenhuma
// rota/API real de agenda no backend: toolbar, grade semanal, eventos e
// popover de detalhe abaixo usam dado de exemplo fixo
// (`@/components/schedule/scheduleMock`), sem integração real de calendário.
// Cancelar/Reagendar/Abrir conversa no popover são inertes de propósito —
// ligar isso a dado real é outro épico.
import { useMemo } from 'react'
import { useEstadoNaUrl, lerUmDe } from '@/hooks/useEstadoNaUrl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { useRegisterTopBarActions, useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import { ScheduleToolbar, type ScheduleViewMode } from '@/components/schedule/ScheduleToolbar'
import { ScheduleWeekGrid } from '@/components/schedule/ScheduleWeekGrid'
import { ScheduleListView } from '@/components/schedule/ScheduleListView'
import { getWeekDays, formatWeekPeriod, isoWeekNumber, MOCK_EVENTS } from '@/components/schedule/scheduleMock'

const lerVisaoAgenda = lerUmDe(['semana', 'dia', 'lista'] as const, 'semana')
const lerSemana = (v: string | null) => { const n = Number(v); return Number.isInteger(n) ? n : 0 }

export function SchedulePage() {
  // Semana, visão e filtros na URL (regra do PO).
  const [weekOffset, setWeekOffset] = useEstadoNaUrl<number>('semana', { padrao: 0, ler: lerSemana })
  const [viewMode, setViewMode] = useEstadoNaUrl<ScheduleViewMode>('visao', { padrao: 'semana', ler: lerVisaoAgenda })
  const [agenteUrl, setAgenteUrl] = useEstadoNaUrl<string>('agente', { padrao: '' })
  const [tipoUrl, setTipoUrl] = useEstadoNaUrl<string>('tipo', { padrao: '' })
  const agentFilter = agenteUrl || null
  const typeFilter = tipoUrl || null
  const setAgentFilter = (v: string | null) => setAgenteUrl(v ?? '')
  const setTypeFilter = (v: string | null) => setTipoUrl(v ?? '')

  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const displayDays = viewMode === 'dia' ? [days.find((d) => d.isToday) ?? days[0]] : days

  const events = useMemo(
    () =>
      MOCK_EVENTS.filter(
        (e) => (!agentFilter || e.agent === agentFilter) && (!typeFilter || e.type === typeFilter),
      ),
    [agentFilter, typeFilter],
  )

  const aguardandoCount = events.filter((e) => e.status === 'aguardando').length

  useRegisterTopBarActions(
    <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} title="Exemplo — criação real de agendamento fica para outro épico">
      Novo agendamento
    </Button>,
    [],
  )

  // SCHED-HEADER-02 (spec/2d-agendamentos.GAPS.md): as contagens vivem no
  // subtítulo do TopBar, não concatenadas no período da toolbar (esse fica
  // só com a data — ver `periodLabel` abaixo).
  useRegisterTopBarSubtitle(
    `${events.length} esta semana${aguardandoCount ? ` · ${aguardandoCount} aguardando confirmação` : ''}`,
    [events.length, aguardandoCount],
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-3">
        <Banner variant="warning" className="text-[12.5px]">
          Dados de exemplo — esta tela mostra só a casca visual dos Agendamentos. A integração real de agenda ainda não existe.
        </Banner>
      </div>

      <ScheduleToolbar
        periodLabel={formatWeekPeriod(days)}
        weekNumber={viewMode === 'semana' ? isoWeekNumber(days[0].date) : undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={() => setWeekOffset((w) => w - 1)}
        onNext={() => setWeekOffset((w) => w + 1)}
        onToday={() => setWeekOffset(0)}
        agentFilter={agentFilter}
        onAgentFilterChange={setAgentFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
      />

      {viewMode === 'lista' ? (
        <ScheduleListView days={days} events={events} />
      ) : (
        <ScheduleWeekGrid days={displayDays} events={events} />
      )}
    </div>
  )
}
