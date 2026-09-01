import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, KanbanSquare, CheckCircle2, XCircle, History, RotateCcw, Handshake } from 'lucide-react'
import { useContactPipelines } from '@/hooks/useContactPipelines'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { useAddToPipeline } from '@/hooks/useAddToPipeline'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { CloseDealReasonModal, type CloseDealReasonInput } from '@/components/deals/CloseDealReasonModal'
import { formatRelativeTime } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, terminalLabelsOf, defaultSalesPipeline } from '@/lib/pipelineKinds'
import { originInfo, timeInStage } from '@/lib/dealCard'
import { movedByLabel, moveTargets } from '@/lib/contactPipelines'
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
 * **O que é agora.** A mesma fonte da ficha (`useContactPipelines`) numa
 * densidade compacta, que é o que cabe num painel estreito: uma linha por
 * registro aberto com funil, tipo, etapa atual e contexto, com "Mover ▾" — a
 * ação que antes exigia abrir um modal de edição de negócio ou ir até o board.
 * Passagens fechadas em linha, com histórico sob demanda.
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
  const navigate = useNavigate()
  const {
    enabled, deals, open, closed, error, busyId, pipelines,
    closeTarget, setCloseTarget, history,
    pipelineOf, moveTo, closeWithReason, reopen, toggleHistory, reload,
  } = useContactPipelines(contactId, contactName)
  const [moveOpenFor, setMoveOpenFor] = useState<string | null>(null)
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
    setMoveOpenFor(null)
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
          const kind = pipelineKindOption(pipelineKindOf(pipeline))
          const KindIcon = kind.icon
          const stage = pipeline.stages.find((s) => s.id === deal.stageId)
          const targets = moveTargets(pipeline, deal.stageId)
          const labels = terminalLabelsOf(pipeline)
          const meta = [timeInStage(deal), movedByLabel(deal) ? `por ${movedByLabel(deal)}` : null, `origem ${originInfo(deal).label}`]
            .filter(Boolean).join(' · ')
          return (
            <article key={deal.id} className="flex flex-col gap-1" data-testid={`panel-pipeline-${pipeline.id}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
                <span className="text-xs text-surface-200 truncate">{pipeline.name}</span>
                <KindIcon className="w-3 h-3 text-surface-500 flex-shrink-0" aria-label={kind.label} />
                {stage && (
                  <span
                    className="ml-auto text-[10px] text-surface-300 whitespace-nowrap"
                    data-testid={`panel-pipeline-stage-${pipeline.id}`}
                  >
                    {stage.label}
                  </span>
                )}
              </div>
              {meta && <p className="text-[10px] text-surface-600 truncate pl-3.5">{meta}</p>}
              <div className="flex items-center gap-1 pl-3.5">
                <Dropdown
                  open={moveOpenFor === deal.id}
                  onClose={() => setMoveOpenFor(null)}
                  align="left"
                  className="w-52"
                  anchor={
                    <button
                      type="button"
                      onClick={() => setMoveOpenFor((v) => (v === deal.id ? null : deal.id))}
                      disabled={busyId === deal.id}
                      className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-surface-800 border border-surface-700 text-surface-200 hover:bg-surface-700 disabled:opacity-50 transition-colors"
                      data-testid={`panel-pipeline-move-${pipeline.id}`}
                      aria-haspopup="menu"
                      aria-expanded={moveOpenFor === deal.id}
                    >
                      Mover <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  }
                >
                  <div className="px-1 py-1 flex flex-col gap-0.5">
                    {targets.normal.map((st) => (
                      <DropdownItem key={st.id} onClick={() => void handleMove(deal, st, pipeline)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                        {st.label}
                      </DropdownItem>
                    ))}
                    {targets.normal.length > 0 && targets.terminal.length > 0 && <DropdownSeparator />}
                    {targets.terminal.map((st) => (
                      <DropdownItem key={st.id} onClick={() => void handleMove(deal, st, pipeline)} danger={st.isLost}>
                        {st.isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {st.isWon ? labels.won : labels.lost} (com motivo)
                      </DropdownItem>
                    ))}
                  </div>
                </Dropdown>
                <button
                  type="button"
                  onClick={() => navigate(`/contacts?pipeline=${pipeline.id}`)}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
                  data-testid={`panel-pipeline-board-${pipeline.id}`}
                >
                  <KanbanSquare className="w-3 h-3" /> Board
                </button>
              </div>
            </article>
          )
        })}

        {closed.length > 0 && (
          <div className="flex flex-col gap-1 pt-1 border-t border-surface-800/60" data-testid="panel-pipelines-closed">
            {closed.map((deal) => {
              const pipeline = pipelineOf(deal)
              const stage = pipeline?.stages.find((s) => s.id === deal.stageId)
              const won = deal.status === 'won'
              const reasonLabel = pipeline?.closeReasons?.find((r) => r.key === deal.closeReason)?.label ?? deal.closeReason ?? null
              const h = history[deal.id]
              return (
                <div key={deal.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-surface-500 min-w-0">
                    {won
                      ? <CheckCircle2 className="w-3 h-3 text-status-active flex-shrink-0" />
                      : <XCircle className="w-3 h-3 text-surface-600 flex-shrink-0" />}
                    <span className="truncate">
                      <span className="text-surface-400">{pipeline?.name ?? 'Funil'}</span> · {stage?.label ?? (won ? 'Ganho' : 'Perdido')}
                      {deal.closedAt && <> · {formatRelativeTime(deal.closedAt)}</>}
                      {reasonLabel && <> · {reasonLabel}</>}
                    </span>
                    {/* A4 (SCRUM-926): reabrir sem sair da conversa — antes só
                        pelo seletor de Status do DealModal, que saiu. */}
                    <button
                      type="button"
                      onClick={() => void handleReopen(deal)}
                      disabled={busyId === deal.id}
                      className="ml-auto inline-flex items-center gap-1 text-[10px] text-surface-300 hover:text-surface-100 disabled:opacity-50 whitespace-nowrap"
                      data-testid={`panel-pipeline-reopen-${deal.id}`}
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Reabrir
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleHistory(deal.id)}
                      className="inline-flex items-center gap-1 text-[10px] text-brand-300 hover:text-brand-200 whitespace-nowrap"
                      data-testid={`panel-pipeline-history-${deal.id}`}
                    >
                      <History className="w-2.5 h-2.5" /> {h && h !== 'loading' ? 'ocultar' : 'histórico'}
                    </button>
                  </div>
                  {h === 'loading' && <p className="text-[10px] text-surface-600 pl-4">Carregando…</p>}
                  {Array.isArray(h) && (
                    <ol className="pl-4 flex flex-col gap-0.5" data-testid={`panel-pipeline-history-list-${deal.id}`}>
                      {h.length === 0 && <li className="text-[10px] text-surface-600">Sem passagens registradas.</li>}
                      {h.map((e) => (
                        <li key={e.id} className="text-[10px] text-surface-600">
                          {e.fromStageLabel ? `${e.fromStageLabel} → ` : 'entrou em '}
                          <span className="text-surface-400">{e.toStageLabel ?? '?'}</span>
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
