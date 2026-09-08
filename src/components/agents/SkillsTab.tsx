// ─── SkillsTab — agent's skills panel ──────────────────────────────────────
// Read-only "capabilities panel" for the agent's owner (toggle pause/resume).
// Skills are configured by Oryon staff at attach time (tokens, IDs, etc are
// never surfaced to the customer here).
//
// Oryon staff (super_admin) sees an extra row of controls: edit-config and
// remove. These appear only when `isOryonStaff(user.role)` is true and are
// the entry point that replaces the previous "open psql and UPDATE" workflow
// for fixing a skill's config after attach.
//
// Layout:
//   [icon] [name + chips + description + footer]   [staff controls + switch]
//   left border colored when active to scan-state from across the screen.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Loader2, AlertCircle, RefreshCw, ShieldAlert, HelpCircle,
  Pencil, Trash2, Beaker,
} from 'lucide-react'
import { listAgentSkills, updateAgentSkill, detachSkill } from '@/services/agentSkillsApi'
import type { AgentSkillWithTemplate } from '@/types/skills'
import { Switch } from '@/components/ui/Switch'
import { Tooltip } from '@/components/ui/Tooltip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/Modal'
import { EditAgentSkillConfigModal } from '@/components/admin/EditAgentSkillConfigModal'
import { TestAgentSkillModal } from '@/components/admin/TestAgentSkillModal'
import { CategoryIcon } from '@/components/skills/CategoryIcon'
import { SkillStatusBadge } from '@/components/skills/SkillStatusBadge'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { isOryonStaff } from '@/lib/roleHelpers'
import { cn } from '@/lib/utils'

interface Props {
  agentId: string
  /**
   * Optional tenant override — only used when Oryon staff opens this tab
   * cross-tenant from `/admin/agents`. Customers leave it undefined; their
   * JWT tenantId is used by the backend.
   */
  tenantId?: string
}

