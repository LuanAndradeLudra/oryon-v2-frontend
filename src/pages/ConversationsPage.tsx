import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { MessageSquarePlus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { ConversationList } from '@/components/conversations/ConversationList/ConversationList'
import { ChatWindow } from '@/components/conversations/ChatWindow/ChatWindow'
import { ContactPanel } from '@/components/conversations/ContactPanel/ContactPanel'
import { ToastContainer } from '@/components/ui/Toast'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { Fab } from '@/components/common/Fab'
import { useConversations } from '@/hooks/useConversations'
import { useSocket } from '@/hooks/useSocket'
import { joinConversation, leaveConversation } from '@/services/socket'
import { conversationsApi } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { useTagsAndUsers } from '@/hooks/useTagsAndUsers'
import { useContacts } from '@/hooks/useContacts'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { resolveRange } from '@/lib/dateRange'
import type {
  Conversation, ConversationFilters,
  SocketAiPauseUpdated, SocketConversationStatusUpdated, SocketMessageNew, SocketUnreadUpdate,
  Tag, User, DealOutcomeInput } from '@/types'

const CURRENT_USER = { firstName: 'Admin', lastName: 'Oryon', avatarUrl: undefined }

export function ConversationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [infoOpen, setInfoOpen]     = useState(false)
  // Default to "today" (BRT) on every mount — the operator opens the page
  // and sees only the conversations with activity from 00:00 São Paulo today.
  // The chip stays clickable for other presets and persists only within the
  // session; on reload we always reset to "today" by design.
  const [filters, setFilters]       = useState<ConversationFilters>(() => {
    const today = resolveRange('today')
    return { status: 'all', startDate: today.startDate, endDate: today.endDate }
  })
  const [totalUnread, setTotalUnread] = useState(0)

  const { tags: allTags, users: allUsers, createTag, deleteTag } = useTagsAndUsers()
  const { contacts: allContacts } = useContacts({}, { withDealsSummary: false })
  const { toasts, toast, dismiss } = useToast()
  const isMobile = useIsMobile()
  const { user } = useAuth()

  // Persists the conversation list's scrollTop across the mobile mount/unmount
  // cycle (list ↔ chat). Without this, tapping an old conversation and then
  // hitting back used to drop the user at the top of the list — which they
  // reported on 2026-05-09 as "barra volta para o início".
  const listScrollPosRef = useRef(0)

  const {
    conversations, loading, loadingMore, hasMore, loadMore, statusCounts, needsReviewCount,
    handleNewMessage, handleAiPauseUpdated, handleStatusUpdated, markAsRead,
    updateStatus, assignUser, transferUser,
    addTag, removeTag, archiveConversation, setAiPause, interveneAi,
  } = useConversations(filters)

  // Sticky active conversation — keep the OPEN conversation in the list even
  // after its status stops matching the active tab (e.g. moved to "Pendente"
  // while viewing "Abertas"), until the operator opens another one. Prevents
  // the list and the open chat from silently disagreeing (orphaned selection).
  // The server list is already status-filtered, so the only rows that fall out
  // of the active tab are ones changed locally — we drop those and re-add just
  // the active one, flagged off-filter (dimmed + status pill).
  const { visibleConversations, offFilterId } = useMemo(() => {
    const statusFilter = filters.status
    const matches = (c: Conversation) =>
      !statusFilter || statusFilter === 'all' || c.status === statusFilter
    const list = conversations.filter(matches)
    let offFilterId: string | null = null
    const active = activeConversation
    // Sticky: if the OPEN conversation isn't in the filtered list because its
    // status no longer matches the active tab, keep it visible (flagged
    // off-filter). Use the freshest copy from the list if still loaded, else
    // the activeConversation state itself — so it persists even if the list
    // was refetched without it.
    if (active && !list.some((c) => c.id === active.id)) {
      const row = conversations.find((c) => c.id === active.id) ?? active
      if (!matches(row)) {
        offFilterId = active.id
        const origIdx = conversations.findIndex((c) => c.id === active.id)
        if (origIdx >= 0) {
          const insertAt = conversations.slice(0, origIdx).filter(matches).length
          list.splice(insertAt, 0, row)
        } else {
          list.unshift(row)
        }
      }
    }
    return { visibleConversations: list, offFilterId }
  }, [conversations, filters.status, activeConversation])

  // ── Socket.IO real-time ────────────────────────────────────────────────────
  useSocket({
    onMessageNew: useCallback((payload: SocketMessageNew) => {
      handleNewMessage(payload)
      if (payload.conversationId !== activeConversation?.id) {
        setTotalUnread((p) => p + 1)
      }
      // Phase 32 — outbound human messages now carry aiPausedUntil +
      // assignedUser via the same event. Mirror onto activeConversation so
      // the header pill flips state without a refetch.
      if (activeConversation?.id === payload.conversationId) {
        const patch: Partial<Conversation> = {}
        if (payload.aiPausedUntil !== undefined) patch.aiPausedUntil = payload.aiPausedUntil
        if (payload.assignedUser !== undefined) patch.assignedUser = payload.assignedUser ?? undefined
        if (Object.keys(patch).length > 0) syncActive(payload.conversationId, patch)
        // Also mirror lastMessageAt, otherwise the 24h-window calc in
        // ChatWindow compares against a stale timestamp while the chat
        // stays open (bug: window shows closed right after a fresh
        // message). Compared against `prev` inside the updater — not the
        // closured `activeConversation`, which can itself be stale here —
        // and only applied if strictly newer, so an out-of-order socket
        // delivery (reconnect replay, racing emits) can't regress it.
        if (payload.message) {
          const sentAt = payload.message.sentAt
          setActiveConversation((prev) =>
            prev?.id === payload.conversationId && new Date(sentAt).getTime() > new Date(prev.lastMessageAt).getTime()
              ? { ...prev, lastMessageAt: sentAt }
              : prev
          )
        }
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
      // Phase 32 — same as onMessageNew: keep activeConversation in lockstep
      // with the latest pause + assignment so the header pill is correct.
      if (activeConversation?.id === payload.conversationId) {
        const patch: Partial<Conversation> = {}
        if (payload.aiPausedUntil !== undefined) patch.aiPausedUntil = payload.aiPausedUntil
        if (payload.assignedUser !== undefined) patch.assignedUser = payload.assignedUser ?? undefined
        if (Object.keys(patch).length > 0) syncActive(payload.conversationId, patch)
        // Also mirror lastMessageAt — see onMessageNew above for why and
        // for the out-of-order-delivery guard.
        if (payload.message) {
          const sentAt = payload.message.sentAt
          setActiveConversation((prev) =>
            prev?.id === payload.conversationId && new Date(sentAt).getTime() > new Date(prev.lastMessageAt).getTime()
              ? { ...prev, lastMessageAt: sentAt }
              : prev
          )
        }
      }
    }, [handleNewMessage, activeConversation?.id]),

    // Phase 27 — AI handoff pause/resume from another tab or operator. Keeps
    // the in-memory list in sync so opening that conversation later shows the
    // correct banner state without a fetch.
    // SCRUM-562 — status changed server-side (manual endpoint or the AI guard's
    // move to `pending`). The list half is handled inside the hook; here we only
    // keep the open conversation's header in lockstep.
    onConversationStatusUpdated: useCallback((payload: SocketConversationStatusUpdated) => {
      handleStatusUpdated(payload)
      if (activeConversation?.id === payload.conversationId) {
        syncActive(payload.conversationId, { status: payload.status })
      }
    }, [handleStatusUpdated, activeConversation?.id]),

    onConversationAiPauseUpdated: useCallback((payload: SocketAiPauseUpdated) => {
      handleAiPauseUpdated(payload)
      if (activeConversation?.id === payload.conversationId) {
        // Phase 32 — pause/resume now also moves the assignment, so propagate
        // both fields onto the active row to keep the header pill consistent.
        const patch: Partial<Conversation> = { aiPausedUntil: payload.aiPausedUntil }
        if (payload.assignedUser !== undefined) {
          patch.assignedUser = payload.assignedUser ?? undefined
        }
        // Phase 33c — mirror the anomaly flag onto the open conversation too.
        if (payload.hasRecentAnomaly !== undefined) {
          patch.hasRecentAnomaly = payload.hasRecentAnomaly
        }
        syncActive(payload.conversationId, patch)
      }
    }, [handleAiPauseUpdated, activeConversation?.id]),
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
    // Em desktop o ContactPanel e' uma coluna lateral persistente — abrir
    // junto com a conversa e' o comportamento esperado. Em mobile o painel
    // sobrepoe o chat; deve aparecer so quando o usuario aciona via menu.
    if (!isMobile) setInfoOpen(true)
    markAsRead(conv.id)
    if (conv.unreadCount > 0) setTotalUnread((p) => Math.max(0, p - conv.unreadCount))
    setSearchParams({ id: conv.id }, { replace: true })
  }

  // Restore active conversation from URL on load. Two cases:
  //   1. Conversation is already in the loaded list → just select it.
  //   2. Conversation is NOT in the list (most commonly: an external link
  //      from the CRM "Abrir conversa" button points at a conversation
  //      whose lastMessageAt falls outside the active period filter, so
  //      it was excluded from /conversations). Fetch it directly and
  //      clear the period filter so the operator sees it in the list too.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    const urlId = searchParams.get('id')
    if (!urlId) return

    // Case 1: already in the list
    if (conversations.length > 0) {
      const match = conversations.find((c) => c.id === urlId)
      if (match) {
        setActiveConversation(match)
        if (!isMobile) setInfoOpen(true)
        restoredRef.current = true
        return
      }
    }

    // Case 2: wait for the initial fetch to finish before deciding it's
    // missing. Without this, we'd fire the fallback fetch while the list
    // is still loading and end up duplicating work.
    if (loading) return

    // Not in the list — pull it directly. Clear the period filter so the
    // newly-loaded conversation also surfaces in the list (otherwise the
    // operator opens a chat but the left column reads "Nenhuma conversa").
    restoredRef.current = true
    conversationsApi.get(urlId)
      .then((r) => {
        setActiveConversation(r.data)
        if (!isMobile) setInfoOpen(true)
        setFilters((f) => ({ ...f, startDate: undefined, endDate: undefined }))
      })
      .catch(() => {
        // Invalid id or no permission — leave the restoredRef true so we
        // don't retry on every render, and let the empty state explain.
      })
  }, [conversations, searchParams, isMobile, loading])

  // Tells the ConversationActivitySection to refetch its timeline. We dispatch
  // a CustomEvent rather than threading a ref through several layers because
  // the panel may be unmounted (mobile drawer closed) when the action runs;
  // the listener attaches/detaches on its own mount and a missed event is
  // harmless (the panel does a fresh fetch on next mount). Backend doesn't
  // emit socket events for tag/status/assign writes, so without this the
  // operator's own actions wouldn't show up live.
  const invalidateActivity = useCallback((convId: string) => {
    window.dispatchEvent(
      new CustomEvent('oryon:activity-invalidate', { detail: { conversationId: convId } }),
    )
  }, [])

  const handleStatusChange = async (id: string, status: 'open' | 'pending' | 'resolved', dealOutcome?: DealOutcomeInput) => {
    await updateStatus(id, status, dealOutcome)
    syncActive(id, { status })
    invalidateActivity(id)
    const msg =
      status === 'resolved' ? (dealOutcome ? 'Conversa resolvida · desfecho registrado ✓' : 'Conversa resolvida ✓')
        : status === 'pending' ? 'Conversa marcada como pendente'
          : 'Conversa marcada como aberta'
    toast(msg, 'success')
  }

  const handleAssign = async (convId: string, user: User | null) => {
    try {
      await assignUser(convId, user)
      syncActive(convId, { assignedUser: user ?? undefined })
      invalidateActivity(convId)
      toast(
        user ? `Atribuído para ${user.firstName} ${user.lastName}` : 'Atribuição removida',
        'success'
      )
    } catch (err) {
      // Surface the backend reason (TenantExceptionFilter writes a human-readable
      // message) instead of failing silently. The "sem acesso" case usually means
      // the TARGET user isn't allowed on this conversation's WhatsApp line.
      const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(raw) ? raw[0] : raw
      toast(msg || 'Não foi possível atribuir a conversa', 'error')
    }
  }

  // ── Atalhos de teclado (triagem estilo Front/Gmail) ────────────────────────
  // J/K navegam na lista, E resolve e pula p/ a próxima, R atribui a mim.
  // Só em desktop e nunca enquanto o foco está num campo de texto — a regra
  // é: digitar mensagem SEMPRE vence atalho.
  // J/K navigate the VISIBLE list (incl. the sticky off-filter active one) so
  // keyboard nav matches exactly what's on screen.
  const shortcutsRef = useRef({ conversations: visibleConversations, activeConversation })
  shortcutsRef.current = { conversations: visibleConversations, activeConversation }

  useEffect(() => {
    if (isMobile) return
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null
      if (!t) return false
      const tag = t.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
    }

    // Mantém o item selecionado visível enquanto o usuário navega por J/K —
    // sem isso o cursor "desce" mas a lista não acompanha e o operador se
    // perde. block:'nearest' rola o mínimo necessário (sem salto de âncora).
    const scrollToConv = (id: string) => {
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-conv-id="${CSS.escape(id)}"]`)
          ?.scrollIntoView({ block: 'nearest' })
      })
    }

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (!['j', 'k', 'e', 'r'].includes(key)) return

      const { conversations: list, activeConversation: active } = shortcutsRef.current
      if (list.length === 0) return
      const idx = active ? list.findIndex((c) => c.id === active.id) : -1

      if (key === 'j' || key === 'k') {
        e.preventDefault()
        const next = key === 'j'
          ? list[Math.min(list.length - 1, idx + 1)]
          : list[Math.max(0, idx <= 0 ? 0 : idx - 1)]
        if (next && next.id !== active?.id) {
          handleSelectConversation(next)
          scrollToConv(next.id)
        }
        return
      }

      if (!active) return

      if (key === 'e') {
        e.preventDefault()
        if (active.status !== 'resolved') void handleStatusChange(active.id, 'resolved')
        // Pula para a próxima da fila — o operador segue triando sem o mouse.
        const next = list[idx + 1] ?? list[idx - 1]
        if (next && next.id !== active.id) {
          handleSelectConversation(next)
          scrollToConv(next.id)
        }
        return
      }

      if (key === 'r') {
        e.preventDefault()
        const me = allUsers.find((u) => u.id === user?.id)
        if (me && active.assignedUser?.id !== me.id) void handleAssign(active.id, me)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, allUsers, user?.id])

  const handleTransfer = async (convId: string, user: User) => {
    try {
      await transferUser(convId, user)
      syncActive(convId, { assignedUser: user })
      invalidateActivity(convId)
      toast(`Transferido para ${user.firstName} ${user.lastName}`, 'success')
    } catch (err) {
      const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(raw) ? raw[0] : raw
      toast(msg || 'Não foi possível transferir a conversa', 'error')
    }
  }

  const handleAddTag = async (convId: string, tag: Tag) => {
    await addTag(convId, tag)
    setActiveConversation((prev) => {
      if (!prev || prev.id !== convId) return prev
      const existing = prev.tags ?? []
      if (existing.find((t) => t.id === tag.id)) return prev
      return { ...prev, tags: [...existing, tag] }
    })
    invalidateActivity(convId)
    toast(`Etiqueta "${tag.name}" adicionada`, 'success')
  }

  const handleRemoveTag = async (convId: string, tagId: string) => {
    await removeTag(convId, tagId)
    setActiveConversation((prev) => {
      if (!prev || prev.id !== convId) return prev
      return { ...prev, tags: (prev.tags ?? []).filter((t) => t.id !== tagId) }
    })
    invalidateActivity(convId)
    toast('Etiqueta removida', 'info')
  }

  const handleArchive = async (convId: string) => {
    await archiveConversation(convId)
    syncActive(convId, { status: 'abandoned' })
    invalidateActivity(convId)
    toast('Conversa arquivada', 'warning')
  }

  // Phase 27 — manual pause/resume of the WhatsApp AI for one conversation.
  // The hook patches the list optimistically; we mirror onto the active
  // conversation so the banner re-renders without waiting on the WS round-trip.
  const handleSetAiPause = async (convId: string, pauseUntil: string | null) => {
    try {
      await setAiPause(convId, pauseUntil)
      syncActive(convId, { aiPausedUntil: pauseUntil })
      invalidateActivity(convId)
      toast(pauseUntil ? 'IA pausada para esta conversa' : 'IA reativada', 'info')
    } catch {
      toast('Não foi possível atualizar a IA — tente de novo', 'error')
    }
  }

  // Phase 34 — "Intervir agora": the backend resolves the pause window from the
  // agent's configured handoff duration, so we don't pass a timestamp. We sync
  // the active conversation from the resolved value the hook returns.
  const handleInterveneAi = async (convId: string) => {
    try {
      const until = await interveneAi(convId)
      syncActive(convId, { aiPausedUntil: until })
      invalidateActivity(convId)
      toast('IA pausada para esta conversa', 'info')
    } catch {
      toast('Não foi possível atualizar a IA — tente de novo', 'error')
    }
  }

  // Phase 29 — page-level handler for send-message failures bubbling up
  // from MessageInput. Reads the human-readable `message` that the backend's
  // TenantExceptionFilter writes into the response body and toasts it.
  // Without this the operator typed → text disappeared → no feedback.
  const handleSendError = useCallback((err: unknown) => {
    const ax = err as { response?: { data?: { message?: string | string[] } } }
    const raw = ax?.response?.data?.message
    const msg = Array.isArray(raw) ? raw[0] : raw
    toast(msg || 'Não foi possível enviar a mensagem. Tente de novo.', 'error')
  }, [toast])

  // Phase 29 — pre-detect "no department" before the operator types. Admin
  // tier bypasses (the backend allows admin users without a department).
  const sendBlockedReason = (() => {
    if (!user) return null
    if (isAdminTier(user.role)) return null
    if (user.departmentId) return null
    return {
      message: 'Você precisa estar vinculado a um setor para enviar mensagens. Peça a um administrador para te adicionar a um setor.',
      ctaHref: '/settings/departments',
      ctaLabel: 'Ver setores',
    }
  })()

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
      {/* 1 — Conversation list. Mobile and desktop render the SAME list with
          the same props — only the outer wrapper differs (mobile adds the
          page header + flex column). Props are extracted into `listProps` so
          new fields can never be passed to one variant and forgotten on the
          other (a real bug we hit when adding the verification badge). */}
      {showList && (() => {
        const listProps = {
          conversations: visibleConversations,
          loading,
          loadingMore,
          hasMore,
          onLoadMore: loadMore,
          statusCounts,
          needsReviewCount,
          activeId: activeConversation?.id ?? null,
          offFilterId,
          filters,
          allTags,
          allContacts,
          allUsers,
          onSelectConversation: handleSelectConversation,
          onFiltersChange: setFilters,
          scrollPositionRef: listScrollPosRef,
        }
        return isMobile ? (
          <div className="flex flex-col flex-1 min-h-0 w-full">
            <MobilePageHeader title="Conversas" />
            <div className="flex-1 min-h-0 flex">
              <ConversationList {...listProps} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0">
            <div className="chat-shell-bg flex-1 min-h-0 flex">
              <ConversationList {...listProps} roundedBottomRight />
            </div>
            {/* Descoberta dos atalhos de triagem — discreto, só desktop */}
            <div className="chat-shell-bg flex items-center justify-center gap-3 px-3 py-1.5 text-[10px] text-surface-600 select-none flex-shrink-0">
              <span><kbd className="px-1 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">J</kbd>/<kbd className="px-1 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">K</kbd> navegar</span>
              <span><kbd className="px-1 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">E</kbd> resolver</span>
              <span><kbd className="px-1 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">R</kbd> p/ mim</span>
            </div>
          </div>
        )
      })()}

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
          onSetAiPause={handleSetAiPause}
          onInterveneAi={handleInterveneAi}
          onAiPauseSocketEvent={(p) => {
            handleAiPauseUpdated(p)
            // Mirror onto the currently-open conversation in case another
            // tab triggered the change.
            if (activeConversation?.id === p.conversationId) {
              syncActive(p.conversationId, { aiPausedUntil: p.aiPausedUntil })
            }
          }}
          onSendError={handleSendError}
          sendBlockedReason={sendBlockedReason}
          onBack={isMobile ? handleMobileBack : undefined}
        />
      )}

      {/* 4 — Contact info panel
          Mobile: drawer renderizado via createPortal(document.body) para
          escapar de ancestrais com transform (que tornariam 'fixed' relativo
          ao ancestral, jogando o painel pra esquerda). Mesmo padrao do
          CRMConfigDrawer. Desktop: coluna lateral estatica.

          IMPORTANTE: w-full em mobile (cobre toda a tela) — sem 88vw nem
          calc(), que estavam sendo afetados por algum container intermediario
          deixando o painel mais estreito que esperado. */}
      {isMobile
        ? createPortal(
            <AnimatePresence>
              {infoOpen && activeConversation && (
                <>
                  <motion.div
                    key="info-bd"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => setInfoOpen(false)}
                    className="fixed inset-0 bg-black/60 z-[60]"
                  />
                  <motion.aside
                    key="info-pn"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
                    className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] z-[61] bg-surface-900 border-l overlay-frame flex flex-col overflow-hidden"
                  >
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
                  </motion.aside>
                </>
              )}
            </AnimatePresence>,
            document.body,
          )
        : infoOpen && activeConversation && (
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
