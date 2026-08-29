import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2, KanbanSquare, ChevronDown, CheckCircle2, XCircle, History } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { DealModal } from '@/components/contacts/DealModal'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { CloseDealReasonModal } from '@/components/deals/CloseDealReasonModal'
import { AddToPipelineMenu } from '@/components/deals/AddToPipelineMenu'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { useToast } from '@/hooks/useToast'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { dealsApi } from '@/services/api'
import { formatRelativeTime } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, terminalLabelsOf, pipelineNoun } from '@/lib/pipelineKinds'
import { originInfo, timeInStage } from '@/lib/dealCard'
import { movedByLabel, moveTargets } from '@/lib/contactPipelines'
import { formatBRL } from '@/utils/money'
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
 * **Densidade média**, entre o stepper da ficha e a linha do painel estreito:
 * um card por registro aberto com funil, tipo, **etapa**, o que mudou por
 * último, "Mover ▾" e "Ver no board"; fechados em linha com motivo e histórico
 * sob demanda.
 *
 * **O que continua só aqui.** Editar (valor e itens de linha) e excluir — o
 * `DealModal` é o único lugar da plataforma onde se mexe no dinheiro do
 * negócio. Já o "Novo" saiu: virou o `AddToPipelineMenu` (F9), com a distinção
 * venda/processo e o conflito `409 open_exists`, em vez de abrir o `DealModal`
 * cru como antes.
 *
 * **Sem o flag de múltiplos funis a aba não some** — diferente da ficha e do
 * painel. No tenant legado de funil único ela é a lista de negócios, que existe
 * desde antes do módulo; o que some é a dimensão de funil (nome, tipo, etapa,
 * mover, board, histórico), porque sem o flag não há funil no cache para ler.
 */
