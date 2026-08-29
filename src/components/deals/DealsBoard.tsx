import { useState, useEffect } from 'react'
import { ArrowRight, MoreVertical, ArrowRightLeft, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn, hexToRgba, getActivePipelines } from '@/lib/utils'
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
  /** Substantivo do card por tipo de funil ("negócio" × "registro", decisão (a)). Default "negócio". */
  itemNoun?: string
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
  itemNoun = 'negócio',
  stages, dealsByStage, onMoveStage, loading, onOpenContact, pipelines = [], onMovePipeline,
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
  const showEmpty = !loading && totalCards === 0 && !!onAddContact

  return (
    <div className="flex-1 overflow-x-auto kanban-scroll snap-x snap-mandatory md:snap-none flex flex-col">
      {showEmpty && (
        <div className="px-4 pt-4 flex-shrink-0" data-testid="deals-board-empty">
          <EmptyState
            icon={UserPlus}
            title={`Nenhum ${itemNoun} neste funil ainda`}
            hint={`As etapas já estão prontas. Adicione um contato para abrir o primeiro ${itemNoun} — ele entra na primeira etapa.`}
            action={{ label: 'Adicionar contato ao funil', onClick: onAddContact }}
          />
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
                      ganho
                    </span>
                  )}
                  {stage.isLost && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded border color-chip"
                      style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
                    >
                      perdido
                    </span>
                  )}
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full transition-all flex-shrink-0"
                  style={{ color: stage.color, backgroundColor: hexToRgba(stage.color, isOver ? 0.2 : 0.1) }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Total da coluna */}
              {totalCents > 0 && (
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
                      {isOver ? 'Soltar aqui' : 'Nenhum negócio'}
                    </span>
                  </div>
                ) : (
                  cards.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        setTimeout(() => setDraggingId(deal.id), 0)
                      }}
                      onDragEnd={() => { setDraggingId(null); setOverStageId(null) }}
                      className={cn(
                        'relative group/card rounded-xl border border-surface-800 bg-surface-900 p-3 cursor-grab active:cursor-grabbing transition-opacity duration-100 hover:border-surface-700',
                        draggingId === deal.id && 'opacity-40',
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
