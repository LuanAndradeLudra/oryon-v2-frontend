import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { DealsBoard } from '@/components/deals/DealsBoard'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { NewContactDrawer } from '@/components/contacts/NewContactDrawer'
import { useKanbanDeals } from '@/hooks/useKanbanDeals'
import { useTagsAndUsers } from '@/hooks/useTagsAndUsers'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useToast } from '@/hooks/useToast'
import { toastDealClosedWithUndo } from '@/lib/dealClose'
import { pipelineKindOf, pipelineNoun, terminalLabelsOf } from '@/lib/pipelineKinds'
import { contactsApi } from '@/services/api'
import { getApiErrorMessage } from '@/lib/utils'
import type { Contact, Deal, Pipeline, PipelineStage } from '@/types'

interface PipelineBoardTabProps {
  pipeline: Pipeline
  pipelines: Pipeline[]
  /** Chamado após um negócio ser criado/movido — o pai reflete em badges/contadores fora deste tab. */
  onDealsChanged?: () => void
}

/**
 * Board do funil (D2 · SCRUM-935) — migrado de dentro de `/contacts` (o
 * segmented control Contatos/Funil saiu, cada funil agora é `/pipelines/:id`
 * com abas Board/Relatórios). Toda a lógica de board que morava em
 * `ContactsPage` (useKanbanDeals, mover etapa, mover funil, fechar com
 * motivo, "Novo negócio", "Adicionar contato ao funil") vive aqui agora —
 * fora do contexto da tabela de contatos, que não é mais irmã dela na tela.
 */
export function PipelineBoardTab({ pipeline, pipelines, onDealsChanged }: PipelineBoardTabProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { openDeal } = useDealPanel()
  const { users } = useTagsAndUsers()
  const {
    dealsByStage, loading, error, moveStage, movePipeline, refetch,
  } = useKanbanDeals(pipeline.id)
  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
  const isProcess = pipelineKindOf(pipeline) === 'process'

  const [closeDealTarget, setCloseDealTarget] = useState<{ deal: Deal; stage: PipelineStage } | null>(null)
  const [newDealStageId, setNewDealStageId] = useState<string | null>(null)
  // B2 (SCRUM-928): `?deal=<id>` — mesmo deep link que o antigo /contacts?pipeline=
  // usava pra realçar o card. Capturado uma vez (lazy initializer): o
  // DealPanelContext global consome e limpa o MESMO param pra abrir a ficha;
  // se este estado reagisse a `searchParams` ao vivo, o realce sumiria assim
  // que a ficha abrisse.
  const [searchParams] = useSearchParams()
  const [highlightDealId] = useState<string | null>(() => searchParams.get('deal'))
  const [showNewContact, setShowNewContact] = useState(false)

  const handleMoveDeal = (deal: Deal, toStageId: string) => {
    const stage = sortedStages.find((st) => st.id === toStageId)
    // A4 (SCRUM-926): terminal = fechamento com motivo do catálogo, em
    // QUALQUER funil — o card fica na coluna de origem até o modal fechar.
    if (stage && (stage.isWon || stage.isLost)) {
      setCloseDealTarget({ deal, stage })
      return
    }
    moveStage(deal, toStageId).catch(() => toast(`Não foi possível mover o ${pipelineNoun(pipeline)}.`, 'error'))
  }

  const handleCloseDealWithReason = async (input: CloseDealReasonInput) => {
    if (!closeDealTarget) return
    const { deal, stage } = closeDealTarget
    const fromStageId = deal.stageId
    const labels = terminalLabelsOf(pipeline)
    const terminalLabel = input.outcome === 'won' ? labels.won : labels.lost
    await moveStage(deal, stage.id, { closeReason: input.reason, closeNote: input.note })
    toastDealClosedWithUndo({
      message: `${terminalLabel}.`,
      dealId: deal.id,
      fromStageId,
      onUndone: () => { void refetch(); onDealsChanged?.() },
    })
    setCloseDealTarget(null)
    void refetch()
    onDealsChanged?.()
  }

  const handleMovePipelineDeal = (deal: Deal, toPipelineId: string) => {
    movePipeline(deal, toPipelineId)
      .then(() => {
        toast('Negócio movido de funil.', 'success')
        onDealsChanged?.()
      })
      .catch((e: unknown) => toast(getApiErrorMessage(e, 'Não foi possível mover o negócio para o funil.'), 'error'))
  }

  const handleOpenDealContact = (contactId: string) => {
    // Board isolado (sem drawer de contato irmão na mesma tela) — a ficha
    // completa é o destino natural aqui, ao contrário do antigo
    // /contacts?pipeline= (que abria o drawer quick-view da própria página).
    navigate(`/contacts/${contactId}`)
  }

  const createContact = async (dto: Parameters<typeof contactsApi.create>[0]): Promise<Contact> => {
    const { data } = await contactsApi.create(dto)
    return data
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm">Não foi possível carregar os negócios deste funil.</p>
        <button onClick={refetch} className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2">
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <>
      <DealsBoard
        stages={sortedStages}
        dealsByStage={dealsByStage}
        onMoveStage={handleMoveDeal}
        onOpenContact={handleOpenDealContact}
        onOpenDeal={openDeal}
        loading={loading}
        pipelines={pipelines}
        onMovePipeline={handleMovePipelineDeal}
        onAddContact={() => setShowNewContact(true)}
        onNewDeal={isProcess ? undefined : (stageId) => setNewDealStageId(stageId)}
        itemNoun={pipelineNoun(pipeline)}
        pipeline={pipeline}
        users={users}
        highlightDealId={highlightDealId}
      />

      {newDealStageId && (
        <NewDealDialog
          open
          pipelines={pipelines}
          initialPipelineId={pipeline.id}
          initialStageId={newDealStageId}
          onClose={() => setNewDealStageId(null)}
          onCreated={() => {
            setNewDealStageId(null)
            void refetch()
            onDealsChanged?.()
          }}
          onConflict={() => {
            // Conflito (409 open_exists) num negócio criado direto do board:
            // sem drawer de contato nesta tela pra oferecer as 3 saídas do
            // fluxo "Adicionar ao funil" — aponta o caminho existente por toast.
            setNewDealStageId(null)
            toast('Este contato já tem um negócio aberto neste funil.', 'error')
          }}
        />
      )}

      <CloseDealReasonModal
        open={!!closeDealTarget}
        onClose={() => setCloseDealTarget(null)}
        deal={closeDealTarget?.deal ?? null}
        stage={closeDealTarget?.stage ?? null}
        pipeline={pipeline}
        onConfirm={handleCloseDealWithReason}
      />

      <NewContactDrawer
        open={showNewContact}
        onClose={() => setShowNewContact(false)}
        onCreate={createContact}
        onCreated={() => {
          setShowNewContact(false)
          void refetch()
          onDealsChanged?.()
        }}
        pipelines={pipelines}
        defaultPipelineId={pipeline.id}
      />
    </>
  )
}
