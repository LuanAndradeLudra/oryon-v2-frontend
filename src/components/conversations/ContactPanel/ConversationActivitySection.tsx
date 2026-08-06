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
  TagsIcon, UserCog, History, Pause, Play, ArrowRightLeft,
  CheckCircle2, Clock, Inbox, Archive, Send, MoveRight, Megaphone, CornerDownLeft,
  MessageSquarePlus, RotateCcw, FileText, AlertTriangle,
  Briefcase, Trophy, XCircle, Pencil, Trash2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatRelativeTime } from '@/lib/utils'
import { formatBRL } from '@/utils/money'
import { fetchAgentActions, type AgentAction } from '@/services/agentActivityApi'
import { fetchUserActivity, type UserActivity } from '@/services/userActivityApi'
import { getSocket } from '@/services/socket'
import { Modal } from '@/components/ui/Modal'
import { guardCorrectedTimelineLabel, guardReasonTimelineLabel } from '@/lib/guardReason'

// Three rows fit comfortably in the contact panel without dominating it; six
// rows is the most we render before pushing the user toward the full-history
// modal, so the contact panel never becomes a scroll-heavy timeline of its
// own. The modal lifts the cap entirely.
const COLLAPSED_LIMIT = 3
const EXPANDED_LIMIT = 6

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
    // `deal:changed` traz contactId (não conversationId), então não dá p/ filtrar por conversa
    // aqui — recarrega a conversa atual (o backend grava o evento de negócio no feed dela).
    const handleDealChanged = () => refetchSoon()
    socket.on('conversation:assigned', handleAssigned)
    socket.on('conversation:resolved', handleResolved)
    socket.on('conversation:updated', handleUpdated)
    socket.on('conversation:ai-pause-updated', handleAiPause)
    socket.on('message:new', handleMessageNew)
    socket.on('deal:changed', handleDealChanged)

    return () => {
      if (pending) clearTimeout(pending)
      window.removeEventListener(ACTIVITY_INVALIDATE_EVENT, onInvalidate)
      socket.off('conversation:assigned', handleAssigned)
      socket.off('conversation:resolved', handleResolved)
      socket.off('conversation:updated', handleUpdated)
      socket.off('conversation:ai-pause-updated', handleAiPause)
      socket.off('message:new', handleMessageNew)
      socket.off('deal:changed', handleDealChanged)
    }
  }, [loadActivity])

  if (loading && entries === null) {
    return (
      <div className="px-4 py-3 border-t border-surface-800 flex items-center gap-2 text-xs text-surface-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Carregando histórico…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 border-t border-surface-800 text-xs text-status-error-400 flex items-center gap-2">
        <AlertCircle className="w-3 h-3" />
        {error}
      </div>
    )
  }

  const list = entries ?? []
  const visibleLimit = expanded ? EXPANDED_LIMIT : COLLAPSED_LIMIT
  const visible = list.slice(0, visibleLimit)
  // Three button states map onto three list-size regimes:
  //   - "Mostrar mais": list goes past the collapsed cap and we have room
  //     to expand inside the panel without spilling into the modal.
  //   - "Mostrar menos": user already expanded; lets them collapse without
  //     losing access to the full history.
  //   - "Ver histórico completo": there are still rows beyond the in-panel
  //     cap (>6) — pop the modal so the operator sees everything without
  //     turning the sidebar into a tall scroll surface.
  const canShowMore = !expanded && list.length > COLLAPSED_LIMIT
  const canShowLess = expanded
  const hasOverflow = list.length > EXPANDED_LIMIT
  const moreInPanel = Math.min(list.length, EXPANDED_LIMIT) - COLLAPSED_LIMIT

  return (
    <>
      <div className="px-4 py-3 border-t border-surface-800">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold flex items-center gap-1.5">
            <History className="w-3 h-3" />
            Histórico da conversa
          </p>
          {list.length > 0 && (
            <span className="text-[10px] text-surface-600">
              {list.length} {list.length === 1 ? 'evento' : 'eventos'}
            </span>
          )}
        </div>
        {list.length === 0 ? (
          <p className="text-xs text-surface-500 py-1">Nenhum evento registrado nesta conversa ainda.</p>
        ) : (
          <TimelineList entries={visible} />
        )}
        {(canShowMore || canShowLess || hasOverflow) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {canShowMore && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-[11px] text-brand-400 hover:text-brand-300 font-medium"
              >
                Mostrar mais{moreInPanel > 0 ? ` (${moreInPanel})` : ''}
              </button>
            )}
            {canShowLess && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[11px] text-surface-400 hover:text-surface-200 font-medium"
              >
                Mostrar menos
              </button>
            )}
            {expanded && hasOverflow && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-[11px] text-brand-400 hover:text-brand-300 font-medium"
              >
                Ver histórico completo
              </button>
            )}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Histórico da conversa"
        className="w-full max-w-lg h-[80vh]"
      >
        <div className="px-4 py-3">
          <p className="text-[11px] text-surface-500 mb-3">
            {list.length} {list.length === 1 ? 'evento' : 'eventos'} nesta conversa
          </p>
          <TimelineList entries={list} />
        </div>
      </Modal>
    </>
  )
}

/** Reusable list of timeline rows. Same component renders the in-panel
 *  preview (3 or 6 rows) and the full-history modal (everything), keeping
 *  visual treatment guaranteed-consistent across both surfaces. */
