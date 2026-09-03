// ─── Skill Template Instances (admin) ──────────────────────────────────────
// Cross-tenant list of every agent_skills row attached to a template — the
// "who's using this template?" view the operator needed before editing or
// deleting one. Each row shows a drift badge keyed off the backend's
// per-row diff so configs out of sync with the current config_schema jump
// out visually.
//
// Mounted by SkillTemplateEditorPage in edit mode only. Skips render when
// creating a new template (no instances possible yet).

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, AlertCircle, RefreshCw, Users, Pencil, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { listSkillTemplateInstances } from '@/services/skillTemplatesApi'
import type {
  SkillTemplate,
  SkillTemplateInstance,
  AgentSkillWithTemplate,
} from '@/types/skills'
import { EditAgentSkillConfigModal } from './EditAgentSkillConfigModal'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

interface Props {
  template: SkillTemplate
}

export function SkillTemplateInstancesSection({ template }: Props) {
  const [rows, setRows] = useState<SkillTemplateInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<SkillTemplateInstance | null>(null)
  const { toast } = useToast()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listSkillTemplateInstances(template.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [template.id])

  useEffect(() => { void reload() }, [reload])

  // Splits drift from healthy rows so the section header can lead with the
  // count of problems without re-iterating the array client-side.
  const driftCount = useMemo(() => rows.filter((r) => r.has_drift).length, [rows])

  // Re-shape the SkillTemplateInstance + the parent template into the
  // AgentSkillWithTemplate the edit modal expects. Same trick the test modal
  // uses — the modal only reads a handful of `template_*` fields and the
  // tenantId prop, both of which we have here.
  const editingAsSkill = useMemo<AgentSkillWithTemplate | null>(() => {
    if (!editing) return null
    return {
      skill_id: editing.id,
      agent_id: editing.agent_id,
      tenant_id: editing.tenant_id,
      config: editing.config,
      llm_name_override: editing.llm_name_override,
      llm_description_override: editing.llm_description_override,
      enabled: editing.enabled,
      created_at: editing.created_at,
      updated_at: editing.updated_at,
      template_id: template.id,
      template_slug: template.slug,
      template_name: template.name,
      template_description: template.description,
      template_category: template.category,
      template_llm_name: template.llm_name,
      template_llm_description: template.llm_description,
      template_input_schema: template.input_schema,
      template_config_schema: template.config_schema,
      template_webhook_path: template.webhook_path,
      template_http_method: template.http_method,
      template_timeout_ms: template.timeout_ms,
      template_mutates: template.mutates,
      template_enabled: template.enabled,
    }
  }, [editing, template])

  return (
    <section className="mt-8 bg-surface-900/50 border border-surface-800 rounded-xl p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            Instâncias atribuídas
            {!loading && (
              <span className="text-[11px] font-normal text-surface-500">
                ({rows.length})
              </span>
            )}
            {driftCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ring-1 bg-status-pending-bg text-status-pending ring-status-pending-border">
                <AlertTriangle className="w-3 h-3" />
                {driftCount} {driftCount === 1 ? 'desatualizada' : 'desatualizadas'}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-surface-500">
            Agentes que já usam este template. "Desatualizada" significa que o config salvo
            está sem um campo obrigatório do schema atual.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Recarregar
        </button>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-10 text-surface-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando instâncias…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-danger break-words">{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-surface-500 py-6 text-center">
          Nenhum agente usa este template ainda.
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-surface-500 border-b border-surface-800">
                <th className="text-left font-medium py-2 pr-3">Agente</th>
                <th className="text-left font-medium py-2 pr-3">Tenant</th>
                <th className="text-left font-medium py-2 pr-3">Config</th>
                <th className="text-left font-medium py-2 pr-3">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <InstanceRow
                  key={row.id}
                  row={row}
                  onEdit={() => setEditing(row)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingAsSkill && (
        <EditAgentSkillConfigModal
          open
          skill={editingAsSkill}
          tenantId={editingAsSkill.tenant_id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast('Instância atualizada', 'success')
            void reload()
          }}
        />
      )}

    </section>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function InstanceRow({
  row,
  onEdit,
}: {
  row: SkillTemplateInstance
  onEdit: () => void
}) {
  // Compact JSON preview — full config goes into a hover tooltip so the
  // table doesn't blow up vertically when an agent has 5+ config keys.
  const configPreview = useMemo(() => {
    const entries = Object.entries(row.config ?? {})
    if (entries.length === 0) return '{}'
    const head = entries.slice(0, 2).map(([k, v]) => `${k}=${formatVal(v)}`).join(', ')
    return entries.length > 2 ? `${head}, +${entries.length - 2}` : head
  }, [row.config])

  return (
    <tr className="border-b border-surface-800/60 hover:bg-surface-900/30">
      <td className="py-2.5 pr-3 text-surface-100 truncate max-w-[180px]">
        {row.agent_name}
      </td>
      <td className="py-2.5 pr-3 text-surface-400 font-mono text-[11px]">
        {row.tenant_id.slice(0, 8)}…
      </td>
      <td className="py-2.5 pr-3 text-surface-300 font-mono text-[11px]">
        <Tooltip content={JSON.stringify(row.config ?? {}, null, 2)} side="top">
          <span className="cursor-help">{configPreview}</span>
        </Tooltip>
      </td>
      <td className="py-2.5 pr-3">
        {row.has_drift ? (
          <Tooltip
            side="top"
            content={[
              row.missing_required.length > 0
                ? `Faltando: ${row.missing_required.join(', ')}`
                : null,
              row.extra_keys.length > 0
                ? `Sobrando: ${row.extra_keys.join(', ')}`
                : null,
            ].filter(Boolean).join('\n')}
          >
            <span className="inline-flex items-center gap-1 text-[11px] text-status-pending cursor-help">
              <AlertTriangle className="w-3 h-3" /> Desatualizada
            </span>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-status-active">
            <CheckCircle2 className="w-3 h-3" /> OK
          </span>
        )}
        {!row.enabled && (
          <span className="ml-2 text-[10px] text-surface-500">(pausada)</span>
        )}
      </td>
      <td className="py-2.5 text-right">
        <Tooltip content="Editar configuração desta instância" side="top">
          <button
            type="button"
            onClick={onEdit}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </td>
    </tr>
  )
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'string') return v.length > 14 ? v.slice(0, 12) + '…' : v
  if (typeof v === 'object') return Array.isArray(v) ? `[${v.length}]` : '{…}'
  return String(v)
}
