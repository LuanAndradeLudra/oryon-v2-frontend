import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { Loader2, MessageSquareOff } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import { ConversationSearch } from './ConversationSearch'
import { ConversationFiltersBar } from './ConversationFilters'
import type { Contact, Conversation, ConversationFilters, Tag } from '@/types'

// TODO: substituir por dado real da API de billing
const USAGE_MOCK = { used: 847, total: 1000 }

interface ConversationListProps {
  conversations: Conversation[]
  loading: boolean
  activeId: string | null
  filters: ConversationFilters
  allTags: Tag[]
  allContacts: Contact[]
  onSelectConversation: (conv: Conversation) => void
  onFiltersChange: (filters: ConversationFilters) => void
}

export function ConversationList({
  conversations, loading, activeId, filters, allTags, allContacts,
  onSelectConversation, onFiltersChange,
}: ConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const [newConvIds, setNewConvIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [filters.status, filters.search, filters.assignedTo, filters.tagId, filters.contactId])

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

  // Counts — persist across status filter changes so all tabs always show real counts
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0, open: 0, pending: 0, resolved: 0 })
  useEffect(() => {
    // Only update counts when viewing 'all' (unfiltered) — this gives accurate totals
    if (filters.status === 'all' || filters.status === undefined) {
      setCounts({
        all:      conversations.length,
        open:     conversations.filter((c) => c.status === 'open').length,
        pending:  conversations.filter((c) => c.status === 'pending').length,
        resolved: conversations.filter((c) => c.status === 'resolved').length,
      })
    }
  }, [conversations, filters.status])

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
      <div ref={listRef} className="flex-1 overflow-y-auto" style={{ contain: 'layout style', willChange: 'transform' }}>
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
          conversations.map((conv) => (
            <div key={conv.id} className={newConvIds.has(conv.id) ? 'animate-conv-in' : undefined}>
              <ConversationItem
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={handleSelect}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
