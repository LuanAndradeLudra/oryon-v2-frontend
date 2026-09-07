// ─── Agenda de disparos (D1 · SCRUM-1018) ──────────────────────────────────
// Substitui a grade semanal de horas que o PO vetou. Duas colunas: à esquerda
// o calendário de densidade e os filtros; à direita o fluxo vertical por dia,
// com trilho de horário e a linha AGORA.
//
// Regra que vale para a tela inteira: dado que o backend não entrega não vira
// zero, não vira barra vazia e não vira botão desabilitado sem explicação —
// some. Ver os comentários de fallback em cada peça.
//
// O que é OPERAÇÃO de campanha (ponte da edição local, ciclo de vida, as duas
// confirmações, "Enviar agora", nome da linha) mora em `../campaignOperations`
// e é igual no Board.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { groupByDay } from './agendaGrouping'
import { AgendaStream } from './AgendaStream'
import { AgendaSidebar } from './AgendaSidebar'
import { AGENDA_FILTERS, applyFilter, type AgendaFilter } from './agendaFilters'
import { useAgendaCampaigns } from './useAgendaCampaigns'
import { useAudienceCounts, useTemplateCategories } from './useAgendaLookups'
import { useCampaignOperations } from '../campaignOperations'
import { WindowNotice } from '../WindowNotice'

/** O relógio da tela. Um só, para o trilho, a linha AGORA e as contagens. */
const CLOCK_TICK_MS = 30_000

export function AgendaShell() {
  const { user } = useAuth()
  const { campaigns, loading, error, truncated, total, rates, refresh } = useAgendaCampaigns()
  const categories = useTemplateCategories()
  const ops = useCampaignOperations(campaigns, refresh)

  const [now, setNow] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [filter, setFilter] = useState<AgendaFilter>('all')

  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const filtered = useMemo(
    () => applyFilter(ops.merged, filter, categories, user?.id),
    [ops.merged, filter, categories, user?.id],
  )

  const groups = useMemo(() => groupByDay(filtered, now), [filtered, now])

  // Só o dia selecionado tem contagem de público (decisão 3).
  const dayCampaigns = useMemo(() => {
    if (!selectedDay) return []
    const key = fmtKey(selectedDay)
    return filtered.filter((c) => {
      const at = c.sentAt ?? c.scheduledAt
      return at ? fmtKey(new Date(at)) === key : false
    })
  }, [filtered, selectedDay])
  const audienceCounts = useAudienceCounts(dayCampaigns)

  const registerDayRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) dayRefs.current.set(key, el)
    else dayRefs.current.delete(key)
  }, [])

  // Selecionar um dia ROLA até ele; não filtra. Filtrar esconderia a linha
  // AGORA e quebraria a leitura contínua que é a razão de ser da agenda.
  const handleSelectDay = useCallback((d: Date | undefined) => {
    setSelectedDay(d)
    if (!d) return
    dayRefs.current.get(fmtKey(d))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (loading) {
    return (
      <div className="flex-1 grid grid-cols-[268px_1fr] min-h-0">
        <div className="border-r border-surface-800 p-5"><SkeletonList items={4} /></div>
        <div className="p-7"><SkeletonList items={5} /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-5">
        <ErrorState onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[268px_1fr] min-h-0">
      <AgendaSidebar
        all={ops.merged}
        filtered={filtered}
        now={now}
        month={month}
        onMonthChange={setMonth}
        selectedDay={selectedDay}
        onSelectDay={handleSelectDay}
        filters={
          <SegmentedControl
            label="Filtrar disparos"
            options={AGENDA_FILTERS}
            value={filter}
            onChange={setFilter}
            className="flex-wrap"
          />
        }
      />

      {groups.length === 0 ? (
        <div className="p-7">
          <EmptyState
            icon={CalendarDays}
            title={filter === 'all' ? 'Nenhum disparo por aqui' : 'Nenhum disparo neste filtro'}
            hint={filter === 'all'
              ? 'Quando você agendar ou enviar um disparo, ele aparece nesta agenda.'
              : 'Troque o filtro para ver os outros disparos.'}
          />
          {/* O aviso de janela sobrevive ao vazio, que é onde ele mais importa:
              sem ele, quem não achou conclui que o disparo não existe, quando
              ele pode estar fora das 300 que a janela alcança. */}
          <WindowNotice truncated={truncated} shown={campaigns.length} total={total} />
        </div>
      ) : (
        <AgendaStream
          groups={groups}
          now={now}
          rates={rates}
          lifecycle={ops.lifecycle}
          audienceCounts={audienceCounts}
          lineNameOf={ops.lineNameOf}
          sendingNowId={ops.sendingNowId}
          onRequestCancel={ops.requestCancel}
          onRequestDelete={ops.requestDelete}
          onSendNow={ops.sendNow}
          registerDayRef={registerDayRef}
          footer={<WindowNotice truncated={truncated} shown={campaigns.length} total={total} />}
        />
      )}

      {ops.confirmations}
    </div>
  )
}

function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
