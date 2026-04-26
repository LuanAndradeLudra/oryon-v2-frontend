import { useState, useCallback, useEffect } from 'react'
import type { CopilotMessage } from '@/contexts/CopilotContext'
import {
  createCopilotSession as apiCreateSession,
  listCopilotSessions as apiListSessions,
  getCopilotMessages as apiGetMessages,
  deleteCopilotSession as apiDeleteSession,
  updateCopilotSessionTitle as apiUpdateTitle,
} from '@/services/copilotServiceBackend'

// ─── Preview builder ──────────────────────────────────────────────────────────

export const ARTIFACT_LABELS: Record<string, string> = {
  webpage: 'Landing Page', slides: 'Apresentação',
  spreadsheet: 'Planilha', document: 'Documento',
}

function buildPreview(content: string): string {
  const m = content.match(/^<(webpage|slides|spreadsheet|document)>/)
  if (m) return `__artifact:${m[1]}__`
  return content.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').slice(0, 80)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SerializedMessage extends Omit<CopilotMessage, 'timestamp'> {
  timestamp: string
}

export interface CopilotSession {
  id: string
  title: string
  preview: string
  createdAt: string
  updatedAt: string
  messages: SerializedMessage[]
}

// ─── Local cache (fast load) ──────────────────────────────────────────────────

const STORAGE_VERSION = 'oryon_copilot_sessions_v2'
function storageKey(userId: string) { return `${STORAGE_VERSION}_${userId}` }
function activeKey(userId: string) { return `${STORAGE_VERSION}_active_${userId}` }

function cacheLoad(userId: string): CopilotSession[] {
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') } catch { return [] }
}
function cacheSave(userId: string, sessions: CopilotSession[]) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(sessions.slice(0, 30))) } catch {}
}
function cacheActiveId(userId: string): string | null {
  try { return localStorage.getItem(activeKey(userId)) } catch { return null }
}
function cacheSetActiveId(userId: string, id: string | null) {
  try { if (id) localStorage.setItem(activeKey(userId), id); else localStorage.removeItem(activeKey(userId)) } catch {}
}

function serializeMessages(messages: CopilotMessage[]): SerializedMessage[] {
  return messages.map((m) => ({ ...m, timestamp: m.timestamp?.toISOString?.() ?? new Date().toISOString() }))
}
function deserializeMessages(messages: SerializedMessage[]): CopilotMessage[] {
  return messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCopilotSessions(userId: string | undefined) {
  const [sessions, setSessions] = useState<CopilotSession[]>(() => userId ? cacheLoad(userId) : [])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => userId ? cacheActiveId(userId) : null)
  const [loadedFromDb, setLoadedFromDb] = useState(false)

  // Helper: load messages for a session from DB and merge into state
  const loadMessagesForSession = useCallback((sessionId: string) => {
    if (!userId) return
    apiGetMessages(sessionId).then((msgs) => {
      if (msgs.length === 0) return
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === sessionId)
        if (idx === -1) return prev
        const updated = [...prev]
        updated[idx] = {
          ...updated[idx],
          messages: msgs.map((m) => ({
            id: m.id, role: m.role as 'user' | 'assistant',
            content: m.content, toolCalls: m.toolCalls as any,
            // Phase 15: restore persisted plan so PlanCard re-renders after reload
            plan: (m.plan as any) ?? undefined,
            timestamp: m.createdAt, isStreaming: false,
          })),
        }
        cacheSave(userId, updated)
        return updated
      })
    }).catch(() => {})
  }, [userId])

  // Load sessions from database on mount
  useEffect(() => {
    if (!userId) { setSessions([]); setActiveSessionId(null); return }

    apiListSessions().then((dbSessions) => {
      if (dbSessions.length > 0) {
        const mapped: CopilotSession[] = dbSessions.map((s) => ({
          id: s.id, title: s.title, preview: '',
          createdAt: s.createdAt, updatedAt: s.lastMessageAt ?? s.createdAt,
          messages: [],
        }))
        setSessions(mapped)
        cacheSave(userId, mapped)

        // Restore active session and load its messages
        const cached = cacheActiveId(userId)
        if (cached && mapped.some((s) => s.id === cached)) {
          setActiveSessionId(cached)
          loadMessagesForSession(cached)
        }
      } else {
        setSessions(cacheLoad(userId))
      }
      setLoadedFromDb(true)
    }).catch(() => {
      setSessions(cacheLoad(userId))
      setLoadedFromDb(true)
    })
  }, [userId, loadMessagesForSession])

  // Persist active session ID to cache
  useEffect(() => {
    if (userId) cacheSetActiveId(userId, activeSessionId)
  }, [userId, activeSessionId])

  // Load messages when user switches to a different session
  useEffect(() => {
    if (!activeSessionId || !userId || !loadedFromDb) return
    loadMessagesForSession(activeSessionId)
  }, [activeSessionId, userId, loadedFromDb, loadMessagesForSession])

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const activeMessages: CopilotMessage[] = activeSession ? deserializeMessages(activeSession.messages) : []
  const atLimit = sessions.length >= 30
  const nearLimit = sessions.length >= 25

  const createSession = useCallback(async (): Promise<string> => {
    if (!userId) return ''
    const fallbackId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Try to create in DB first so we use the real ID from the start
    let sessionId: string = fallbackId
    try {
      const res = await apiCreateSession('Nova conversa')
      if (res?.id) sessionId = res.id
    } catch { /* use fallback */ }

    const newSession: CopilotSession = {
      id: sessionId, title: 'Nova conversa', preview: '', createdAt: now, updatedAt: now, messages: [],
    }
    setSessions((prev) => {
      const updated = [newSession, ...prev.slice(0, 29)]
      cacheSave(userId, updated)
      return updated
    })
    setActiveSessionId(sessionId)

    return sessionId
  }, [userId])

  const selectSession = useCallback((id: string | null) => {
    setActiveSessionId(id)
  }, [])

  const deleteSession = useCallback((id: string) => {
    if (!userId) return
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      cacheSave(userId, updated)
      return updated
    })
    setActiveSessionId((prev) => prev === id ? null : prev)
    apiDeleteSession(id).catch(() => {})
  }, [userId])

  const updateSessionMessages = useCallback((id: string, messages: CopilotMessage[]) => {
    if (!userId) return
    const isStreaming = messages.some((m) => m.isStreaming)

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev

      const session = prev[idx]
      const firstUser = messages.find((m) => m.role === 'user')
      const title = firstUser ? firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '') : session.title
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      const preview = lastAssistant ? buildPreview(lastAssistant.content) : session.preview

      const updated: CopilotSession = {
        ...session, title, preview, updatedAt: new Date().toISOString(),
        messages: isStreaming ? session.messages : serializeMessages(messages),
      }
      const updatedSessions = [...prev]
      updatedSessions.splice(idx, 1)
      updatedSessions.unshift(updated)
      if (!isStreaming) {
        cacheSave(userId, updatedSessions)
        // Sync title to database
        if (title !== session.title) apiUpdateTitle(id, title).catch(() => {})
      }
      return updatedSessions
    })
  }, [userId])

  const updateSessionTitle = useCallback((id: string, title: string) => {
    if (!userId) return
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx === -1) return prev
      const updated = [...prev]
      updated[idx] = { ...updated[idx], title }
      cacheSave(userId, updated)
      return updated
    })
    apiUpdateTitle(id, title).catch(() => {})
  }, [userId])

  return {
    sessions, activeSession, activeSessionId, activeMessages,
    atLimit, nearLimit,
    createSession, selectSession, deleteSession,
    updateSessionMessages, updateSessionTitle,
  }
}
