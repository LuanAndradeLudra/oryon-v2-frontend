// ─── Skill Templates List (admin) ──────────────────────────────────────────
// Catalogue of skills the platform offers. Oryon staff CRUDs templates here
// and then assigns them to customer agents from /admin/skills/assign.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Sparkles, Loader2, AlertCircle, Edit3, Beaker, Power, PowerOff, Link2, Users } from 'lucide-react'
import { listSkillTemplates, updateSkillTemplate } from '@/services/skillTemplatesApi'
import { listAdminOrganizations, type AdminOrganization } from '@/services/adminApi'
import type { SkillTemplate } from '@/types/skills'
import { CategoryIcon } from '@/components/skills/CategoryIcon'
import { ToastContainer } from '@/components/ui/Toast'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tooltip } from '@/components/ui/Tooltip'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

interface AssignedState { tenantId: string; agentId: string; templateId: string }

const CATEGORY_LABELS: Record<string, string> = {
  clinic:   'Clínicas',
  crm:      'CRM',
  calendar: 'Calendário',
  custom:   'Custom',
}

export function SkillTemplatesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toasts, toast, dismiss } = useToast()
  // The Assign screen pushes its result via navigation state — fire a toast
  // once on mount instead of holding a banner forever (cleaner UX, fewer
  // moving parts on the list).
  const initialAssigned = (location.state as { assigned?: AssignedState } | null)?.assigned ?? null
  const assignedToastFiredRef = useRef(false)
  const [templates, setTemplates] = useState<SkillTemplate[]>([])
  const [orgs, setOrgs] = useState<AdminOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [filterScope, setFilterScope] = useState<'all' | 'public' | 'private'>('all')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Oryon staff lists all (public + private of every tenant) by default —
      // filtering happens client-side so toggling categories doesn't refetch.
      const rows = await listSkillTemplates({ all: true })
      setTemplates(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // Load organisations once so the cards can show "attributed to: <names>"
  // by mapping the `instances_by_tenant` ids returned by the backend. We
  // tolerate failure here (the cards just fall back to raw UUIDs) — this is
  // a nice-to-have, not load-blocking.
  useEffect(() => {
    listAdminOrganizations()
      .then(setOrgs)
      .catch(() => { /* silent: cards still work without names */ })
  }, [])

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of orgs) map.set(o.id, o.businessName)
    return map
  }, [orgs])

  // Fire the "skill atribuída" toast exactly once per navigation arrival.
  useEffect(() => {
    if (initialAssigned && !assignedToastFiredRef.current) {
      assignedToastFiredRef.current = true
      toast('Skill atribuída com sucesso ao agente do cliente.', 'success')
    }
  }, [initialAssigned, toast])

  const filtered = templates.filter((t) => {
    if (filterCategory && t.category !== filterCategory) return false
    if (filterStatus === 'enabled' && !t.enabled) return false
    if (filterStatus === 'disabled' && t.enabled) return false
    if (filterScope === 'public' && t.tenant_id !== null) return false
    if (filterScope === 'private' && t.tenant_id === null) return false
    return true
  })

  const categories = Array.from(new Set(templates.map((t) => t.category))).sort()

  async function toggleEnabled(t: SkillTemplate) {
    try {
      const updated = await updateSkillTemplate(t.id, { enabled: !t.enabled })
      setTemplates((prev) => prev.map((row) => (row.id === t.id ? updated : row)))
      toast(updated.enabled ? `${updated.name} ativada` : `${updated.name} desabilitada`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="flex items-start justify-between gap-6 mb-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-brand-400 flex-shrink-0" />
            <h1 className="text-xl font-semibold text-surface-100">Templates de Skills</h1>
          </div>
          <p className="text-sm text-surface-400">
            Catálogo de capacidades disponíveis para anexar aos agentes dos clientes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start">
          <button
            onClick={() => navigate('/admin/skills/assign')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-100 text-sm font-medium transition-colors"
          >
            <Link2 className="w-4 h-4" /> Atribuir a um agente
          </button>
          <button
            onClick={() => navigate('/admin/skill-templates/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-surface-950 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Novo template
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
        <FilterSelect
          label="Categoria"
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: '', label: 'Todas' },
            ...categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as typeof filterStatus)}
          options={[
            { value: 'all',      label: 'Todos' },
            { value: 'enabled',  label: 'Ativos' },
            { value: 'disabled', label: 'Desabilitados' },
          ]}
        />
        <FilterSelect
          label="Escopo"
          value={filterScope}
          onChange={(v) => setFilterScope(v as typeof filterScope)}
          options={[
            { value: 'all',     label: 'Todos' },
            { value: 'public',  label: 'Público' },
            { value: 'private', label: 'Privado' },
          ]}
        />
        <span className="ml-auto text-surface-500">
          {filtered.length} de {templates.length} template{templates.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-surface-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando templates…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-danger font-medium mb-1">Erro ao carregar</p>
            <p className="text-surface-400">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="Nenhum template encontrado"
          hint="Crie o primeiro template para começar a oferecer skills aos clientes."
          action={{
            label: 'Criar template',
            onClick: () => navigate('/admin/skill-templates/new'),
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            orgNameById={orgNameById}
            onEdit={() => navigate(`/admin/skill-templates/${t.id}`)}
            onTest={() => navigate(`/admin/skill-templates/${t.id}/test`)}
            onAssign={() => navigate(`/admin/skills/assign?templateId=${t.id}`)}
            onToggle={() => toggleEnabled(t)}
          />
        ))}
      </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

// ─── Pieces ────────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex items-center gap-2 text-surface-300">
      <span className="text-xs uppercase tracking-wide text-surface-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-900 border border-surface-700 rounded-md px-2 py-1 text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function TemplateCard({
  template,
  orgNameById,
  onEdit,
  onTest,
  onAssign,
  onToggle,
}: {
  template: SkillTemplate
  orgNameById: Map<string, string>
  onEdit: () => void
  onTest: () => void
  onAssign: () => void
  onToggle: () => void
}) {
  const isPublic = template.tenant_id === null

  // Flatten the per-tenant agent counts into a list ordered by usage so the
  // card shows the heaviest users first. Falls back to the raw tenant UUID
  // when the org list hasn't loaded (or the org was deleted).
  const assignments = Object.entries(template.instances_by_tenant ?? {})
    .map(([tenantId, agentCount]) => ({
      tenantId,
      name: orgNameById.get(tenantId) ?? tenantId.slice(0, 8) + '…',
      agentCount,
    }))
    .sort((a, b) => b.agentCount - a.agentCount)
  const totalAgents = assignments.reduce((sum, a) => sum + a.agentCount, 0)

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-colors flex flex-col h-full',
        template.enabled
          ? 'bg-surface-900 border-surface-700 hover:border-surface-600'
          : 'bg-surface-900/40 border-surface-800 opacity-70',
      )}
    >
      {/* Header: icon + name + badges. Description sits below so badges can
          wrap naturally without pushing the icon. */}
      <div className="flex items-start gap-3 mb-2">
        <CategoryIcon
          category={template.category}
          tone={template.enabled ? 'active' : 'muted'}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-surface-100 truncate">
            {template.name}
          </h3>
          <p className="text-[11px] text-surface-500 font-mono truncate">
            {template.slug} · {CATEGORY_LABELS[template.category] ?? template.category}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <Badge tone={template.enabled ? 'success' : 'muted'}>
          {template.enabled ? 'ativo' : 'desabilitado'}
        </Badge>
        <Badge tone={isPublic ? 'brand' : 'pending'}>
          {isPublic ? 'público' : 'privado'}
        </Badge>
        {template.mutates && (
          <Badge tone="danger">⚠ destrutivo</Badge>
        )}
        {(template.drift_count ?? 0) > 0 && (
          <Tooltip
            side="top"
            content="Tem instâncias cujo config está sem um campo obrigatório do schema atual. Abra o template para corrigir."
          >
            <span className="cursor-help">
              <Badge tone="pending">
                ⚠ {template.drift_count} {template.drift_count === 1 ? 'desatualizada' : 'desatualizadas'}
              </Badge>
            </span>
          </Tooltip>
        )}
      </div>

      <p className="text-sm text-surface-400 line-clamp-2 mb-3">{template.description}</p>

      {/* Attribution strip — names of the orgs running this template + a
          tooltip with the full breakdown. Hidden when there are zero
          assignments to keep the card clean. mt-auto pushes it to the bottom
          so cards in the same grid row stay vertically aligned even when
          their descriptions have different line counts. */}
      {assignments.length > 0 && (
        <div className="mt-auto pt-2 flex items-center gap-1.5 text-[11px] text-surface-500 flex-wrap">
          <Users className="w-3 h-3 flex-shrink-0" />
          <Tooltip
            side="top"
            content={assignments
              .map((a) => `${a.name} — ${a.agentCount} ${a.agentCount === 1 ? 'agente' : 'agentes'}`)
              .join('\n')}
          >
            <span className="truncate cursor-help text-surface-400">
              {assignments.slice(0, 2).map((a) => a.name).join(', ')}
              {assignments.length > 2 && ` +${assignments.length - 2}`}
            </span>
          </Tooltip>
          <span className="text-surface-600">·</span>
          <span>
            {totalAgents} {totalAgents === 1 ? 'agente' : 'agentes'}
          </span>
        </div>
      )}

      {/* Action row — horizontal, fixed at the bottom of the card. Icon-only
          for compactness; tooltips on hover spell out each action. */}
      <div className="mt-3 pt-3 border-t border-surface-800 flex items-center gap-1">
        <Tooltip content="Editar template" side="top">
          <button
            onClick={onEdit}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5" /> Editar
          </button>
        </Tooltip>
        <Tooltip content="Testar este template" side="top">
          <button
            onClick={onTest}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs"
          >
            <Beaker className="w-3.5 h-3.5" /> Testar
          </button>
        </Tooltip>
        {template.enabled && (
          <Tooltip content="Atribuir a um agente" side="top">
            <button
              onClick={onAssign}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-xs"
            >
              <Link2 className="w-3.5 h-3.5" /> Atribuir
            </button>
          </Tooltip>
        )}
        <Tooltip
          content={template.enabled ? 'Desabilitar (soft delete)' : 'Reativar template'}
          side="top"
        >
          <button
            onClick={onToggle}
            className={cn(
              'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs flex-shrink-0',
              template.enabled
                ? 'bg-surface-800 hover:bg-surface-700 text-surface-300'
                : 'bg-status-active-bg hover:bg-status-active-bg/80 text-status-active',
            )}
          >
            {template.enabled
              ? <PowerOff className="w-3.5 h-3.5" />
              : <Power className="w-3.5 h-3.5" />}
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: 'success' | 'muted' | 'brand' | 'pending' | 'danger'
  children: React.ReactNode
}) {
  // `muted` stays on the neutral surface path (no --chip); the colored tones
  // render as filled chips (darkened bg + white text) via .color-chip.
  const chipColor: Partial<Record<typeof tone, string>> = {
    success: 'var(--color-status-active)',
    brand:   'var(--color-brand-500)',
    pending: 'var(--color-status-pending)',
    danger:  'var(--color-danger)',
  }
  const base = 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium'
  if (tone === 'muted') {
    return (
      <span className={cn(base, 'ring-1 bg-surface-800 text-surface-400 ring-surface-700')}>
        {children}
      </span>
    )
  }
  return (
    <span
      className={cn(base, 'color-chip border')}
      style={{ ['--chip']: chipColor[tone] } as React.CSSProperties}
    >
      {children}
    </span>
  )
}
