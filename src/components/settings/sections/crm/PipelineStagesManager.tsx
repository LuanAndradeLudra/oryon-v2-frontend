import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Trophy, X, Archive, ArchiveRestore, Star } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Tooltip } from '@/components/ui/Tooltip'
import { PipelineStageModal } from '@/components/settings/modals/PipelineStageModal'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { useDragReorder } from '@/hooks/useDragReorder'
import { pipelinesApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage, getDefaultPipeline, cn } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, terminalLabelsOf } from '@/lib/pipelineKinds'
import type { Pipeline, PipelineStage } from '@/types'

interface PipelineStagesManagerProps {
  pipelines: Pipeline[]
  /** Chamado após qualquer criação/edição/exclusão/reordenação — o dono da
   *  lista de pipelines (ContactsPage) refaz o fetch, e o Kanban do funil
   *  selecionado reflete as mudanças imediatamente. */
  onChanged: () => void
  /** Funil a pré-selecionar ao montar (SCRUM-293) — usado pelo redirect
   *  "criar funil → configurar estágios" logo após a criação, pra abrir já
   *  no funil recém-criado em vez de cair no default do tenant. Ignorado se
   *  o id não existir em `pipelines` (mesmo fallback de sempre). */
  initialPipelineId?: string | null
}

/** Gerencia os estágios (colunas do Kanban) de UM funil de negócio por vez,
 *  escolhido pelo select acima da lista. Espelha StagesManager (estágios do
 *  ciclo de vida do contato), mas aponta para os endpoints de pipeline e usa
 *  isWon/isLost em vez de isTerminal. */
