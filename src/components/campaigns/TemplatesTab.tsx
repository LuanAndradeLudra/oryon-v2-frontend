// ─── TemplatesTab ──────────────────────────────────────────────────────────
// Casca da Biblioteca de templates (D4/SCRUM-1023). O que é BIBLIOTECA — rail
// de facetas, grade, cards — mora em `library/TemplateLibrary`. O que é FLUXO
// fica aqui: carregar da Meta, o criador em tela cheia, e os modais de
// atribuir linha, duplicar e excluir.
//
// A divisão mantém o ponto de montagem em `CampaignsPage.tsx` inalterado —
// arquivo congelado, de outro dono, que continua importando `TemplatesTab`.
//
// O modal de prévia saiu: o card da Biblioteca JÁ é a prévia, no tema escuro
// do WhatsApp. Com ele foi embora o único `fixed inset-0` cru fora de `ui/`
// que este arquivo tinha (Carta §1).
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { templatesApi } from '@/services/api'
import { TemplateCreator } from './TemplateCreator'
import { TemplateLibrary } from './library/TemplateLibrary'
import { ConfirmModal } from '@/components/ui/Modal'
import { AssignWabaModal } from '@/components/common/AssignWabaModal'
import { DuplicateTemplateModal } from '@/components/common/DuplicateTemplateModal'
import { WhatsappLineRequiredBanner } from '@/components/shared/WhatsappLineRequiredBanner'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { WhatsAppTemplate } from '@/types'

export function TemplatesTab() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [metaLoadWarning, setMetaLoadWarning] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Declarado com os outros hooks, NÃO depois do early return do `drawerOpen`
  // abaixo — senão com o criador aberto renderizaríamos um hook a menos e o
  // React derruba a aba com "Rendered fewer hooks than expected".
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [assignWabaTarget, setAssignWabaTarget] = useState<WhatsAppTemplate | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<WhatsAppTemplate | null>(null)
  const { numbers: waLines, loading: waLoading } = useWorkspaceNumber()
  // O backend recusa `create_template` com 400 quando não há nenhuma linha —
  // travar aqui evita o formulário preenchido à toa.
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

  // Com o criador ativo ele ocupa a página inteira, no lugar do conteúdo da aba.
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

  return (
    <div className="flex flex-col h-full">
      {!waLoading && !hasWhatsappLine && (
        <div className="px-5 pt-4">
          <WhatsappLineRequiredBanner resource="templates WhatsApp" />
        </div>
      )}

      {metaLoadWarning && hasWhatsappLine && (
        <Banner variant="warning" className="mx-5 mt-4">{metaLoadWarning}</Banner>
      )}

      {deleteError && (
        <Banner variant="danger" className="mx-5 mt-4">{deleteError}</Banner>
      )}

      {/* Busca, situação e linha saíram desta barra: viraram grupos do rail,
          onde cada opção mostra quantos há nela. A barra fica só com as duas
          ações que o mockup desenha no TopBar. */}
      <div className="flex items-center justify-end gap-3 px-5 py-4 border-b border-surface-800 flex-shrink-0">
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
          onClick={() => { if (!hasWhatsappLine) return; setEditing(null); setDrawerOpen(true) }}
          disabled={!hasWhatsappLine}
          title={!hasWhatsappLine ? 'Conecte uma linha WhatsApp antes de criar templates' : undefined}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Novo template
        </Button>
      </div>

      <TemplateLibrary
        templates={templates}
        loading={loading}
        canCreate={hasWhatsappLine}
        onCreate={() => { setEditing(null); setDrawerOpen(true) }}
        onEdit={(tpl) => { setEditing(tpl); setDrawerOpen(true) }}
        // Sem BE.8 a reescrita com IA não existe; o destino honesto é o
        // criador já preenchido com o recusado e o motivo da Meta à vista,
        // que é onde a sugestão do BE.8 também vai cair quando ele chegar
        // (Decisão D15: `rewrite` não persiste nada).
        onRewrite={(tpl) => { setEditing(tpl); setDrawerOpen(true) }}
        onUse={(tpl) => navigate(`/campaigns/new?template=${encodeURIComponent(tpl.id)}`)}
        onDelete={(tpl) => setDeleteTarget(tpl.id)}
        onDuplicate={(tpl) => setDuplicateTarget(tpl)}
        onAssignWaba={(tpl) => setAssignWabaTarget(tpl)}
        deletingId={deleting}
      />

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
