import { useState, useEffect } from 'react'
import { Plus, Loader2, MoreHorizontal, CheckCircle2, XCircle, RotateCcw, History } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { DealModal } from '@/components/contacts/DealModal'
import { NewDealDialog } from '@/components/deals/NewDealDialog'
import { useDealSummaryMove } from '@/components/deals/DealSummary'
import { CloseDealReasonModal } from '@/components/deals/CloseDealReasonModal'
import { AddToPipelineMenu } from '@/components/deals/AddToPipelineMenu'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { useDealPanel } from '@/contexts/DealPanelContext'
import { useToast } from '@/hooks/useToast'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { dealsApi, contactsApi } from '@/services/api'
import { pipelineNoun, defaultSalesPipeline, pipelineKindOf, terminalLabelsOf } from '@/lib/pipelineKinds'
import { moveTargets, movedByLabel } from '@/lib/contactPipelines'
import { formatRelativeTime } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import type { Deal, Pipeline, PipelineStage, ContactHistoryEvent } from '@/types'

const DEAL_HISTORY_TYPES = new Set(['deal_created', 'deal_won', 'deal_lost', 'deal_updated'])

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
 * SCRUM-1097 (DRAWER-25/26/27): a densidade `card` do `DealSummary`
 * compartilhado deu lugar a uma tabela bordeada própria desta aba
 * (Negócio/Etapa/Valor/Atualizado, menu "···" por linha com mover/editar/
 * excluir) — a referência não mostra cards aqui. `DealSummary` continua
 * servindo a ficha (`ContactPipelinesSection`) e o painel de conversas
 * (`ContactPanelDeals`), que não fazem parte deste reestilo.
 *
 * **O que continua só aqui.** Editar (valor e itens de linha) e excluir — o
 * `DealModal` é o único lugar da plataforma onde se mexe no dinheiro do
 * negócio; só esta tela oferece as duas ações. Já o "Novo" saiu: virou o
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
  const { requestAdd, requestAddDetailed, dialogs: addDialogs, reportConflict } = useAddToPipeline()
  const moveState = useDealSummaryMove()

  // DRAWER-29/30 (spec/1c-contatos.GAPS.md): "Atividade recente" abaixo da
  // tabela — só os eventos de NEGÓCIO do histórico do contato (criado/ganho/
  // perdido/atualizado), não a timeline inteira (conversas/tags/IA), que já
  // tem lugar próprio na aba Histórico.
  const [recentActivity, setRecentActivity] = useState<ContactHistoryEvent[]>([])
  useEffect(() => {
    let alive = true
    contactsApi.getHistory(contactId, 1, 30)
      .then((r) => {
        if (!alive) return
        setRecentActivity(r.data.data.filter((e) => DEAL_HISTORY_TYPES.has(e.type)))
      })
      .catch(() => { if (alive) setRecentActivity([]) })
    return () => { alive = false }
  }, [contactId])
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

  // DRAWER-24 (spec/1c-contatos.GAPS.md): soma só os abertos de funil de
  // VENDA (processo nunca mostra R$, mesma regra do DealSummary).
  const openSalesTotalCents = open.reduce((sum, deal) => {
    const pipeline = pipelineOf(deal)
    return !pipeline || pipelineKindOf(pipeline) === 'sales' ? sum + deal.amountCents : sum
  }, 0)

  return (
    <div className="px-[18px] py-3.5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-surface-100" data-testid="deals-open-count">
            {deals === null ? '…' : open.length} {vocab.deals} abertos
            {openSalesTotalCents > 0 && (
              <span className="text-surface-400 font-medium"> · {formatBRL(openSalesTotalCents)}</span>
            )}
          </h3>
        </div>
        {multiPipeline ? (
          <AddToPipelineMenu
            contactId={contactId}
            contactName={contactName}
            openDeals={deals === null ? null : open}
            size="sm"
            onPick={(pipeline) => void requestAdd({ contactId, contactName, pipeline })}
            onOpenDetailed={() => requestAddDetailed({ contactId, contactName })}
          />
        ) : (
          <Button size="sm" variant="neutral" leftIcon={<Plus className="w-[13px] h-[13px]" />} onClick={() => setNewDealOpen(true)}>
            Novo {dealWord}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-danger mb-3" role="alert">{error}</p>}

      {deals === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-accent-dark" />
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
          {/* DRAWER-25/26/27 (spec/1c-contatos.GAPS.md): tabela bordeada em vez
              de um card por negócio — Negócio/Etapa/Valor/Atualizado. As ações
              (mover/editar/excluir) que o card tinha viram o menu "···" por
              linha; histórico por etapa (era o `history`/`toggleHistory` do
              hook) e a timeline de atividade (DRAWER-29/30) ficaram de fora
              desta passada — GAPS-PENDENTES. */}
          <div className="border border-surface-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_110px_90px] h-[30px] items-center px-3 bg-surface-900 border-b border-surface-700 text-[11px] font-semibold text-surface-400">
              <span>Negócio</span>
              <span>Etapa</span>
              <span className="text-right">Valor</span>
              <span className="text-right">Atualizado</span>
            </div>
            {open.map((deal) => {
              const pipeline = pipelineOf(deal)
              const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
              const targets = pipeline ? moveTargets(pipeline, deal.stageId) : null
              const labels = terminalLabelsOf(pipeline)
              const showsMoney = !pipeline || pipelineKindOf(pipeline) === 'sales'
              const items = deal.lineItems?.length ?? 0
              const dealTitle = deal.title?.trim()
              const primaryLabel = pipeline?.name ?? dealTitle ?? contactName
              const showsOwnTitle = !!dealTitle && dealTitle !== contactName.trim() && dealTitle !== primaryLabel
              const updated = deal.updatedAt ?? deal.createdAt
              return (
                <div
                  key={deal.id}
                  className="relative grid grid-cols-[1fr_130px_110px_90px] items-center h-9 px-3 border-b border-surface-700 last:border-0 text-[13px] hover:bg-[var(--rowhover)] transition-colors"
                  data-testid={`deal-open-${deal.id}`}
                >
                  <button
                    type="button"
                    onClick={() => openDeal(deal.id)}
                    aria-label={`Abrir ${primaryLabel}`}
                    className="absolute inset-0 z-0"
                    data-testid={`deal-board-${deal.id}`}
                  />
                  <span className="relative z-10 flex items-center gap-1.5 min-w-0 pointer-events-none">
                    {pipeline && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />}
                    <span className="font-medium text-surface-100 truncate">{primaryLabel}</span>
                    {showsOwnTitle && <span className="text-surface-400 truncate">· {dealTitle}</span>}
                  </span>
                  <span className="relative z-10 text-surface-300 truncate pointer-events-none">{pipeline ? stage?.label ?? '—' : ''}</span>
                  {showsMoney ? (
                    <span className="relative z-10 text-right tabular-nums text-surface-300 pointer-events-none" data-testid={`deal-money-${deal.id}`}>
                      {formatBRL(deal.amountCents)}{items > 0 ? ` · ${items} ${items === 1 ? 'item' : 'itens'}` : ''}
                    </span>
                  ) : <span />}
                  <span className="relative z-10 flex items-center justify-end gap-1">
                    <span className="text-surface-400 tabular-nums pointer-events-none">
                      {updated ? formatRelativeTime(updated) : '—'}
                    </span>
                    <Dropdown
                      open={moveState.isOpen(deal.id)}
                      onClose={() => moveState.toggle(deal.id)}
                      align="right"
                      className="w-52"
                      anchor={
                        <button
                          type="button"
                          onClick={() => moveState.toggle(deal.id)}
                          disabled={busyId === deal.id}
                          aria-label="Mais ações"
                          // PL-C2-CAR-18 (Eixo10/P4): mesmo gatilho "Mais ações"
                          // de linha de tabela que ContactsTable.tsx já usa,
                          // nesta MESMA aba de Contatos — lá é p-1.5/rounded-lg/
                          // rowhover/ícone 16px; aqui era p-1/rounded cru (4px)/
                          // bg-surface-800/ícone 14px.
                          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-100 hover:bg-[var(--rowhover)] disabled:opacity-50 transition-colors"
                          data-testid={`deal-move-${deal.id}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      }
                    >
                      <div className="px-1 py-1 flex flex-col gap-0.5">
                        {targets?.normal.map((s) => (
                          <DropdownItem key={s.id} onClick={() => pipeline && handleMove(deal, s, pipeline)}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </DropdownItem>
                        ))}
                        {targets?.terminal.map((s) => (
                          <DropdownItem key={s.id} onClick={() => pipeline && handleMove(deal, s, pipeline)} danger={s.isLost}>
                            {s.isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {s.isWon ? labels.won : labels.lost} (com motivo)
                          </DropdownItem>
                        ))}
                        <DropdownItem onClick={() => { moveState.close(); setEditDeal(deal); setModalOpen(true) }}>
                          Editar
                        </DropdownItem>
                        <DropdownItem onClick={() => { moveState.close(); setDeleteDeal(deal) }} danger>
                          Excluir
                        </DropdownItem>
                      </div>
                    </Dropdown>
                  </span>
                </div>
              )
            })}
          </div>

          {closed.length > 0 && (
            <div className="flex flex-col" data-testid="deals-closed">
              {closed.map((deal) => {
                const pipeline = pipelineOf(deal)
                const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
                const won = deal.status === 'won'
                const labels = terminalLabelsOf(pipeline)
                const reasonLabel = pipeline?.closeReasons?.find((r) => r.key === deal.closeReason)?.label ?? deal.closeReason ?? null
                const dealHistory = history[deal.id]
                return (
                  <div key={deal.id} className="flex flex-col gap-1 py-1 border-b border-surface-700 last:border-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-surface-400" data-testid={`deal-closed-${deal.id}`}>
                      {won
                        ? <CheckCircle2 className="w-3 h-3 text-status-active flex-shrink-0" />
                        : <XCircle className="w-3 h-3 text-surface-500 flex-shrink-0" />}
                      <span className="truncate">
                        {pipeline?.name ?? deal.title ?? 'Funil'} · {stage?.label ?? (won ? labels.won : labels.lost)}
                        {reasonLabel && <> · {reasonLabel}</>}
                      </span>
                      {multiPipeline && (
                        <>
                          <button
                            type="button"
                            onClick={() => void reopen(deal)}
                            disabled={busyId === deal.id}
                            className="ml-auto flex items-center gap-1 text-surface-300 hover:text-surface-100 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                            data-testid={`deal-reopen-${deal.id}`}
                          >
                            <RotateCcw className="w-2.5 h-2.5" /> Reabrir
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleHistory(deal.id)}
                            className="flex items-center gap-1 text-accent-dark hover:opacity-80 whitespace-nowrap flex-shrink-0"
                            data-testid={`deal-history-${deal.id}`}
                          >
                            <History className="w-2.5 h-2.5" /> {dealHistory && dealHistory !== 'loading' ? 'ocultar' : 'histórico'}
                          </button>
                        </>
                      )}
                    </div>
                    {dealHistory === 'loading' && <p className="text-[11px] text-surface-600 pl-4">Carregando…</p>}
                    {Array.isArray(dealHistory) && (
                      <ol className="pl-4 flex flex-col gap-0.5" data-testid={`deal-history-list-${deal.id}`}>
                        {dealHistory.length === 0 && <li className="text-[11px] text-surface-600">Sem passagens registradas.</li>}
                        {dealHistory.map((e) => (
                          <li key={e.id} className="text-[11px] text-surface-500">
                            {e.fromStageLabel ? `${e.fromStageLabel} → ` : 'entrou em '}
                            <span className="text-surface-300">{e.toStageLabel ?? '?'}</span>
                            {' · '}{movedByLabel({ lastMovedByKind: e.movedByKind, lastMovedByActorName: e.movedByActorName }) ?? 'sistema'}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {recentActivity.length > 0 && (
            <div className="mt-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-surface-500 mb-1.5">
                Atividade recente
              </p>
              <ol>
                {recentActivity.map((e) => (
                  <li key={e.id} className="grid grid-cols-[64px_1fr] gap-2.5 py-[7px] border-b border-surface-700 last:border-0 text-[12.5px]">
                    <span className="text-[11.5px] text-surface-500">{formatRelativeTime(e.createdAt)}</span>
                    <span className="text-surface-300 truncate">
                      <span className="font-semibold text-surface-100">{e.actorName}</span>
                      {' '}
                      <span className="text-surface-400">{e.summary}</span>
                    </span>
                  </li>
                ))}
              </ol>
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
        impact={{ label: `"${deleteDeal?.title}" será excluído permanentemente`, tone: 'danger' }}
        description="Esta ação não pode ser desfeita."
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