export function PipelineStagesManager({ pipelines, onChanged, initialPipelineId }: PipelineStagesManagerProps) {
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  const canManage = isAdminTier(actor?.role)

  const [pipelineId, setPipelineId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editStage, setEditStage] = useState<PipelineStage | null>(null)
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Sobrepõe `stages` logo após um reorder (feedback instantâneo, antes do
  // round-trip de `onChanged()`/refetch) — StagesManager tem o equivalente
  // via `setStagesOptimistic` do CRMConfigContext; aqui não há um contexto
  // compartilhado (os pipelines vêm via prop), então a sobreposição é local.
  const [optimisticStages, setOptimisticStages] = useState<PipelineStage[] | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)

  // Default: `initialPipelineId` (funil recém-criado, se veio um) quando
  // existir na lista, senão o pipeline padrão do tenant — assim que a lista
  // chegar (ou se o funil selecionado for excluído noutro lugar enquanto
  // isto está aberto).
  useEffect(() => {
    if (pipelines.length === 0) { setPipelineId(''); return }
    if (pipelineId && pipelines.some((p) => p.id === pipelineId)) return
    const preferred = initialPipelineId && pipelines.some((p) => p.id === initialPipelineId)
      ? initialPipelineId
      : getDefaultPipeline(pipelines)?.id ?? ''
    setPipelineId(preferred)
  }, [pipelines, pipelineId, initialPipelineId])

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId) ?? null
  const serverStages = (selectedPipeline?.stages ?? []).slice().sort((a, b) => a.order - b.order)
  const stages = optimisticStages ?? serverStages
  // DealsService.resolveStageForStatus cai num fallback não-terminal quando
  // não sobra NENHUM estágio isWon/isLost — um deal "ganho" viraria "open"
  // em silêncio (ver assertNotLastTerminalStage no backend). Usado pra
  // desabilitar excluir o último de cada um, com tooltip explicando por quê.
  const wonCount = stages.filter((s) => s.isWon).length
  const lostCount = stages.filter((s) => s.isLost).length
  // F7 (SCRUM-868): vocabulário por tipo — Ganho/Perdido em venda,
  // Concluído/Cancelado em processo. Vem do backend (`terminalLabels`); o
  // fallback por `kind` cobre um backend anterior ao épico.
  const terminalLabels = terminalLabelsOf(selectedPipeline)
  const kindOption = pipelineKindOption(pipelineKindOf(selectedPipeline))

  // Assim que dados frescos do pai chegarem (nova identidade do array de
  // estágios do pipeline selecionado) ou o funil trocar, descarta a
  // sobreposição otimista — os dados reais tomam conta.
  useEffect(() => {
    setOptimisticStages(null)
  }, [pipelineId, selectedPipeline?.stages])

  const handleSave = async (data: { label: string; color: string; isWon: boolean; isLost: boolean }) => {
    if (!pipelineId) return
    try {
      if (editStage) {
        const res = await pipelinesApi.updateStage(pipelineId, editStage.id, data)
        // Otimista: aplica o estágio atualizado na hora — não espera o
        // round-trip de onChanged()/fetchPipelines() (que refaz a lista
        // inteira de funis) só para refletir a edição de UM estágio.
        setOptimisticStages(stages.map((s) => (s.id === res.data.id ? res.data : s)))
        toast('Estágio atualizado com sucesso.', 'success')
      } else {
        const res = await pipelinesApi.createStage(pipelineId, data)
        setOptimisticStages([...stages, res.data])
        toast('Estágio criado com sucesso.', 'success')
      }
      setModalOpen(false)
      setEditStage(null)
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao salvar estágio.'), 'error')
      throw err // mantém o modal aberto
    }
  }

  const handleDelete = async () => {
    if (!deleteStage || !pipelineId) return
    setDeleting(true)
    try {
      await pipelinesApi.removeStage(pipelineId, deleteStage.id)
      setOptimisticStages(stages.filter((s) => s.id !== deleteStage.id))
      toast('Estágio excluído.', 'success')
      setDeleteStage(null)
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao excluir estágio.'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  // Arquivar/Desarquivar (SCRUM-285) — some/volta dos seletores de uso, mas
  // continua listado e gerenciável aqui. O backend rejeita arquivar o funil
  // padrão do tenant (409) — o erro exato vem do getApiErrorMessage.
  const handleToggleArchive = async () => {
    if (!selectedPipeline) return
    setArchiving(true)
    try {
      await pipelinesApi.update(selectedPipeline.id, { isArchived: !selectedPipeline.isArchived })
      toast(selectedPipeline.isArchived ? 'Funil desarquivado.' : 'Funil arquivado.', 'success')
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao alterar arquivamento do funil.'), 'error')
    } finally {
      setArchiving(false)
    }
  }

  // Tornar padrão (SCRUM-293) — o backend garante exatamente 1 default por
  // tenant numa transação (desmarca o atual, marca o novo). Rejeita funil
  // arquivado (409) — deixa o backend ser dono do invariante, mesmo padrão
  // já usado em handleToggleArchive acima.
  const handleSetDefault = async () => {
    if (!selectedPipeline) return
    setSettingDefault(true)
    try {
      await pipelinesApi.setDefault(selectedPipeline.id)
      toast('Funil definido como padrão.', 'success')
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao definir funil padrão.'), 'error')
    } finally {
      setSettingDefault(false)
    }
  }

  // ── Drag & Drop (mecânica compartilhada — ver useDragReorder) ──────────────
  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    stages,
    async (reordered) => {
      if (!pipelineId) return
      // Optimistic: atualiza a UI na hora, antes do round-trip.
      const withNewOrder = reordered.map((s, i) => ({ ...s, order: i + 1 }))
      setOptimisticStages(withNewOrder)
      try {
        await pipelinesApi.reorderStages(pipelineId, withNewOrder.map((s) => s.id))
        toast('Funil reordenado.', 'success')
        onChanged()
      } catch {
        toast('Erro ao reordenar. Recarregando...', 'error')
        setOptimisticStages(null)
        onChanged()
      }
    },
  )

  return (
    <>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-surface-100">Estágios do funil</h3>
        <p className="text-xs text-surface-500 mt-0.5">
          Escolha o funil para editar as colunas do Kanban de negócios. Mudanças aqui refletem direto no board.
        </p>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <FormFieldSelect
          value={pipelineId}
          onChange={setPipelineId}
          pipelines={pipelines}
        />
        {selectedPipeline && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full mb-0.5 bg-surface-800 border border-surface-700 text-surface-300"
            title={kindOption.description}
            data-testid="pipeline-kind-badge"
          >
            <kindOption.icon className="w-3 h-3" /> {kindOption.label}
          </span>
        )}
        {selectedPipeline?.isArchived && (
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full mb-0.5 color-chip border"
            style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
          >
            Arquivado
          </span>
        )}
        {canManage && selectedPipeline && !selectedPipeline.isDefault && (
          <button
            onClick={handleSetDefault}
            disabled={settingDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 disabled:opacity-50 transition-all"
          >
            <Star className="w-3.5 h-3.5" />
            {settingDefault ? 'Salvando...' : 'Tornar padrão'}
          </button>
        )}
        {canManage && selectedPipeline && (
          <button
            onClick={handleToggleArchive}
            disabled={archiving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 disabled:opacity-50 transition-all"
          >
            {selectedPipeline.isArchived
              ? <ArchiveRestore className="w-3.5 h-3.5" />
              : <Archive className="w-3.5 h-3.5" />}
            {archiving ? 'Salvando...' : selectedPipeline.isArchived ? 'Desarquivar' : 'Arquivar'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-5 mb-3">
        <p className="text-xs text-surface-500">Arraste para reordenar.</p>
        {canManage && (
          <button
            onClick={() => { setEditStage(null); setModalOpen(true) }}
            disabled={!pipelineId}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-50 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Novo estágio
          </button>
        )}
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {!pipelineId ? (
          <p className="text-sm text-surface-500 text-center py-10">Nenhum funil disponível.</p>
        ) : stages.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-10">Nenhum estágio configurado neste funil.</p>
        ) : (
          <ul className="divide-y divide-surface-800">
            {stages.map((stage, idx) => {
              const isLastWon = stage.isWon && wonCount <= 1
              const isLastLost = stage.isLost && lostCount <= 1
              const deleteBlockedReason = isLastWon
                ? `O funil precisa de pelo menos um estágio de ${terminalLabels.won}.`
                : isLastLost
                  ? `O funil precisa de pelo menos um estágio de ${terminalLabels.lost}.`
                  : null

              return (
              <li
                key={stage.id}
                draggable={canManage}
                onDragStart={canManage ? () => handleDragStart(idx) : undefined}
                onDragOver={canManage ? (e) => handleDragOver(e, idx) : undefined}
                onDrop={canManage ? () => handleDrop(idx) : undefined}
                onDragEnd={canManage ? handleDragEnd : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 transition-all duration-200 group',
                  overIdx === idx ? 'bg-brand-500/10 border-l-2 border-brand-500' : 'hover:bg-surface-800/30',
                )}
              >
                <GripVertical
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    canManage ? 'text-surface-700 cursor-grab active:cursor-grabbing' : 'text-surface-800 cursor-not-allowed',
                  )}
                />

                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                  style={{ backgroundColor: stage.color, borderColor: stage.color }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-100">{stage.label}</span>
                    {stage.isWon && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full color-chip border"
                        style={{ ['--chip']: 'var(--color-success)' } as React.CSSProperties}
                      >
                        <Trophy className="w-2.5 h-2.5" /> {terminalLabels.won}
                      </span>
                    )}
                    {stage.isLost && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full color-chip border"
                        style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
                      >
                        <X className="w-2.5 h-2.5" /> {terminalLabels.lost}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-600 font-mono">{stage.key}</p>
                </div>

                <span className="text-xs text-surface-600 tabular-nums">ordem {stage.order}</span>

                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditStage(stage); setModalOpen(true) }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deleteBlockedReason ? (
                      <Tooltip content={deleteBlockedReason} side="top">
                        <button
                          disabled
                          className="p-1.5 rounded-lg text-surface-600 opacity-40 cursor-not-allowed transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    ) : (
                      <button
                        onClick={() => setDeleteStage(stage)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}
      </div>

      <PipelineStageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editStage={editStage}
        terminalLabels={terminalLabels}
      />

      <ConfirmModal
        open={!!deleteStage}
        onClose={() => setDeleteStage(null)}
        onConfirm={handleDelete}
        title="Excluir estágio"
        description={`Tem certeza que deseja excluir o estágio "${deleteStage?.label}"? Só é possível excluir estágios sem negócios.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}

/** Select de funil — separado só para manter o corpo do componente principal legível. */
function FormFieldSelect({
  value,
  onChange,
  pipelines,
}: {
  value: string
  onChange: (id: string) => void
  pipelines: Pipeline[]
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-surface-400 mb-1.5 block">Funil</label>
      <div className="relative w-full sm:w-72">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-surface-800 border border-surface-700 rounded-lg py-2 pl-3 pr-8 text-sm text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/60 transition-colors"
        >
          {pipelines.length === 0 && <option value="">Nenhum funil disponível</option>}
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}{p.isArchived ? ' (arquivado)' : ''}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
