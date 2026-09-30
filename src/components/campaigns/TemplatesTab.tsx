import { useEstadoNaUrl, lerUmDe } from '@/hooks/useEstadoNaUrl'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, AlertCircle, Loader2, RefreshCw, Copy, FileText } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { templatesApi } from '@/services/api'
import { TemplateCreator } from './TemplateCreator'
import { TemplatePreview } from './TemplatePreview'
import { TemplateCategoryTile, TEMPLATE_CATEGORIES } from './templateCategory'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { useMediaQuery } from '@/hooks/useMediaQuery'
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
  APPROVED: 'color-chip-soft border [--chip:var(--color-status-active)]',
  PENDING:  'color-chip-soft border [--chip:var(--color-status-pending)]',
  REJECTED: 'color-chip-soft border [--chip:var(--color-danger)]',
  PAUSED:   'bg-surface-900 border border-surface-700 text-surface-400',
  DISABLED: 'color-chip-soft border [--chip:var(--color-danger)]',
}

const FILTER_OPTIONS: { value: TemplateStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'Todos' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'PENDING',  label: 'Em análise' },
  { value: 'REJECTED', label: 'Rejeitados' },
  { value: 'PAUSED',   label: 'Pausados' },
]

const lerStatusModelo = lerUmDe(['all', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED'] as const, 'all')

export function TemplatesTab({ onCountChange }: { onCountChange?: (n: number) => void } = {}) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  // Busca, status, linha e o modelo em prévia na URL (regra do PO).
  const [search, setSearch] = useEstadoNaUrl<string>('busca', { padrao: '' })
  const [statusFilter, setStatusFilter] = useEstadoNaUrl<TemplateStatus | 'all'>('status', { padrao: 'all', ler: lerStatusModelo })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null)
  const [previewId, setPreviewId] = useEstadoNaUrl<string>('modelo', { padrao: '' })
  const previewTemplate = previewId ? templates.find((t) => t.id === previewId) ?? null : null
  const setPreviewTemplate = (t: WhatsAppTemplate | null) => setPreviewId(t?.id ?? '')
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
  const [lineFilter, setLineFilter] = useEstadoNaUrl<LineFilterValue>('linha', { padrao: 'all' })
  // Responsivo: o painel de detalhe (abaixo) só aparece a partir de `lg`
  // (1024px, mesmo breakpoint do `hidden lg:block` dele). Abaixo disso não
  // sobra NENHUM jeito de ver a prévia do modelo — o modal de prévia antigo
  // saiu junto com o redesenho da lista+painel — então essa media query
  // decide quando abrir a mesma <TemplateDetail> dentro de um Modal.
  const belowLg = useMediaQuery('(max-width: 1023px)')
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

  // Compartilhado entre o painel fixo (≥lg) e o Modal (<lg, abaixo) — mesmo
  // componente, mesmas props, só o contêiner muda por viewport.
  const detailContent = (
    <TemplateDetail
      template={previewTemplate}
      canEdit={previewTemplate ? canEditTemplate(previewTemplate) : false}
      onEdit={() => { if (previewTemplate) { setEditing(previewTemplate); setDrawerOpen(true) } }}
      onDelete={() => { if (previewTemplate) setDeleteTarget(previewTemplate.id) }}
      onAssignWaba={() => { if (previewTemplate) setAssignWabaTarget(previewTemplate) }}
      onDuplicate={waLines.length > 1 && previewTemplate ? () => setDuplicateTarget(previewTemplate) : undefined}
      deleting={!!previewTemplate && deleting === previewTemplate.id}
    />
  )

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

      {/* Toolbar. flex-wrap (mesmo achado do KpiGrid.tsx/SCRUM-1070): busca +
          SegmentedControl + LineFilterChip + 2 botões não cabem em 390px sem
          quebrar linha — sem isto o container cortava o botão fora da tela
          em vez de rolar. */}
      <div className="flex items-center gap-3 flex-wrap px-5 py-4 border-b border-surface-700 flex-shrink-0">
        <div className="relative flex-1 max-w-xs min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar template..."
            className="w-full h-7 bg-surface-800 border border-[var(--bd2)] rounded-sm pl-8 pr-3 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
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

      {/* Conteúdo — lista + detalhe (SCRUM-1097, 22/09).
          A grade de 4 cards saiu: os gerenciadores de modelo do mercado
          (Twilio Content Template Builder, WhatsApp Manager da própria Meta)
          são LISTA com busca e filtros, não mosaico de prévias. A prévia não
          se perde — ganha um painel fixo à direita, que mostra o modelo
          inteiro em vez do pedaço que cabia dentro do card. */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 overflow-y-auto">
          {loading ? (
            <div className="p-5"><SkeletonList items={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={FileText}
                title={templates.length === 0 ? 'Nenhum modelo ainda' : 'Nenhum modelo com esses filtros'}
                hint={templates.length === 0
                  ? 'Modelos são as mensagens aprovadas pela Meta que você pode disparar a qualquer momento.'
                  : 'Ajuste a busca, o status ou a linha para ver mais.'}
                action={
                  templates.length === 0 && hasWhatsappLine
                    ? { label: 'Criar primeiro modelo', onClick: () => { setEditing(null); setDrawerOpen(true) } }
                    : templates.length > 0
                      ? { label: 'Limpar filtros', onClick: () => { setSearch(''); setStatusFilter('all'); setLineFilter('all') } }
                      : undefined
                }
              />
            </div>
          ) : (
            <div role="list">
              {filtered.map((tpl) => (
                <TemplateRow
                  key={tpl.id}
                  template={tpl}
                  selecionado={previewTemplate?.id === tpl.id}
                  onSelect={() => setPreviewTemplate(tpl)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Painel de detalhe. Ponto de quebra em `lg` (1024), não `xl`: medi
            em 1240px — largura de notebook comum — e com `xl` o painel sumia
            e, como o modal de prévia saiu, NÃO sobrava jeito nenhum de ver o
            modelo. Abaixo de 1024 o painel vira Modal (ver `belowLg` abaixo
            — achado da responsividade, R2/T7). */}
        <div className="hidden lg:block w-[360px] xl:w-[392px] flex-none border-l border-surface-700 overflow-y-auto bg-surface-900">
          {detailContent}
        </div>
      </div>

      {/* Abaixo de lg não há painel lateral (some via `hidden lg:block` acima)
          — sem isto, tablet/celular não tinham NENHUM jeito de ver a prévia
          do modelo (o antigo modal de prévia foi removido no redesenho da
          lista+painel). Mesmo <TemplateDetail>, sem mudar o visual dele —
          só o contêiner muda de painel fixo pra modal. */}
      <Modal
        open={belowLg && !!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={<span className="sr-only">Detalhe do modelo</span>}
        aria-label="Detalhe do modelo"
        bodyClassName="p-0"
        className="max-w-md"
      >
        {detailContent}
      </Modal>

      {deleteError && (
        <Banner variant="danger" className="mx-5 mb-2">{deleteError}</Banner>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null) }}
        onConfirm={handleDelete}
        title="Excluir template"
        description="O template será removido do Oryon e da Meta (quando possível). Campanhas que já usaram este template não são afetadas retroativamente."
        impact={(() => {
          const tpl = templates.find((t) => t.id === deleteTarget)
          return tpl ? { label: `Template "${tpl.name}"`, tone: 'danger' as const } : undefined
        })()}
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

/** Trecho do corpo em uma linha — ajuda a reconhecer o modelo sem abri-lo,
 *  que era a única vantagem real da grade de prévias. */
function resumoCorpo(body: string): string {
  return body.replace(/\*(.*?)\*/g, '$1').replace(/\s+/g, ' ').trim()
}

function TemplateRow({ template, selecionado, onSelect }: {
  template: WhatsAppTemplate
  selecionado: boolean
  onSelect: () => void
}) {
  const cfg = STATUS_CONFIG[template.status]
  return (
    <button
      role="listitem"
      onClick={onSelect}
      aria-current={selecionado}
      className={cn(
        'w-full flex items-center gap-2.5 h-11 px-4 border-b border-surface-700 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:-outline-offset-1',
        selecionado ? 'bg-[var(--rowhover)]' : 'hover:bg-[var(--rowhover)]',
      )}
    >
      {/* Barra de seleção: ocupa lugar sempre, para o texto não deslocar. */}
      <span className={cn('w-[2px] h-5 rounded-full flex-none', selecionado ? 'bg-brand-500' : 'bg-transparent')} />
      <TemplateCategoryTile category={template.category} size={22} />
      {/* Medido ao vivo em 390px: max-w-210px fixo deixava só 22px pro
          resumo (invisível na prática). Abaixo de sm o nome cede espaço
          (55% da linha) pro resumo aparecer; a partir de sm volta aos
          210px de sempre. */}
      <span className="text-[12.5px] font-semibold text-surface-100 truncate max-w-[55%] sm:max-w-[210px] flex-none">
        {template.name}
      </span>
      {/* Medido ao vivo: em 390px quem não cabe não é o nome (195px, já
          abaixo do teto) — é o resumo, sem espaço sobrando ao lado do chip
          de 74px. Opção (a) escolhida: resumo é reforço de reconhecimento,
          a mensagem inteira já aparece no painel/Modal de detalhe. */}
      <span className="hidden sm:block text-xs text-surface-500 truncate flex-1 min-w-0">{resumoCorpo(template.body)}</span>
      {template.needsWabaAssignment && (
        <AlertCircle className="w-3.5 h-3.5 text-warning flex-none" aria-label="Sem linha WhatsApp atribuída" />
      )}
      {/* Responsivo: idioma e data somem abaixo de `sm` (640) — nada de
          fixo pra encolher sobrava na linha em 390px (soma das larguras
          fixas passava de 300px antes mesmo do nome). Nome + resumo +
          chip de status continuam sempre visíveis (o essencial). */}
      <span className="hidden sm:block text-[11px] text-surface-500 tabular-nums flex-none w-12 text-right">{template.language}</span>
      <span className={cn('inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-none w-[74px] justify-center', STATUS_CHIP_CLASS[template.status])}>
        {cfg.label}
      </span>
      <span className="hidden sm:block text-[11px] text-surface-600 tabular-nums flex-none w-[62px] text-right">
        {new Date(template.createdAt).toLocaleDateString('pt-BR')}
      </span>
    </button>
  )
}

function LinhaMeta({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-t border-surface-700 first:border-t-0">
      <span className="text-[11px] text-surface-500 w-[72px] flex-none">{rotulo}</span>
      <span className="text-xs text-surface-200 min-w-0 truncate">{children}</span>
    </div>
  )
}

function TemplateDetail({ template, canEdit, onEdit, onDelete, onAssignWaba, onDuplicate, deleting }: {
  template: WhatsAppTemplate | null
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onAssignWaba: () => void
  onDuplicate?: () => void
  deleting: boolean
}) {
  if (!template) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
        <Eye className="w-5 h-5 text-surface-600" />
        <p className="text-xs text-surface-500">Selecione um modelo para ver como ele chega no WhatsApp.</p>
      </div>
    )
  }
  const cat = TEMPLATE_CATEGORIES[template.category]
  const cfg = STATUS_CONFIG[template.status]
  return (
    <div className="flex flex-col">
      <div className="px-4 py-3.5 border-b border-surface-700 flex items-start gap-2.5">
        <TemplateCategoryTile category={template.category} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-surface-50 truncate">{template.name}</p>
          <p className="text-[11px] text-surface-500">{cat.label} · {template.language}</p>
        </div>
        <span className={cn('inline-flex items-center h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-none', STATUS_CHIP_CLASS[template.status])}>
          {cfg.label}
        </span>
      </div>

      {template.status === 'REJECTED' && template.rejectionReason && (
        <Banner variant="danger" className="mx-4 mt-3">{template.rejectionReason}</Banner>
      )}

      <div className="px-4 py-3">
        <TemplatePreview template={template} />
      </div>

      <div className="px-4 pb-3">
        <LinhaMeta rotulo="Categoria">{cat.label}</LinhaMeta>
        <LinhaMeta rotulo="Idioma">{template.language}</LinhaMeta>
        <LinhaMeta rotulo="Linha">
          <WhatsappLineChip whatsappNumberId={template.whatsappNumberId} />
        </LinhaMeta>
        {template.bodyVariables && template.bodyVariables.length > 0 && (
          <LinhaMeta rotulo="Variáveis">{template.bodyVariables.join(' · ')}</LinhaMeta>
        )}
        {template.buttons && template.buttons.length > 0 && (
          <LinhaMeta rotulo="Botões">{template.buttons.map((b) => b.text).join(' · ')}</LinhaMeta>
        )}
        <LinhaMeta rotulo="Criado">{new Date(template.createdAt).toLocaleDateString('pt-BR')}</LinhaMeta>
      </div>

      <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        {canEdit && <Button size="sm" variant="neutral" onClick={onEdit} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Editar</Button>}
        {template.needsWabaAssignment && (
          <Button size="sm" variant="secondary" onClick={onAssignWaba} leftIcon={<FileText className="w-3.5 h-3.5" />}>Atribuir linha</Button>
        )}
        {onDuplicate && (
          <Button size="sm" variant="secondary" onClick={onDuplicate} leftIcon={<Copy className="w-3.5 h-3.5" />}>Duplicar</Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-danger"
          onClick={onDelete}
          disabled={deleting}
          leftIcon={deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        >
          Excluir
        </Button>
      </div>
    </div>
  )
}
