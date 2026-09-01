import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Trophy, X } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Tooltip } from '@/components/ui/Tooltip'
import { PipelineStageModal } from '@/components/settings/modals/PipelineStageModal'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { useDragReorder } from '@/hooks/useDragReorder'
import { pipelinesApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage, cn } from '@/lib/utils'
import { pipelineKindOf, terminalLabelsOf } from '@/lib/pipelineKinds'
import type { Pipeline, PipelineStage } from '@/types'

interface PipelineStagesManagerProps {
  /** Funil cujas etapas (colunas do Kanban) este bloco edita — a seleção do
   *  funil e as ações de ciclo de vida (renomear/arquivar/tornar padrão/
   *  excluir) vivem no componente pai (`FunnelsSettings`), que é quem
   *  escolhe QUAL funil mostrar aqui. */
  pipeline: Pipeline
  /** Chamado após qualquer criação/edição/exclusão/reordenação — o dono da
   *  lista de pipelines (`CRMConfigContext`) refaz o fetch. */
  onChanged: () => void
}

/** Reordena/edita as etapas (colunas do Kanban) de UM funil de negócio — o
 *  funil em si é escolhido pelo componente pai. Espelha StagesManager
 *  (estágios do ciclo de vida do contato), mas aponta para os endpoints de
 *  pipeline e usa isWon/isLost em vez de isTerminal. */
export function PipelineStagesManager({ pipeline, onChanged }: PipelineStagesManagerProps) {
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  const canManage = isAdminTier(actor?.role)

  const [modalOpen, setModalOpen] = useState(false)
  const [editStage, setEditStage] = useState<PipelineStage | null>(null)
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Sobrepõe `stages` logo após uma mutação (feedback instantâneo, antes do
  // round-trip de `onChanged()`/refetch) — StagesManager tem o equivalente
  // via `setStagesOptimistic` do CRMConfigContext; aqui não há um contexto
  // compartilhado (o pipeline vem via prop), então a sobreposição é local.
  const [optimisticStages, setOptimisticStages] = useState<PipelineStage[] | null>(null)

  const serverStages = (pipeline.stages ?? []).slice().sort((a, b) => a.order - b.order)
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
  const terminalLabels = terminalLabelsOf(pipeline)
  const isSales = pipelineKindOf(pipeline) === 'sales'

  // Assim que dados frescos do pai chegarem (nova identidade do array de
  // estágios) ou o funil trocar, descarta a sobreposição otimista.
  useEffect(() => {
    setOptimisticStages(null)
  }, [pipeline.id, pipeline.stages])

  const handleSave = async (data: { label: string; color: string; isWon: boolean; isLost: boolean; probability?: number | null }) => {
    try {
      if (editStage) {
        const res = await pipelinesApi.updateStage(pipeline.id, editStage.id, data)
        // Otimista: aplica o estágio atualizado na hora — não espera o
        // round-trip de onChanged()/refetch só para refletir a edição de UM estágio.
        setOptimisticStages(stages.map((s) => (s.id === res.data.id ? res.data : s)))
        toast('Estágio atualizado com sucesso.', 'success')
      } else {
        const res = await pipelinesApi.createStage(pipeline.id, data)
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
    if (!deleteStage) return
    setDeleting(true)
    try {
      await pipelinesApi.removeStage(pipeline.id, deleteStage.id)
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

  // ── Drag & Drop (mecânica compartilhada — ver useDragReorder) ──────────────
  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    stages,
    async (reordered) => {
      // Optimistic: atualiza a UI na hora, antes do round-trip.
      const withNewOrder = reordered.map((s, i) => ({ ...s, order: i + 1 }))
      setOptimisticStages(withNewOrder)
      try {
        await pipelinesApi.reorderStages(pipeline.id, withNewOrder.map((s) => s.id))
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
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-surface-500">Arraste para reordenar.</p>
        {canManage && (
          <button
            onClick={() => { setEditStage(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-50 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Novo estágio
          </button>
        )}
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {stages.length === 0 ? (
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

                {isSales && !stage.isWon && !stage.isLost && (
                  <span className="text-xs text-surface-500 tabular-nums" title="Probabilidade default desta etapa">
                    {stage.probability != null ? `${stage.probability}%` : '— %'}
                  </span>
                )}
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
        showProbability={isSales}
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
