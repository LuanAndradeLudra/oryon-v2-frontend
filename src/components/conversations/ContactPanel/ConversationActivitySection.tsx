// ─── Conversation Activity Section ──────────────────────────────────────────
//
// Replaces the older AgentActivitySection. Shows a single chronological
// timeline that interleaves:
//   - WhatsApp AI agent actions (agent_tool_executions on the agent-server)
//   - Operator actions via the UI (activity_logs on the backend)
//
// The two fetches happen in parallel; either failing only suppresses that
// half (the panel still renders the other side), so a flaky agent-server
// doesn't blank out the operator's own audit trail and vice versa.
//
// Source-based de-duplication lives on the backend
// (/activity-feed/conversation/:id excludes source IN ('agent', ...)) — the
// agent-server feed remains the canonical source for AI writes because its
// `humanSummary` is richer (resolved user/tag names, timing, error_message).

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot, CheckCircle, AlertCircle, Loader2, UserPlus, UserMinus, Tag as TagIcon,
  TagsIcon, UserCog, Pause, Play, ArrowRightLeft,
  CheckCircle2, Clock, Inbox, Archive, Send, MoveRight, Megaphone, CornerDownLeft,
  MessageSquarePlus, RotateCcw, FileText, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatRelativeTime } from '@/lib/utils'
import { fetchAgentActions, type AgentAction } from '@/services/agentActivityApi'
import { fetchUserActivity, type UserActivity } from '@/services/userActivityApi'
import { getSocket } from '@/services/socket'
import { Modal } from '@/components/ui/Modal'

const COLLAPSED_LIMIT = 4
const EXPANDED_LIMIT = 8

type TimeFilter = 'today' | '7d' | '30d' | 'all'

function matchesFilter(createdAt: string, filter: TimeFilter): boolean {
  if (filter === 'all') return true
  const now = Date.now()
  const ts = new Date(createdAt).getTime()
  const diff = now - ts
  if (filter === 'today') {
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)
    return ts >= startOfDay.getTime()
  }
  if (filter === '7d') return diff <= 7 * 86400_000
  if (filter === '30d') return diff <= 30 * 86400_000
  return true
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Discriminated union normalising the two backend shapes (agent and user)
 *  to a common timeline entry. Anything the row component reads must live
 *  on every branch; the `kind` discriminator picks the icon and accent. */
type TimelineEntry =
  | {
      kind: 'agent'
      id: string
      summary: string
      success: boolean
      errorMessage: string | null
      toolName: string
      /** Snapshot of the agent's display name when the action ran. Null for
       *  rows recorded before migration 31 — TimelineRow falls back to a
       *  generic "Agente IA" label so the slot is never empty. */
      agentName: string | null
      createdAt: string
    }
  | {
      kind: 'user'
      id: string
      summary: string
      actor: string
      action: string
      createdAt: string
      /** Free-form payload from the audit row's `details` (the request body
       *  the operator sent). visualForEntry inspects fields here to pick
       *  the right label/icon for compound actions like assign vs unassign. */
      metadata: Record<string, unknown>
    }

/** Browser CustomEvent name dispatched by ConversationsPage after every
 *  local mutation (tag add/remove, status change, assign, etc.). The
 *  panel listens for it to refetch immediately — backend doesn't emit
 *  socket events for most CRM writes (only message:new and ai-pause), so
 *  socket alone isn't enough to keep the timeline live. detail.conversationId
 *  is required so the panel ignores invalidations targeted at other
 *  conversations. */
export const ACTIVITY_INVALIDATE_EVENT = 'oryon:activity-invalidate'

export interface ActivityInvalidateDetail {
  conversationId: string
}

/** Module-scoped cache of the merged timeline keyed by conversationId.
 *  Surviving across mounts means tapping back into a recent conversation
 *  shows its history instantly — the fetch still runs in the background to
 *  pick up anything new, but the operator never sees a 2-second blank. */
const timelineCache = new Map<string, TimelineEntry[]>()

