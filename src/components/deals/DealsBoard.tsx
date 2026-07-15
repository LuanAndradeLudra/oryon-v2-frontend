import { useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn, hexToRgba } from '@/lib/utils'
import type { Deal, PipelineStage } from '@/types'

interface DealsBoardProps {
  stages: PipelineStage[]
  dealsByStage: Record<string, Deal[]>
  onMoveStage: (deal: Deal, toStageId: string) => void
  loading?: boolean
  /** Abre a ficha do contato do negócio — chip "ver contato →" no card. */
  onOpenContact?: (contactId: string) => void
}

function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Kanban de NEGÓCIOS de um pipeline — um card por Deal, colunas = estágios.
 * Drag-drop nativo (mesmo padrão do ContactsKanban). A mudança de estágio deriva
 * o status no backend (ganho/perdido nos terminais).
 */
export function DealsBoard({ stages, dealsByStage, onMoveStage, loading, onOpenContact }: DealsBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStageId, setOverStageId] = useState<string | null>(null)

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

  return (
    <div className="flex-1 overflow-x-auto kanban-scroll snap-x snap-mandatory md:snap-none">
      <div
        className="flex gap-3 p-4 h-full min-h-0"
        style={{ minWidth: typeof window !== 'undefined' && window.innerWidth >= 768 ? stages.length * 280 : undefined }}
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
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">ganho</span>
                  )}
                  {stage.isLost && (
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">perdido</span>
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
                        'rounded-xl border border-surface-800 bg-surface-900 p-3 cursor-grab active:cursor-grabbing transition-opacity duration-100 hover:border-surface-700',
                        draggingId === deal.id && 'opacity-40',
                      )}
                    >
                      <div className="text-sm font-medium text-surface-100 truncate">{deal.title}</div>
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
