// ─── Agenda de disparos (D1 · SCRUM-1018) ──────────────────────────────────
// Substitui a grade semanal de horas que o PO vetou. Duas colunas: à esquerda
// o calendário de densidade e os filtros; à direita o fluxo vertical por dia,
// com trilho de horário e a linha AGORA.
//
// Regra que vale para a tela inteira: dado que o backend não entrega não vira
// zero, não vira barra vazia e não vira botão desabilitado sem explicação —
// some. Ver os comentários de fallback em cada peça.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { campaignsApi } from '@/services/api'
import { showToast } from '@/hooks/useToast'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/utils'
import { groupByDay } from './agendaGrouping'
import { AgendaStream } from './AgendaStream'
import { AgendaSidebar } from './AgendaSidebar'
import { AGENDA_FILTERS, applyFilter, type AgendaFilter } from './agendaFilters'
import { useAgendaCampaigns } from './useAgendaCampaigns'
import { useCampaignLifecycle } from './useCampaignLifecycle'
import { useAudienceCounts, useTemplateCategories } from './useAgendaLookups'
import type { Campaign } from '@/types'

/** O relógio da tela. Um só, para o trilho, a linha AGORA e as contagens. */
const CLOCK_TICK_MS = 30_000

/**
 * Idade máxima da cópia local de um cartão: um pouco mais que o poll ativo
 * (20 s), o bastante para cobrir o vão entre o clique e a leitura seguinte.
 * É a rede para um backend sem `updatedAt`; com ele a ponte solta antes.
 */
const LOCAL_EDIT_TTL_MS = 30_000

interface LocalEdit { campaign: Campaign; at: number }

/**
 * A resposta do servidor já alcançou a edição local? Só o carimbo responde.
 * `updatedAt` vem no fio (do `BaseEntity` do backend) mas NÃO está no tipo
 * congelado — daí a leitura defensiva. Sem os dois carimbos a resposta é NÃO e
 * quem solta a ponte é o TTL.
 *
 * Comparar `status` seria tentador e está errado: ele diverge nas DUAS direções
 * — servidor que ainda não soube da pausa (segurar) e servidor que já passou à
 * frente (soltar). O mesmo sinal para as duas não decide nada; foi o teste que
 * provou isso, quebrando a ponte logo no primeiro poll.
 */
function serverCaughtUp(fromServer: Campaign, edit: LocalEdit): boolean {
  const stampOf = (c: Campaign) => {
    const raw = (c as { updatedAt?: unknown }).updatedAt
    const t = typeof raw === 'string' ? Date.parse(raw) : NaN
    return Number.isNaN(t) ? null : t
  }
  const servidor = stampOf(fromServer)
  const local = stampOf(edit.campaign)
  return servidor !== null && local !== null && servidor >= local
}

