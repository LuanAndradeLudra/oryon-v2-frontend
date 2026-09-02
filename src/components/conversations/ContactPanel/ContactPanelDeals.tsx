import { KanbanSquare, Handshake } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { DealSummary, useDealSummaryMove } from '@/components/deals/DealSummary'
import { Button } from '@/components/ui/Button'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { pipelineKindOf, defaultSalesPipeline } from '@/lib/pipelineKinds'
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
  const {
    enabled, deals, open, closed, error, busyId, pipelines,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, reopen, toggleHistory, reload,
  } = useContactPipelines(contactId, contactName)
  const moveState = useDealSummaryMove()
  const { vocab } = useTenantVocab()
  // A3 (SCRUM-925): o vazio ganha ação. Não e a "segunda porta" que a
  // SCRUM-920 tirou daqui — aquele "Novo" abria o DealModal cru e virava erro
  // no conflito; este passa pelo MESMO fluxo do cabeçalho, com o 409 tratado.
  const addToPipeline = useAddToPipeline({ onCreated: () => reload() })
  const salesPipeline = defaultSalesPipeline(pipelines)

  if (!enabled) return null

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
    <div className="px-4 py-3 border-b border-surface-800" data-testid="panel-pipelines">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold flex items-center gap-1.5">
          <KanbanSquare className="w-3 h-3" /> Funis
          <span className="text-surface-600 normal-case tracking-normal" data-testid="panel-pipelines-count">
            · {deals === null ? '…' : `${open.length} ${open.length === 1 ? 'aberto' : 'abertos'}`}
          </span>
        </p>
      </div>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}

      {deals !== null && open.length === 0 && closed.length === 0 && !error && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs text-surface-600">Nenhum registro ainda.</p>
          {salesPipeline && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Handshake className="w-3.5 h-3.5" />}
              onClick={() => addToPipeline.requestAdd({ contactId, contactName, pipeline: salesPipeline, conversationId })}
            >
              Novo {vocab.deal.toLowerCase()}
            </Button>
          )}
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
