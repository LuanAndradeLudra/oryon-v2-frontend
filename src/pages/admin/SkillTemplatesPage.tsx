// ─── Skill Templates List (admin) ──────────────────────────────────────────
// Catalogue of skills the platform offers. Oryon staff CRUDs templates here
// and then assigns them to customer agents from /admin/skills/assign.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Sparkles, Loader2, AlertCircle, Edit3, Beaker, Power, PowerOff, Link2, CheckCircle2, X } from 'lucide-react'
import { listSkillTemplates, updateSkillTemplate } from '@/services/skillTemplatesApi'
import type { SkillTemplate } from '@/types/skills'
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
  // The Assign screen pushes navigation state on success — pluck it once,
  // then mirror locally so the banner survives client-side filter changes.
  const initialAssigned = (location.state as { assigned?: AssignedState } | null)?.assigned ?? null
  const [assignedBanner, setAssignedBanner] = useState<AssignedState | null>(initialAssigned)
  const [templates, setTemplates] = useState<SkillTemplate[]>([])
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
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-surface-950 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo template
          </button>
        </div>
      </header>

      {/* Success banner after attach */}
      {assignedBanner && (
        <div className="flex items-center gap-3 p-3 mb-5 rounded-lg bg-status-active-bg/40 border border-status-active-border text-sm">
          <CheckCircle2 className="w-5 h-5 text-status-active flex-shrink-0" />
          <p className="text-status-active flex-1">
            Skill atribuída com sucesso ao agente do cliente.
          </p>
          <button
            onClick={() => setAssignedBanner(null)}
            className="text-status-active hover:text-surface-100 transition-colors"
            aria-label="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="w-10 h-10 text-surface-600 mb-3" />
          <p className="text-surface-300 font-medium mb-1">Nenhum template encontrado</p>
          <p className="text-sm text-surface-500 mb-4">
            Crie o primeiro template para começar a oferecer skills aos clientes.
          </p>
          <button
            onClick={() => navigate('/admin/skill-templates/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-surface-950 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Criar template
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onEdit={() => navigate(`/admin/skill-templates/${t.id}`)}
            onTest={() => navigate(`/admin/skill-templates/${t.id}/test`)}
            onAssign={() => navigate(`/admin/skills/assign?templateId=${t.id}`)}
            onToggle={() => toggleEnabled(t)}
          />
        ))}
      </div>
      </div>
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
  onEdit,
  onTest,
  onAssign,
  onToggle,
}: {
  template: SkillTemplate
  onEdit: () => void
  onTest: () => void
  onAssign: () => void
  onToggle: () => void
}) {
  const isPublic = template.tenant_id === null
  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-colors',
        template.enabled
          ? 'bg-surface-900 border-surface-700 hover:border-surface-600'
          : 'bg-surface-900/40 border-surface-800 opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-semibold text-surface-100 truncate">
              {template.name}
            </h3>
            <Badge tone={template.enabled ? 'success' : 'muted'}>
              {template.enabled ? 'ativo' : 'desabilitado'}
            </Badge>
            <Badge tone={isPublic ? 'brand' : 'pending'}>
              {isPublic ? 'público' : 'privado'}
            </Badge>
            {template.mutates && (
              <Badge tone="danger">⚠ destrutivo</Badge>
            )}
          </div>
          <p className="text-xs text-surface-500 font-mono mb-2 truncate">
            {template.slug} · {CATEGORY_LABELS[template.category] ?? template.category}
          </p>
          <p className="text-sm text-surface-400 line-clamp-2">{template.description}</p>
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            onClick={onTest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs"
          >
            <Beaker className="w-3.5 h-3.5" /> Testar
          </button>
          {template.enabled && (
            <button
              onClick={onAssign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 text-xs"
            >
              <Link2 className="w-3.5 h-3.5" /> Atribuir
            </button>
          )}
          <button
            onClick={onToggle}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs',
              template.enabled
                ? 'bg-surface-800 hover:bg-surface-700 text-surface-300'
                : 'bg-status-active-bg hover:bg-status-active-bg/80 text-status-active',
            )}
          >
            {template.enabled
              ? <><PowerOff className="w-3.5 h-3.5" /> Desabilitar</>
              : <><Power className="w-3.5 h-3.5" /> Reativar</>}
          </button>
        </div>
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
  const cls: Record<typeof tone, string> = {
    success: 'bg-status-active-bg text-status-active ring-status-active-border',
    muted:   'bg-surface-800 text-surface-400 ring-surface-700',
    brand:   'bg-brand-600/15 text-brand-400 ring-brand-600/30',
    pending: 'bg-status-pending-bg text-status-pending ring-status-pending-border',
    danger:  'bg-danger/10 text-danger ring-danger/30',
  }
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ring-1', cls[tone])}>
      {children}
    </span>
  )
}
