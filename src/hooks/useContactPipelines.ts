import { useCallback, useEffect, useState } from 'react'
import { dealsApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { useToast } from '@/hooks/useToast'
import { DEALS_INVALIDATE_EVENT } from '@/hooks/useResolveWithOutcome'
import { getApiErrorMessage } from '@/lib/utils'
import { splitDeals } from '@/lib/contactPipelines'
import { toastDealClosedWithUndo } from '@/lib/dealClose'
import type { CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import type { Deal, DealStageHistoryEntry, Pipeline, PipelineStage } from '@/types'

export interface CloseTarget {
  deal: Deal
  stage: PipelineStage
  pipeline: Pipeline
}

/**
 * "Onde este contato está nos funis" — a máquina de estado, uma vez só.
 *
 * Havia **três** implementações paralelas disto: `ContactPipelinesSection` (a
 * ficha, feita na F11 e correta no Modelo B), `ContactPanelDeals` (o painel das
 * conversas) e `DealsTab` (o quick-view da tabela) — estas duas anteriores ao
 * Modelo B, com `Ganho/Perdido` fixo mesmo em funil de processo e valor em
 * dinheiro em registro que não tem valor. Não foi acidente: sem um dono
 * compartilhado, cada história corrigiu só a superfície do seu escopo. As três
 * passaram por aqui — o painel na SCRUM-920, o quick-view na SCRUM-921.
 *
 * O que é comum é o **comportamento** — carregar, ouvir socket e evento local,
 * mover (terminal exige motivo), fechar, abrir histórico. O que é de cada tela
 * é a **densidade**: stepper na ficha, card no quick-view, linha compacta no
 * painel da conversa. Este hook fica com o primeiro; a apresentação continua
 * de cada uma.
 *
 * Sem o flag de múltiplos funis (SCRUM-498) não busca nada e devolve
 * `enabled:false` — quem chama some da tela. Com `requireMultiPipeline:false`
 * o hook carrega mesmo assim, para a superfície que **não pode sumir** com o
 * flag desligado: o quick-view da tabela (`DealsTab`) é a aba de negócios do
 * tenant legado de funil único, que existia antes do módulo. Aí `enabled` diz
 * "o hook está vivo" e `multiPipeline` diz "há metadado de funil para mostrar"
 * — sem funis no cache não há nome, etapa nem destino de movimento.
 */
export function useContactPipelines(
  contactId: string,
  contactName: string,
  { requireMultiPipeline = true }: { requireMultiPipeline?: boolean } = {},
) {
  const multiPipeline = useMultiPipeline()
  const enabled = multiPipeline || !requireMultiPipeline
  const { pipelines } = useCRMConfig()
  const { toast } = useToast()
  const [deals, setDeals] = useState<Deal[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [closeTarget, setCloseTarget] = useState<CloseTarget | null>(null)
  const [history, setHistory] = useState<Record<string, DealStageHistoryEntry[] | 'loading' | undefined>>({})

  const load = useCallback(() => {
    if (!enabled) return
    dealsApi.list(contactId)
      .then((r) => { setDeals(Array.isArray(r.data) ? r.data : []); setError('') })
      .catch((e: unknown) => { setDeals([]); setError(getApiErrorMessage(e, 'Não foi possível carregar os funis.')) })
  }, [contactId, enabled])

  useEffect(() => { load() }, [load])

  // Tempo real por duas vias: o socket cobre o que muda em outro lugar (board,
  // IA, automação) e o evento local cobre a ação que acabou de acontecer nesta
  // aba, sem esperar o round-trip.
  useEffect(() => {
    if (!enabled) return
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<{ contactId?: string }>).detail
      if (!detail?.contactId || detail.contactId === contactId) load()
    }
    window.addEventListener(DEALS_INVALIDATE_EVENT, onLocal)
    const socket = connectSocket()
    const onDealChanged = (p: { contactId?: string }) => { if (p?.contactId === contactId) load() }
    socket.on('deal:changed', onDealChanged)
    return () => {
      window.removeEventListener(DEALS_INVALIDATE_EVENT, onLocal)
      socket.off('deal:changed', onDealChanged)
    }
  }, [contactId, load, enabled])

  const { open, closed } = splitDeals(deals ?? [])
  const pipelineOf = useCallback(
    (d: Pick<Deal, 'pipelineId'>) => pipelines.find((p) => p.id === d.pipelineId),
    [pipelines],
  )

  /** Etapa normal move direto; terminal abre o modal de motivo (I5 do §4.6). */
  const moveTo = useCallback(async (deal: Deal, stage: PipelineStage, pipeline: Pipeline) => {
    if (stage.isWon || stage.isLost) { setCloseTarget({ deal, stage, pipeline }); return }
    setBusyId(deal.id)
    try {
      await dealsApi.moveStage(deal.id, stage.id)
      toast(`${contactName} foi para ${stage.label} em ${pipeline.name}.`, 'success')
      load()
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Não foi possível mover.'), 'error')
    } finally {
      setBusyId(null)
    }
  }, [contactName, load, toast])

  const closeWithReason = useCallback(async (input: CloseDealReasonInput) => {
    if (!closeTarget) return
    const { deal, stage, pipeline } = closeTarget
    const fromStageId = deal.stageId
    // Valor final confirmado no modal (venda sem itens): grava antes de fechar
    // — depois de fechado o registro não aceita mais edição de valor.
    if (input.amountCents !== undefined) {
      await dealsApi.update(deal.id, { amountCents: input.amountCents })
    }
    await dealsApi.setStatus(deal.id, {
      status: input.outcome,
      closeReason: input.reason,
      closeNote: input.note,
    })
    // A4 (SCRUM-926): fechar é reversível por 5 s — depois disso, "Reabrir" na
    // linha do registro fechado.
    toastDealClosedWithUndo({
      message: `${contactName} marcado como ${stage.label} em ${pipeline.name}.`,
      dealId: deal.id,
      fromStageId,
      onUndone: load,
    })
    setCloseTarget(null)
    load()
  }, [closeTarget, contactName, load])

  /**
   * Reabre um registro fechado na 1ª etapa não-terminal do funil (A4 ·
   * SCRUM-926). Existe porque o único lugar que reabria era o seletor de
   * Status do `DealModal`, que saiu — fechar virou ação própria, com motivo, e
   * reabrir precisava de casa nova. 409 (o contato já tem outro aberto no
   * funil, I1) chega como mensagem do backend, que explica o que houve.
   */
  const reopen = useCallback(async (deal: Deal) => {
    setBusyId(deal.id)
    try {
      await dealsApi.setStatus(deal.id, { status: 'open' })
      toast(`${contactName} voltou para o funil.`, 'success')
      load()
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Não foi possível reabrir.'), 'error')
    } finally {
      setBusyId(null)
    }
  }, [contactName, load, toast])

  const toggleHistory = useCallback(async (dealId: string) => {
    if (history[dealId] && history[dealId] !== 'loading') {
      setHistory((h) => ({ ...h, [dealId]: undefined }))
      return
    }
    setHistory((h) => ({ ...h, [dealId]: 'loading' }))
    try {
      const { data } = await dealsApi.history(dealId)
      setHistory((h) => ({ ...h, [dealId]: Array.isArray(data) ? data : [] }))
    } catch {
      setHistory((h) => ({ ...h, [dealId]: [] }))
      toast('Não foi possível carregar o histórico.', 'error')
    }
  }, [history, toast])

  return {
    /** O hook está carregando e ouvindo; a superfície que se esconde pelo flag some quando `false`. */
    enabled,
    /** Flag de múltiplos funis: sem ele não há funil no cache, só o negócio cru. */
    multiPipeline,
    pipelines,
    /** `null` enquanto carrega — as telas distinguem "carregando" de "nenhum". */
    deals,
    open,
    closed,
    error,
    busyId,
    closeTarget,
    setCloseTarget,
    history,
    pipelineOf,
    moveTo,
    closeWithReason,
    reopen,
    toggleHistory,
    reload: load,
  }
}
