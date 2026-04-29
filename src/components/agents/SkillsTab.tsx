// ─── SkillsTab — customer view ─────────────────────────────────────────────
// Read-only listing of skills attached to this agent + a toggle to pause/
// resume each one. Configuration values (api tokens, ids, …) are never shown
// here — those are managed by Oryon staff at attach time. Skills with
// `mutates=true` are flagged with a destructive badge so the operator knows
// which calls actually change customer data.

import { useState, useEffect, useCallback } from 'react'
import {
  Sparkles, ShieldAlert, Loader2, AlertCircle, RefreshCw, Mail,
} from 'lucide-react'
import { listAgentSkills, updateAgentSkill } from '@/services/agentSkillsApi'
import type { AgentSkillWithTemplate } from '@/types/skills'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  clinic:   'Clínicas',
  crm:      'CRM',
  calendar: 'Calendário',
  custom:   'Custom',
}

interface Props {
  agentId: string
}

export function SkillsTab({ agentId }: Props) {
  const [rows, setRows] = useState<AgentSkillWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listAgentSkills(agentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { void reload() }, [reload])

  async function toggle(row: AgentSkillWithTemplate) {
    const next = !row.enabled
    // Optimistic flip — revert on error so the UI stays in sync without a
    // refetch on the happy path.
    setTogglingId(row.skill_id)
    setRows((prev) => prev.map((r) => (r.skill_id === row.skill_id ? { ...r, enabled: next } : r)))
    try {
      await updateAgentSkill(agentId, row.skill_id, { enabled: next })
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.skill_id === row.skill_id ? { ...r, enabled: !next } : r)))
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setTogglingId(null)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-surface-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando skills…
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && rows.length === 0) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
        <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-danger font-medium mb-1">Erro ao carregar skills</p>
          <p className="text-surface-400 break-words">{error}</p>
        </div>
        <button
          onClick={reload}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-medium flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-surface-900/40 border border-dashed border-surface-700 rounded-xl">
        <Sparkles className="w-10 h-10 text-surface-600 mb-3" />
        <p className="text-surface-300 font-medium mb-1">Nenhuma skill ativada para este agente</p>
        <p className="text-sm text-surface-500 max-w-md mb-4">
          Skills são capacidades específicas (marcar consulta, consultar pedido, etc.)
          que são habilitadas pela equipe Oryon de acordo com o seu negócio.
        </p>
        <a
          href="mailto:contato@oryonsolutions.com?subject=Quero+ativar+skills+no+meu+agente"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-medium"
        >
          <Mail className="w-3.5 h-3.5" /> Falar com a Oryon
        </a>
      </div>
    )
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {error && (
        <div className="flex items-start gap-3 p-3 mb-3 rounded-lg bg-danger/10 border border-danger/30 text-xs">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-danger flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-surface-500 hover:text-surface-300">
            ✕
          </button>
        </div>
      )}

      <p className="text-sm text-surface-400 mb-4">
        Capacidades que esse agente pode usar nas conversas. Use o botão para pausar
        ou retomar uma capacidade. As configurações detalhadas são gerenciadas pela equipe Oryon.
      </p>

      <div className="space-y-3">
        {rows.map((row) => (
          <SkillRow
            key={row.skill_id}
            row={row}
            toggling={togglingId === row.skill_id}
            onToggle={() => toggle(row)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Row ───────────────────────────────────────────────────────────────────

function SkillRow({
  row,
  toggling,
  onToggle,
}: {
  row: AgentSkillWithTemplate
  toggling: boolean
  onToggle: () => void
}) {
  const description = row.llm_description_override?.trim() || row.template_llm_description
  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-colors',
        row.enabled
          ? 'bg-surface-900 border-surface-700'
          : 'bg-surface-900/40 border-surface-800',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3
              className={cn(
                'text-sm font-semibold truncate',
                row.enabled ? 'text-surface-100' : 'text-surface-400',
              )}
            >
              {row.template_name}
            </h3>
            <Badge tone={row.enabled ? 'success' : 'muted'}>
              {row.enabled ? 'ativa' : 'pausada'}
            </Badge>
            <Badge tone="muted">
              {CATEGORY_LABELS[row.template_category] ?? row.template_category}
            </Badge>
            {row.template_mutates && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-pending-bg text-status-pending ring-1 ring-status-pending-border">
                <ShieldAlert className="w-2.5 h-2.5" /> destrutiva
              </span>
            )}
          </div>
          <p className="text-sm text-surface-400 line-clamp-2">{description}</p>
          {!row.template_enabled && (
            <p className="text-[11px] text-status-pending mt-1">
              Esta skill foi desabilitada pela Oryon — entre em contato para mais detalhes.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Switch
            checked={row.enabled}
            onChange={onToggle}
            disabled={toggling || !row.template_enabled}
          />
          {toggling && (
            <span className="text-[10px] text-surface-500 inline-flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> salvando
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: 'success' | 'muted'
  children: React.ReactNode
}) {
  const cls: Record<typeof tone, string> = {
    success: 'bg-status-active-bg text-status-active ring-status-active-border',
    muted:   'bg-surface-800 text-surface-400 ring-surface-700',
  }
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ring-1', cls[tone])}>
      {children}
    </span>
  )
}