export function ConversationActivitySection({ conversationId }: { conversationId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(
    () => timelineCache.get(conversationId) ?? null,
  )
  const [loading, setLoading] = useState(() => !timelineCache.has(conversationId))
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<TimeFilter>('today')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  // Tracks which conversationId the in-flight fetch belongs to so a slow
  // response from the previous conversation can't clobber the new one.
  // Also lets event handlers short-circuit refetches for events on
  // unrelated conversations without re-creating listeners on each id.
  const currentIdRef = useRef(conversationId)
  currentIdRef.current = conversationId

  const loadActivity = useCallback(async (id: string) => {
    const [agentResult, userResult] = await Promise.allSettled([
      fetchAgentActions(id),
      fetchUserActivity(id),
    ])
    // Drop the response when the user has already navigated away — without
    // this the old conversation's activity briefly overwrites the new one
    // (the bug the customer reported as the panel taking 2s to update on
    // switch).
    if (currentIdRef.current !== id) return
    const agentRows: TimelineEntry[] = agentResult.status === 'fulfilled'
      ? agentResult.value.filter(toShownAgent).map(toAgentEntry)
      : []
    const userRows: TimelineEntry[] = userResult.status === 'fulfilled'
      ? userResult.value.map(toUserEntry)
      : []
    if (agentResult.status === 'rejected' && userResult.status === 'rejected') {
      const msg = agentResult.reason instanceof Error
        ? agentResult.reason.message
        : 'Erro ao carregar histórico'
      setError(msg)
      setEntries([])
      return
    }
    setError(null)
    const merged = [...agentRows, ...userRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    setEntries(merged)
    timelineCache.set(id, merged)
  }, [])

  // Initial fetch + swap on conversation change.
  //
  // Three cases:
  //   1. Conversation was visited before → seed state from cache, render
  //      instantly, kick a background revalidation. The operator sees no
  //      blank — what they had before pops up immediately.
  //   2. New conversation, fresh cache → null entries + loading=true so the
  //      "Carregando histórico…" indicator shows.
  //   3. Either way, currentIdRef gates late responses so swapping fast
  //      between A → B → C never lets B clobber C.
  useEffect(() => {
    const cached = timelineCache.get(conversationId)
    if (cached) {
      setEntries(cached)
      setLoading(false)
    } else {
      setEntries(null)
      setLoading(true)
    }
    setError(null)
    void loadActivity(conversationId).finally(() => {
      if (currentIdRef.current === conversationId) setLoading(false)
    })
  }, [conversationId, loadActivity])

  // Two complementary realtime channels — both refetch with a small debounce
  // so a burst of mutations doesn't fire several /activity calls in a row.
  //
  //   - Custom DOM event (oryon:activity-invalidate): fired by
  //     ConversationsPage handlers right after a local mutation succeeds.
  //     This is the primary trigger for the operator's own actions because
  //     the backend doesn't emit socket events for tag/assign/status writes.
  //
  //   - Socket events: cover the cases that DO fan out (message:new,
  //     conversation:ai-pause-updated) and pick up writes from other
  //     operators / agents in real time across tabs and devices.
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null
    const refetchSoon = (eventConvId?: string) => {
      if (eventConvId && eventConvId !== currentIdRef.current) return
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => {
        const id = currentIdRef.current
        if (id) void loadActivity(id)
      }, 50)
    }

    const onInvalidate = (e: Event) => {
      const detail = (e as CustomEvent<ActivityInvalidateDetail>).detail
      refetchSoon(detail?.conversationId)
    }
    window.addEventListener(ACTIVITY_INVALIDATE_EVENT, onInvalidate)

    const socket = getSocket()
    const handleAssigned = (p: { conversationId: string }) => refetchSoon(p?.conversationId)
    const handleResolved = (p: { conversationId: string }) => refetchSoon(p?.conversationId)
    const handleUpdated = (p: { conversationId: string }) => refetchSoon(p?.conversationId)
    const handleAiPause = (p: { conversationId: string }) => refetchSoon(p?.conversationId)
    const handleMessageNew = (p: { conversationId: string }) => refetchSoon(p?.conversationId)
    socket.on('conversation:assigned', handleAssigned)
    socket.on('conversation:resolved', handleResolved)
    socket.on('conversation:updated', handleUpdated)
    socket.on('conversation:ai-pause-updated', handleAiPause)
    socket.on('message:new', handleMessageNew)

    return () => {
      if (pending) clearTimeout(pending)
      window.removeEventListener(ACTIVITY_INVALIDATE_EVENT, onInvalidate)
      socket.off('conversation:assigned', handleAssigned)
      socket.off('conversation:resolved', handleResolved)
      socket.off('conversation:updated', handleUpdated)
      socket.off('conversation:ai-pause-updated', handleAiPause)
      socket.off('message:new', handleMessageNew)
    }
  }, [loadActivity])

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const FILTER_LABELS: Record<TimeFilter, string> = {
    today: 'Hoje', '7d': '7 dias', '30d': '30 dias', all: 'Tudo',
  }

  if (loading && entries === null) {
    return (
      <div className="panel-divider px-4 py-3 border-t border-surface-800 flex items-center gap-2 text-xs text-surface-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Carregando histórico…
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel-divider px-4 py-3 border-t border-surface-800 text-xs text-status-error-400 flex items-center gap-2">
        <AlertCircle className="w-3 h-3" />
        {error}
      </div>
    )
  }

  const allEntries = entries ?? []
  const filtered = allEntries.filter(e => matchesFilter(e.createdAt, filter))
  const visibleLimit = expanded ? EXPANDED_LIMIT : COLLAPSED_LIMIT
  const visible = filtered.slice(0, visibleLimit)
  const canShowMore = !expanded && filtered.length > COLLAPSED_LIMIT
  const canShowLess = expanded
  const hasOverflow = filtered.length > EXPANDED_LIMIT
  const moreInPanel = Math.min(filtered.length, EXPANDED_LIMIT) - COLLAPSED_LIMIT

  return (
    <>
      <div className="panel-divider px-4 pt-4 pb-3 border-t border-surface-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-surface-200">Timeline</p>
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen(v => !v)}
              className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-lg px-2.5 py-1 transition-colors"
            >
              {FILTER_LABELS[filter]}
              <ChevronDown className={cn('w-3 h-3 transition-transform', filterOpen && 'rotate-180')} />
            </button>
            {filterOpen && (
              <div className="overlay-scrim z-40" aria-hidden onMouseDown={() => setFilterOpen(false)} />
            )}
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[100px] py-1 overlay-surface border rounded-xl overflow-hidden">
                {(Object.keys(FILTER_LABELS) as TimeFilter[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setFilter(f); setFilterOpen(false); setExpanded(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs transition-colors',
                      f === filter ? 'text-brand-300 bg-brand-600/10' : 'text-surface-300 hover:bg-surface-700',
                    )}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-surface-500 py-1">
            {allEntries.length === 0 ? 'Nenhum evento registrado.' : 'Nenhum evento no período.'}
          </p>
        ) : (
          <TimelineList entries={visible} />
        )}

        {(canShowMore || canShowLess || hasOverflow) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[52px]">
            {canShowMore && (
              <button type="button" onClick={() => setExpanded(true)} className="text-[11px] text-brand-400 hover:text-brand-300 font-medium">
                Mostrar mais{moreInPanel > 0 ? ` (${moreInPanel})` : ''}
              </button>
            )}
            {canShowLess && (
              <button type="button" onClick={() => setExpanded(false)} className="text-[11px] text-surface-400 hover:text-surface-200 font-medium">
                Mostrar menos
              </button>
            )}
            {expanded && hasOverflow && (
              <button type="button" onClick={() => setModalOpen(true)} className="text-[11px] text-brand-400 hover:text-brand-300 font-medium">
                Ver histórico completo
              </button>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Histórico da conversa" className="w-full max-w-lg h-[80vh]">
        <div className="px-2 py-3">
          <TimelineList entries={allEntries} />
        </div>
      </Modal>
    </>
  )
}

function TimelineList({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ul className="relative">
      {entries.map((e, i) => (
        <TimelineRow key={`${e.kind}-${e.id}`} entry={e} isLast={i === entries.length - 1} />
      ))}
    </ul>
  )
}

function TimelineRow({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const visual = visualForEntry(entry)
  const failed = entry.kind === 'agent' && !entry.success
  const actor = entry.kind === 'user'
    ? entry.actor
    : (entry.agentName || 'Agente IA')

  // Extract dot color from iconClass (e.g. "bg-emerald-900/40 text-emerald-300" → emerald)
  const dotColor = 'bg-surface-500'

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-0"
    >
      {/* Time column */}
      <div className="w-10 flex-shrink-0 pt-0.5 pr-2 text-right">
        <span className="text-[10px] text-surface-500 font-medium tabular-nums leading-none">
          {formatTime(entry.createdAt)}
        </span>
      </div>

      {/* Line + dot column */}
      <div className="flex flex-col items-center flex-shrink-0 w-4 mr-2.5">
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-surface-950', dotColor)} />
        {!isLast && <div className="w-px flex-1 min-h-[20px] bg-surface-700 mt-1" />}
      </div>

      {/* Content column */}
      <div className="flex-1 min-w-0 pb-3">
        <p className={cn(
          'text-xs font-medium leading-snug',
          failed ? 'text-status-error-300' : 'text-surface-200',
        )}>
          {visual.label}
        </p>
        <p className="text-[10px] text-surface-500 mt-0.5 truncate">
          {actor}
          {entry.kind === 'agent' && !entry.success && (
            <span className="text-status-error-400 ml-1">· falhou</span>
          )}
        </p>
        {entry.kind === 'agent' && !entry.success && entry.errorMessage && (
          <p className="text-[10px] text-status-error-400 mt-0.5 line-clamp-2">{entry.errorMessage}</p>
        )}
      </div>
    </motion.li>
  )
}

function dotColorFromIconClass(_iconClass: string): string {
  return 'bg-surface-500'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toShownAgent(a: AgentAction): boolean {
  // Backend already filters the SQL with human_summary != '' but be defensive
  // — older rows from before that filter might still come through, and it's
  // cheaper to drop them on the client than to hide them with rendering tricks.
  return !!a.humanSummary && a.humanSummary.trim().length > 0
}

function toAgentEntry(a: AgentAction): TimelineEntry {
  return {
    kind: 'agent',
    id: a.id,
    summary: a.humanSummary,
    success: a.success,
    errorMessage: a.errorMessage,
    toolName: a.toolName,
    agentName: a.agentName,
    createdAt: a.createdAt,
  }
}

function toUserEntry(a: UserActivity): TimelineEntry {
  return {
    kind: 'user',
    id: a.id,
    summary: a.summary,
    actor: a.actor,
    action: a.type,
    createdAt: a.timestamp,
    metadata: a.metadata ?? {},
  }
}

/** Visual + textual treatment for one timeline entry. Centralises the
 *  per-action mapping so a new audit type only requires extending this
 *  function; the row component stays generic.
 *
 *  Each treatment includes:
 *   - label: human-friendly Portuguese phrase for the row title
 *   - Icon: lucide icon component
 *   - rowBg: tinted background for the entire row (light wash of the colour)
 *   - iconClass: tinted background + foreground for the icon badge
 *
 *  We pick a *colour family per action* (not per actor kind) so two rows
 *  for the same action — one from the AI, one from an operator — stay
 *  visually consistent on the timeline. The actor source is conveyed by
 *  the actor name on the metadata line below the title, not by colour. */
export interface RowVisual {
  label: string
  Icon: typeof UserPlus
  rowBg: string
  iconClass: string
}

function visualForEntry(entry: TimelineEntry): RowVisual {
  if (entry.kind === 'agent') {
    return visualForAgentEntry(entry)
  }
  return visualForUserEntry(entry)
}

function visualForAgentEntry(entry: Extract<TimelineEntry, { kind: 'agent' }>): RowVisual {
  const base = visualForActionKey(toolToActionKey(entry.toolName), {})
  return { ...base, label: entry.summary || base.label }
}

function visualForUserEntry(entry: Extract<TimelineEntry, { kind: 'user' }>): RowVisual {
  return visualForActionKey(entry.action, entry.metadata)
}

/** Map agent tool names onto the same action keys we use for user audit
 *  rows so the visual treatment is shared across both halves. */
function toolToActionKey(toolName: string): string {
  switch (toolName) {
    case 'assign_conversation': return 'conversation_assigned'
    case 'transfer_conversation': return 'conversation_transferred'
    case 'set_conversation_status': return 'conversation_status_updated'
    case 'add_tag_to_conversation': return 'conversation_tag_added'
    case 'remove_tag_from_conversation': return 'conversation_tag_removed'
    case 'send_message': return 'message_sent'
    case 'update_contact': return 'contact_updated'
    default: return toolName
  }
}

/** The visual map. Compound actions (assign-vs-unassign,
 *  pause-vs-resume, status sub-states) inspect `metadata` to pick the
 *  right variant. Falls back to a neutral grey treatment for unknown
 *  actions instead of throwing — new tools can ship before we add a
 *  dedicated case. */
export function visualForActionKey(key: string, metadata: Record<string, unknown>): RowVisual {
  switch (key) {
    case 'conversation_assigned': {
      const userId = metadata.userId
      const userName = typeof metadata.userName === 'string' ? metadata.userName : null
      const isUnassign = userId === null || userId === undefined || userId === ''
      if (isUnassign) {
        return { label: 'Removeu atribuição da conversa', Icon: UserMinus,
                 rowBg: 'bg-zinc-900/30', iconClass: 'bg-zinc-800 text-zinc-300' }
      }
      return {
        label: userName ? `Atribuiu a conversa para ${userName}` : 'Atribuiu a conversa',
        Icon: UserPlus,
        rowBg: 'bg-indigo-950/25', iconClass: 'bg-indigo-900/40 text-indigo-300',
      }
    }
    case 'conversation_transferred': {
      const toUserName = typeof metadata.toUserName === 'string' ? metadata.toUserName : null
      return {
        label: toUserName ? `Transferiu a conversa para ${toUserName}` : 'Transferiu a conversa',
        Icon: ArrowRightLeft,
        rowBg: 'bg-violet-950/25', iconClass: 'bg-violet-900/40 text-violet-300',
      }
    }
    case 'conversation_status_updated': {
      const status = typeof metadata.status === 'string' ? metadata.status : ''
      switch (status) {
        case 'resolved':
          return { label: 'Marcou como resolvida', Icon: CheckCircle2,
                   rowBg: 'bg-emerald-950/25', iconClass: 'bg-emerald-900/40 text-emerald-300' }
        case 'pending':
          return { label: 'Moveu para a fila', Icon: Clock,
                   rowBg: 'bg-amber-950/25', iconClass: 'bg-amber-900/40 text-amber-300' }
        case 'open':
          return { label: 'Reabriu a conversa', Icon: Inbox,
                   rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300' }
        case 'abandoned':
          return { label: 'Arquivou a conversa', Icon: Archive,
                   rowBg: 'bg-zinc-900/30', iconClass: 'bg-zinc-800 text-zinc-300' }
        default:
          return { label: 'Atualizou status da conversa', Icon: MoveRight,
                   rowBg: 'bg-surface-900/40', iconClass: 'bg-surface-800 text-surface-300' }
      }
    }
    case 'conversation_tag_added': {
      const tagName = typeof metadata.tagName === 'string' ? metadata.tagName : null
      return {
        label: tagName ? `Adicionou a etiqueta "${tagName}"` : 'Adicionou uma etiqueta',
        Icon: TagIcon,
        rowBg: 'bg-orange-950/25', iconClass: 'bg-orange-900/40 text-orange-300',
      }
    }
    case 'conversation_tag_removed': {
      const tagName = typeof metadata.tagName === 'string' ? metadata.tagName : null
      return {
        label: tagName ? `Removeu a etiqueta "${tagName}"` : 'Removeu uma etiqueta',
        Icon: TagsIcon,
        rowBg: 'bg-zinc-900/30', iconClass: 'bg-zinc-800 text-zinc-300',
      }
    }
    case 'conversation_ai_pause_updated': {
      const pauseUntil = metadata.pauseUntil
      const resumed = pauseUntil === null
      return resumed
        ? { label: 'Reativou o agente IA', Icon: Play,
            rowBg: 'bg-emerald-950/25', iconClass: 'bg-emerald-900/40 text-emerald-300' }
        : { label: 'Pausou o agente IA', Icon: Pause,
            rowBg: 'bg-amber-950/25', iconClass: 'bg-amber-900/40 text-amber-300' }
    }
    case 'conversation_created':
      return { label: 'Conversa iniciada', Icon: MessageSquarePlus,
               rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300' }
    case 'conversation_reopened':
      return { label: 'Conversa reaberta', Icon: RotateCcw,
               rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300' }
    case 'conversation_ai_auto_paused':
      return { label: 'IA pausada (atendente assumiu)', Icon: Pause,
               rowBg: 'bg-amber-950/25', iconClass: 'bg-amber-900/40 text-amber-300' }
    case 'template_sent': {
      const tplName = typeof metadata.templateName === 'string' ? metadata.templateName : null
      return {
        label: tplName ? `Template enviado: ${tplName}` : 'Template enviado',
        Icon: FileText,
        rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300',
      }
    }
    case 'message_sent':
      return { label: 'Enviou uma mensagem', Icon: Send,
               rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300' }
    case 'contact_updated':
      return { label: 'Atualizou contato', Icon: UserCog,
               rowBg: 'bg-fuchsia-950/25', iconClass: 'bg-fuchsia-900/40 text-fuchsia-300' }
    case 'automated_message_sent': {
      const name = typeof metadata.name === 'string' ? metadata.name : null
      return {
        label: name ? `Disparo enviado: ${name}` : 'Disparo automático enviado',
        Icon: Megaphone,
        rowBg: 'bg-amber-950/25', iconClass: 'bg-amber-900/40 text-amber-300',
      }
    }
    case 'interactive_reply_received': {
      const title = typeof metadata.title === 'string' ? metadata.title : null
      return {
        label: title ? `Cliente respondeu: ${title}` : 'Resposta interativa do cliente',
        Icon: CornerDownLeft,
        rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300',
      }
    }
    // Phase 33c — anti-claim guard outcomes. Handoff = the AI claimed an action
    // it never executed and the turn was transferred to a human (needs review).
    // Corrected = the AI tried to claim falsely but self-corrected (audit only).
    case 'agent_phantom_confirmation_handoff':
      return {
        label: `Verificação necessária: a IA afirmou ${phantomClaimLabel(metadata.claimType)} sem executar a operação — transferido para atendente`,
        Icon: AlertTriangle,
        rowBg: 'bg-amber-950/40', iconClass: 'bg-amber-900/50 text-amber-200',
      }
    case 'agent_phantom_confirmation_corrected':
      return {
        label: `A IA tentou confirmar ${phantomClaimLabel(metadata.claimType)} sem executar — corrigido automaticamente`,
        Icon: AlertCircle,
        rowBg: 'bg-surface-900/40', iconClass: 'bg-surface-800 text-surface-300',
      }
    default:
      return { label: key, Icon: Bot,
               rowBg: 'bg-surface-900/40', iconClass: 'bg-surface-800 text-surface-300' }
  }
}

/** Map the anti-claim guard's claim type to a human phrase for timeline rows. */
function phantomClaimLabel(raw: unknown): string {
  switch (typeof raw === 'string' ? raw : '') {
    case 'schedule': return 'um agendamento'
    case 'cancel':   return 'um cancelamento'
    case 'confirm':  return 'uma confirmação'
    default:         return 'uma ação'
  }
}
