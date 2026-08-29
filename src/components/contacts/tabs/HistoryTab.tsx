import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, Bot, User, Tag, GitCommitHorizontal, UserPlus, ShieldCheck, History,
  Briefcase, Trophy, XCircle, Pencil, Trash2, RotateCcw,
} from 'lucide-react'
import { contactsApi } from '@/services/api'
import { fetchContactActivity } from '@/services/userActivityApi'
import { fetchAgentActionsByContact } from '@/services/agentActivityApi'
import { getSocket } from '@/services/socket'
import {
  visualForActionKey, type RowVisual,
} from '@/components/conversations/ContactPanel/ConversationActivitySection'
import { cn } from '@/lib/utils'

// ── Pipeline (contact_history) visual map ─────────────────────────────────────
// `chip` é consumido via .color-chip + --chip (fundo saturado, ícone branco) —
// mesma linguagem de ConversationActivitySection.tsx, cuja RowVisual este
// arquivo também consome (ver `visualForActionKey` abaixo).
const PIPELINE_VIS: Record<string, { Icon: RowVisual['Icon']; chip: string }> = {
  contact_created: { Icon: UserPlus, chip: 'var(--color-accent-cyan)' },
  stage_change:    { Icon: GitCommitHorizontal, chip: 'var(--color-accent)' },
  ai_update:       { Icon: Bot, chip: 'var(--color-accent-amber)' },
  opt_in_changed:  { Icon: ShieldCheck, chip: 'var(--color-success)' },
  tags_updated:    { Icon: Tag, chip: 'var(--color-accent-amber)' },
  tag_added:       { Icon: Tag, chip: 'var(--color-accent-green)' },
  tag_removed:     { Icon: Tag, chip: 'var(--color-status-muted)' },
  manual_edit:     { Icon: User, chip: 'var(--color-status-muted)' },
  deal_created:    { Icon: Briefcase, chip: 'var(--color-accent-green)' },
  deal_won:        { Icon: Trophy, chip: 'var(--color-success)' },
  deal_lost:       { Icon: XCircle, chip: 'var(--color-danger)' },
  deal_updated:    { Icon: Pencil, chip: 'var(--color-accent-cyan)' },
  deal_reopened:   { Icon: RotateCcw, chip: 'var(--color-accent-cyan)' },
  deal_deleted:    { Icon: Trash2, chip: 'var(--color-danger)' },
}
const PIPELINE_FALLBACK = { Icon: User, chip: 'var(--color-status-muted)' }

type Section = 'pipeline' | 'conversas'

interface TimelineItem {
  id: string
  section: Section
  ts: number
  label: string
  actor: string
  Icon: RowVisual['Icon']
  chip: string
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

interface HistoryTabProps {
  contactId: string
}

export function HistoryTab({ contactId }: HistoryTabProps) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Section>('all')
  // `loading` é derivado: enquanto o contato já carregado não for o atual, mostra o spinner.
  // Evita setState síncrono dentro do effect (cascading renders).
  const loading = loadedId !== contactId

  // Three sources merged: pipeline (contact_history), conversation activity
  // (operators/system across all the contact's conversations) and agent CRM
  // actions. Each call degrades to [] so one failure never blanks the panel.
  // Retorna a lista pronta — quem chama decide se ainda deve aplicá-la (gate `alive`).
  const loadHistory = useCallback(async (id: string): Promise<TimelineItem[]> => {
    const [pipeline, userActivity, agentActions] = await Promise.all([
      contactsApi.getHistory(id).then((r) => r.data.data).catch(() => []),
      fetchContactActivity(id).catch(() => []),
      fetchAgentActionsByContact(id).catch(() => []),
    ])
    const merged: TimelineItem[] = []

    for (const e of pipeline) {
      const vis = PIPELINE_VIS[e.type] ?? PIPELINE_FALLBACK
      merged.push({
        id: `p-${e.id}`,
        section: 'pipeline',
        ts: new Date(e.createdAt).getTime(),
        label: e.summary,
        actor: e.actorName ?? 'Sistema',
        Icon: vis.Icon,
        chip: vis.chip,
      })
    }

    for (const a of userActivity) {
      const vis = visualForActionKey(a.type, (a.metadata ?? {}) as Record<string, unknown>)
      merged.push({
        id: `u-${a.id}`,
        section: 'conversas',
        ts: new Date(a.timestamp).getTime(),
        label: vis.label,
        actor: a.actor ?? 'Sistema',
        Icon: vis.Icon,
        chip: vis.chip,
      })
    }

    for (const a of agentActions) {
      merged.push({
        id: `a-${a.id}`,
        section: 'conversas',
        ts: new Date(a.createdAt).getTime(),
        label: a.humanSummary || 'Ação do agente',
        actor: a.agentName ?? 'Agente IA',
        Icon: Bot,
        chip: 'var(--color-accent-violet)',
      })
    }

    merged.sort((x, y) => y.ts - x.ts)
    return merged
  }, [])

