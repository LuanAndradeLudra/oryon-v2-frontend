// ─── Settings → Auditoria ────────────────────────────────────────────────────
// Tenant-scoped audit feed for owners/managers. Read-only timeline of every
// mutation the team performed. Backed by GET /audit/tenant-feed which forces
// tenantId from the JWT — no cross-tenant leakage possible.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, AlertCircle, Filter, X } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActorChip } from '@/components/ui/ActorChip'
import { formatActivity } from '@/components/dashboard/activityFormatter'
import {
  listTenantAuditFeed,
  type TenantAuditRow,
  type TenantAuditQuery,
} from '@/services/tenantAuditApi'
import { cn } from '@/lib/utils'

// Coarse domain buckets the user can filter by — friendlier than asking them
// to type 'contact_created' / 'contact_updated' / 'contact_deleted'. Each
// bucket is an entityType prefix matched by the backend.
const ENTITY_BUCKETS: Array<{ value: string; label: string }> = [
  { value: '',                  label: 'Todas as áreas' },
  { value: 'contact',           label: 'Contatos' },
  { value: 'conversation',      label: 'Conversas' },
  { value: 'campaign',          label: 'Campanhas' },
  { value: 'automation',        label: 'Automations' },
  { value: 'template',          label: 'Templates' },
  { value: 'tag',               label: 'Tags' },
  { value: 'stage',             label: 'Estágios' },
  { value: 'canned_response',   label: 'Respostas rápidas' },
  { value: 'user',              label: 'Equipe (usuários)' },
  { value: 'department',        label: 'Setores' },
  { value: 'whatsapp_number',   label: 'Números WhatsApp' },
  { value: 'context',           label: 'Contexto da IA' },
  { value: 'organization',      label: 'Empresa' },
  { value: 'media',             label: 'Mídias' },
  { value: 'internal_channel',  label: 'Chat interno' },
]

const SEVERITY_OPTIONS = ['', 'info', 'warn', 'error'] as const

const SEVERITY_STYLE: Record<string, string> = {
  info:  'bg-surface-700/40 text-surface-200 border-surface-600',
  warn:  'bg-status-pending-bg text-status-pending border-status-pending/40',
  error: 'bg-status-failed-bg text-status-failed border-status-failed/40',
}

