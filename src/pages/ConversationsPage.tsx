import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, MessageSquarePlus } from 'lucide-react'

import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { ConversationList } from '@/components/conversations/ConversationList/ConversationList'
import { ChatWindow } from '@/components/conversations/ChatWindow/ChatWindow'
import { ContactPanel } from '@/components/conversations/ContactPanel/ContactPanel'
import { ToastContainer } from '@/components/ui/Toast'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Fab } from '@/components/common/Fab'
import { useConversations } from '@/hooks/useConversations'
import { useSocket } from '@/hooks/useSocket'
import { joinConversation, leaveConversation } from '@/services/socket'
import { useToast } from '@/hooks/useToast'
import { useTagsAndUsers } from '@/hooks/useTagsAndUsers'
import { useContacts } from '@/hooks/useContacts'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'
import type {
  Conversation, ConversationFilters,
  SocketMessageNew, SocketUnreadUpdate,
  Tag, User,
} from '@/types'

const CURRENT_USER = { firstName: 'Admin', lastName: 'Oryon', avatarUrl: undefined }

export function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [infoOpen, setInfoOpen]     = useState(false)
  const [filters, setFilters]       = useState<ConversationFilters>({ status: 'all' })
  const [totalUnread, setTotalUnread] = useState(0)
  const [assignOpen, setAssignOpen] = useState(false)

  const { tags: allTags, users: allUsers, createTag, deleteTag } = useTagsAndUsers()
  const { contacts: allContacts } = useContacts()
  const { toasts, toast, dismiss } = useToast()
  const isMobile = useIsMobile()

  const {
    conversations, loading,
    handleNewMessage, markAsRead,
    updateStatus, assignUser, transferUser,
    addTag, removeTag, archiveConversation,
  } = useConversations(filters)

  const assignedTo = filters.assignedTo ?? 'all'
  const isFiltered = assignedTo !== 'all'

  useRegisterTopBarActions(
    <Dropdown
      open={assignOpen}
      onClose={() => setAssignOpen(false)}
      align="right"
      className="w-52"
      anchor={
        <button
          onClick={() => setAssignOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
            isFiltered || assignOpen
              ? 'bg-brand-600/20 text-brand-300 border-brand-500/30'
              : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {isFiltered ? (assignedTo === 'me' ? 'Minhas' : 'Sem atribuição') : 'Filtrar'}
          {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
        </button>
      }
    >
      <div className="px-2 pt-2 pb-2 flex flex-col gap-0.5">
        {([
          { label: 'Todas as conversas', value: 'all' },
          { label: 'Minhas conversas',   value: 'me' },
          { label: 'Sem atribuição',      value: 'unassigned' },
        ] as const).map(({ label, value }) => (
          <DropdownItem
            key={value}
            active={assignedTo === value}
            onClick={() => {
              setFilters((f) => ({ ...f, assignedTo: value }))
              setAssignOpen(false)
            }}
          >
            {label}
          </DropdownItem>
        ))}
      </div>
    </Dropdown>,
    [assignOpen, assignedTo, isFiltered],
  )

  // ── Socket.IO real-time ────────────────────────────────────────────────────
  useSocket({
    onMessageNew: useCallback((payload: SocketMessageNew) => {
      handleNewMessage(payload)
      if (payload.conversationId !== activeConversation?.id) {
        setTotalUnread((p) => p + 1)
      }
    }, [handleNewMessage, activeConversation?.id]),

    onUnreadUpdate: useCallback((payload: SocketUnreadUpdate) => {
      setTotalUnread(payload.total)
    }, []),

    onConversationResolved: useCallback((payload: { conversationId: string }) => {
      if (activeConversation?.id === payload.conversationId) {
        setActiveConversation((prev) => prev ? { ...prev, status: 'resolved' } : null)
      }
    }, [activeConversation?.id]),

    onConversationAssigned: useCallback((payload: { conversationId: string; assignedTo: User }) => {
      if (activeConversation?.id === payload.conversationId) {
        setActiveConversation((prev) =>
          prev ? { ...prev, assignedUser: payload.assignedTo } : null
        )
      }
    }, [activeConversation?.id]),

    // Sidebar updates (conversation:updated replaces tenant-wide message:new for list)
    onConversationUpdated: useCallback((payload: SocketMessageNew) => {
      handleNewMessage(payload)
      if (payload.conversationId !== activeConversation?.id) {
        setTotalUnread((p) => p + 1)
      }
    }, [handleNewMessage, activeConversation?.id]),
  })

  // ── Helpers to sync activeConversation with list state ────────────────────
  const syncActive = useCallback((id: string, patch: Partial<Conversation>) => {
    setActiveConversation((prev) => prev?.id === id ? { ...prev, ...patch } : prev)
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  // Join/leave WebSocket rooms when active conversation changes
  const prevActiveIdRef = useRef<string | null>(null)
  useEffect(() => {
    const prevId = prevActiveIdRef.current
    const newId = activeConversation?.id ?? null
    if (prevId === newId) return
    if (prevId) leaveConversation(prevId)
    if (newId) joinConversation(newId)
    prevActiveIdRef.current = newId
    return () => { if (newId) leaveConversation(newId) }
  }, [activeConversation?.id])

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv)
    setInfoOpen(true)
    markAsRead(conv.id)
    if (conv.unreadCount > 0) setTotalUnread((p) => Math.max(0, p - conv.unreadCount))
    setSearchParams({ id: conv.id }, { replace: true })
  }

  // Restore active conversation from URL on load
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || conversations.length === 0) return
    const urlId = searchParams.get('id')
    if (urlId) {
      const match = conversations.find((c) => c.id === urlId)
      if (match) {
        setActiveConversation(match)
        setInfoOpen(true)
        restoredRef.current = true
      }
    }
  }, [conversations, searchParams])

  const handleStatusChange = async (id: string, status: 'open' | 'pending' | 'resolved') => {
    await updateStatus(id, status)
    syncActive(id, { status })
    const msg =
      status === 'resolved' ? 'Conversa resolvida ✓'
        : status === 'pending' ? 'Conversa marcada como pendente'
          : 'Conversa marcada como aberta'
    toast(msg, 'success')
  }

  const handleAssign = async (convId: string, user: User | null) => {
    await assignUser(convId, user)
    syncActive(convId, { assignedUser: user ?? undefined })
    toast(
      user ? `Atribuído para ${user.firstName} ${user.lastName}` : 'Atribuição removida',
      'success'
    )
  }

  const handleTransfer = async (convId: string, user: User) => {
    await transferUser(convId, user)
    syncActive(convId, { assignedUser: user })
    toast(`Transferido para ${user.firstName} ${user.lastName}`, 'success')
  }

  const handleAddTag = async (convId: string, tag: Tag) => {
    await addTag(convId, tag)
    setActiveConversation((prev) => {
      if (!prev || prev.id !== convId) return prev
      const existing = prev.tags ?? []
      if (existing.find((t) => t.id === tag.id)) return prev
      return { ...prev, tags: [...existing, tag] }
    })
    toast(`Etiqueta "${tag.name}" adicionada`, 'success')
  }

  const handleRemoveTag = async (convId: string, tagId: string) => {
    await removeTag(convId, tagId)
    setActiveConversation((prev) => {
      if (!prev || prev.id !== convId) return prev
      return { ...prev, tags: (prev.tags ?? []).filter((t) => t.id !== tagId) }
    })
    toast('Etiqueta removida', 'info')
  }

  const handleArchive = async (convId: string) => {
    await archiveConversation(convId)
    syncActive(convId, { status: 'abandoned' })
    toast('Conversa arquivada', 'warning')
  }

  // Mobile back: clear active conversation, close info panel, drop ?id from URL.
  const handleMobileBack = useCallback(() => {
    setActiveConversation(null)
    setInfoOpen(false)
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  // In mobile, list and chat are alternative full-screen views — never both at
  // once. Desktop keeps the original side-by-side layout.
  const showList = !isMobile || !activeConversation
  const showChat = !isMobile || !!activeConversation

  return (
    <>
      {/* 1 — Conversation list */}
      {showList && (
        isMobile ? (
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <MobilePageHeader title="Conversas" />
            <div className="flex-1 min-h-0 flex">
              <ConversationList
                conversations={conversations}
                loading={loading}
                activeId={activeConversation?.id ?? null}
                filters={filters}
                allTags={allTags}
                allContacts={allContacts}
                onSelectConversation={handleSelectConversation}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            loading={loading}
            activeId={activeConversation?.id ?? null}
            filters={filters}
            allTags={allTags}
            allContacts={allContacts}
            onSelectConversation={handleSelectConversation}
            onFiltersChange={setFilters}
          />
        )
      )}

      {/* 3 — Chat window */}
      {showChat && (
        <ChatWindow
          conversation={activeConversation}
          allTags={allTags}
          allUsers={allUsers}
          onStatusChange={handleStatusChange}
          onToggleInfo={() => setInfoOpen((v) => !v)}
          infoOpen={infoOpen}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onCreateTag={createTag}
          onDeleteTag={deleteTag}
          onAssign={handleAssign}
          onTransfer={handleTransfer}
          onArchive={handleArchive}
          onBack={isMobile ? handleMobileBack : undefined}
        />
      )}

      {/* 4 — Contact info panel */}
      {infoOpen && activeConversation && (
        <div className="fixed inset-0 z-40 md:static md:inset-auto md:z-auto md:flex md:h-full">
          <div className="absolute inset-0 bg-black/50 md:hidden" onClick={() => setInfoOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 md:static md:w-auto md:h-full">
            <ContactPanel
              conversation={activeConversation}
              allTags={allTags}
              allUsers={allUsers}
              onClose={() => setInfoOpen(false)}
              onAddTag={(tag) => handleAddTag(activeConversation.id, tag)}
              onRemoveTag={(tagId) => handleRemoveTag(activeConversation.id, tagId)}
              onCreateTag={createTag}
              onDeleteTag={deleteTag}
              onAssign={(user) => handleAssign(activeConversation.id, user)}
              onTransfer={(user) => handleTransfer(activeConversation.id, user)}
              onArchive={() => handleArchive(activeConversation.id)}
            />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {/* Mobile FAB: nova conversa — abre /contacts para escolher um destinatario.
          So mostra quando lista esta visivel; durante chat ativo, FAB seria
          ruido. Picker dedicado em bottom sheet fica para PR seguinte. */}
      {showList && !activeConversation && (
        <Fab
          icon={<MessageSquarePlus className="w-6 h-6" />}
          label="Nova conversa"
          onClick={() => navigate('/contacts')}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
