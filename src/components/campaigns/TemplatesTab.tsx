import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, AlertCircle, Loader2, RefreshCw, Copy, FileText, MoreHorizontal } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'
import { templatesApi } from '@/services/api'
import { TemplateCreator } from './TemplateCreator'
import { TemplatePreview } from './TemplatePreview'
import { CATEGORY_LABELS } from './constants'
import { ConfirmModal } from '@/components/ui/Modal'
import { WhatsappLineChip } from '@/components/common/WhatsappLineChip'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { DuplicateTemplateModal } from '@/components/common/DuplicateTemplateModal'
import { LineFilterChip, lineMatches, type LineFilterValue } from '@/components/common/LineFilterChip'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { WhatsAppTemplate, TemplateStatus } from '@/types'

// `chip`/`icon` por status saíram junto com o `.color-chip` sólido — o chip
// virou STATUS_CHIP_CLASS (TPL-05), sem ícone.
const STATUS_CONFIG: Record<TemplateStatus, { label: string }> = {
  PENDING:  { label: 'Em análise' },
  APPROVED: { label: 'Aprovado' },
  REJECTED: { label: 'Rejeitado' },
  PAUSED:   { label: 'Pausado' },
  DISABLED: { label: 'Desativado' },
}

// TPL-05 (spec 2c): chip suave (fundo tinta + texto colorido), sem ícone —
// mesmo padrão do statusChip de CampaignsTab.tsx, chip "Aprovado · Meta".
const STATUS_CHIP_CLASS: Record<TemplateStatus, string> = {
  APPROVED: 'bg-status-active-bg text-status-active',
  PENDING:  'bg-status-pending-bg text-status-pending',
  REJECTED: 'bg-danger/10 text-danger',
  PAUSED:   'bg-surface-900 border border-surface-700 text-surface-400',
  DISABLED: 'bg-danger/10 text-danger',
}

const FILTER_OPTIONS: { value: TemplateStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todos' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'PENDING',  label: 'Em análise' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'PAUSED',   label: 'Pausados' },
]

export function TemplatesTab({ onCountChange }: { onCountChange?: (n: number) => void } = {}) {
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

  // SCRUM-1106 (tela 2c): contagem no rótulo da aba, no CampaignsPage.
  useEffect(() => { onCountChange?.(templates.length) }, [templates.length, onCountChange])

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
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-700 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar template..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <SegmentedControl
          options={FILTER_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          label="Filtrar templates por status"
        />

        <LineFilterChip value={lineFilter} onChange={setLineFilter} />

        <Button
          variant="secondary"
          onClick={handleSync}
          disabled={syncing}
          title="Importar da Meta e atualizar status dos templates"
          leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />}
        >
          Sincronizar
        </Button>

        <Button
          variant="neutral"
          onClick={() => { if (!hasWhatsappLine) return; setEditing(null); setDrawerOpen(true) }}
          disabled={!hasWhatsappLine}
          title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar templates' : undefined}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo template
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <SkeletonList items={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum template encontrado"
            action={
              templates.length === 0 && hasWhatsappLine
                ? { label: 'Criar primeiro template', onClick: () => { setEditing(null); setDrawerOpen(true) } }
                : undefined
            }
          />
        ) : (
          // SCRUM-1106 (tela 2c): grade de 4 cards — a lista virou linhas
          // densas demais pra caber num card estreito, então a prévia some
          // de vista; o mock quer a mensagem visível de cara.
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            className="bg-surface-900 rounded-2xl border border-surface-700 p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-100">{previewTemplate.name}</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                aria-label="Fechar"
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
  const [menuOpen, setMenuOpen] = useState(false)
  const metaBits = [
    CATEGORY_LABELS[template.category],
    template.language,
    template.buttons && template.buttons.length > 0 ? `${template.buttons.length} botã${template.buttons.length === 1 ? 'o' : 'oes'}` : null,
    template.bodyVariables && template.bodyVariables.length > 0 ? `${template.bodyVariables.length} variáve${template.bodyVariables.length === 1 ? 'l' : 'is'}` : null,
  ].filter(Boolean)

  return (
    // TPL-02: card sem hover, borda --bd (surface-700, visível no claro), raio 8px (rounded-lg).
    <div className="flex flex-col bg-surface-800 border border-surface-700 rounded-lg overflow-hidden group">
      {/* Header — TPL-03: 2 linhas (nome+chip+menu / meta), TPL-04/05/06. */}
      <div className="flex flex-col gap-1 px-3 py-2.5 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <span className="flex-1 min-w-0 text-xs font-medium text-surface-100 font-mono truncate">{template.name}</span>
          <span className={cn('inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-shrink-0', STATUS_CHIP_CLASS[template.status])}>
            {cfg.label}
          </span>
          <span onClick={(e) => e.stopPropagation()} className="inline-flex flex-shrink-0">
            <Dropdown
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              align="right"
              className="w-48"
              anchor={
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Mais ações"
                  className="p-1 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700 transition-all"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              }
            >
              <div className="px-1 py-1 flex flex-col gap-0.5">
                <DropdownItem onClick={() => { onPreview(); setMenuOpen(false) }}>
                  <Eye className="w-3.5 h-3.5" /> Preview
                </DropdownItem>
                {canEdit && (
                  <DropdownItem onClick={() => { onEdit(); setMenuOpen(false) }}>
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </DropdownItem>
                )}
                {template.needsWabaAssignment && (
                  <DropdownItem onClick={() => { onAssignWaba(); setMenuOpen(false) }}>
                    <FileText className="w-3.5 h-3.5" /> Atribuir linha WhatsApp
                  </DropdownItem>
                )}
                {onDuplicate && (
                  <DropdownItem onClick={() => { onDuplicate(); setMenuOpen(false) }}>
                    <Copy className="w-3.5 h-3.5" /> Duplicar para outra linha
                  </DropdownItem>
                )}
                <DropdownItem danger disabled={deleting} onClick={() => { onDelete(); setMenuOpen(false) }}>
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Excluir
                </DropdownItem>
              </div>
            </Dropdown>
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-surface-500 truncate">{metaBits.join(' · ')}</span>
          <WhatsappLineChip whatsappNumberId={template.whatsappNumberId} />
          <span className="ml-auto text-[11px] text-surface-600 flex-shrink-0">{new Date(template.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* Corpo — prévia em fundo #EFE7DD (hex fixo, mockup do WhatsApp) */}
      <button
        onClick={onPreview}
        className="bg-[#EFE7DD] p-3 max-h-[220px] overflow-y-auto text-left cursor-zoom-in"
        title="Ver prévia completa"
      >
        <TemplatePreview template={template} compact variant="card" />
      </button>

      {/* Rodapé — só o motivo de rejeição, quando existe (TPL-06: meta virou linha 2 do header). */}
      {template.status === 'REJECTED' && template.rejectionReason && (
        <p className="px-3 py-2 text-[11px] text-danger flex items-start gap-1 line-clamp-2">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {template.rejectionReason}
        </p>
      )}
    </div>
  )
}
