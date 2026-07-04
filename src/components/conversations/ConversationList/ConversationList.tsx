import { useRef, useEffect, useCallback, useState, useLayoutEffect, type MutableRefObject } from 'react'
import { Loader2, MessageSquareOff, AlertTriangle } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import { ConversationSearch } from './ConversationSearch'
import { ConversationFiltersBar } from './ConversationFilters'
import { QuickFiltersMenu } from './QuickFiltersMenu'
import { TagFilterMenu } from './TagFilterMenu'
import { cn } from '@/lib/utils'
import type { Contact, Conversation, ConversationFilters, ConversationStatusCounts, Tag, User } from '@/types'

// TODO: substituir por dado real da API de billing
const USAGE_MOCK = { used: 847, total: 1000 }

interface ConversationListProps {
  conversations: Conversation[]
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  /** Database-wide totals per status, computed by the backend so the tab
   *  badges stay accurate even with pagination (otherwise they'd show only
   *  what fits in the loaded array). */
  statusCounts?: ConversationStatusCounts
  /** Phase 33c — tenant-wide count of conversations needing review (the
   *  "Verificar" badge). 0 hides the contextual indicator. */
  needsReviewCount?: number
  activeId: string | null
  filters: ConversationFilters
  allTags: Tag[]
  allContacts: Contact[]
  /** Team roster — drives the "Equipe" filter dropdown. Optional so
   *  callers that don't surface the assignment filter (e.g. embedded
   *  previews) can omit it; the dropdown then only shows "Sem atribuição". */
  allUsers?: User[]
  onSelectConversation: (conv: Conversation) => void
  onFiltersChange: (filters: ConversationFilters) => void
  onLoadMore?: () => void
  /** External hold for the list's scrollTop. Lets callers (mobile chat ↔ list
   *  switch) preserve the user's position across remounts. Without this, the
   *  list goes back to the top whenever the wrapper unmounts. */
  scrollPositionRef?: MutableRefObject<number>
}

