import { useState, useCallback, useEffect, useRef } from 'react'
import type { CopilotMessage } from '@/contexts/CopilotContext'
import {
  createCopilotSession as apiCreateSession,
  buscarSessoesDoCopilot,
  obterSessaoDoCopilot,
  getCopilotMessages as apiGetMessages,
  deleteCopilotSession as apiDeleteSession,
  updateCopilotSessionTitle as apiUpdateTitle,
  type SessaoDoCopilotApi,
} from '@/services/copilotServiceBackend'
import { expirarLotesOrfaos } from '@/components/copilot/bancada/lotes'

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

/** Tamanho da página da lista (máximo do servidor). */
const PAGINA = 100

// ─── Local cache (fast load) ──────────────────────────────────────────────────

const STORAGE_VERSION = 'oryon_copilot_sessions_v2'
function storageKey(userId: string) { return `${STORAGE_VERSION}_${userId}` }
function activeKey(userId: string) { return `${STORAGE_VERSION}_active_${userId}` }

function cacheLoad(userId: string): CopilotSession[] {
  try {
    const lista = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as CopilotSession[]
    // Lote pendente guardado no cache não tem mais turno vivo.
    return lista.map((s) => ({ ...s, messages: expirarLotesOrfaos(s.messages ?? []) }))
  } catch { return [] }
}
function cacheSave(userId: string, sessions: CopilotSession[]) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(sessions.slice(0, PAGINA))) } catch {}
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

function daApi(s: SessaoDoCopilotApi): CopilotSession {
  return {
    id: s.id, title: s.title, preview: '',
    createdAt: s.createdAt, updatedAt: s.updatedAt ?? s.lastMessageAt ?? s.createdAt,
    messages: [],
  }
}

/** Junta listas sem repetir conversa (a primeira ocorrência vence). */
function juntar(a: CopilotSession[], b: CopilotSession[]): CopilotSession[] {
  const vistos = new Set(a.map((s) => s.id))
  return [...a, ...b.filter((s) => !vistos.has(s.id))]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type EstadoDaConversaAberta = 'carregando' | 'nao-encontrada' | 'erro'

export function useCopilotSessions(userId: string | undefined) {
  const [sessions, setSessions] = useState<CopilotSession[]>(() => userId ? cacheLoad(userId) : [])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => userId ? cacheActiveId(userId) : null)
  const [loadedFromDb, setLoadedFromDb] = useState(false)
  // Paginação (agent-server novo: cursor before/beforeId).
  const [temMais, setTemMais] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  // Conversa pedida pela URL que não está na lista: buscada pelo id.
  const [estadoAvulsa, setEstadoAvulsa] = useState<Record<string, EstadoDaConversaAberta>>({})
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  // Primeira página como veio do servidor — para detectar servidor que ignora `q`.
  const primeiraPaginaRef = useRef<string[]>([])

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
          messages: expirarLotesOrfaos(msgs.map((m) => ({
            id: m.id, role: m.role as 'user' | 'assistant',
            content: m.content, toolCalls: m.toolCalls as any,
            // Phase 15: restore persisted plan so PlanCard re-renders after reload
            plan: (m.plan as any) ?? undefined,
            timestamp: m.createdAt, isStreaming: false,
          }))),
        }
        cacheSave(userId, updated)
        return updated
      })
    }).catch(() => {})
  }, [userId])

  // Load sessions from database on mount
  useEffect(() => {
    if (!userId) { setSessions([]); setActiveSessionId(null); return }

    buscarSessoesDoCopilot({ limit: PAGINA }).then((dbSessions) => {
      if (dbSessions && dbSessions.length > 0) {
        const mapped = dbSessions.map(daApi)
        primeiraPaginaRef.current = mapped.map((s) => s.id)
        setSessions(mapped)
        cacheSave(userId, mapped)
        setTemMais(dbSessions.length >= PAGINA)

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
      // Revisão 11/10: antes cortava para 30 (slice(0,29)) e sumia com 70
      // conversas da lista. Mantém tudo; o cache guarda as 100 mais recentes.
      const updated = [newSession, ...prev.filter((s) => s.id !== sessionId)]
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

  /** Próxima página da lista (cursor do último item). */
  const carregarMais = useCallback(async () => {
    const atual = sessionsRef.current
    const ultima = atual[atual.length - 1]
    if (!ultima || carregandoMais) return
    setCarregandoMais(true)
    try {
      const pagina = await buscarSessoesDoCopilot({ before: ultima.updatedAt, beforeId: ultima.id, limit: PAGINA })
      if (!pagina) return
      const novas = pagina.map(daApi).filter((s) => !atual.some((x) => x.id === s.id))
      // Servidor antigo ignora o cursor e devolve a 1ª página: nada novo = fim.
      setTemMais(novas.length > 0 && pagina.length >= PAGINA)
      if (novas.length > 0) setSessions((prev) => juntar(prev, novas))
    } finally {
      setCarregandoMais(false)
    }
  }, [carregandoMais])

  /**
   * Busca no servidor (título + conteúdo). `null` = o servidor não buscou
   * (erro ou versão que ignora `q`) — quem chama filtra a lista local.
   */
  const buscarNoServidor = useCallback(async (q: string): Promise<CopilotSession[] | null> => {
    const termo = q.trim()
    if (!termo) return null
    const r = await buscarSessoesDoCopilot({ q: termo, limit: PAGINA })
    if (!r) return null
    const ids = r.map((s) => s.id)
    const primeira = primeiraPaginaRef.current
    const ignorou = ids.length > 0 && ids.length === Math.min(PAGINA, primeira.length) && ids.every((id, i) => primeira[i] === id)
    if (ignorou) return null
    return r.map((s) => sessionsRef.current.find((x) => x.id === s.id) ?? daApi(s))
  }, [])

  /**
   * Garante que a conversa `id` (vinda da URL) esteja na lista: fora das
   * carregadas, busca pelo id. 404 → "não encontrada".
   */
  const abrirConversa = useCallback(async (id: string) => {
    if (sessionsRef.current.some((s) => s.id === id)) return
    setEstadoAvulsa((prev) => ({ ...prev, [id]: 'carregando' }))
    const r = await obterSessaoDoCopilot(id)
    if (r.status === 'ok') {
      setSessions((prev) => prev.some((s) => s.id === id) ? prev : [...prev, daApi(r.sessao)])
      setEstadoAvulsa((prev) => { const n = { ...prev }; delete n[id]; return n })
      loadMessagesForSession(id)
    } else {
      setEstadoAvulsa((prev) => ({ ...prev, [id]: r.status }))
    }
  }, [loadMessagesForSession])

  return {
    sessions, activeSession, activeSessionId, activeMessages, loadedFromDb,
    createSession, selectSession, deleteSession,
    updateSessionMessages, updateSessionTitle,
    temMais, carregandoMais, carregarMais, buscarNoServidor,
    abrirConversa, estadoAvulsa,
  }
}