export function SkillsTab({ agentId, tenantId }: Props) {
  const { user } = useAuth()
  const staff = isOryonStaff(user?.role)
  const navigate = useNavigate()
  const [rows, setRows] = useState<AgentSkillWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  // Staff-only modal state — kept here (not inside SkillRow) so a single
  // modal instance is mounted at any time and refetch + toast plumb cleanly.
  const [editing, setEditing] = useState<AgentSkillWithTemplate | null>(null)
  const [removing, setRemoving] = useState<AgentSkillWithTemplate | null>(null)
  const [removingPending, setRemovingPending] = useState(false)
  const [testing, setTesting] = useState<AgentSkillWithTemplate | null>(null)
  const { toast } = useToast()

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await listAgentSkills(agentId, tenantId))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [agentId, tenantId])

  useEffect(() => { void reload() }, [reload])

  // Derive header counters from the array — no extra fetch.
  const stats = useMemo(() => {
    let active = 0, paused = 0, mutates = 0
    for (const r of rows) {
      if (r.enabled) active++; else paused++
      if (r.enabled && r.template_mutates) mutates++
    }
    return { active, paused, mutates }
  }, [rows])

  async function toggle(row: AgentSkillWithTemplate) {
    const next = !row.enabled
    // Optimistic flip — revert on error so the UI stays in sync without a
    // refetch on the happy path.
    setTogglingId(row.skill_id)
    setRows((prev) => prev.map((r) => (r.skill_id === row.skill_id ? { ...r, enabled: next } : r)))
    try {
      await updateAgentSkill(agentId, row.skill_id, { enabled: next }, tenantId)
      toast(next ? `${row.template_name} ativada` : `${row.template_name} pausada`, 'success')
    } catch (err) {
      // Rollback the optimistic update + surface the error via toast (no
      // more inline banner that ate vertical space at the top of the list).
      setRows((prev) => prev.map((r) => (r.skill_id === row.skill_id ? { ...r, enabled: !next } : r)))
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleRemove() {
    if (!removing) return
    setRemovingPending(true)
    try {
      await detachSkill(agentId, removing.skill_id, tenantId)
      setRows((prev) => prev.filter((r) => r.skill_id !== removing.skill_id))
      toast(`${removing.template_name} removida do agente`, 'success')
      setRemoving(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setRemovingPending(false)
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

  // ── Initial load error (no data at all) ─────────────────────────────────
  if (loadError && rows.length === 0) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
        <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-danger font-medium mb-1">Erro ao carregar skills</p>
          <p className="text-surface-400 break-words">{loadError}</p>
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
  // Two copies live here: staff sees an actionable CTA pointing at the
  // assign flow, customers see a passive "talk to your manager" prompt
  // (skills are configured by Oryon staff on the customer's behalf).
  if (rows.length === 0) {
    if (staff) {
      // Deep-link to assign with tenant + agent pre-filled so the operator
      // doesn't have to re-pick what they just selected on /admin/agents.
      // When tenantId isn't provided (super_admin acting in own tenant),
      // we still pass the agent id and AssignSkillPage handles the missing
      // tenant by waiting for the picker.
      const params = new URLSearchParams()
      if (tenantId) params.set('tenant', tenantId)
      params.set('agent', agentId)
      return (
        <EmptyState
          icon={Sparkles}
          title="Nenhuma skill atribuída a este agente"
          hint="Atribua um template do catálogo para dar uma nova capacidade a este agente."
          action={{
            label: 'Atribuir skill',
            onClick: () => navigate(`/admin/skills/assign?${params.toString()}`),
          }}
        />
      )
    }
    return (
      <EmptyState
        icon={Sparkles}
        title="Nenhuma skill ativada para este agente"
        hint="Sua equipe Oryon pode ativar capacidades específicas para o seu negócio (marcar consulta, consultar pedido, etc). Fale com seu gerente para liberar."
        action={{
          label: 'Falar com a Oryon',
          href: 'mailto:contato@oryonsolutions.com?subject=Quero+ativar+skills+no+meu+agente',
        }}
      />
    )
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Hero — explain + at-a-glance counters */}
      <header className="mb-5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <h2 className="text-sm font-semibold text-surface-100">Capacidades do agente</h2>
          <Tooltip
            content="As configurações detalhadas (tokens, IDs, regras de cada integração) são gerenciadas pela equipe Oryon. Você pode pausar e retomar qualquer capacidade aqui."
            side="top"
          >
            <span className="text-surface-500 hover:text-surface-300 cursor-help inline-flex">
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          </Tooltip>
        </div>
        <p className="text-xs text-surface-500 mb-3">
          O que esse agente sabe fazer durante as conversas. Pause uma capacidade para suspender o uso temporariamente.
        </p>
        <Stats active={stats.active} paused={stats.paused} mutates={stats.mutates} />
      </header>

      {/* Cards — staggered fade-in for a touch of life on first paint */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((row, idx) => (
            <motion.div
              key={row.skill_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, delay: idx * 0.04, ease: 'easeOut' }}
            >
              <SkillRow
                row={row}
                toggling={togglingId === row.skill_id}
                staff={staff}
                onToggle={() => toggle(row)}
                onEdit={() => setEditing(row)}
                onRemove={() => setRemoving(row)}
                onTest={() => setTesting(row)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>


      {/* Staff-only modals — only mounted when an action is triggered. */}
      {editing && (
        <EditAgentSkillConfigModal
          open
          skill={editing}
          tenantId={tenantId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast(`${editing.template_name} atualizada`, 'success')
            void reload()
          }}
        />
      )}

      <ConfirmModal
        open={!!removing}
        onClose={() => removingPending ? undefined : setRemoving(null)}
        onConfirm={handleRemove}
        title="Remover skill do agente?"
        description={removing
          ? `"${removing.template_name}" será removida deste agente imediatamente. Essa ação não pode ser desfeita — o histórico do agent_skills é apagado (hard delete). Para reatribuir depois, use a tela de Atribuir skill.`
          : ''}
        confirmLabel="Remover"
        danger
        loading={removingPending}
      />

      {testing && (
        <TestAgentSkillModal
          open
          skill={testing}
          onClose={() => setTesting(null)}
        />
      )}
    </div>
  )
}

// ─── Stats strip ──────────────────────────────────────────────────────────

function Stats({ active, paused, mutates }: { active: number; paused: number; mutates: number }) {
  return (
    <div className="inline-flex items-center gap-3 text-xs">
      <StatPill tone="success" label={`${active} ${active === 1 ? 'ativa' : 'ativas'}`} />
      {paused > 0 && (
        <StatPill tone="muted" label={`${paused} ${paused === 1 ? 'pausada' : 'pausadas'}`} />
      )}
      {mutates > 0 && (
        <StatPill
          tone="warning"
          icon={<ShieldAlert className="w-3 h-3" />}
          label={`${mutates} ${mutates === 1 ? 'destrutiva' : 'destrutivas'}`}
        />
      )}
    </div>
  )
}

function StatPill({
  tone,
  label,
  icon,
}: {
  tone: 'success' | 'muted' | 'warning'
  label: string
  icon?: React.ReactNode
}) {
  const chip: Partial<Record<typeof tone, string>> = {
    success: 'var(--color-status-active)',
    warning: 'var(--color-status-pending)',
  }
  if (tone === 'muted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ring-1 bg-surface-800 text-surface-400 ring-surface-700">
        {icon}
        {label}
      </span>
    )
  }
  return (
    <span
      className="color-chip inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium border"
      style={{ ['--chip']: chip[tone] } as React.CSSProperties}
    >
      {icon}
      {label}
    </span>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────

function SkillRow({
  row,
  toggling,
  staff,
  onToggle,
  onEdit,
  onRemove,
  onTest,
}: {
  row: AgentSkillWithTemplate
  toggling: boolean
  staff: boolean
  onToggle: () => void
  onEdit: () => void
  onRemove: () => void
  onTest: () => void
}) {
  const description = row.llm_description_override?.trim() || row.template_llm_description
  const disabled = toggling || !row.template_enabled

  return (
    <motion.div
      // Subtle "pulse" feedback when the user toggles the switch — pure visual
      // confirmation so the user knows the click registered before the API
      // round-trip is even visible.
      animate={toggling ? { scale: [1, 1.005, 1] } : { scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'group relative grid grid-cols-[44px_1fr_auto] items-start gap-4 p-4 rounded-xl border transition-colors',
        // Left accent only when active. Border colour comes from the same
        // status-active token used in the header chip — visual continuity.
        'border-l-2',
        row.enabled
          ? 'bg-surface-900 border-surface-700 border-l-status-active hover:border-surface-600'
          : 'bg-surface-900/40 border-surface-800 border-l-transparent opacity-80',
      )}
    >
      <CategoryIcon
        category={row.template_category}
        tone={row.enabled ? 'active' : 'muted'}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3
            className={cn(
              'text-sm font-semibold truncate',
              row.enabled ? 'text-surface-100' : 'text-surface-400',
            )}
          >
            {row.template_name}
          </h3>
          <SkillStatusBadge
            enabled={row.enabled}
            mutates={row.template_mutates}
            templateEnabled={row.template_enabled}
          />
        </div>
        <p className="text-sm text-surface-400 line-clamp-2">{description}</p>

        {/* Footer placeholder — usage metrics will land here in Phase D
            (executions count + success rate + last_executed). For now a
            quiet inline hint communicates the resting state without
            looking broken. */}
        {row.enabled ? (
          <p className="text-[11px] text-surface-600 mt-2">
            Capacidade disponível durante as conversas
          </p>
        ) : (
          <p className="text-[11px] text-surface-600 mt-2">
            Pausada — não será usada nas conversas
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {staff && (
          <div className="flex items-center gap-1">
            <Tooltip content="Testar skill" side="top">
              <button
                type="button"
                onClick={onTest}
                disabled={toggling}
                aria-label="Testar skill"
                className="w-7 h-7 rounded-md inline-flex items-center justify-center text-surface-400 hover:text-brand-300 hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Beaker className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Editar configuração" side="top">
              <button
                type="button"
                onClick={onEdit}
                disabled={toggling}
                aria-label="Editar configuração"
                className="w-7 h-7 rounded-md inline-flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Remover skill (hard delete)" side="top">
              <button
                type="button"
                onClick={onRemove}
                disabled={toggling}
                aria-label="Remover skill (hard delete)"
                className="w-7 h-7 rounded-md inline-flex items-center justify-center text-surface-400 hover:text-danger hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        )}
        <Switch
          checked={row.enabled}
          onChange={onToggle}
          disabled={disabled}
        />
        {toggling && (
          <span className="text-[10px] text-surface-500 inline-flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> salvando
          </span>
        )}
      </div>
    </motion.div>
  )
}
