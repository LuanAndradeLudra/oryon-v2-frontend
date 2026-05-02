// ─── Settings → Auditoria ────────────────────────────────────────────────────
// Tenant-scoped audit feed for owners/managers. Read-only timeline of every
// mutation the team performed. Backed by GET /audit/tenant-feed which forces
// tenantId from the JWT — no cross-tenant leakage possible.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, AlertCircle, Filter, X } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'
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

function Row({ row }: { row: TenantAuditRow }) {
  const verb = humanizeAction(row.action)
  return (
    <tr className="hover:bg-surface-800/30">
      <td className="px-4 py-2.5 whitespace-nowrap text-surface-300 text-xs">
        {new Date(row.createdAt).toLocaleString('pt-BR')}
      </td>
      <td className="px-4 py-2.5 text-surface-200 text-xs">
        {row.actorName ?? <span className="text-surface-500">—</span>}
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
            <span className="text-surface-500 text-xs"> · {row.entityType}</span>
          </>
        ) : (
          <span className="text-surface-500 text-xs">{row.entityType}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-surface-300 text-xs max-w-md truncate" title={row.description}>
        {row.description}
      </td>
    </tr>
  )
}

// Turn 'campaign_sent' → 'Campanha enviada'. Falls back to a humanised verb
// when the action isn't in the dictionary so we never show a raw snake_case
// to the customer. The dictionary is intentionally finite — when a new
// action appears, the fallback prints "<entityType> <pastVerb>" which is
// usually fine until we add a translation here.
function humanizeAction(action: string): string {
  return ACTION_LABELS[action] ?? defaultize(action)
}

const ACTION_LABELS: Record<string, string> = {
  // Contacts
  contact_created: 'Contato criado',
  contact_updated: 'Contato atualizado',
  contact_deleted: 'Contato removido',
  contact_ai_profile_generated: 'Perfil IA gerado',
  contact_ai_profile_applied: 'Perfil IA aplicado',
  contact_template_sent: 'Template enviado para contato',
  contact_custom_fields_updated: 'Campos customizados do contato atualizados',
  contacts_bulk_stage_updated: 'Estágio atualizado em lote',
  contacts_bulk_tags_updated: 'Tags atualizadas em lote',
  contacts_bulk_opt_in_updated: 'Opt-in atualizado em lote',
  contacts_bulk_deleted: 'Contatos removidos em lote',
  // Conversations
  message_sent: 'Mensagem enviada',
  conversation_assigned: 'Conversa atribuída',
  conversation_transferred: 'Conversa transferida',
  conversation_status_updated: 'Status da conversa alterado',
  conversation_tag_added: 'Tag adicionada à conversa',
  conversation_tag_removed: 'Tag removida da conversa',
  conversation_analysis_triggered: 'Análise de conversa solicitada',
  conversation_analysis_confirmed: 'Análise de conversa confirmada',
  // Campaigns
  campaign_created: 'Campanha criada',
  campaign_updated: 'Campanha atualizada',
  campaign_sent: 'Campanha enviada',
  campaign_deleted: 'Campanha removida',
  // Automations
  automation_created: 'Automação criada',
  automation_updated: 'Automação atualizada',
  automation_toggled: 'Automação ativada/desativada',
  automation_deleted: 'Automação removida',
  // Templates
  template_created: 'Template criado',
  template_updated: 'Template atualizado',
  template_deleted: 'Template removido',
  templates_synced: 'Templates sincronizados',
  template_duplicated_to_line: 'Template duplicado para outra linha',
  // Tags / stages / custom-fields / canned
  tag_created: 'Tag criada',
  tag_updated: 'Tag atualizada',
  tag_deleted: 'Tag removida',
  stage_created: 'Estágio criado',
  stage_updated: 'Estágio atualizado',
  stage_deleted: 'Estágio removido',
  stage_reordered: 'Estágios reordenados',
  custom_field_created: 'Campo customizado criado',
  custom_field_updated: 'Campo customizado atualizado',
  custom_field_deleted: 'Campo customizado removido',
  canned_response_created: 'Resposta rápida criada',
  canned_response_updated: 'Resposta rápida atualizada',
  canned_response_deleted: 'Resposta rápida removida',
  // Team
  user_invited: 'Usuário convidado',
  user_updated: 'Usuário atualizado',
  user_deactivated: 'Usuário desativado',
  user_invitation_resent: 'Convite reenviado',
  user_self_updated: 'Usuário atualizou o próprio perfil',
  user_password_changed: 'Senha alterada',
  user_logged_out: 'Usuário deslogou',
  department_created: 'Setor criado',
  department_updated: 'Setor atualizado',
  department_deleted: 'Setor removido',
  // WhatsApp
  meta_oauth_started: 'Conexão Meta iniciada',
  whatsapp_number_set_primary: 'Linha WhatsApp definida como primária',
  whatsapp_number_updated: 'Linha WhatsApp atualizada',
  whatsapp_number_removed: 'Linha WhatsApp desconectada',
  waba_resubscribed: 'WABA re-inscrito',
  waba_system_user_token_generated: 'Token de sistema gerado',
  meta_business_created: 'Business Manager criado',
  meta_phone_verification_requested: 'Verificação de telefone solicitada',
  meta_phone_verified: 'Telefone verificado',
  meta_setup_finalized: 'Setup WhatsApp concluído',
  // Context / organization / preferences
  organization_updated: 'Empresa atualizada',
  company_brain_updated: 'Contexto da IA atualizado',
  company_brain_synced_to_rag: 'Contexto sincronizado com RAG',
  knowledge_base_updated: 'Base de conhecimento atualizada',
  notification_preference_updated: 'Preferência de notificação atualizada',
  notification_preferences_bulk_updated: 'Preferências de notificação salvas',
  notification_preference_reset: 'Preferência de notificação restaurada',
  // Compliance / media
  lgpd_contact_data_exported: 'Dados LGPD do contato exportados',
  lgpd_contact_data_erased: 'Dados LGPD do contato apagados',
  media_uploaded: 'Mídia enviada',
  // Internal chat
  internal_channel_created: 'Canal interno criado',
  internal_message_sent: 'Mensagem interna enviada',
  internal_message_deleted: 'Mensagem interna removida',
  internal_channel_members_added: 'Membros adicionados ao canal',
  internal_channel_member_removed: 'Membro removido do canal',
  internal_channel_deleted: 'Canal interno removido',
}

function defaultize(action: string): string {
  return action
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
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
