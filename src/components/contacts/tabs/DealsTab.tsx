import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DealModal } from '@/components/contacts/DealModal'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import { DealSummary, useDealSummaryMove } from '@/components/deals/DealSummary'
import { CloseDealReasonModal } from '@/components/deals/CloseDealReasonModal'
import { AddToPipelineMenu } from '@/components/deals/AddToPipelineMenu'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useToast } from '@/hooks/useToast'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { dealsApi } from '@/services/api'
import { pipelineNoun, defaultSalesPipeline } from '@/lib/pipelineKinds'
import type { Deal, Pipeline, PipelineStage } from '@/types'

/**
 * Aba de negócios do quick-view do contato (drawer da tabela de CRM) — a
 * **terceira** das três leituras de "onde este contato está nos funis", e a
 * última a chegar ao Modelo B (SCRUM-921). As outras duas são a ficha
 * (`ContactPipelinesSection`, F11) e o painel das conversas
 * (`ContactPanelDeals`, SCRUM-920); as três dividem `useContactPipelines`.
 *
 * **O que esta aba era.** É para onde o usuário cai ao clicar num chip
 * "Funil · Etapa" na tabela — e a aba não mostrava a etapa. Chamava tudo de
 * `Ganho/Perdido` (tabela literal no arquivo) mesmo em funil de **processo**,
 * onde é Concluído/Cancelado; exibia **R$ 0,00** em registro que não tem valor;
 * não tinha "Mover"; não dizia nada dos fechados (nem motivo, nem passagens); e
 * repetia carga e socket próprios, sem ouvir o evento local. O chip prometia uma
 * coisa e a aba que ele abre entregava outra.
 *
 * Densidade `card` do `DealSummary` compartilhado (B3 · SCRUM-929): um card
 * por registro aberto com funil, tipo, **etapa**, stepper de progresso, o que
 * mudou por último, "Mover etapa ▾" e "Abrir negócio"; fechados em linha com
 * motivo e histórico sob demanda.
 *
 * **O que continua só aqui.** Editar (valor e itens de linha) e excluir — o
 * `DealModal` é o único lugar da plataforma onde se mexe no dinheiro do
 * negócio; por isso só esta tela passa `onEdit`/`onDelete` ao `DealSummary`
 * (a ficha, `ContactPipelinesSection`, não passa). Já o "Novo" saiu: virou o
 * `AddToPipelineMenu` (F9), com a distinção venda/processo e o conflito
 * `409 open_exists`, em vez de abrir o `DealModal` cru como antes.
 *
 * **Sem o flag de múltiplos funis a aba não some** — diferente da ficha e do
 * painel. No tenant legado de funil único ela é a lista de negócios, que existe
 * desde antes do módulo; o que some é a dimensão de funil (nome, tipo, etapa,
 * mover, board, histórico), porque sem o flag não há funil no cache para ler.
 */
