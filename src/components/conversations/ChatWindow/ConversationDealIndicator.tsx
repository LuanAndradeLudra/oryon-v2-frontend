import { useState, useEffect, useCallback, useMemo } from 'react'
import { KanbanSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dealsApi, pipelineRoutingApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { cn, hexToRgba } from '@/lib/utils'
import type { Deal } from '@/types'

interface DealChip {
  dealId: string
  pipeline: string
  pipelineId: string
  stage: string
  color: string
  /** Funil roteado pra linha WhatsApp desta conversa (pipeline-routing) — destacado no chip. */
  isRouted: boolean
}

/**
 * Indicador dos negócios ABERTOS do contato, no cabeçalho da conversa —
 * modelo híbrido permite mais de um aberto simultâneo (um por funil). Mostra
 * um chip por negócio (pipeline · estágio), destacando o funil roteado pra
 * esta linha WhatsApp. Atualiza ao vivo via socket `deal:changed` (refetch
 * on-event). Não renderiza nada se o contato não tem negócio aberto. Clique
 * em qualquer chip leva ao board daquele funil.
 *
 * A lista de funis vem do cache compartilhado (`CRMConfigContext`, SCRUM-293)
 * — este componente não faz seu próprio GET /settings/pipelines nem monta
 * uma subscrição extra pra isso; só combina o cache com os deals abertos e o
 * roteamento (que aí sim são específicos deste contato/linha).
 */
export function ConversationDealIndicator({ contactId, whatsappNumberId }: { contactId: string; whatsappNumberId?: string }) {
  const { pipelines } = useCRMConfig()
  const [openDeals, setOpenDeals] = useState<Deal[]>([])
  const [routedPipelineId, setRoutedPipelineId] = useState<string | undefined>(undefined)
  const navigate = useNavigate()

  const load = useCallback(() => {
    Promise.all([
      dealsApi.list(contactId),
      whatsappNumberId ? pipelineRoutingApi.list() : Promise.resolve(null),
    ])
      .then(([dealsRes, routingRes]) => {
        const deals = Array.isArray(dealsRes.data) ? dealsRes.data : []
        setOpenDeals(deals.filter((d) => d.status === 'open'))
        setRoutedPipelineId(
          routingRes
            ? (routingRes.data ?? []).find((r) => r.whatsappNumberId === whatsappNumberId)?.pipelineId
            : undefined,
        )
      })
      .catch(() => { setOpenDeals([]); setRoutedPipelineId(undefined) })
  }, [contactId, whatsappNumberId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const socket = connectSocket()
    const onDealChanged = (p: { contactId?: string }) => {
      if (p?.contactId === contactId) load()
    }
    socket.on('deal:changed', onDealChanged)
    return () => { socket.off('deal:changed', onDealChanged) }
  }, [contactId, load])

  const chips = useMemo(() => {
    const next: DealChip[] = []
    for (const deal of openDeals) {
      const pipe = pipelines.find((p) => p.id === deal.pipelineId)
      const stage = pipe?.stages.find((s) => s.id === deal.stageId)
      if (!pipe || !stage) continue
      next.push({
        dealId: deal.id,
        pipeline: pipe.name,
        pipelineId: pipe.id,
        stage: stage.label,
        color: stage.color,
        isRouted: pipe.id === routedPipelineId,
      })
    }
    // Funil roteado primeiro, resto por nome — ordem estável, não depende
    // da ordem em que o backend devolveu os deals.
    next.sort((a, b) => {
      if (a.isRouted !== b.isRouted) return a.isRouted ? -1 : 1
      return a.pipeline.localeCompare(b.pipeline)
    })
    return next
  }, [openDeals, pipelines, routedPipelineId])

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap max-w-full">
      {chips.map((chip) => (
        <button
          key={chip.dealId}
          type="button"
          onClick={() => navigate(`/contacts?pipeline=${chip.pipelineId}`)}
          title={`${chip.pipeline} · ${chip.stage}${chip.isRouted ? ' — funil desta linha' : ''} — abrir no board`}
          className={cn(
            'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium max-w-full',
          )}
          style={{
            backgroundColor: hexToRgba(chip.color, 0.15),
            color: chip.color,
            boxShadow: chip.isRouted ? `inset 0 0 0 1px ${chip.color}` : undefined,
          }}
        >
          <KanbanSquare className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{chip.pipeline} · {chip.stage}</span>
        </button>
      ))}
    </div>
  )
}