export function AgendaShell() {
  const { user } = useAuth()
  const { numbers } = useWorkspaceNumber()
  const { campaigns, loading, error, truncated, total, rates, refresh } = useAgendaCampaigns()
  const categories = useTemplateCategories()

  const [now, setNow] = useState(() => new Date())
  const [month, setMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [filter, setFilter] = useState<AgendaFilter>('all')
  const [cancelTarget, setCancelTarget] = useState<Campaign | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [sendingNowId, setSendingNowId] = useState<string | null>(null)
  const [localEdits, setLocalEdits] = useState<Map<string, LocalEdit>>(new Map())

  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  // Resposta de pause/resume/cancel chega antes do próximo poll — aplicar
  // localmente evita a tela "voltar" por até 20 s depois de um clique.
  //
  // É uma PONTE de UM intervalo, e expira: preferir sempre a cópia local
  // congelaria o cartão pelo resto da sessão — pausar, o disparo terminar no
  // servidor (`sent`, 100/100) e o cartão seguir oferecendo "Retomar" com a
  // barra travada em 40/100, sem refresh que resolva. Solta por idade e assim
  // que o servidor traz registro pelo menos tão novo quanto ela.
  const merged = useMemo(
    () => campaigns.map((c) => localEdits.get(c.id)?.campaign ?? c),
    [campaigns, localEdits],
  )

  const applyLocal = useCallback((updated: Campaign) => {
    setLocalEdits((prev) => new Map(prev).set(updated.id, { campaign: updated, at: Date.now() }))
  }, [])

  // A cada chegada do poll, joga fora o que a resposta do servidor já alcançou.
  useEffect(() => {
    setLocalEdits((prev) => {
      if (prev.size === 0) return prev
      const next = new Map(prev)
      const agora = Date.now()
      for (const c of campaigns) {
        const edit = next.get(c.id)
        if (!edit) continue
        if (agora - edit.at > LOCAL_EDIT_TTL_MS || serverCaughtUp(c, edit)) next.delete(c.id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [campaigns])

  const lifecycle = useCampaignLifecycle(applyLocal)

  const filtered = useMemo(
    () => applyFilter(merged, filter, categories, user?.id),
    [merged, filter, categories, user?.id],
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

  const lineNameOf = useCallback(
    (c: Campaign) => {
      const line = numbers.find((n) => n.id === c.whatsappNumberId)
      return line ? (line.label || line.displayPhoneNumber) : undefined
    },
    [numbers],
  )

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

  // "Enviar agora" dispara mensagem de verdade: erro invisível aqui é o pior
  // dos quatro, porque a tela não muda de expressão e convida ao segundo
  // clique. (Os três do ciclo de vida já avisam por conta própria.)
  const handleSendNow = useCallback(async (c: Campaign) => {
    setSendingNowId(c.id)
    try {
      const res = await campaignsApi.send(c.id)
      applyLocal(res.data)
    } catch {
      showToast(`Não deu para enviar "${c.name}" agora. Nenhuma mensagem saiu.`, 'error')
    } finally {
      setSendingNowId(null)
    }
  }, [applyLocal])

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return
    await lifecycle.run('cancel', cancelTarget.id)
    setCancelTarget(null)
  }, [cancelTarget, lifecycle])

  // `ConfirmModal` tipa `onConfirm` como `() => void` e DESCARTA a promessa:
  // sem o catch, o modal ficaria aberto sem explicação nenhuma.
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await campaignsApi.delete(deleteTarget.id)
      refresh()
    } catch {
      showToast(`Não deu para excluir "${deleteTarget.name}". O rascunho continua aí.`, 'error')
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, refresh])

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
        all={merged}
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
          lifecycle={lifecycle}
          audienceCounts={audienceCounts}
          lineNameOf={lineNameOf}
          sendingNowId={sendingNowId}
          onRequestCancel={setCancelTarget}
          onRequestDelete={setDeleteTarget}
          onSendNow={handleSendNow}
          registerDayRef={registerDayRef}
          footer={<WindowNotice truncated={truncated} shown={campaigns.length} total={total} />}
        />
      )}

      <ConfirmModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancelar disparo"
        description={`"${cancelTarget?.name ?? ''}" para de enviar e não pode ser retomado. Os contatos que ainda não receberam não vão receber.`}
        confirmLabel="Cancelar disparo"
        danger
        loading={lifecycle.busy === cancelTarget?.id}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Excluir rascunho"
        description={`"${deleteTarget?.name ?? ''}" será apagado. Não dá para desfazer.`}
        confirmLabel="Excluir"
        danger
      />
    </div>
  )
}

/**
 * A tela DIZ o que está mostrando quando o teto de paginação corta a lista.
 * `GET /campaigns` ordena por `createdAt DESC` e não aceita recorte por data,
 * então uma campanha criada há meses e agendada para o mês que vem pode ficar
 * de fora. Silenciar isso faria a agenda parecer completa quando não está —
 * o `?from=&to=` está registrado como item de Onda 2 (decisão 2 do Maestro).
 */
function WindowNotice({ truncated, shown, total }: {
  truncated: boolean
  shown: number
  total: number
}) {
  if (!truncated) return null
  return (
    <div className={cn(
      'flex items-start gap-2 text-[11px] text-surface-400',
      'mt-4 px-3 py-2.5 rounded-xl border border-dashed border-surface-700',
    )}>
      <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-status-pending" />
      <span>
        Mostrando os {shown.toLocaleString('pt-BR')} disparos criados mais
        recentemente, de {total.toLocaleString('pt-BR')}. Períodos mais antigos
        podem estar incompletos — a lista ainda é ordenada por data de criação,
        não pela data em que o disparo acontece.
      </span>
    </div>
  )
}

function fmtKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
