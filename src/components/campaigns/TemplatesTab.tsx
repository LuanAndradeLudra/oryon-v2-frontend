import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, Clock, CheckCircle2, XCircle, PauseCircle, AlertCircle, Loader2, RefreshCw, Copy } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { cn } from '@/lib/utils'
import { templatesApi } from '@/services/api'
import { TemplateCreator } from './TemplateCreator'
import { TemplatePreview } from './TemplatePreview'
import { CATEGORY_LABELS } from './constants'
import { ConfirmModal } from '@/components/ui/Modal'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { DuplicateTemplateModal } from '@/components/common/DuplicateTemplateModal'
import { LineFilterChip, lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { WhatsAppTemplate, TemplateStatus } from '@/types'

const STATUS_CONFIG: Record<TemplateStatus, { label: string; chip: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING:  { label: 'Em análise',  chip: 'var(--color-status-pending)',  icon: Clock },
  APPROVED: { label: 'Aprovado',    chip: 'var(--color-status-active)', icon: CheckCircle2 },
  REJECTED: { label: 'Rejeitado',   chip: 'var(--color-danger)', icon: XCircle },
  PAUSED:   { label: 'Pausado',     chip: 'var(--color-status-muted)', icon: PauseCircle },
  DISABLED: { label: 'Desativado',  chip: 'var(--color-danger)', icon: AlertCircle },
}

const FILTER_OPTIONS: { value: TemplateStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todos' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'PENDING',  label: 'Em análise' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'PAUSED',   label: 'Pausados' },
]

export function TemplatesTab() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [metaLoadWarning, setMetaLoadWarning] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Must be declared with the other hooks, NOT after the `drawerOpen` early
  // return below — otherwise when drawerOpen=true we render one fewer hook
  // and React throws "Rendered fewer hooks than expected", crashing the tab.
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [assignWabaTarget, setAssignWabaTarget] = useState<WhatsAppTemplate | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<WhatsAppTemplate | null>(null)
  const [lineFilter, setLineFilter] = useState<LineFilterValue>('all')
  // Show the "duplicate to line" action only in multi-WABA tenants —
  // single-line tenants have nowhere else to clone to.
  const { numbers: waLines, loading: waLoading } = useWorkspaceNumber()
  // Backend rejects create_template with 400 when zero lines exist —
  // we block the UI here to fail fast (no form fill-in wasted).
  const hasWhatsappLine = waLines.length > 0

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setMetaLoadWarning(null)
    try {
      const pull = await templatesApi.pullFromMeta()
      if (pull.data.errors.length > 0) {
        setMetaLoadWarning(pull.data.errors.join(' '))
      } else if (pull.data.imported > 0) {
        setMetaLoadWarning(null)
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMetaLoadWarning(
        typeof msg === 'string' && msg.trim()
          ? msg
          : 'Não foi possível carregar templates da Meta. Exibindo apenas os salvos localmente.',
      )
    }
    try {
      const r = await templatesApi.list()
      setTemplates(r.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await templatesApi.sync()
      fetchTemplates()
    } finally {
      setSyncing(false)
    }
  }

  const handleSaved = (tpl: WhatsAppTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id)
      return idx >= 0 ? prev.map((t) => t.id === tpl.id ? tpl : t) : [tpl, ...prev]
    })
    setDrawerOpen(false)
    setEditing(null)
  }

  // When creator mode is active, render it full-page instead of normal tab content
  if (drawerOpen) {
    return (
      <TemplateCreator
        editing={editing}
        onCancel={() => { setDrawerOpen(false); setEditing(null) }}
        onSaved={handleSaved}
      />
    )
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget)
    setDeleteError(null)
    try {
      await templatesApi.delete(deleteTarget)
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget))
      setDeleteTarget(null)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setDeleteError(typeof msg === 'string' ? msg : 'Não foi possível excluir o template.')
    } finally {
      setDeleting(null)
    }
  }

  const canEditTemplate = (tpl: WhatsAppTemplate) =>
    tpl.status === 'REJECTED' || (tpl.status === 'PENDING' && !!tpl.rejectionReason)

  // Local filter via LineFilterChip. Rows without a whatsappNumberId
  // (legacy, Migration #045) stay visible so the badge + modal can
  // resolve them — hiding them would make the gap invisible.
  const filtered = templates.filter((t) => {
    if (!lineMatches(lineFilter, { whatsappNumberId: t.whatsappNumberId })) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* WhatsApp gate banner */}
      {!waLoading && !hasWhatsappLine && (
        <div className="px-5 pt-4">
          <WhatsappLineRequiredBanner resource="templates WhatsApp" />
        </div>
      )}

      {metaLoadWarning && hasWhatsappLine && (
        <Banner variant="warning" className="mx-5 mt-4">{metaLoadWarning}</Banner>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar template..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                statusFilter === f.value
                  ? 'bg-surface-700 text-surface-100'
                  : 'text-surface-500 hover:text-surface-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <LineFilterChip value={lineFilter} onChange={setLineFilter} />

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-300 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          title="Importar da Meta e atualizar status dos templates"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          Sincronizar
        </button>

        <button
          onClick={() => { if (!hasWhatsappLine) return; setEditing(null); setDrawerOpen(true) }}
          disabled={!hasWhatsappLine}
          title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar templates' : undefined}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-medium rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" />
          Novo template
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm text-surface-500">Nenhum template encontrado</p>
            {templates.length === 0 && hasWhatsappLine && (
              <button
                onClick={() => { setEditing(null); setDrawerOpen(true) }}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Criar primeiro template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onPreview={() => setPreviewTemplate(tpl)}
                onEdit={() => { setEditing(tpl); setDrawerOpen(true) }}
                canEdit={canEditTemplate(tpl)}
                onDelete={() => setDeleteTarget(tpl.id)}
                onAssignWaba={() => setAssignWabaTarget(tpl)}
                onDuplicate={waLines.length > 1 ? () => setDuplicateTarget(tpl) : undefined}
                deleting={deleting === tpl.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-surface-900 rounded-2xl border border-surface-800 p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-100">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
              >
                ×
              </button>
            </div>
            <TemplatePreview template={previewTemplate} />
          </div>
        </div>
      )}

      {deleteError && (
        <Banner variant="danger" className="mx-5 mb-2">{deleteError}</Banner>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
        onConfirm={handleDelete}
        title="Excluir template"
        description="O template será removido do Oryon e da Meta (quando possível). Campanhas que já usaram este template não são afetadas retroativamente."
        confirmLabel="Excluir template"
        danger
        loading={!!deleting}
      />

      {assignWabaTarget && (
        <AssignWabaModal
          resourceType="template"
          resourceId={assignWabaTarget.id}
          resourceName={assignWabaTarget.name}
          currentNumberId={assignWabaTarget.whatsappNumberId}
          onClose={() => setAssignWabaTarget(null)}
          onSaved={() => {
            setAssignWabaTarget(null)
            fetchTemplates()
          }}
        />
      )}

      {duplicateTarget && (
        <DuplicateTemplateModal
          template={duplicateTarget}
          onClose={() => setDuplicateTarget(null)}
          onDuplicated={() => {
            setDuplicateTarget(null)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}

function TemplateCard({
  template,
  onPreview,
  onEdit,
  onDelete,
  onAssignWaba,
  onDuplicate,
  canEdit,
  deleting,
}: {
  template: WhatsAppTemplate
  onPreview: () => void
  onEdit: () => void
  onDelete: () => void
  onAssignWaba: () => void
  /** Only set in multi-WABA tenants — undefined hides the button. */
  onDuplicate?: () => void
  canEdit: boolean
  deleting: boolean
}) {
  const cfg = STATUS_CONFIG[template.status]
  const StatusIcon = cfg.icon

  return (
    <div className="flex items-start gap-4 p-4 bg-surface-800/50 hover:bg-surface-800 border border-surface-800 rounded-xl transition-all group">
      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium text-surface-100 font-mono">{template.name}</span>
          <span
            className="color-chip border flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ ['--chip']: cfg.chip } as React.CSSProperties}
          >
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </span>
          <span className="text-[11px] text-surface-500 bg-surface-700 px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[template.category]}
          </span>
          <span className="text-[11px] text-surface-600">{template.language}</span>
          {template.needsWabaAssignment && <WabaAssignmentBadge onClick={onAssignWaba} />}
          <WhatsappLineChip whatsappNumberId={template.whatsappNumberId} />
        </div>

        <p className="text-xs text-surface-400 line-clamp-2 mt-1">
          {template.body}
        </p>

        {template.status === 'REJECTED' && template.rejectionReason && (
          <p className="text-[11px] text-danger mt-1.5 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {template.rejectionReason}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {template.bodyVariables && template.bodyVariables.length > 0 && (
            <span className="text-[11px] text-surface-500">
              {template.bodyVariables.length} variáve{template.bodyVariables.length === 1 ? 'l' : 'is'}
            </span>
          )}
          {template.buttons && template.buttons.length > 0 && (
            <span className="text-[11px] text-surface-500">
              {template.buttons.length} botã{template.buttons.length === 1 ? 'o' : 'oes'}
            </span>
          )}
          <span className="text-[11px] text-surface-600">
            {new Date(template.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onPreview}
          className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-all"
          title="Preview"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        {canEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-all"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-all"
            title="Duplicar para outra linha"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-1.5 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-all"
          title="Excluir"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}
