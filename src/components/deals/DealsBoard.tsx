import { useState, useEffect } from 'react'
import { ArrowRight, MoreVertical, ArrowRightLeft, UserPlus, Clock, Phone, Plus, Handshake } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, hexToRgba, getActivePipelines } from '@/lib/utils'
import { pipelineKindOf, terminalLabelsOf, pipelineNoun } from '@/lib/pipelineKinds'
import { originInfo, movedByChip, timeInStage } from '@/lib/dealCard'
import type { Deal, Pipeline, PipelineStage } from '@/types'

interface DealsBoardProps {
  stages: PipelineStage[]
  dealsByStage: Record<string, Deal[]>
  onMoveStage: (deal: Deal, toStageId: string) => void
  loading?: boolean
  /** Abre a ficha do contato do negócio — chip "ver contato →" no card. */
  onOpenContact?: (contactId: string) => void
  /** Funis do tenant — alimenta o menu "Mover para funil" de cada card
   *  (SCRUM-293). Omitido/vazio = menu não aparece. */
  pipelines?: Pipeline[]
  onMovePipeline?: (deal: Deal, toPipelineId: string) => void
  /** F7 (SCRUM-867): funil sem nenhum card → empty state com "Adicionar contato ao funil".
   *  Omitido = só as colunas vazias (comportamento anterior). */
  onAddContact?: () => void
  /**
   * A3 (SCRUM-925): abre o "Novo negócio" já na etapa clicada. Presente só em
   * funil de VENDA — em processo o registro nasce pelo "Adicionar ao funil" de
   * 1 clique, sem formulário. Quando existe, ele é a ação primária do board
   * (P2) e substitui o CTA do vazio, que abria o cadastro completo de contato
   * (F-FUNIL-24: o operador queria um negócio, não um contato novo).
   */
  onNewDeal?: (stageId: string) => void
  /** Substantivo do card por tipo de funil ("negócio" × "registro", decisão (a)). Default: derivado de `pipeline`, senão "negócio". */
  itemNoun?: string
  /** F8 (SCRUM-869): o funil deste board — `kind` decide o card (processo: contato como título, sem valor) e os rótulos dos terminais. */
  pipeline?: Pipeline | null
  /** B2 (SCRUM-928): `?deal=<id>` no board — destaca e centraliza o card. A
   *  ficha em si abre pelo mesmo param, globalmente (`DealPanelContext`);
   *  aqui é só o realce visual. */
  highlightDealId?: string | null
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Kanban de NEGÓCIOS de um pipeline — um card por Deal, colunas = estágios.
 * Drag-drop nativo (mesmo padrão do ContactsKanban). A mudança de estágio deriva
 * o status no backend (ganho/perdido nos terminais).
 */
export function DealsBoard({
  onAddContact,
  onNewDeal,
  itemNoun,
  pipeline,
  stages, dealsByStage, onMoveStage, loading, onOpenContact, pipelines = [], onMovePipeline,
  highlightDealId,
}: DealsBoardProps) {
  // `useIsMobile` (matchMedia + resize listener) em vez de `window.innerWidth`
  // lido direto no render — o valor cru só era recalculado quando ALGUM
  // OUTRO estado mudasse a re-renderizar o componente; redimensionar a janela
  // sozinho não atualizava o layout (min-width da coluna) até isso acontecer.
  const isDesktop = !useIsMobile()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStageId, setOverStageId] = useState<string | null>(null)
  const [pipelineMenuDealId, setPipelineMenuDealId] = useState<string | null>(null)
  // Todos os `stages` recebidos são do MESMO pipeline (board de um funil só) —
  // basta ler de qualquer um pra saber qual funil excluir das opções do menu.
  const currentPipelineId = stages[0]?.pipelineId
  const otherPipelines = getActivePipelines(pipelines).filter((p) => p.id !== currentPipelineId)

