import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KanbanSquare } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { ConversationDealSelector } from '@/components/conversations/ChatWindow/ConversationDealSelector'
import { needsDealSelector, selectableDeals, linkedDeal } from '@/lib/dealIndicator'
import { DEALS_INVALIDATE_EVENT } from '@/hooks/useResolveWithOutcome'
import { useToast } from '@/hooks/useToast'
import { dealsApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/utils'
import { DealSummary, useDealSummaryMove } from '@/components/deals/DealSummary'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { pipelineKindOf } from '@/lib/pipelineKinds'
import { formatBRL } from '@/utils/money'
import type { Deal, Pipeline, PipelineStage } from '@/types'

/**
 * "Funis" no painel do contato, dentro de Conversas.
 *
 * **O que esta tela era.** A seção mais vista da plataforma — quem atende passa
 * o dia no inbox — e a menos atualizada: anterior ao Modelo B, chamava tudo de
 * "Negócio", mostrava `Ganho/Perdido` mesmo num funil de **processo** (onde o
 * vocabulário é Concluído/Cancelado), exibia **R$ 0,00** em registro que não tem
 * valor, somava processo junto com venda nos totais, e **não mostrava a etapa**
 * — a tabela, a ficha e o board mostravam; justamente aqui, onde a decisão
 * acontece, não. O chip do cabeçalho da conversa dizia "Funil · Etapa" e o
 * painel logo abaixo dizia "Negócio · R$ 0,00 · Ganho": duas leituras do mesmo
 * registro, discordando.
 *
 * **O que é agora.** A mesma fonte da ficha (`useContactPipelines`), na
 * densidade `row` do `DealSummary` compartilhado (B3 · SCRUM-929) — o que
 * cabe num painel estreito: uma linha por registro aberto com funil, tipo,
 * etapa atual e contexto, com "Mover etapa ▾" — a ação que antes exigia abrir
 * um modal de edição de negócio ou ir até o board. Passagens fechadas em
 * linha, com histórico sob demanda.
 *
 * **Dinheiro só onde existe.** Os totais "Em aberto/Ganho" aparecem apenas se
 * há registro de **venda**; num tenant que só usa funil de processo, a faixa
 * some em vez de mostrar zeros.
 *
 * **Criar registro saiu daqui.** O cabeçalho desta mesma conversa já tem
 * "Adicionar ao funil" (F9), com o fluxo de conflito (`409 open_exists`) e a
 * distinção venda/processo. O "Novo" que existia aqui abria o `DealModal`
 * direto e transformava o conflito num erro cru — duas portas para a mesma
 * ação, uma delas errada.
 */
/**
 * C2 (SCRUM-933) — o seletor "negócio desta conversa" mudou de casa em 09/09.
 *
 * Ele morava no `ConversationDealIndicator`, no cabeçalho do chat. Com os chips
 * de negócio saindo de lá (eram a mesma informação que esta seção, em dois
 * lugares), o seletor viria junto — e ele não é enfeite: é o que grava
 * `originConversationId` e decide em qual negócio a IA e o "resolver com
 * desfecho" vão agir. Aqui ele fica ao lado da lista que ele desambigua, que é
 * onde a pergunta faz sentido.
 */
export function ContactPanelDeals({
  contactId,
  contactName,
  conversationId,
}: {
  contactId: string
  /** Usado nas mensagens de confirmação ("Fulano foi para X"). */
  contactName: string
  conversationId: string
}) {
  const { openDeal } = useDealPanel()
  const { toast } = useToast()
  const navigate = useNavigate()

  /**
   * "No funil" — leva ao quadro do funil do registro, com a ficha aberta em
   * cima (`?deal=`, consumido uma vez pela PipelinePage).
   *
   * Sai da conversa, e isso tem custo conhecido: o rascunho da mensagem se
   * perde (F-CONV-29). Por isso ele é a AÇÃO SECUNDÁRIA — "Abrir" continua
   * respondendo "o que é este negócio" sem tirar ninguém do lugar, e este
   * responde "onde ele está", que é a pergunta que a ficha sozinha não
   * respondia desde a B2 (SCRUM-928).
   */
  const irAoQuadro = (deal: Deal) => {
    const pipeline = pipelineOf(deal)
    if (!pipeline) return
    navigate(`/pipelines/${pipeline.id}?deal=${deal.id}`)
  }
  const {
    enabled, deals, open, closed, error, busyId, pipelines,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, reopen, toggleHistory, reload,
  } = useContactPipelines(contactId, contactName)
  const moveState = useDealSummaryMove()
  const [linking, setLinking] = useState(false)

  // Só existe com mais de um aberto no MESMO funil — o que só acontece em
  // funil com multiplicidade (C1 · SCRUM-932). Sem isso não há ambiguidade.
  const opcoes = selectableDeals(open, conversationId)
  const mostraSeletor = needsDealSelector(open)
  const vinculado = linkedDeal(open, conversationId)

  const vincular = async (dealId: string) => {
    setLinking(true)
    try {
      await dealsApi.linkConversation(dealId, conversationId)
      reload()
      // As outras superfícies deste contato leem o mesmo `originConversationId`.
      window.dispatchEvent(new CustomEvent(DEALS_INVALIDATE_EVENT, { detail: { contactId } }))
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Não foi possível vincular o negócio a esta conversa.'), 'error')
    } finally {
      setLinking(false)
    }
  }
  // A3 (SCRUM-925): o vazio ganha ação. Não e a "segunda porta" que a
  // SCRUM-920 tirou daqui — aquele "Novo" abria o DealModal cru e virava erro
  // no conflito; este passa pelo MESMO fluxo do cabeçalho, com o 409 tratado.
  const addToPipeline = useAddToPipeline({ onCreated: () => reload() })

  if (!enabled) return null
  // A seção só existe quando há o que mostrar. Enquanto carrega e quando o
  // contato nunca entrou em funil nenhum, ela não ocupa espaço no painel —
  // criar registro continua a um clique em "Adicionar ao funil ▾", no
  // cabeçalho, e no menu ⋯ do mobile. Erro é exceção: aparece, senão o
  // operador não saberia que a leitura falhou.
  const vazio = deals !== null && open.length === 0 && closed.length === 0
  if ((deals === null || vazio) && !error) return null

  /** O histórico da conversa mostra eventos de registro — recarrega junto. */
  const refreshActivity = () => {
    window.dispatchEvent(
      new CustomEvent('oryon:activity-invalidate', { detail: { conversationId } }),
    )
  }

  const handleMove = async (deal: Deal, stage: PipelineStage, pipeline: Pipeline) => {
    moveState.close()
    await moveTo(deal, stage, pipeline)
    refreshActivity()
  }

  const handleClose = async (input: CloseDealReasonInput) => {
    await closeWithReason(input)
    refreshActivity()
  }

  const handleReopen = async (deal: Deal) => {
    await reopen(deal)
    refreshActivity()
  }

  // Faceta comercial: só registros de VENDA entram na conta. Processo não tem
  // valor, e somá-lo aqui produziria um total que não significa nada.
  const salesDeals = [...open, ...closed].filter((d) => {
    const p = pipelineOf(d)
    return p ? pipelineKindOf(p) === 'sales' : false
  })
  const openCents = salesDeals.filter((d) => d.status === 'open').reduce((s, d) => s + (d.amountCents ?? 0), 0)
  const wonCents = salesDeals.filter((d) => d.status === 'won').reduce((s, d) => s + (d.amountCents ?? 0), 0)

  return (
    <div className="panel-divider px-4 py-3 border-t border-surface-800" data-testid="panel-pipelines">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold flex items-center gap-1.5">
          <KanbanSquare className="w-3 h-3" /> Funis
          <span className="text-surface-600 normal-case tracking-normal" data-testid="panel-pipelines-count">
            · {open.length} em aberto
          </span>
        </p>
      </div>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}

      {mostraSeletor && (
        <div className="mb-2">
          <ConversationDealSelector
            deals={opcoes}
            pipelines={pipelines}
            linkedDealId={vinculado?.id ?? null}
            busy={linking}
            onPick={(id) => void vincular(id)}
            onOpenDeal={openDeal}
          />
        </div>
      )}

      {salesDeals.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2" data-testid="panel-pipelines-money">
          <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg px-2.5 py-1.5">
            <p className="text-[9px] text-surface-500 uppercase tracking-wide">Em aberto</p>
            <p className="text-sm font-semibold text-surface-100 tabular-nums">{formatBRL(openCents)}</p>
          </div>
          <div className="bg-surface-800/60 border border-surface-700/50 rounded-lg px-2.5 py-1.5">
            <p className="text-[9px] text-surface-500 uppercase tracking-wide">Ganho</p>
            <p className="text-sm font-semibold text-success tabular-nums">{formatBRL(wonCents)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {open.map((deal) => {
          const pipeline = pipelineOf(deal)
          if (!pipeline) return null
          return (
            <DealSummary
              key={deal.id}
              density="row"
              deal={deal}
              pipeline={pipeline}
              contactName={contactName}
              busy={busyId === deal.id}
              moveOpen={moveState.isOpen(deal.id)}
              onToggleMove={() => moveState.toggle(deal.id)}
              onMove={(stage) => void handleMove(deal, stage, pipeline)}
              onOpen={() => openDeal(deal.id)}
              onOpenBoard={() => irAoQuadro(deal)}
              testIdPrefix="panel-pipeline"
              testIdKey={pipeline.id}
            />
          )
        })}

        {closed.length > 0 && (
          <div className="flex flex-col gap-1 pt-1 border-t border-surface-800/60" data-testid="panel-pipelines-closed">
            {closed.map((deal) => (
              <DealSummary
                key={deal.id}
                density="row"
                closed
                deal={deal}
                pipeline={pipelineOf(deal)}
                busy={busyId === deal.id}
                onReopen={() => void handleReopen(deal)}
                history={history[deal.id]}
                onToggleHistory={() => void toggleHistory(deal.id)}
                testIdPrefix="panel-pipeline"
                testIdKey={deal.id}
              />
            ))}
          </div>
        )}
      </div>

      <CloseDealReasonModal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        deal={closeTarget?.deal ?? null}
        stage={closeTarget?.stage ?? null}
        pipeline={closeTarget?.pipeline ?? null}
        onConfirm={handleClose}
      />
      {addToPipeline.dialogs}
    </div>
  )
}
