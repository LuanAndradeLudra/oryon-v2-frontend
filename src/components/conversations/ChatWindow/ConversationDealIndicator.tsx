import { useState, useEffect, useCallback, useMemo } from 'react'
import { KanbanSquare, CheckCircle2, XCircle } from 'lucide-react'
import { dealsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { DEALS_INVALIDATE_EVENT } from '@/hooks/useResolveWithOutcome'
import { pickIndicatorDeals, needsDealSelector, selectableDeals, linkedDeal } from '@/lib/dealIndicator'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { ConversationDealSelector } from './ConversationDealSelector'
import { cn, hexToRgba } from '@/lib/utils'
import type { Deal } from '@/types'

interface DealChip {
  dealId: string
  pipeline: string
  stage: string
  color: string
  /** F11-887: registro que NASCEU nesta conversa (`originConversationId`) — destacado no chip.
   *  Substitui o destaque por roteamento de linha (congelado no Modelo B). */
  isOrigin: boolean
  /** F10 (SCRUM-883): registro desta conversa já fechado — chip no terminal com ícone de fechado. */
  closed?: 'won' | 'lost'
}

/**
 * Indicador dos registros do contato no cabeçalho da conversa — um chip por
 * registro aberto (funil · etapa), mais o registro desta conversa depois de
 * fechado (F10). Destaque = registro que nasceu NESTA conversa (F11-887; o
 * roteamento por linha está congelado no Modelo B e não é mais consultado).
 * Atualiza ao vivo via socket `deal:changed` e pelo evento local
 * `oryon:deals-invalidate`. Clique em qualquer chip abre a ficha do negócio.
 *
 * A lista de funis vem do cache compartilhado (`CRMConfigContext`, SCRUM-293)
 * — este componente faz só 1 `GET /deals?contactId=` por conversa aberta.
 *
 * B4 (SCRUM-930): clique abre a FICHA do negócio em painel lateral
 * (`useDealPanel`), não navega mais pro board — `/contacts?pipeline=`
 * abandonava a conversa e o rascunho da mensagem (F-CONV-29). O painel é um
 * portal por cima da página atual; a conversa nunca desmonta.
 */
export function ConversationDealIndicator({ contactId, conversationId }: { contactId: string; whatsappNumberId?: string; conversationId?: string }) {
  const { pipelines } = useCRMConfig()
  // Gate de múltiplos funis (SCRUM-498): sem o flag não há chip possível
  // (`pipelines` vem vazio), então os deals nem são buscados.
  const multiPipeline = useMultiPipeline()
  const [openDeals, setOpenDeals] = useState<Deal[]>([])
  const { openDeal } = useDealPanel()
  const { toast } = useToast()
  const [linking, setLinking] = useState(false)

  const load = useCallback(() => {
    // Gate fechado: sem fetch. Os chips já saem vazios no `useMemo` abaixo.
    if (!multiPipeline) return
    dealsApi.list(contactId)
      .then((dealsRes) => {
        const deals = Array.isArray(dealsRes.data) ? dealsRes.data : []
        setOpenDeals(pickIndicatorDeals(deals, conversationId))
      })
      .catch(() => { setOpenDeals([]) })
  }, [contactId, multiPipeline, conversationId])

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
        stage: stage.label,
        color: stage.color,
        isOrigin: !!conversationId && deal.originConversationId === conversationId,
        closed: deal.status === 'won' || deal.status === 'lost' ? deal.status : undefined,
      })
    }
    // Registro desta conversa primeiro, resto por nome — ordem estável, não
    // depende da ordem em que o backend devolveu os deals.
    next.sort((a, b) => {
      if (a.isOrigin !== b.isOrigin) return a.isOrigin ? -1 : 1
      return a.pipeline.localeCompare(b.pipeline)
    })
    return next
  }, [openDeals, pipelines, conversationId, multiPipeline])

  // C2 (SCRUM-933): com N abertos no MESMO funil não existe "o" negócio desta
  // conversa até alguém dizer qual — o cabeçalho ganha o seletor. Com um
  // aberto por funil (todo tenant sem `allowMultipleOpen`) nada muda aqui.
  const showSelector = useMemo(() => !!conversationId && needsDealSelector(openDeals), [openDeals, conversationId])
  const options = useMemo(() => (showSelector ? selectableDeals(openDeals, conversationId) : []), [showSelector, openDeals, conversationId])
  const linkedId = useMemo(() => linkedDeal(openDeals, conversationId)?.id ?? null, [openDeals, conversationId])

  const pickDeal = useCallback(async (dealId: string) => {
    if (!conversationId) return
    setLinking(true)
    try {
      await dealsApi.linkConversation(dealId, conversationId)
      load()
      // As outras superfícies deste contato (painel, ficha, board) leem o
      // mesmo `originConversationId` — avisa na hora, como o resto do módulo.
      window.dispatchEvent(new CustomEvent(DEALS_INVALIDATE_EVENT, { detail: { contactId } }))
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Não foi possível vincular o negócio a esta conversa.'), 'error')
    } finally {
      setLinking(false)
    }
  }, [conversationId, contactId, load, toast])

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap max-w-full">
      {showSelector && (
        <ConversationDealSelector
          deals={options}
          pipelines={pipelines}
          linkedDealId={linkedId}
          busy={linking}
          onPick={(id) => void pickDeal(id)}
          onOpenDeal={openDeal}
        />
      )}
      {chips.map((chip) => (
        <button
          key={chip.dealId}
          type="button"
          onClick={() => openDeal(chip.dealId)}
          title={`${chip.pipeline} · ${chip.stage}${chip.closed ? ' — fechado nesta conversa' : chip.isOrigin ? ' — registro desta conversa' : ''} — abrir negócio`}
          data-testid={chip.closed ? 'deal-chip-closed' : 'deal-chip-open'}
          data-origin={chip.isOrigin || undefined}
          className={cn(
            // Achado do Lince (revisão do PR #76): a pílula visível tem só
            // ~18-20px de alvo de toque. `before` transparente, absoluto e
            // centralizado (sem afetar o layout — não empurra os chips
            // vizinhos) garante ≥44×44px de área clicável sem mudar a
            // aparência: cor/padding/borda da pílula continuam os mesmos.
            'relative inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium max-w-full',
            "before:content-[''] before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:min-w-[44px] before:min-h-[44px]",
            chip.closed && 'opacity-80',
          )}
          style={{
            backgroundColor: hexToRgba(chip.color, 0.15),
            color: chip.color,
            boxShadow: chip.isOrigin && !chip.closed ? `inset 0 0 0 1px ${chip.color}` : undefined,
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