  // Fecha o menu "Mover para funil" ao clicar fora dele.
  useEffect(() => {
    if (!pipelineMenuDealId) return
    const onDocClick = () => setPipelineMenuDealId(null)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [pipelineMenuDealId])

  const draggingDeal: Deal | null = (() => {
    if (!draggingId) return null
    for (const s of stages) {
      const found = (dealsByStage[s.id] ?? []).find((d) => d.id === draggingId)
      if (found) return found
    }
    return null
  })()

  const handleDrop = (stageId: string) => {
    if (draggingDeal && draggingDeal.stageId !== stageId) {
      onMoveStage(draggingDeal, stageId)
    }
    setDraggingId(null)
    setOverStageId(null)
  }

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-surface-500">
        Este pipeline não tem estágios configurados.
      </div>
    )
  }

  // Empty state do funil recém-criado (F7): as colunas continuam visíveis
  // (o usuário vê as etapas que acabou de montar) e o CTA abre o cadastro de
  // contato já com este funil selecionado. Só aparece sem NENHUM card e com
  // os dados carregados — durante o loading o skeleton das colunas basta.
  const totalCards = stages.reduce((n, st) => n + (dealsByStage[st.id]?.length ?? 0), 0)
  const showEmpty = !loading && totalCards === 0 && (!!onAddContact || !!onNewDeal)
  // Etapa de partida do "Novo negócio" — a 1ª NÃO-terminal. Criar direto num
  // terminal é 400 no backend desde a A4 (fechar exige motivo), então nem o
  // vazio nem o "+" da coluna oferecem isso.
  const firstOpenStage = stages.find((s) => !s.isWon && !s.isLost) ?? null
  // F8 (SCRUM-869): vocabulário por tipo. Funil de VENDA renderiza exatamente
  // como antes (título, valor, chips ganho/perdido); funil de PROCESSO mostra
  // o contato como título, esconde valor/total e usa Concluído/Cancelado.
  const isProcess = pipelineKindOf(pipeline) === 'process'
  const terminalLabels = terminalLabelsOf(pipeline)
  const noun = itemNoun ?? (pipeline ? pipelineNoun(pipeline) : 'negócio')

  return (
    <div className="flex-1 overflow-x-auto kanban-scroll snap-x snap-mandatory md:snap-none flex flex-col">
      {showEmpty && (
        <div className="px-4 pt-4 flex-shrink-0" data-testid="deals-board-empty">
          {/* A3: em funil de venda o CTA cria o NEGÓCIO (o contato é escolhido
              dentro do diálogo). Em processo segue abrindo o cadastro de
              contato, que é o gesto certo lá. */}
          {onNewDeal && firstOpenStage ? (
            <EmptyState
              icon={Handshake}
              title={`Nenhum ${noun} neste funil ainda`}
              hint={`As etapas já estão prontas. Crie o primeiro ${noun} — ele entra em ${firstOpenStage.label}.`}
              action={{ label: `Novo ${noun}`, onClick: () => onNewDeal(firstOpenStage.id) }}
            />
          ) : (
            <EmptyState
              icon={UserPlus}
              title={`Nenhum ${noun} neste funil ainda`}
              hint={`As etapas já estão prontas. Adicione um contato para abrir o primeiro ${noun} — ele entra na primeira etapa.`}
              action={onAddContact ? { label: 'Adicionar contato ao funil', onClick: onAddContact } : undefined}
            />
          )}
        </div>
      )}
      <div
        className="flex gap-3 p-4 h-full min-h-0"
        style={{ minWidth: isDesktop ? stages.length * 280 : undefined }}
      >
        {stages.map((stage) => {
          const cards = dealsByStage[stage.id] ?? []
          const isOver = overStageId === stage.id && !!draggingDeal && draggingDeal.stageId !== stage.id
          const totalCents = cards.reduce((sum, d) => sum + (d.amountCents ?? 0), 0)

          return (
            <div
              key={stage.id}
              className="flex flex-col w-[85vw] md:w-72 flex-shrink-0 snap-start"
              onDragOver={(e) => { e.preventDefault(); setOverStageId(stage.id) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStageId(null) }}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Header da coluna */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-xs font-semibold truncate" style={{ color: stage.color }}>{stage.label}</span>
                  {stage.isWon && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded border color-chip"
                      style={{ ['--chip']: 'var(--color-success)' } as React.CSSProperties}
                    >
                      {terminalLabels.won.toLowerCase()}
                    </span>
                  )}
                  {stage.isLost && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded border color-chip"
                      style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
                    >
                      {terminalLabels.lost.toLowerCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full transition-all"
                    style={{ color: stage.color, backgroundColor: hexToRgba(stage.color, isOver ? 0.2 : 0.1) }}
                  >
                    {cards.length}
                  </span>
                  {/* A3: criar já nesta etapa. Fora dos terminais — negócio não
                      nasce fechado (a A4 exige motivo, e o backend responde 400). */}
                  {onNewDeal && !stage.isWon && !stage.isLost && (
                    <button
                      type="button"
                      onClick={() => onNewDeal(stage.id)}
                      aria-label={`Novo ${noun} em ${stage.label}`}
                      title={`Novo ${noun} em ${stage.label}`}
                      className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Total da coluna — só em funil de venda (processo não tem valor) */}
              {!isProcess && totalCents > 0 && (
                <div className="px-1 mb-2 text-[11px] text-surface-500">{brl(totalCents)}</div>
              )}

              {/* Lista de cards */}
              <div
                className={cn(
                  'flex flex-col gap-2 flex-1 overflow-y-auto pb-4 rounded-xl transition-all duration-200 min-h-[80px] p-2',
                  isOver ? 'bg-brand-500/5 ring-2 ring-brand-500/30 ring-inset' : 'bg-transparent',
                  loading && cards.length > 0 && 'opacity-50',
                )}
              >
                {loading && cards.length === 0 ? (
                  <div className="h-16 rounded-xl bg-surface-800/60 animate-pulse" aria-hidden />
                ) : cards.length === 0 ? (
                  <div className={cn(
                    'border-2 border-dashed rounded-xl h-20 flex items-center justify-center transition-colors',
                    isOver ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-800',
                  )}>
                    <span className={cn('text-xs', isOver ? 'text-brand-400' : 'text-surface-600')}>
                      {isOver ? 'Soltar aqui' : `Nenhum ${noun}`}
                    </span>
                  </div>
                ) : (
                  cards.map((deal) => (
                    <div
                      key={deal.id}
                      ref={highlightDealId === deal.id ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        setTimeout(() => setDraggingId(deal.id), 0)
                      }}
                      onDragEnd={() => { setDraggingId(null); setOverStageId(null) }}
                      data-testid={highlightDealId === deal.id ? 'deal-card-highlighted' : undefined}
                      className={cn(
                        'relative group/card rounded-xl border border-surface-800 bg-surface-900 p-3 cursor-grab active:cursor-grabbing transition-opacity duration-100 hover:border-surface-700',
                        draggingId === deal.id && 'opacity-40',
                        highlightDealId === deal.id && 'ring-2 ring-brand-500 border-brand-500',
                      )}
                    >
                      {onMovePipeline && otherPipelines.length > 0 && (
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPipelineMenuDealId(pipelineMenuDealId === deal.id ? null : deal.id)
                            }}
                            className={cn(
                              'p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all',
                              pipelineMenuDealId === deal.id ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100',
                            )}
                            aria-label="Mais ações"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {pipelineMenuDealId === deal.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-48 bg-surface-800 border border-surface-700 rounded-lg shadow-xl overflow-hidden"
                            >
                              <div className="px-3 py-2 border-b border-surface-700">
                                <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
                                  <ArrowRightLeft className="w-3 h-3" /> Mover para funil
                                </span>
                              </div>
                              {otherPipelines.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => { onMovePipeline(deal, p.id); setPipelineMenuDealId(null) }}
                                  className="w-full text-left px-3 py-2 text-xs text-surface-200 hover:bg-surface-700 transition-colors flex items-center gap-2"
                                >
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isProcess ? (
                        <ProcessCardBody deal={deal} onOpenContact={onOpenContact} />
                      ) : (
                      <>
                      <div className="text-sm font-medium text-surface-100 truncate pr-5">{deal.title}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-surface-400">{brl(deal.amountCents ?? 0)}</span>
                        {deal.createdByKind === 'ai' && (
                          <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">IA</span>
                        )}
                        {deal.createdByKind === 'automation' && (
                          <span className="text-[10px] text-surface-400 bg-surface-800 px-1.5 py-0.5 rounded">auto</span>
                        )}
                      </div>
                      {deal.contact && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenContact?.(deal.contact!.id) }}
                          className="mt-2 flex items-center gap-1.5 text-[11px] text-surface-500 hover:text-brand-400 transition-colors group/contact w-full"
                        >
                          <Avatar name={deal.contact.displayName} imageUrl={deal.contact.profilePicUrl ?? undefined} size="xs" />
                          <span className="truncate flex-1 text-left">{deal.contact.displayName}</span>
                          <span className="flex items-center gap-0.5 opacity-0 group-hover/contact:opacity-100 transition-opacity flex-shrink-0">
                            ver contato <ArrowRight className="w-3 h-3" />
                          </span>
                        </button>
                      )}
                      </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Corpo do card em funil de PROCESSO (F8 · SCRUM-870, prancheta 2): o
 * paciente/contato é o título; sem valor; abaixo, de onde veio (campanha ·
 * evento · IA · manual · importação) e quem moveu por último (auto / IA);
 * por fim, tempo na etapa e telefone. Tudo vem do próprio `Deal` do board
 * (`GET /deals?pipelineId=`, F8-870) — nenhuma chamada extra por card.
 */
function ProcessCardBody({ deal, onOpenContact }: { deal: Deal; onOpenContact?: (contactId: string) => void }) {
  const origin = originInfo(deal)
  const OriginIcon = origin.icon
  const by = movedByChip(deal)
  const time = timeInStage(deal)
  const name = deal.contact?.displayName ?? deal.title
  const phone = deal.contact?.phone ?? null
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (deal.contact) onOpenContact?.(deal.contact.id) }}
        className="flex items-center gap-2 pr-5 w-full text-left group/contact"
        data-testid="process-card-title"
      >
        {deal.contact && <Avatar name={name} imageUrl={deal.contact.profilePicUrl ?? undefined} size="xs" />}
        <span className="text-sm font-medium text-surface-100 truncate flex-1">{name}</span>
        {deal.contact && (
          <span className="flex items-center gap-0.5 text-[10px] text-surface-500 opacity-0 group-hover/contact:opacity-100 transition-opacity flex-shrink-0">
            ver <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </button>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] text-surface-400 truncate" title={origin.label} data-testid="process-card-origin">
          <OriginIcon className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{origin.label}</span>
        </span>
        {by === 'ia' && (
          <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded flex-shrink-0" title={deal.lastMovedByActorName ?? 'IA'}>IA</span>
        )}
        {by === 'auto' && (
          <span className="text-[10px] text-surface-400 bg-surface-800 px-1.5 py-0.5 rounded flex-shrink-0" title={deal.lastMovedByActorName ?? 'automático'}>auto</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-surface-500">
        {time ? (
          <span className="inline-flex items-center gap-1" data-testid="process-card-time"><Clock className="w-3 h-3" /> {time}</span>
        ) : <span />}
        {phone && (
          <span className="inline-flex items-center gap-1 tabular-nums"><Phone className="w-3 h-3" /> {phone}</span>
        )}
      </div>
    </>
  )
}