export function ConversationList({
  conversations, loading, loadingMore = false, hasMore = false,
  statusCounts, needsReviewCount = 0,
  activeId, filters, allTags, allUsers,
  onSelectConversation, onFiltersChange, onLoadMore,
  scrollPositionRef,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const [newConvIds, setNewConvIds] = useState<Set<string>>(new Set())

  // Restore scroll position BEFORE the browser paints in two scenarios:
  //
  //   1. Component mount — covers mobile back-from-chat where the list
  //      remounts (initial use case).
  //   2. activeId changes — covers desktop, where the list never unmounts
  //      but the parent re-renders on selection. Without this, picking a
  //      conversation deep in the list visually jumps the scrollbar (the
  //      browser's automatic scroll-anchoring sometimes shifts position
  //      when the active item's styles change — bg, border, badge).
  //
  // The handleScroll callback below keeps the ref up to date as the user
  // scrolls, so the value we restore here is always the user's last manual
  // position — not stale from a previous session.
  useLayoutEffect(() => {
    if (!listRef.current || !scrollPositionRef) return
    if (listRef.current.scrollTop !== scrollPositionRef.current) {
      listRef.current.scrollTop = scrollPositionRef.current
    }
  }, [activeId, scrollPositionRef])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
    if (scrollPositionRef) scrollPositionRef.current = 0
  }, [filters.status, filters.search, filters.assignedTo, filters.tagId, filters.contactId, scrollPositionRef])

  // Infinite scroll — trigger `onLoadMore` when the user scrolls within 200px
  // of the bottom. Replaced an IntersectionObserver-based sentinel that wasn't
  // firing reliably in production (likely interaction with the `contain` /
  // `willChange: transform` styles on this scroll container, or a quirk of
  // explicit `root` in some browser engines). Plain scroll math is more
  // deterministic and the load-more lock in useConversations handles the
  // duplicate-fire risk that scroll handlers normally have.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (scrollPositionRef) scrollPositionRef.current = el.scrollTop
    if (!hasMore || loadingMore || !onLoadMore) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 200) onLoadMore()
  }, [scrollPositionRef, hasMore, loadingMore, onLoadMore])

  // Track newly appearing conversations to flash a subtle fade-in. Only
  // animates when a small number of items appear at once — a real-time
  // socket prepend (typically 1–2 per event) — and skips bulk additions
  // from `loadMore` pagination (50 at a time), where the animation looked
  // like the list was flickering when the user later clicked a row.
  const ANIMATE_NEW_THRESHOLD = 5
  useEffect(() => {
    const currentIds = new Set(conversations.map((c) => c.id))
    const previous = prevIdsRef.current
    prevIdsRef.current = currentIds
    if (previous.size === 0) return
    const added = new Set<string>()
    currentIds.forEach((id) => {
      if (!previous.has(id)) added.add(id)
    })
    if (added.size === 0 || added.size > ANIMATE_NEW_THRESHOLD) return
    setNewConvIds(added)
    const timer = setTimeout(() => setNewConvIds(new Set()), 400)
    return () => clearTimeout(timer)
  }, [conversations])

  const handleSelect = useCallback((conv: Conversation) => onSelectConversation(conv), [onSelectConversation])

  // Tab badges read straight from the backend-provided counts. The previous
  // implementation derived them from `conversations.length` filtered by status,
  // which broke with pagination — once only 50 of N rows were loaded, the
  // badges shrank with the page instead of showing the database total.
  // Spread into a plain map so the loosely-typed FiltersBar prop accepts it.
  const counts: Record<string, number> = statusCounts
    ? { ...statusCounts }
    : { all: 0, open: 0, pending: 0, resolved: 0 }

  // Painel da lista (desktop): largura responsiva — a CONVERSA é o foco
  // absoluto do Inbox, então a lista cede espaço em telas menores
  // (360px em laptops, 420px em xl, 480px só em 2xl+). A lane interna fica
  // em max-w-[440px] + mx-auto, então segue centralizada em qualquer largura.
  return (
    <div className="conv-surface flex flex-col h-full w-full sm:w-[360px] xl:w-[420px] 2xl:w-[480px] bg-surface-950 border-r border-surface-800 flex-shrink-0">
      {/* Search header */}
      <div className="px-3 pt-3 pb-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ConversationSearch
              value={filters.search ?? ''}
              onChange={(search) => onFiltersChange({ ...filters, search })}
            />
          </div>
          {loading && <Loader2 className="w-4 h-4 text-surface-400 animate-spin flex-shrink-0" />}

          {/* Phase 33c — verification badge. Contextual indicator: appears
              ONLY when there are conversations needing review. Clicking
              toggles the needsReview filter so the operator can triage
              them. Active state mirrors the filter dropdown's blue glow but
              in amber to match the in-bubble warning. */}
          {needsReviewCount > 0 && (
            <button
              onClick={() =>
                onFiltersChange({ ...filters, needsReview: filters.needsReview ? undefined : true })
              }
              aria-label="Conversas que precisam de verificação"
              title={`${needsReviewCount} ${needsReviewCount === 1 ? 'conversa precisa' : 'conversas precisam'} de verificação`}
              style={filters.needsReview
                ? ({ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties)
                : undefined}
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all border flex-shrink-0',
                filters.needsReview
                  ? 'color-chip'
                  : 'bg-surface-800 text-amber-400 border-surface-700 hover:bg-surface-700 hover:text-amber-300',
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              <span
                className="color-chip absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-black"
                style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}
              >
                {needsReviewCount > 99 ? '99+' : needsReviewCount}
              </span>
            </button>
          )}

          <TagFilterMenu
            filters={filters}
            onFiltersChange={onFiltersChange}
            allTags={allTags}
          />

          <QuickFiltersMenu
            filters={filters}
            onFiltersChange={onFiltersChange}
            allUsers={allUsers}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="pt-2">
        <ConversationFiltersBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          counts={counts}
          allTags={allTags}
          allUsers={allUsers}
        />
      </div>

      {/* List */}
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto" style={{ contain: 'layout style', willChange: 'transform' }}>
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
            <span className="text-xs text-surface-500">Carregando...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center">
              <MessageSquareOff className="w-6 h-6 text-surface-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-300">Nenhuma conversa</p>
              <p className="text-xs text-surface-500 mt-1">
                {filters.search ? 'Tente outro termo de busca' : 'Nenhuma conversa com esses filtros'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-[440px] mx-auto pt-2">
            {conversations.map((conv) => (
              <div key={conv.id} className={newConvIds.has(conv.id) ? 'animate-conv-in' : undefined}>
                <ConversationItem
                  conversation={conv}
                  isActive={conv.id === activeId}
                  onSelect={handleSelect}
                />
              </div>
            ))}
            </div>
            {hasMore && (
              <div className="flex items-center justify-center py-4" aria-hidden="true">
                {loadingMore && (
                  <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