export function DealsTab({ contactId, contactName }: { contactId: string; contactName: string }) {
  const { vocab } = useTenantVocab()
  const { toast } = useToast()
  const { openDeal } = useDealPanel()
  // A aba precisa listar mesmo sem o flag — daí `requireMultiPipeline: false`.
  const {
    multiPipeline, pipelines, deals, open, closed, error, busyId,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, reopen, toggleHistory, reload,
  } = useContactPipelines(contactId, contactName, { requireMultiPipeline: false })
  const { requestAdd, dialogs: addDialogs, reportConflict } = useAddToPipeline()
  const moveState = useDealSummaryMove()
  const [modalOpen, setModalOpen] = useState(false)
  // A3 (SCRUM-925): sem o flag de múltiplos funis não há "Adicionar ao funil ▾",
  // e o "Novo" abria o `DealModal` — que é o formulário de EDIÇÃO e não tem
  // campo de valor. Agora abre o mesmo diálogo de 2 passos das outras
  // superfícies; o `DealModal` fica só para editar.
  const [newDealOpen, setNewDealOpen] = useState(false)
  const salesPipeline = defaultSalesPipeline(pipelines)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dealWord = vocab.deal.toLowerCase()
  const deletePipeline = deleteDeal ? pipelineOf(deleteDeal) : undefined

  const handleMove = (deal: Deal, stage: PipelineStage, pipeline: Pipeline) => {
    moveState.close()
    void moveTo(deal, stage, pipeline)
  }

  const handleDelete = async () => {
    if (!deleteDeal) return
    setDeleting(true)
    try {
      await dealsApi.remove(deleteDeal.id)
      toast(`${pipelineNoun(deletePipeline)} excluído.`, 'success')
      setDeleteDeal(null)
      reload()
    } catch {
      toast('Erro ao excluir.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const closeModal = () => { setModalOpen(false); setEditDeal(null) }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-surface-100">
            {vocab.deals}
            {multiPipeline && (
              <span className="text-xs font-medium text-surface-500" data-testid="deals-open-count">
                {' · '}{deals === null ? '…' : `${open.length} ${open.length === 1 ? 'aberto' : 'abertos'}`}
              </span>
            )}
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {multiPipeline
              ? 'Onde este contato está em cada funil.'
              : 'Produtos/serviços propostos ou vendidos a este contato.'}
          </p>
        </div>
        {multiPipeline ? (
          <AddToPipelineMenu
            contactId={contactId}
            contactName={contactName}
            openDeals={deals === null ? null : open}
            size="sm"
            onPick={(pipeline) => void requestAdd({ contactId, contactName, pipeline })}
          />
        ) : (
          <button
            onClick={() => setNewDealOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Novo {dealWord}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-danger mb-3" role="alert">{error}</p>}

      {deals === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      ) : open.length === 0 && closed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-surface-500">Nenhum {dealWord} ainda.</p>
          {/* A3 (SCRUM-925): o vazio ganha ação — com o flag, pelo mesmo fluxo
              do "Adicionar ao funil" (conflito I1 incluso); sem o flag, pelo
              diálogo direto, que é o único caminho de criação do tenant legado. */}
          {(!multiPipeline || salesPipeline) && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                if (!multiPipeline || !salesPipeline) { setNewDealOpen(true); return }
                void requestAdd({ contactId, contactName, pipeline: salesPipeline })
              }}
            >
              Novo {dealWord}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((deal) => {
            const pipeline = pipelineOf(deal)
            return (
              <DealSummary
                key={deal.id}
                density="card"
                deal={deal}
                pipeline={pipeline}
                contactName={contactName}
                busy={busyId === deal.id}
                showMeta={multiPipeline}
                moveOpen={moveState.isOpen(deal.id)}
                onToggleMove={() => moveState.toggle(deal.id)}
                onMove={(stage) => pipeline && handleMove(deal, stage, pipeline)}
                onOpen={() => openDeal(deal.id)}
                onEdit={() => { setEditDeal(deal); setModalOpen(true) }}
                onDelete={() => setDeleteDeal(deal)}
                testIdPrefix="deal"
                testIdKey={deal.id}
              />
            )
          })}

          {closed.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1" data-testid="deals-closed">
              {closed.map((deal) => (
                <DealSummary
                  key={deal.id}
                  density="card"
                  closed
                  deal={deal}
                  pipeline={pipelineOf(deal)}
                  busy={busyId === deal.id}
                  onReopen={() => void reopen(deal)}
                  history={history[deal.id]}
                  onToggleHistory={() => void toggleHistory(deal.id)}
                  showReopenHistory={multiPipeline}
                  testIdPrefix="deal"
                  testIdKey={deal.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <DealModal
        open={modalOpen}
        contactId={contactId}
        contactName={contactName}
        editDeal={editDeal}
        pipelines={pipelines}
        onClose={closeModal}
        onSaved={() => { closeModal(); reload() }}
      />

      {/* A3: criação (o `DealModal` acima ficou só para edição). O 409 vai para
          o modal de conflito do hook — este caminho não o tratava (F-05). */}
      {newDealOpen && (
      <NewDealDialog
        open
        contactId={contactId}
        contactName={contactName}
        pipelines={pipelines}
        onClose={() => setNewDealOpen(false)}
        onCreated={() => { setNewDealOpen(false); reload() }}
        onConflict={({ openDealId, pipelineId }) => {
          setNewDealOpen(false)
          const pipeline = pipelines.find((p) => p.id === pipelineId)
          if (pipeline) reportConflict({ contactId, contactName, pipeline }, openDealId)
        }}
      />
      )}

      <ConfirmModal
        open={!!deleteDeal}
        onClose={() => setDeleteDeal(null)}
        onConfirm={handleDelete}
        title={`Excluir ${pipelineNoun(deletePipeline)}`}
        description={`Tem certeza que deseja excluir "${deleteDeal?.title}"?`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <CloseDealReasonModal
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        deal={closeTarget?.deal ?? null}
        stage={closeTarget?.stage ?? null}
        pipeline={closeTarget?.pipeline ?? null}
        onConfirm={closeWithReason}
      />

      {addDialogs}
    </div>
  )
}
