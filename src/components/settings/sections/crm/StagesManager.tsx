import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Lock } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { StageModal } from '@/components/settings/modals/StageModal'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { stagesApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn } from '@/lib/utils'
import type { TenantStage } from '@/types'

export function StagesManager() {
  const { stages, refetchStages, setStagesOptimistic } = useCRMConfig()
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  // Mirror @Roles(ADMIN, BUSINESS_ADMIN) on POST/PATCH/DELETE /settings/stages.
  // GET is open (used everywhere as part of CRMConfig), so non-admins still
  // see the list — they just don't see edit/delete/reorder affordances.
  const canManageStages = isAdminTier(actor?.role)
  const [modalOpen, setModalOpen] = useState(false)
  const [editStage, setEditStage] = useState<TenantStage | null>(null)
  const [deleteStage, setDeleteStage] = useState<TenantStage | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Drag state
  const dragIdx = useRef<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const handleSave = async (data: { label: string; color: string; isTerminal: boolean }) => {
    try {
      if (editStage) {
        await stagesApi.update(editStage.id, data)
        toast('Estágio atualizado com sucesso.', 'success')
      } else {
        await stagesApi.create(data)
        toast('Estágio criado com sucesso.', 'success')
      }
      setModalOpen(false)
      setEditStage(null)
      refetchStages()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar estágio.', 'error')
      throw err // Re-throw so StageModal keeps open
    }
  }

  const handleDelete = async () => {
    if (!deleteStage) return
    setDeleting(true)
    try {
      await stagesApi.delete(deleteStage.id)
      toast('Estágio excluído.', 'success')
      refetchStages()
      setDeleteStage(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir estágio.'
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(axiosMsg ?? msg, 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── Drag & Drop handlers ────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => {
    dragIdx.current = idx
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }

  const handleDrop = async (targetIdx: number) => {
    const fromIdx = dragIdx.current
    dragIdx.current = null
    setOverIdx(null)
    if (fromIdx === null || fromIdx === targetIdx) return

    // Optimistic: update UI instantly with new order
    const reordered = [...stages]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(targetIdx, 0, moved)
    const withNewOrder = reordered.map((s, i) => ({ ...s, order: i + 1 }))
    setStagesOptimistic(withNewOrder)

    // Sync to backend
    try {
      await stagesApi.reorder(withNewOrder.map((s) => s.id))
      toast('Pipeline reordenado.', 'success')
    } catch {
      toast('Erro ao reordenar. Recarregando...', 'error')
      refetchStages()
    }
  }

  const handleDragEnd = () => {
    dragIdx.current = null
    setOverIdx(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-100">Estágios do pipeline</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Defina as etapas do seu funil de vendas. Arraste para reordenar.
          </p>
        </div>
        {canManageStages && (
          <button
            onClick={() => { setEditStage(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Novo estágio
          </button>
        )}
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {stages.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-10">Nenhum estágio configurado.</p>
        ) : (
          <ul className="divide-y divide-surface-800">
            {stages.map((stage, idx) => (
              <li
                key={stage.id}
                draggable={canManageStages}
                onDragStart={canManageStages ? () => handleDragStart(idx) : undefined}
                onDragOver={canManageStages ? (e) => handleDragOver(e, idx) : undefined}
                onDrop={canManageStages ? () => handleDrop(idx) : undefined}
                onDragEnd={canManageStages ? handleDragEnd : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 transition-all duration-200 group',
                  overIdx === idx ? 'bg-brand-500/10 border-l-2 border-brand-500' : 'hover:bg-surface-800/30',
                )}
              >
                <GripVertical
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    canManageStages
                      ? 'text-surface-700 cursor-grab active:cursor-grabbing'
                      : 'text-surface-800 cursor-not-allowed',
                  )}
                />

                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                  style={{ backgroundColor: stage.color, borderColor: stage.color }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-100">{stage.label}</span>
                    {stage.isTerminal && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-surface-500 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Terminal
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-600 font-mono">{stage.key}</p>
                </div>

                <span className="text-xs text-surface-600 tabular-nums">ordem {stage.order}</span>

                {canManageStages && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditStage(stage); setModalOpen(true) }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteStage(stage)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <StageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editStage={editStage}
      />

      <ConfirmModal
        open={!!deleteStage}
        onClose={() => setDeleteStage(null)}
        onConfirm={handleDelete}
        title="Excluir estágio"
        description={`Tem certeza que deseja excluir o estágio "${deleteStage?.label}"? Contatos neste estágio não serão afetados, mas deixarão de ser agrupados.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
