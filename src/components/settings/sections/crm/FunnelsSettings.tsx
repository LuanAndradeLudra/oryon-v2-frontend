import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, Star } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { CreatePipelineModal, type CreatePipelineData } from '@/components/deals/CreatePipelineModal'
import { PipelineStagesManager } from './PipelineStagesManager'
import { PipelineSalesSettings } from './PipelineSalesSettings'
import { PipelineCloseReasonsManager } from './PipelineCloseReasonsManager'
import { PipelineAccessManager } from './PipelineAccessManager'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage, getDefaultPipeline, cn } from '@/lib/utils'
import { pipelinesApi } from '@/services/api'
import { pipelineKindOption, pipelineKindOf } from '@/lib/pipelineKinds'

/**
 * Tela "Funis" em Configurações → CRM (B5/SCRUM-931) — substitui "Estágios do
 * funil". Único lugar que cria/renomeia/exclui/arquiva um funil (P13: sai da
 * tela de operação, `/contacts` só usa); por funil, reúne etapas, a seção
 * Vendas (escondida em processo), motivos de fechamento editáveis e acesso
 * por setor. Consome `CRMConfigContext` como fonte única — fim dos dois
 * caches divergentes (contexto × estado local de `ContactsPage`) que faziam
 * uma etapa renomeada sumir do chip do chat.
 */
export function FunnelsSettings() {
  const { pipelines, loadingPipelines, refetchPipelines } = useCRMConfig()
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  const canManage = isAdminTier(actor?.role)

  const [selectedId, setSelectedId] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)

  useEffect(() => {
    if (pipelines.length === 0) { setSelectedId(''); return }
    if (selectedId && pipelines.some((p) => p.id === selectedId)) return
    setSelectedId(getDefaultPipeline(pipelines)?.id ?? pipelines[0]?.id ?? '')
  }, [pipelines, selectedId])

  const selected = pipelines.find((p) => p.id === selectedId) ?? null
  const isSales = pipelineKindOf(selected) === 'sales'
  const kindOption = pipelineKindOption(pipelineKindOf(selected))

  const handleCreate = async (data: CreatePipelineData) => {
    let created
    try {
      created = (await pipelinesApi.create({ name: data.name, color: data.color, kind: data.kind, stages: data.stages })).data
    } catch (e: unknown) {
      throw new Error(getApiErrorMessage(e, 'Erro ao criar funil.'))
    }
    setSelectedId(created.id)
    refetchPipelines()
    toast('Funil criado. Adicione o primeiro contato para começar.', 'success')
  }

  const handleEdit = async (data: CreatePipelineData) => {
    if (!selected) return
    try {
      await pipelinesApi.update(selected.id, { name: data.name, color: data.color })
    } catch (e: unknown) {
      throw new Error(getApiErrorMessage(e, 'Erro ao editar funil.'))
    }
    refetchPipelines()
    toast('Funil atualizado.', 'success')
  }

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await pipelinesApi.remove(selected.id)
      toast('Funil excluído.', 'success')
      setDeleteConfirmOpen(false)
      setSelectedId('')
      refetchPipelines()
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Erro ao excluir funil.'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleArchive = async () => {
    if (!selected) return
    setArchiving(true)
    try {
      await pipelinesApi.update(selected.id, { isArchived: !selected.isArchived })
      toast(selected.isArchived ? 'Funil desarquivado.' : 'Funil arquivado.', 'success')
      refetchPipelines()
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Erro ao alterar arquivamento do funil.'), 'error')
    } finally {
      setArchiving(false)
    }
  }

  const handleSetDefault = async () => {
    if (!selected) return
    setSettingDefault(true)
    try {
      await pipelinesApi.setDefault(selected.id)
      toast('Funil definido como padrão.', 'success')
      refetchPipelines()
    } catch (e: unknown) {
      toast(getApiErrorMessage(e, 'Erro ao definir funil padrão.'), 'error')
    } finally {
      setSettingDefault(false)
    }
  }

  if (loadingPipelines) {
    return <p className="text-sm text-surface-500 text-center py-10">Carregando…</p>
  }

  return (
    <>
      <SettingsSection
        title="Funis"
        description="Cada funil tem etapas, motivos de fechamento e acesso por setor próprios."
      >
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs font-semibold text-surface-400 mb-1.5 block">Funil</label>
            <div className="relative w-full sm:w-72">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none bg-surface-800 border border-surface-700 rounded-lg py-2 pl-3 pr-8 text-sm text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/60 transition-colors"
              >
                {pipelines.length === 0 && <option value="">Nenhum funil ainda</option>}
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}{p.isArchived ? ' (arquivado)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {selected && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full mb-0.5 bg-surface-800 border border-surface-700 text-surface-300"
              title={kindOption.description}
            >
              <kindOption.icon className="w-3 h-3" /> {kindOption.label}
            </span>
          )}
          {selected?.isArchived && (
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-full mb-0.5 color-chip border"
              style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
            >
              Arquivado
            </span>
          )}

          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              {selected && (
                <button
                  onClick={() => setEditOpen(true)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-all')}
                >
                  <Pencil className="w-3.5 h-3.5" /> Renomear / cor
                </button>
              )}
              {selected && !selected.isDefault && (
                <button
                  onClick={handleSetDefault}
                  disabled={settingDefault}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 disabled:opacity-50 transition-all"
                >
                  <Star className="w-3.5 h-3.5" />
                  {settingDefault ? 'Salvando...' : 'Tornar padrão'}
                </button>
              )}
              {selected && (
                <button
                  onClick={handleToggleArchive}
                  disabled={archiving}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 disabled:opacity-50 transition-all"
                >
                  {selected.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  {archiving ? 'Salvando...' : selected.isArchived ? 'Desarquivar' : 'Arquivar'}
                </button>
              )}
              {selected && !selected.isDefault && (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-red-400 hover:bg-red-900/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              )}
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Novo funil
              </button>
            </div>
          )}
        </div>
      </SettingsSection>

      {selected && (
        <>
          <SettingsSection title="Etapas" description="Reordene, defina a probabilidade default e os terminais (Ganho/Perdido).">
            <PipelineStagesManager pipeline={selected} onChanged={refetchPipelines} />
          </SettingsSection>

          {isSales && (
            <SettingsSection title="Vendas" description="Dono padrão do negócio e multiplicidade — só existem em funil de vendas.">
              <PipelineSalesSettings pipeline={selected} onChanged={refetchPipelines} />
            </SettingsSection>
          )}

          <SettingsSection title="Motivos de fechamento" description="Editáveis por tenant; desativar tira o motivo dos modais sem apagar histórico.">
            <PipelineCloseReasonsManager pipeline={selected} onChanged={refetchPipelines} />
          </SettingsSection>

          <SettingsSection title="Acesso" description="Setores que enxergam este funil no board, nos chips e nos eventos.">
            <PipelineAccessManager pipeline={selected} onChanged={refetchPipelines} />
          </SettingsSection>
        </>
      )}

      <CreatePipelineModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} tenantId={actor?.tenantId} />
      <CreatePipelineModal open={editOpen} onClose={() => setEditOpen(false)} onSave={handleEdit} editPipeline={selected} tenantId={actor?.tenantId} />
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Excluir funil"
        description={`Tem certeza que deseja excluir "${selected?.name}"? Só é possível excluir funis sem negócios.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
