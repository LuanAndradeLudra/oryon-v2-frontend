// ─── Board por status (D1b · SCRUM-1019) ───────────────────────────────────
// A mesma janela de campanhas da Agenda, vista como fluxo: rascunho →
// agendada → enviando → enviada, com a coluna do que não concluiu ao lado.
//
// Mesma fonte de dados e mesma superfície de operação da Agenda
// (`useAgendaCampaigns` + `useCampaignOperations`): as duas telas são o mesmo
// dado em disposições diferentes, e um segundo dialeto de polling ou uma
// segunda ponte de edição local seriam dois lugares para o mesmo defeito.
//
// Sem barra lateral e sem chips de filtro, como no mockup: filtrar é da
// Agenda. Aqui a leitura é a forma do quadro.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { KanbanSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useAgendaCampaigns } from '../agenda/useAgendaCampaigns'
import { useCampaignOperations } from '../campaignOperations'
import { WindowNotice } from '../WindowNotice'
import { buildBoard, type BoardColumnId } from './boardColumns'
import { BoardColumn } from './BoardColumn'
import { useUserNames } from './useUserNames'
import type { Campaign } from '@/types'

/** O relógio da tela: "hoje · 20:30" e "em 1h 59" precisam de uma referência só. */
const CLOCK_TICK_MS = 30_000

export function BoardShell() {
  const { campaigns, loading, error, truncated, total, rates, refresh } = useAgendaCampaigns()
  const ops = useCampaignOperations(campaigns, refresh)
  const userNames = useUserNames()

  const [now, setNow] = useState(() => new Date())
  const [expanded, setExpanded] = useState<Set<BoardColumnId>>(() => new Set())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const columns = useMemo(() => buildBoard(ops.merged), [ops.merged])

  const toggle = useCallback((id: BoardColumnId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const rateOf = useCallback((id: string) => rates.get(id), [rates])
  const authorOf = useCallback(
    (c: Campaign) => userNames.get(c.createdByUserId),
    [userNames],
  )

  if (loading) {
    return (
      <div className="flex-1 p-7 grid grid-cols-2 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-[18px] border border-surface-800 bg-surface-900/60 p-2.5">
            <SkeletonList items={3} />
          </div>
        ))}
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

  if (ops.merged.length === 0) {
    return (
      <div className="flex-1 p-7">
        <EmptyState
          icon={KanbanSquare}
          title="Nenhum disparo por aqui"
          hint="Quando você criar um disparo, ele aparece neste quadro na coluna do estado em que estiver."
        />
        <WindowNotice truncated={truncated} shown={campaigns.length} total={total} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-7">
      {/* `overflow-x-auto` no quadro, nunca dentro da coluna: a coluna precisa
          crescer em altura para o gargalo aparecer. */}
      <div className="grid grid-cols-[repeat(5,minmax(224px,1fr))] gap-3 overflow-x-auto pb-1.5 items-start">
        {columns.map((column) => (
          <BoardColumn
            key={column.def.id}
            column={column}
            now={now}
            expanded={expanded.has(column.def.id)}
            onToggleExpand={() => toggle(column.def.id)}
            lifecycle={ops.lifecycle}
            rateOf={rateOf}
            authorOf={authorOf}
            lineOf={ops.lineNameOf}
            onSendNow={ops.sendNow}
            sendingNowId={ops.sendingNowId}
          />
        ))}
      </div>

      <WindowNotice truncated={truncated} shown={campaigns.length} total={total} />

      {ops.confirmations}
    </div>
  )
}
