import { useCallback, useRef, useState } from 'react'
import { Loader2, CheckSquare, Plus, Upload, Settings2 } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { cn, hexToRgba } from '@/lib/utils'
import type { ColumnState } from '@/hooks/useKanbanContacts'
import type { Contact, ContactStage, TenantStage } from '@/types'

interface ContactsKanbanProps {
  /** Per-stage column state from useKanbanContacts. Keyed by stage.key. */
  columns: Record<string, ColumnState>
  /** Trigger fetching the next page of a stage's contacts. */
  onLoadMore: (stageKey: string) => void
  onOpenPanel: (contact: Contact) => void
  onMoveStage: (contact: Contact, stage: ContactStage) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
  onBulkMoveStage?: (ids: string[], stage: ContactStage) => void
  onBulkDelete?: () => void
  onNewContact?: () => void
  onImport?: () => void
  onConfigCRM?: () => void
}

export function ContactsKanban({
  columns,
  onLoadMore,
  onOpenPanel,
  onMoveStage,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onBulkMoveStage,
  onBulkDelete,
  onNewContact,
  onImport,
  onConfigCRM,
}: ContactsKanbanProps) {
  const { stages, loadingStages } = useCRMConfig()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const hasSelection = (selectedIds?.size ?? 0) > 0

  // Empty-area context menu (right-click on the kanban background).
  const buildEmptyAreaMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = []
    if (onNewContact) items.push({ label: 'Novo contato', icon: Plus, onClick: onNewContact })
    if (onImport) items.push({ label: 'Importar contatos', icon: Upload, onClick: onImport })
    if (onConfigCRM) {
      if (items.length > 0) items.push({ separator: true })
      items.push({ label: 'Configurar CRM', icon: Settings2, onClick: onConfigCRM })
    }
    return items
  }, [onNewContact, onImport, onConfigCRM])
  const { onContextMenu: onEmptyAreaContextMenu } = useContextMenu(buildEmptyAreaMenu)

  if (loadingStages) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-surface-400">
        <Settings2 className="w-8 h-8 text-surface-600" />
        <p className="text-sm">Nenhuma etapa configurada.</p>
        {onConfigCRM && (
          <button
            onClick={onConfigCRM}
            className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
          >
            Configurar etapas do CRM
          </button>
        )}
      </div>
    )
  }

  // Find the contact being dragged across any column (so we can render the
  // multi-drag count badge and decide whether the drop is a no-op).
  const draggingContact: Contact | null = (() => {
    if (!draggingId) return null
    for (const s of stages) {
      const found = columns[s.key]?.contacts.find((c) => c.id === draggingId)
      if (found) return found
    }
    return null
  })()
  const isDraggingSelection =
    draggingId !== null && (selectedIds?.has(draggingId) ?? false) && (selectedIds?.size ?? 0) > 1
  const draggingCount = isDraggingSelection ? (selectedIds?.size ?? 0) : draggingId ? 1 : 0

  const handleDrop = (stageKey: string) => {
    if (isDraggingSelection && onBulkMoveStage && selectedIds) {
      onBulkMoveStage(Array.from(selectedIds), stageKey as ContactStage)
    } else if (draggingContact && draggingContact.stage !== stageKey) {
      onMoveStage(draggingContact, stageKey as ContactStage)
    }
    setDraggingId(null)
    setOverKey(null)
  }

  return (
    <div className="flex flex-col h-full" onContextMenu={onEmptyAreaContextMenu}>
      <div className="flex-1 overflow-x-auto kanban-scroll snap-x snap-mandatory md:snap-none">
        <div
          className="flex gap-3 p-4 h-full min-h-0"
          // Em mobile, cada coluna ocupa ~85% da viewport — usuario percebe
          // que ha colunas alem e desliza. minWidth fixo so a partir de md.
          style={{ minWidth: typeof window !== 'undefined' && window.innerWidth >= 768 ? stages.length * 260 : undefined }}
        >
          {stages.map((stage) => {
            const column = columns[stage.key]
            const isOver =
              overKey === stage.key &&
              !!draggingId &&
              (isDraggingSelection || draggingContact?.stage !== stage.key)

            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                column={column}
                isOver={isOver}
                draggingId={draggingId}
                draggingCount={draggingCount}
                isDraggingSelection={isDraggingSelection}
                hasSelection={hasSelection}
                selectedIds={selectedIds}
                onLoadMore={onLoadMore}
                onOpenPanel={onOpenPanel}
                onMoveStage={onMoveStage}
                onToggleSelect={onToggleSelect}
                onSelectAll={onSelectAll}
                onBulkDelete={onBulkDelete}
                onSetOverKey={setOverKey}
                onSetDraggingId={setDraggingId}
                onDrop={handleDrop}
                allStages={stages}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── KanbanColumn ────────────────────────────────────────────────────────────
// Inline sub-component so each column owns its own scroll container ref.
// Originally implemented with an IntersectionObserver tied to the per-column
// scroll element, but that pattern proved unreliable in production for the
// conversations list (composited layers / `contain` styles interacting with
// explicit `root`). Switched to a plain scroll handler — deterministic across
// browsers and matches what useConversations / ConversationList do.

interface KanbanColumnProps {
  stage: TenantStage
  column: ColumnState | undefined
  isOver: boolean
  draggingId: string | null
  draggingCount: number
  isDraggingSelection: boolean
  hasSelection: boolean
  selectedIds?: Set<string>
  onLoadMore: (stageKey: string) => void
  onOpenPanel: (contact: Contact) => void
  onMoveStage: (contact: Contact, stage: ContactStage) => void
  onToggleSelect?: (id: string) => void
  onSelectAll?: (ids: string[]) => void
  onBulkDelete?: () => void
  onSetOverKey: (key: string | null) => void
  onSetDraggingId: (id: string | null) => void
  onDrop: (stageKey: string) => void
  allStages: TenantStage[]
}

function KanbanColumn({
  stage,
  column,
  isOver,
  draggingId,
  draggingCount,
  isDraggingSelection,
  hasSelection,
  selectedIds,
  onLoadMore,
  onOpenPanel,
  onMoveStage,
  onToggleSelect,
  onSelectAll,
  onBulkDelete,
  onSetOverKey,
  onSetDraggingId,
  onDrop,
  allStages,
}: KanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const cards = column?.contacts ?? []
  const total = column?.total ?? 0
  const hasMore = column?.hasMore ?? false
  const loading = column?.loading ?? false
  const loadingMore = column?.loadingMore ?? false

  // Match the conversations list visual budget — 999+ keeps the badge from
  // exploding when a tenant accumulates many leads in a single stage.
  const displayTotal = total > 999 ? '999+' : total

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading || loadingMore) return
    const el = e.currentTarget
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 200) onLoadMore(stage.key)
  }, [hasMore, loading, loadingMore, onLoadMore, stage.key])

  return (
    <div
      className="flex flex-col w-[85vw] md:w-64 flex-shrink-0 snap-start bg-surface-900 rounded-2xl border border-surface-700/50 p-2"
      onDragOver={(e) => { e.preventDefault(); onSetOverKey(stage.key) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onSetOverKey(null) }}
      onDrop={() => onDrop(stage.key)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-xs font-semibold" style={{ color: stage.color }}>
            {stage.label}
          </span>
          {stage.isTerminal && (
            <span className="text-[10px] text-surface-600 bg-surface-800 px-1.5 py-0.5 rounded border border-surface-700">terminal</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onSelectAll && hasSelection && cards.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectAll(cards.map((c) => c.id))}
              title="Selecionar todos desta coluna"
              className="p-1 text-surface-500 hover:text-brand-400 hover:bg-surface-700 rounded transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          )}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full transition-all"
            style={{ color: stage.color, backgroundColor: hexToRgba(stage.color, isOver ? 0.2 : 0.1) }}
          >
            {displayTotal}
          </span>
        </div>
      </div>

      {/* Linha de acento do estágio no topo da coluna — substitui o acento que
          ficava em cada card do CRM. Faz um leve fade para a direita. */}
      <div
        aria-hidden
        className="h-[2.5px] rounded-full mb-3 mx-1"
        style={{ background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color} 45%, ${stage.color}00 100%)` }}
      />

      {/* Scrollable card list — onScroll triggers loadMore near the bottom. */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          'flex flex-col gap-2 flex-1 overflow-y-auto pb-4 rounded-xl transition-all duration-200 min-h-[80px] p-2',
          isOver
            ? 'bg-brand-500/5 ring-2 ring-brand-500/30 ring-inset'
            : 'bg-transparent',
          // Revalidando com dados antigos na tela (troca de filtro): esmaece
          // de leve para sinalizar atualização sem piscar skeleton.
          loading && cards.length > 0 && 'opacity-50',
        )}
      >
        {/* Initial loading skeleton (page 1 in flight, no cards yet). */}
        {loading && cards.length === 0 ? (
          <ColumnSkeleton />
        ) : cards.length === 0 ? (
          // Empty state — no contacts, not loading, not loading more.
          <div className={cn(
            'border-2 border-dashed rounded-xl h-20 flex items-center justify-center transition-colors',
            isOver ? 'border-brand-500/50 bg-brand-500/5' : 'border-surface-800',
          )}>
            <span className={cn('text-xs', isOver ? 'text-brand-400' : 'text-surface-600')}>
              {isOver
                ? isDraggingSelection
                  ? `Soltar ${draggingCount} contatos`
                  : 'Soltar aqui'
                : 'Nenhum contato'}
            </span>
          </div>
        ) : (
          cards.map((contact) => {
            const isPartOfMultiDrag =
              isDraggingSelection &&
              draggingId !== contact.id &&
              (selectedIds?.has(contact.id) ?? false)
            const isDraggingThisCard = draggingId === contact.id
            return (
              <div
                key={contact.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setTimeout(() => onSetDraggingId(contact.id), 0)
                }}
                onDragEnd={() => { onSetDraggingId(null); onSetOverKey(null) }}
                className={cn(
                  'relative rounded-xl transition-opacity duration-100 cursor-grab active:cursor-grabbing',
                  isDraggingThisCard && 'opacity-40',
                  isPartOfMultiDrag && 'opacity-30',
                )}
              >
                {isDraggingThisCard && isDraggingSelection && (
                  <span
                    className="absolute -top-2 -right-2 z-20 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-brand-600 text-surface-950 text-xs font-bold shadow-lg"
                    aria-label={`${draggingCount} contatos selecionados`}
                  >
                    {draggingCount}
                  </span>
                )}
                <KanbanCard
                  contact={contact}
                  stages={allStages}
                  onOpenPanel={onOpenPanel}
                  onMoveStage={onMoveStage}
                  isSelected={selectedIds?.has(contact.id) ?? false}
                  onToggleSelect={onToggleSelect}
                  hasSelection={hasSelection}
                  selectionCount={selectedIds?.size ?? 0}
                  onDeleteSelected={onBulkDelete}
                />
              </div>
            )
          })
        )}

        {/* Loading indicator at the end while a non-first page is in flight. */}
        {loadingMore && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 text-surface-500 animate-spin" />
          </div>
        )}

        {/* Extra drop target area when column has cards */}
        {isOver && cards.length > 0 && (
          <div className="h-12 border-2 border-dashed border-brand-500/40 rounded-xl flex items-center justify-center">
            <span className="text-xs text-brand-400">
              {isDraggingSelection ? `Soltar ${draggingCount} contatos` : 'Soltar aqui'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Three pulsing card placeholders shown while a column's first page is in
// flight. Roughly the same height as a real card so the layout doesn't jump.
function ColumnSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-surface-800/60 animate-pulse"
          aria-hidden
        />
      ))}
    </>
  )
}
