// ─── Agent Activity Section ──────────────────────────────────────────────────
//
// Phase 25 — collapsible list shown in ContactPanel that surfaces every CRM
// action the WhatsApp AI agent ran on this conversation (assignments, status
// changes, tag adds/removes, stage moves). Pulls from the agent-server's
// /agents/builder/conversations/:id/actions endpoint, which reads
// agent_tool_executions filtered to kind='crm'.
//
// Design choices:
//   * Mount-time fetch (no realtime in v1). Real-time updates via the
//     ConversationsGateway are a v2 nicety once we have stronger UX needs.
//   * Pre-rendered `humanSummary` is rendered verbatim — no client-side i18n
//     or formatting work; the agent-server already produced it in Portuguese.
//   * Collapsed by default to 5 items; "Ver todas" expands to the full N≤50.

import { useEffect, useState } from 'react'
import { Bot, CheckCircle, AlertCircle, Loader2, UserPlus, Tag as TagIcon, MoveRight, MessageSquare, KanbanSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn, formatRelativeTime } from '@/lib/utils'
import { fetchAgentActions, type AgentAction } from '@/services/agentActivityApi'

const COLLAPSED_LIMIT = 5

export function AgentActivitySection({ conversationId }: { conversationId: string }) {
  const [actions, setActions] = useState<AgentAction[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchAgentActions(conversationId)
      .then((rows) => { if (alive) setActions(rows) })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Erro ao carregar') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [conversationId])

  // Hide the section entirely while loading — keeps the panel from flashing
  // an empty state on every conversation switch. Once loaded, even an empty
  // list shows up so the operator knows the agent has been quiet.
  if (loading && actions === null) {
    return (
      <div className="px-4 py-3 border-t border-surface-800 flex items-center gap-2 text-xs text-surface-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Carregando atividade do agente…
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

  const list = actions ?? []
  const visible = expanded ? list : list.slice(0, COLLAPSED_LIMIT)
  const hidden = list.length - visible.length

  return (
    <div className="px-4 py-3 border-t border-surface-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-surface-500 uppercase tracking-wide font-semibold flex items-center gap-1.5">
          <Bot className="w-3 h-3" />
          Atividade do agente IA
        </p>
        {list.length > 0 && (
          <span className="text-[10px] text-surface-600">
            {list.length} {list.length === 1 ? 'ação' : 'ações'}
          </span>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-surface-500 py-1">Nenhuma ação automatizada nesta conversa ainda.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => (
            <ActionRow key={a.id} action={a} />
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-[11px] text-surface-400 hover:text-surface-200 font-medium"
        >
          Ver todas ({hidden} mais)
        </button>
      )}
    </div>
  )
}

function ActionRow({ action }: { action: AgentAction }) {
  const Icon = iconFor(action)
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-2.5 px-2 py-1.5 rounded-md',
        action.success ? 'bg-surface-900/40' : 'bg-status-error-950/30 border border-status-error-900/40',
      )}
    >
      <span
        className={cn(
          'mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
          action.success ? 'bg-surface-800 text-brand-300' : 'bg-status-error-900/40 text-status-error-300',
        )}
      >
        <Icon className="w-3 h-3" />
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs leading-snug', action.success ? 'text-surface-200' : 'text-status-error-300')}>
          {action.humanSummary || displayName(action.toolName)}
        </p>
        <p className="text-[10px] text-surface-500 mt-0.5 flex items-center gap-1">
          <span>{formatRelativeTime(action.createdAt)}</span>
          {action.success ? (
            <CheckCircle className="w-2.5 h-2.5 text-status-success-500" />
          ) : (
            <span className="text-status-error-400">· falhou</span>
          )}
        </p>
        {!action.success && action.errorMessage && (
          <p className="text-[10px] text-status-error-400 mt-0.5 line-clamp-2">{action.errorMessage}</p>
        )}
      </div>
    </motion.li>
  )
}

function iconFor(a: AgentAction) {
  switch (a.toolName) {
    case 'assign_conversation':
    case 'transfer_conversation':
      return UserPlus
    case 'set_conversation_status':
      return MessageSquare
    case 'add_tag_to_conversation':
    case 'remove_tag_from_conversation':
      return TagIcon
    case 'update_contact':
      return MoveRight
    case 'update_deal_stage':
      // list_deal_stages (a pure read, like list_stages/list_tags/list_users)
      // is intentionally absent here — the backend filters those rows out
      // before they ever reach this UI (empty humanSummary), matching every
      // other read-only tool's absence from this switch.
      return KanbanSquare
    default:
      return Bot
  }
}

function displayName(tool: string): string {
  // Fallback when the agent-server didn't pre-render a humanSummary.
  const map: Record<string, string> = {
    assign_conversation: 'Atribuiu a conversa',
    transfer_conversation: 'Transferiu a conversa',
    set_conversation_status: 'Mudou status da conversa',
    add_tag_to_conversation: 'Etiquetou a conversa',
    remove_tag_from_conversation: 'Removeu etiqueta da conversa',
    update_contact: 'Atualizou contato',
    update_deal_stage: 'Moveu o negócio no funil',
  }
  return map[tool] ?? tool
}