  // Carga inicial + recarga ao trocar de contato. `alive` descarta respostas
  // atrasadas de um contato anterior; `loadedId` casa os dados com o contato exibido.
  useEffect(() => {
    let alive = true
    loadHistory(contactId).then((merged) => {
      if (!alive) return
      setItems(merged)
      setLoadedId(contactId)
    })
    return () => { alive = false }
  }, [contactId, loadHistory])

  // Realtime: um negócio mudou (criar/editar/ganhar/perder/reabrir/excluir) para ESTE
  // contato → recarrega a timeline na hora (antes ela ficava estática até remontar).
  useEffect(() => {
    const socket = getSocket()
    let alive = true
    let pending: ReturnType<typeof setTimeout> | null = null
    const onDealChanged = (p: { contactId?: string }) => {
      if (p?.contactId && p.contactId !== contactId) return
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => {
        loadHistory(contactId).then((merged) => { if (alive) setItems(merged) })
      }, 50)
    }
    socket.on('deal:changed', onDealChanged)
    return () => {
      alive = false
      if (pending) clearTimeout(pending)
      socket.off('deal:changed', onDealChanged)
    }
  }, [contactId, loadHistory])

  const filtered = filter === 'all' ? items : items.filter((i) => i.section === filter)
  const counts = {
    all: items.length,
    pipeline: items.filter((i) => i.section === 'pipeline').length,
    conversas: items.filter((i) => i.section === 'conversas').length,
  }

  const TABS: Array<{ key: 'all' | Section; label: string }> = [
    { key: 'all', label: `Tudo (${counts.all})` },
    { key: 'pipeline', label: `Pipeline (${counts.pipeline})` },
    { key: 'conversas', label: `Conversas (${counts.conversas})` },
  ]

  return (
    <div className="p-4">
      {/* Segmented filter */}
      <div className="flex items-center gap-1 mb-4 bg-surface-900 border border-surface-800 rounded-lg p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors',
              filter === t.key
                ? 'bg-surface-700 text-surface-100'
                : 'text-surface-400 hover:text-surface-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
          <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center">
            <History className="w-5 h-5 text-surface-600" />
          </div>
          <p className="text-sm text-surface-400">Nenhum evento registrado ainda.</p>
        </div>
      ) : (
        <div className="relative pl-5 flex flex-col gap-0">
          <div className="absolute left-2 top-3 bottom-3 w-px bg-surface-800" />
          {filtered.map((item) => (
            <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
              <div
                className="absolute -left-0.5 top-0.5 w-6 h-6 rounded-full border color-chip flex items-center justify-center flex-shrink-0 z-10"
                style={{ '--chip': item.chip } as React.CSSProperties}
              >
                <item.Icon className="w-3 h-3" />
              </div>
              <div className="ml-7 min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-surface-200 flex-1">{item.label}</p>
                  {filter === 'all' && (
                    <span className="text-[9px] uppercase tracking-wide text-surface-600 bg-surface-800/60 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                      {item.section === 'pipeline' ? 'Pipeline' : 'Conversa'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-surface-500">{item.actor}</span>
                  <span className="text-surface-700">·</span>
                  <span className="text-[11px] text-surface-600">{formatDate(item.ts)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