function TimelineList({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <TimelineRow key={`${e.kind}-${e.id}`} entry={e} />
      ))}
    </ul>
  )
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const visual = visualForEntry(entry)
  const failed = entry.kind === 'agent' && !entry.success
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-2.5 px-2 py-1.5 rounded-md',
        failed
          ? 'bg-status-error-950/30 border border-status-error-900/40'
          : visual.rowBg,
      )}
    >
      <span
        className={cn(
          'mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
          failed ? 'bg-status-error-900/40 text-status-error-300' : visual.iconClass,
        )}
      >
        <visual.Icon className="w-3 h-3" />
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs leading-snug',
          failed ? 'text-status-error-300' : 'text-surface-200',
        )}>
          {visual.label}
        </p>
        <p className="text-[10px] text-surface-500 mt-0.5 flex items-center gap-1">
          <span>{formatRelativeTime(entry.createdAt)}</span>
          {entry.kind === 'user' && (
            <>
              <span>·</span>
              <span className="truncate max-w-[140px]">{entry.actor}</span>
            </>
          )}
          {entry.kind === 'agent' && (
            <>
              {/* Same actor slot the operator branch uses, so the timeline
                  reads "Atribuiu a conversa... · há 2h · Agente Vendas".
                  Legacy rows without agent_name fall back to a neutral
                  "Agente IA" — the UUID is never exposed. */}
              <span>·</span>
              <span className="truncate max-w-[140px]">
                {entry.agentName || 'Agente IA'}
              </span>
              {entry.success
                ? <CheckCircle className="w-2.5 h-2.5 text-status-success-500" />
                : <span className="text-status-error-400">· falhou</span>}
            </>
          )}
        </p>
        {entry.kind === 'agent' && !entry.success && entry.errorMessage && (
          <p className="text-[10px] text-status-error-400 mt-0.5 line-clamp-2">{entry.errorMessage}</p>
        )}
      </div>
    </motion.li>
  )
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
    //
    // A action name ainda é `agent_phantom_confirmation_handoff` por
    // compatibilidade com as linhas já gravadas, mas o motivo REAL vem do
    // `outcome`: desde o Verification Gateway o handoff também acontece por
    // preço, horário e nome, não só por ação alegada.
    case 'agent_phantom_confirmation_handoff':
      return {
        label: guardReasonTimelineLabel(
          typeof metadata.outcome === 'string' ? metadata.outcome : null,
          typeof metadata.claimType === 'string' ? metadata.claimType : null,
        ),
        Icon: AlertTriangle,
        rowBg: 'bg-amber-950/40', iconClass: 'bg-amber-900/50 text-amber-200',
      }
    // Mesmo motivo do caso acima: com o gateway, a autocorreção também acontece
    // por preço, horário e nome — não só por ação alegada.
    case 'agent_phantom_confirmation_corrected':
      return {
        label: guardCorrectedTimelineLabel(
          typeof metadata.outcome === 'string' ? metadata.outcome : null,
          typeof metadata.claimType === 'string' ? metadata.claimType : null,
        ),
        Icon: AlertCircle,
        rowBg: 'bg-surface-900/40', iconClass: 'bg-surface-800 text-surface-300',
      }
    case 'deal_created': {
      const t = typeof metadata.dealTitle === 'string' ? metadata.dealTitle : 'Negócio'
      const v = typeof metadata.amountCents === 'number' ? ` · ${formatBRL(metadata.amountCents)}` : ''
      return { label: `Negócio "${t}" criado${v}`, Icon: Briefcase,
               rowBg: 'bg-emerald-950/25', iconClass: 'bg-emerald-900/40 text-emerald-300' }
    }
    case 'deal_won': {
      const t = typeof metadata.dealTitle === 'string' ? metadata.dealTitle : 'Negócio'
      const v = typeof metadata.amountCents === 'number' ? ` · ${formatBRL(metadata.amountCents)}` : ''
      return { label: `Negócio "${t}" ganho${v}`, Icon: Trophy,
               rowBg: 'bg-emerald-950/25', iconClass: 'bg-emerald-900/40 text-emerald-300' }
    }
    case 'deal_lost': {
      const t = typeof metadata.dealTitle === 'string' ? metadata.dealTitle : 'Negócio'
      return { label: `Negócio "${t}" perdido`, Icon: XCircle,
               rowBg: 'bg-red-950/25', iconClass: 'bg-red-900/40 text-red-300' }
    }
    case 'deal_updated': {
      const t = typeof metadata.dealTitle === 'string' ? metadata.dealTitle : 'Negócio'
      return { label: `Negócio "${t}" atualizado`, Icon: Pencil,
               rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300' }
    }
    case 'deal_reopened': {
      const t = typeof metadata.dealTitle === 'string' ? metadata.dealTitle : 'Negócio'
      return { label: `Negócio "${t}" reaberto`, Icon: RotateCcw,
               rowBg: 'bg-sky-950/25', iconClass: 'bg-sky-900/40 text-sky-300' }
    }
    case 'deal_deleted': {
      const t = typeof metadata.dealTitle === 'string' ? metadata.dealTitle : 'Negócio'
      return { label: `Negócio "${t}" excluído`, Icon: Trash2,
               rowBg: 'bg-red-950/25', iconClass: 'bg-red-900/40 text-red-300' }
    }
    default:
      return { label: key, Icon: Bot,
               rowBg: 'bg-surface-900/40', iconClass: 'bg-surface-800 text-surface-300' }
  }
}

