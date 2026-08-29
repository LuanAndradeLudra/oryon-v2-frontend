import { useState, useEffect, useCallback, useMemo } from 'react'
import { KanbanSquare, CheckCircle2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dealsApi, pipelineRoutingApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { DEALS_INVALIDATE_EVENT } from '@/hooks/useResolveWithOutcome'
import { pickIndicatorDeals } from '@/lib/dealIndicator'
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
  /** F10 (SCRUM-883): registro desta conversa já fechado — chip no terminal com ícone de fechado. */
  closed?: 'won' | 'lost'
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
export function ConversationDealIndicator({ contactId, whatsappNumberId, conversationId }: { contactId: string; whatsappNumberId?: string; conversationId?: string }) {
  const { pipelines } = useCRMConfig()
  // Gate de múltiplos funis (SCRUM-498): sem o flag não há chip possível
  // (`pipelines` vem vazio), então nem os deals nem o roteamento são
  // buscados — evita 1 GET /deals + 1 GET /settings/pipeline-routing (404
  // sem o módulo) por conversa aberta.
  const multiPipeline = useMultiPipeline()
  const [openDeals, setOpenDeals] = useState<Deal[]>([])
  const [routedPipelineId, setRoutedPipelineId] = useState<string | undefined>(undefined)
  const navigate = useNavigate()

  const load = useCallback(() => {
    // Gate fechado: sem fetch. Os chips já saem vazios no `useMemo` abaixo.
    if (!multiPipeline) return
    Promise.all([
      dealsApi.list(contactId),
      whatsappNumberId ? pipelineRoutingApi.list() : Promise.resolve(null),
    ])
      .then(([dealsRes, routingRes]) => {
        const deals = Array.isArray(dealsRes.data) ? dealsRes.data : []
        setOpenDeals(pickIndicatorDeals(deals, conversationId))
        setRoutedPipelineId(
          routingRes
            ? (routingRes.data ?? []).find((r) => r.whatsappNumberId === whatsappNumberId)?.pipelineId
            : undefined,
        )
      })
      .catch(() => { setOpenDeals([]); setRoutedPipelineId(undefined) })
  }, [contactId, whatsappNumberId, multiPipeline, conversationId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!multiPipeline) return
    const socket = connectSocket()
    const onDealChanged = (p: { contactId?: string }) => {
      if (p?.contactId === contactId) load()
    }
    socket.on('deal:changed', onDealChanged)
    // F10 (SCRUM-883): quem resolveu com desfecho avisa na hora — o socket chega depois.
    const onLocalInvalidate = (e: Event) => {
      const detail = (e as CustomEvent<{ contactId?: string }>).detail
      if (!detail?.contactId || detail.contactId === contactId) load()
    }
    window.addEventListener(DEALS_INVALIDATE_EVENT, onLocalInvalidate)
    return () => {
      socket.off('deal:changed', onDealChanged)
      window.removeEventListener(DEALS_INVALIDATE_EVENT, onLocalInvalidate)
    }
  }, [contactId, load, multiPipeline])

  const chips = useMemo(() => {
    const next: DealChip[] = []
    if (!multiPipeline) return next
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
        closed: deal.status === 'won' || deal.status === 'lost' ? deal.status : undefined,
      })
    }
    // Funil roteado primeiro, resto por nome — ordem estável, não depende
    // da ordem em que o backend devolveu os deals.
    next.sort((a, b) => {
      if (a.isRouted !== b.isRouted) return a.isRouted ? -1 : 1
      return a.pipeline.localeCompare(b.pipeline)
    })
    return next
  }, [openDeals, pipelines, routedPipelineId, multiPipeline])

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap max-w-full">
      {chips.map((chip) => (
        <button
          key={chip.dealId}
          type="button"
          onClick={() => navigate(`/contacts?pipeline=${chip.pipelineId}`)}
          title={`${chip.pipeline} · ${chip.stage}${chip.closed ? ' — fechado nesta conversa' : chip.isRouted ? ' — funil desta linha' : ''} — abrir no board`}
          data-testid={chip.closed ? 'deal-chip-closed' : 'deal-chip-open'}
          className={cn(
            'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium max-w-full',
            chip.closed && 'opacity-80',
          )}
          style={{
            backgroundColor: hexToRgba(chip.color, 0.15),
            color: chip.color,
            boxShadow: chip.isRouted && !chip.closed ? `inset 0 0 0 1px ${chip.color}` : undefined,
          }}
        >
          {chip.closed === 'won'
            ? <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" aria-label="Fechado como ganho" />
            : chip.closed === 'lost'
              ? <XCircle className="w-2.5 h-2.5 flex-shrink-0" aria-label="Fechado como perdido" />
              : <KanbanSquare className="w-2.5 h-2.5 flex-shrink-0" />}
          <span className="truncate">{chip.pipeline} · {chip.stage}</span>
        </button>
      ))}
    </div>
  )
}