export function DealsTab({ contactId, contactName }: { contactId: string; contactName: string }) {
  const { vocab } = useTenantVocab()
  const { toast } = useToast()
  const navigate = useNavigate()
  // A aba precisa listar mesmo sem o flag — daí `requireMultiPipeline: false`.
  const {
    multiPipeline, pipelines, deals, open, closed, error, busyId,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, toggleHistory, reload,
  } = useContactPipelines(contactId, contactName, { requireMultiPipeline: false })
  const { requestAdd, dialogs: addDialogs } = useAddToPipeline()
  const [moveOpenFor, setMoveOpenFor] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null)
  const [deleting, setDeleting] = useState(false)

  const dealWord = vocab.deal.toLowerCase()
  const deletePipeline = deleteDeal ? pipelineOf(deleteDeal) : undefined

  const handleMove = (deal: Deal, stage: PipelineStage, pipeline: Pipeline) => {
    setMoveOpenFor(null)
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
            onClick={() => { setEditDeal(null); setModalOpen(true) }}
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
        <p className="text-sm text-surface-500 text-center py-10">
          {multiPipeline ? 'Nenhum registro ainda — use "Adicionar ao funil".' : `Nenhum ${dealWord} ainda.`}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((deal) => {
            const pipeline = pipelineOf(deal)
            const kind = pipelineKindOption(pipelineKindOf(pipeline))
            const KindIcon = kind.icon
            const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
            const targets = pipeline ? moveTargets(pipeline, deal.stageId) : null
            const labels = terminalLabelsOf(pipeline)
            // Sem funil (tenant legado) todo negócio é comercial; com funil, só
            // o de VENDA tem dinheiro — processo não tem valor, e o "R$ 0,00"
            // que aparecia ali era leitura falsa, não formatação feia.
            const showsMoney = !pipeline || pipelineKindOf(pipeline) === 'sales'
            const items = deal.lineItems?.length ?? 0
            // Em funil de processo o título É o contato (F8, decisão (a)):
            // repeti-lo dentro da ficha do próprio contato não informa nada.
            const title = deal.title?.trim()
            const showsTitle = !!title && title !== contactName.trim()
            const who = movedByLabel(deal)
            const meta = multiPipeline
              ? [timeInStage(deal), who ? `movido por ${who}` : null, `origem ${originInfo(deal).label}`]
                .filter(Boolean).join(' · ')
              : ''
            return (
              <article
                key={deal.id}
                className="bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 flex flex-col gap-2"
                data-testid={`deal-open-${deal.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {pipeline && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />}
                  <span className="text-sm font-medium text-surface-100 truncate">
                    {pipeline?.name ?? title ?? vocab.deal}
                  </span>
                  {pipeline && <KindIcon className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" aria-label={kind.label} />}
                  {stage && (
                    <span className="ml-auto text-[11px] text-surface-300 whitespace-nowrap" data-testid={`deal-stage-${deal.id}`}>
                      {stage.label}
                    </span>
                  )}
                </div>

                {pipeline && showsTitle && <p className="text-xs text-surface-300 truncate">{title}</p>}

                {showsMoney && (
                  <p className="text-[11px] text-surface-400 tabular-nums" data-testid={`deal-money-${deal.id}`}>
                    {formatBRL(deal.amountCents)}
                    {items ? ` · ${items} ${items === 1 ? 'item' : 'itens'}` : ''}
                  </p>
                )}

                {meta && <p className="text-[11px] text-surface-500 truncate" data-testid={`deal-meta-${deal.id}`}>{meta}</p>}

                <div className="flex items-center gap-1.5">
                  {pipeline && targets && (
                    <Dropdown
                      open={moveOpenFor === deal.id}
                      onClose={() => setMoveOpenFor(null)}
                      align="left"
                      className="w-56"
                      anchor={
                        <button
                          type="button"
                          onClick={() => setMoveOpenFor((v) => (v === deal.id ? null : deal.id))}
                          disabled={busyId === deal.id}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-200 hover:bg-surface-700 disabled:opacity-50 transition-colors"
                          data-testid={`deal-move-${deal.id}`}
                          aria-haspopup="menu"
                          aria-expanded={moveOpenFor === deal.id}
                        >
                          Mover <ChevronDown className="w-3 h-3" />
                        </button>
                      }
                    >
                      <div className="px-1 py-1 flex flex-col gap-0.5">
                        {targets.normal.map((s) => (
                          <DropdownItem key={s.id} onClick={() => handleMove(deal, s, pipeline)}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </DropdownItem>
                        ))}
                        {targets.normal.length > 0 && targets.terminal.length > 0 && <DropdownSeparator />}
                        {targets.terminal.map((s) => (
                          <DropdownItem key={s.id} onClick={() => handleMove(deal, s, pipeline)} danger={s.isLost}>
                            {s.isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {s.isWon ? labels.won : labels.lost} (com motivo)
                          </DropdownItem>
                        ))}
                      </div>
                    </Dropdown>
                  )}
                  {pipeline && (
                    <button
                      type="button"
                      onClick={() => navigate(`/contacts?pipeline=${pipeline.id}`)}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                      data-testid={`deal-board-${deal.id}`}
                    >
                      <KanbanSquare className="w-3.5 h-3.5" /> Ver no board
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setEditDeal(deal); setModalOpen(true) }}
                    title={`Editar ${pipelineNoun(pipeline)}`}
                    className="ml-auto p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
                    data-testid={`deal-edit-${deal.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteDeal(deal)}
                    title={`Excluir ${pipelineNoun(pipeline)}`}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                    data-testid={`deal-delete-${deal.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            )
          })}

          {closed.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1" data-testid="deals-closed">
              {closed.map((deal) => {
                const pipeline = pipelineOf(deal)
                const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
                const won = deal.status === 'won'
                const labels = terminalLabelsOf(pipeline)
                const reasonLabel = pipeline?.closeReasons?.find((r) => r.key === deal.closeReason)?.label ?? deal.closeReason ?? null
                const h = history[deal.id]
                return (
                  <div key={deal.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-400 min-w-0">
                      {won ? <CheckCircle2 className="w-3 h-3 text-status-active flex-shrink-0" /> : <XCircle className="w-3 h-3 text-surface-500 flex-shrink-0" />}
                      <span className="truncate">
                        <span className="text-surface-300">{pipeline?.name ?? deal.title ?? vocab.deal}</span>
                        {' · '}{stage?.label ?? (won ? labels.won : labels.lost)}
                        {deal.closedAt && <> · {formatRelativeTime(deal.closedAt)}</>}
                        {reasonLabel && <> · {reasonLabel}</>}
                      </span>
                      {multiPipeline && (
                        <button
                          type="button"
                          onClick={() => void toggleHistory(deal.id)}
                          className="ml-auto inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200 whitespace-nowrap"
                          data-testid={`deal-history-${deal.id}`}
                        >
                          <History className="w-3 h-3" /> {h && h !== 'loading' ? 'ocultar' : 'ver histórico'}
                        </button>
                      )}
                    </div>
                    {h === 'loading' && <p className="text-[11px] text-surface-600 pl-4">Carregando…</p>}
                    {Array.isArray(h) && (
                      <ol className="pl-4 flex flex-col gap-0.5" data-testid={`deal-history-list-${deal.id}`}>
                        {h.length === 0 && <li className="text-[11px] text-surface-600">Sem passagens registradas.</li>}
                        {h.map((e) => (
                          <li key={e.id} className="text-[11px] text-surface-500">
                            {e.fromStageLabel ? `${e.fromStageLabel} → ` : 'entrou em '}<span className="text-surface-300">{e.toStageLabel ?? '?'}</span>
                            {' · '}{movedByLabel({ lastMovedByKind: e.movedByKind, lastMovedByActorName: e.movedByActorName }) ?? 'sistema'}
                            {' · '}{formatRelativeTime(e.createdAt)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )
              })}
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
