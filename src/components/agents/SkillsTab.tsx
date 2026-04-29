// ─── SkillsTab — customer view ─────────────────────────────────────────────
// Read-only "capabilities panel" for the agent's owner. Skills are configured
// by Oryon staff at attach time (tokens, ids, etc are never surfaced here).
// Customer can pause/resume each skill and otherwise just sees what the
// agent can do during conversations.
//
// Layout:
//   [icon] [name + chips + description + footer]   [switch]
//   left border colored when active to scan-state from across the screen.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Loader2, AlertCircle, RefreshCw, ShieldAlert, HelpCircle,
} from 'lucide-react'
import { listAgentSkills, updateAgentSkill } from '@/services/agentSkillsApi'
import type { AgentSkillWithTemplate } from '@/types/skills'
import { Switch } from '@/components/ui/Switch'
import { Tooltip } from '@/components/ui/Tooltip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ToastContainer } from '@/components/ui/Toast'
import { CategoryIcon } from '@/components/skills/CategoryIcon'
import { SkillStatusBadge } from '@/components/skills/SkillStatusBadge'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

interface Props {
  agentId: string
}

export function SkillsTab({ agentId }: Props) {
  const [rows, setRows] = useState<AgentSkillWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const { toasts, toast, dismiss } = useToast()

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setRows(await listAgentSkills(agentId))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [agentId])

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
      await updateAgentSkill(agentId, row.skill_id, { enabled: next })
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
  if (rows.length === 0) {
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
                onToggle={() => toggle(row)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
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
  const cls: Record<typeof tone, string> = {
    success: 'bg-status-active-bg text-status-active ring-status-active-border',
    muted:   'bg-surface-800 text-surface-400 ring-surface-700',
    warning: 'bg-status-pending-bg text-status-pending ring-status-pending-border',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ring-1', cls[tone])}>
      {icon}
      {label}
    </span>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────

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

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