export function AuditTrail() {
  const [filters, setFilters] = useState<TenantAuditQuery>({ limit: 30 })
  const [rows, setRows] = useState<TenantAuditRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q: TenantAuditQuery, append = false) => {
    setLoading(true); setError(null)
    try {
      const res = await listTenantAuditFeed(q)
      setRows(prev => (append ? [...prev, ...res.data] : res.data))
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar atividades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(filters, false) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const onApply = (next: TenantAuditQuery) => {
    setFilters(next)
    void load(next, false)
  }

  const onLoadMore = () => {
    if (!nextCursor) return
    void load({ ...filters, before: nextCursor }, true)
  }

  return (
    <div className="px-6 py-6">
      <SectionHeader
        title="Auditoria da equipe"
        description="Tudo que sua equipe fez na plataforma — criação, edição e remoção de contatos, campanhas, templates, automações e mais. Apenas leitura."
      />

      <FilterBar filters={filters} onApply={onApply} loading={loading} />

      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border border-status-failed/40 bg-status-failed-bg text-status-failed text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <EmptyState
          icon={Search}
          title="Nenhuma atividade no período"
          hint="Ajuste o filtro ou amplie a janela. Apenas ações de membros da equipe (não jobs internos) aparecem aqui."
        />
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border border-surface-800 overflow-hidden bg-surface-900">
          <table className="w-full text-sm">
            <thead className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Quando</th>
                <th className="text-left px-4 py-2.5 font-medium">Quem</th>
                <th className="text-left px-4 py-2.5 font-medium">Ação</th>
                <th className="text-left px-4 py-2.5 font-medium">Recurso</th>
                <th className="text-left px-4 py-2.5 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {rows.map(r => (
                <Row key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-100 text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────
//
// Linha da tabela de auditoria. Mesmo padrão visual da Atividade Recente
// do dashboard:
//   • "Quem" → ActorChip (ícone monocromático + nome). Fallback de nome
//     vem do ActorChip para 'agent'/'webhook'/'job'.
//   • "Ação" → frase passiva via `formatActivity` (mesmo formatter
//     usado no dashboard, garante consistência de copy). O action_name
//     técnico fica como sub-label discreto pra investigação.
//   • "Recurso" e "Detalhes" mantidos — auditoria precisa expor os
//     dados crus pro time de suporte usar como evidência.

function Row({ row }: { row: TenantAuditRow }) {
  const verb = formatActivity({
    action: row.action,
    subject: row.entityName ?? '',
    details: row.details,
  })
  return (
    <tr className="hover:bg-surface-800/30">
      <td className="px-4 py-2.5 whitespace-nowrap text-surface-300 text-xs">
        {new Date(row.createdAt).toLocaleString('pt-BR')}
      </td>
      <td className="px-4 py-2.5 text-xs">
        <ActorChip
          actorType={row.actorType}
          actorName={row.actorName}
          maxNameWidth={180}
          className="text-xs"
        />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-surface-100 text-sm">{verb}</span>
          {row.severity !== 'info' && (
            <span className={cn('inline-block px-1.5 py-0.5 rounded text-[11px] font-medium border', SEVERITY_STYLE[row.severity])}>
              {row.severity}
            </span>
          )}
        </div>
        <div className="text-[11px] text-surface-500 font-mono">{row.action}</div>
      </td>
      <td className="px-4 py-2.5 text-surface-300 text-sm">
        {row.entityName ? (
          <>
            <span>{row.entityName}</span>
            <span className="text-surface-500 text-xs"> · {ENTITY_LABEL[row.entityType] ?? row.entityType}</span>
          </>
        ) : (
          <span className="text-surface-500 text-xs">{ENTITY_LABEL[row.entityType] ?? row.entityType}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-surface-300 text-xs max-w-md">
        {renderDetails(row)}
      </td>
    </tr>
  )
}

// Render the audit row's `details` JSONB as a series of "chave: valor" chips
// — but ONLY for keys explicitly listed as operator-friendly. Anything not
// in `DETAIL_KEY_LABEL` (typically raw UUIDs like `tagId`, `agent_id`, `id`)
// is suppressed instead of leaking technical identifiers into the panel.
// Operators investigating a row can still drill into the raw payload from
// a future detail modal; this column is for at-a-glance scanning.
function renderDetails(row: TenantAuditRow): React.ReactNode {
  const details = row.details ?? {}
  const entries = Object.entries(details).filter(([k, v]) => {
    if (!(k in DETAIL_KEY_LABEL)) return false   // allowlist gate
    if (v === null || v === undefined || v === '') return false
    return true
  })
  if (entries.length === 0) {
    // No useful structured details — show the description, but never the
    // raw "<action> <entityType>" technical fallback that some endpoints
    // emit when they don't provide a friendly description (the action
    // name is already shown beneath the "Ação" column).
    const looksTechnical = row.description.trim().startsWith(row.action)
    return looksTechnical
      ? <span className="text-surface-600">—</span>
      : <span className="truncate block" title={row.description}>{row.description}</span>
  }
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {entries.slice(0, 4).map(([k, v]) => (
        <span key={k} className="inline-flex items-baseline gap-1">
          <span className="text-surface-500">{DETAIL_KEY_LABEL[k]}:</span>
          <span className="text-surface-200">{formatDetailValue(v)}</span>
        </span>
      ))}
      {entries.length > 4 && (
        <span className="text-surface-500">+{entries.length - 4} mais</span>
      )}
    </div>
  )
}

function formatDetailValue(v: unknown): string {
  if (v === true) return 'sim'
  if (v === false) return 'não'
  if (Array.isArray(v)) return v.length > 3 ? `${v.length} itens` : v.map(String).join(', ')
  if (typeof v === 'object' && v !== null) return JSON.stringify(v).slice(0, 40)
  return String(v)
}

// Allowlist of detail keys that ARE meaningful to a non-technical operator
// (no UUIDs, no internal plumbing). When the audit infrastructure adds a
// new field that the operator should see, add it here with its PT-BR
// label — leaving it out is the safe default (suppresses the chip).
//
// Convention: friendly verbs/nouns; lowercase except for proper labels.
// The resolver fields (userName/toUserName/tagName) come from the backend's
// `resolveDetailEnrichments` step in ActivityService; they're the resolved
// HUMAN names paired with the corresponding *Id fields (which we hide).
const DETAIL_KEY_LABEL: Record<string, string> = {
  // Movement / transitions
  from:           'de',
  to:             'para',
  new_status:     'novo status',
  status:         'status',
  new_stage:      'novo estágio',
  stage:          'estágio',
  // Toggles
  enabled:        'ativada',
  isActive:       'ativa',
  // Resolved human names (paired with hidden *Id fields)
  userName:       'usuário',
  toUserName:     'destinatário',
  tagName:        'etiqueta',
  agent_name:     'agente',
  // Counts / scope
  rule_count:     'regras',
  fields:         'campos',
  field:          'campo',
  categories:     'categorias',
  prompt_length:  'tamanho do prompt',
  count:          'quantidade',
  // Misc
  reason:         'motivo',
  new_role:       'novo papel',
  role:           'papel',
}

// Friendly translation of entity_type → PT-BR for the "Recurso" column.
// Mirrors the same vocabulary the Settings sidebar uses so the audit
// rows speak the same language as the rest of the app.
const ENTITY_LABEL: Record<string, string> = {
  contact:           'contato',
  conversation:      'conversa',
  campaign:          'campanha',
  automation:        'automação',
  template:          'modelo',
  tag:               'etiqueta',
  stage:             'estágio',
  canned_response:   'resposta rápida',
  user:              'usuário',
  department:        'setor',
  whatsapp_number:   'número WhatsApp',
  context:           'contexto da IA',
  organization:      'empresa',
  media:             'mídia',
  internal_channel:  'canal interno',
  internal_message:  'mensagem interna',
  ai_agent:          'agente IA',
  custom_field:      'campo personalizado',
  notification_preference: 'preferência de notificação',
}

// ─── FilterBar ───────────────────────────────────────────────────────────────

function FilterBar({
  filters, onApply, loading,
}: {
  filters: TenantAuditQuery
  onApply: (q: TenantAuditQuery) => void
  loading: boolean
}) {
  const [draft, setDraft] = useState<TenantAuditQuery>(filters)
  const set = <K extends keyof TenantAuditQuery>(k: K, v: TenantAuditQuery[K]) => {
    setDraft(prev => ({ ...prev, [k]: v }))
  }
  const apply = () => onApply({ ...draft, before: undefined })
  const clear = () => {
    const cleared: TenantAuditQuery = { limit: 30 }
    setDraft(cleared)
    onApply(cleared)
  }

  const hasFilters = useMemo(
    () => !!(draft.actorId || draft.action || draft.entityType || draft.severity || draft.since),
    [draft],
  )

  return (
    <div className="mb-4 px-4 py-3 rounded-lg border border-surface-800 bg-surface-900/40 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 text-xs text-surface-400">
        <Filter className="w-4 h-4" /> Filtros
      </div>
      <Field label="Quem (userId)" value={draft.actorId ?? ''} onChange={v => set('actorId', v || undefined)} placeholder="UUID" />
      <Select
        label="Área"
        value={draft.entityType ?? ''}
        options={ENTITY_BUCKETS}
        onChange={v => set('entityType', v || undefined)}
      />
      <Field label="Ação (verb)" value={draft.action ?? ''} onChange={v => set('action', v || undefined)} placeholder="ex: campaign_sent" />
      <Select
        label="Severidade"
        value={draft.severity ?? ''}
        options={SEVERITY_OPTIONS.map(s => ({ value: s, label: s || 'todas' }))}
        onChange={v => set('severity', (v || undefined) as TenantAuditQuery['severity'])}
      />
      <Field label="Desde" type="datetime-local" value={toLocalInput(draft.since)} onChange={v => set('since', fromLocalInput(v))} />
      <div className="flex gap-2 ml-auto">
        {hasFilters && (
          <button onClick={clear} className="px-3 py-1.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <button
          onClick={apply}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-black text-xs disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-surface-400">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 text-xs rounded border border-surface-700 bg-surface-900 text-surface-100 focus:outline-none focus:border-brand-500 w-44"
      />
    </label>
  )
}

function Select({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-surface-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2 py-1 text-xs rounded border border-surface-700 bg-surface-900 text-surface-100 focus:outline-none focus:border-brand-500 min-w-[140px]"
      >
        {options.map(o => (
          <option key={o.value || 'all'} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}
