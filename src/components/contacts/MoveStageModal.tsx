import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { contactsApi } from '@/services/api'
import { cn, hexToRgba } from '@/lib/utils'

interface MoveStageModalProps {
  open: boolean
  onClose: () => void
  contactId: string
  contactName?: string
  currentStage?: string | null
  /** Called after the backend confirms the move, with the new stage key.
   *  Parent uses it to update local state so the page reflects the change
   *  without a full refetch (the mini-kanban itself already closes). */
  onStageChanged?: (nextStage: string) => void
}

/**
 * Mini-kanban modal for moving a single contact between stages. The columns
 * are rendered horizontally, scrolling overflow-x if the tenant has many
 * stages. The currently-active column gets a stronger ring + the "atual"
 * pill so the operator sees both the starting point and the targets in
 * the same glance. Clicking any non-current column performs the move.
 */
export function MoveStageModal({
  open, onClose, contactId, contactName, currentStage, onStageChanged,
}: MoveStageModalProps) {
  const { stages, loadingStages } = useCRMConfig()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMove = async (stageKey: string) => {
    if (stageKey === currentStage || pendingKey) return
    setPendingKey(stageKey)
    setError(null)
    try {
      await contactsApi.bulkUpdateStage([contactId], stageKey)
      onStageChanged?.(stageKey)
      onClose()
    } catch (err) {
      console.error('[MoveStageModal] move failed', err)
      setError('Não foi possível mover o contato. Tente novamente.')
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contactName ? `Mover ${contactName}` : 'Mover contato'}
      className="max-w-5xl"
    >
      {loadingStages ? (
        <div className="flex items-center justify-center py-10 text-surface-500 text-xs">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando situações…
        </div>
      ) : stages.length === 0 ? (
        <p className="text-xs text-surface-500 text-center py-8">
          Nenhuma situação configurada. Cadastre em Configurações → CRM → Situação do contato.
        </p>
      ) : (
        <>
          <p className="text-xs text-surface-500 mb-3">
            Clique na situação para onde deseja mover o contato.
          </p>

          {/* Horizontal kanban — each column has a colored header band and
              a click target body. overflow-x-auto handles tenants with many
              stages without breaking the layout.

              `filter-scroll` (defined in index.css) gives a thin scrollbar
              with a transparent track so the bar doesn't show a white strip
              against the dark modal. Extra pb pushes the bar away from the
              column bodies and closer to the modal's bottom border, with a
              negative bottom margin to nudge it the last few pixels. */}
          <div
            className="filter-scroll flex gap-2 overflow-x-auto pb-5 -mb-2 -mx-1 px-1"
          >
            {stages.map((stage) => {
              const isCurrent = stage.key === currentStage
              const isPending = pendingKey === stage.key
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleMove(stage.key)}
                  disabled={isCurrent || !!pendingKey}
                  className={cn(
                    'flex-shrink-0 w-[200px] min-h-[140px] rounded-xl border bg-surface-800/60 transition-all text-left',
                    'flex flex-col overflow-hidden',
                    isCurrent
                      ? 'border-surface-600 cursor-default'
                      : 'border-surface-700 hover:border-surface-500 hover:bg-surface-800 cursor-pointer',
                    pendingKey && !isPending && 'opacity-50',
                  )}
                  style={
                    isCurrent
                      ? {
                          borderColor: hexToRgba(stage.color, 0.6),
                          boxShadow: `0 0 0 1px ${hexToRgba(stage.color, 0.4)}`,
                        }
                      : undefined
                  }
                >
                  {/* Color band */}
                  <div
                    className="h-1.5 w-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="px-3 py-3 flex-1 flex flex-col gap-1.5">
                    <p
                      className="text-xs font-semibold leading-snug"
                      style={{ color: stage.color }}
                    >
                      {stage.label}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-surface-300 bg-surface-700/70 px-1.5 py-0.5 rounded self-start">
                        <Check className="w-2.5 h-2.5" />
                        Atual
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-brand-300">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Movendo…
                      </span>
                    )}
                    {!isCurrent && !isPending && (
                      <span className="text-[10px] text-surface-500">
                        Clique para mover
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {error && (
            <p className="text-[11px] text-danger mt-3">{error}</p>
          )}
        </>
      )}
    </Modal>
  )
}
