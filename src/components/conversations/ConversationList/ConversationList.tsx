import { useRef, useEffect, useCallback, useState, useLayoutEffect, type MutableRefObject } from 'react'
import { Loader2, MessageSquareOff } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import { ConversationSearch } from './ConversationSearch'
import { ConversationFiltersBar } from './ConversationFilters'
import type { Contact, Conversation, ConversationFilters, ConversationStatusCounts, Tag } from '@/types'

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
  activeId: string | null
  filters: ConversationFilters
  allTags: Tag[]
  allContacts: Contact[]
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
  statusCounts,
  activeId, filters, allTags, allContacts,
  onSelectConversation, onFiltersChange, onLoadMore,
  scrollPositionRef,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const [newConvIds, setNewConvIds] = useState<Set<string>>(new Set())

  // Restore scroll position on mount BEFORE the browser paints, so the user
  // doesn't see a flash of "top of the list" before we jump back. This is
  // what makes "tap a conversation → press back" return to the same spot
  // instead of always landing at the top — the previous behavior was
  // confusing when users were scrolled deep into the list.
  useLayoutEffect(() => {
    if (!listRef.current || !scrollPositionRef) return
    listRef.current.scrollTop = scrollPositionRef.current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Track newly appearing conversations
  useEffect(() => {
    const currentIds = new Set(conversations.map((c) => c.id))
    if (prevIdsRef.current.size > 0) {
      const added = new Set<string>()
      currentIds.forEach((id) => {
        if (!prevIdsRef.current.has(id)) added.add(id)
      })
      if (added.size > 0) {
        setNewConvIds(added)
        const timer = setTimeout(() => setNewConvIds(new Set()), 400)
        return () => clearTimeout(timer)
      }
    }
    prevIdsRef.current = currentIds
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

  return (
    <div className="flex flex-col h-full w-full sm:w-[418px] bg-black border-r border-surface-800 flex-shrink-0">
      {/* Search header */}
      <div className="px-3 pt-3 pb-3 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ConversationSearch
              value={filters.search ?? ''}
              onChange={(search) => onFiltersChange({ ...filters, search })}
            />
          </div>
          {loading && <Loader2 className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />}
        </div>
      </div>

      {/* Filters */}
      <div className="pt-2">
        <ConversationFiltersBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          counts={counts}
          allTags={allTags}
          allContacts={allContacts}
        />
      </div>

      {/* List */}
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto" style={{ contain: 'layout style', willChange: 'transform' }}>
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
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
            {conversations.map((conv) => (
              <div key={conv.id} className={newConvIds.has(conv.id) ? 'animate-conv-in' : undefined}>
                <ConversationItem
                  conversation={conv}
                  isActive={conv.id === activeId}
                  onSelect={handleSelect}
                />
              </div>
            ))}
            {hasMore && (
              <div className="flex items-center justify-center py-4" aria-hidden="true">
                {loadingMore && (
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
