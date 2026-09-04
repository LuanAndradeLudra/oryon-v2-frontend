import { useState } from 'react'
import { Check, ArrowRight, X, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { pipelineNoun, terminalLabelsOf } from '@/lib/pipelineKinds'
import { timeInStage } from '@/lib/dealCard'
import type { Deal, Pipeline } from '@/types'

export type ConflictChoice = 'open_existing' | 'move_to_first' | 'close_and_new'

interface PipelineConflictModalProps {
  open: boolean
  onClose: () => void
  contactName: string
  pipeline: Pipeline | null
  /** Registro aberto que causou o `conflict(open_exists)` — pode chegar depois (fetch) → skeleton. */
  existing: Deal | null
  busy?: boolean
  onChoose: (choice: ConflictChoice) => Promise<void> | void
}

/**
 * Prancheta 4 · "Já existe um registro aberto" (F9 · SCRUM-877, Modelo B
 * §4.3): o funil nunca decide reentrada — devolve `conflict` e o humano
 * escolhe. Três saídas, nada em silêncio:
 *   1. abrir o registro existente (default) — continua de onde parou;
 *   2. mover o existente para a 1ª etapa — reinicia a passagem, histórico preservado;
 *   3. fechar o existente como Cancelado/Perdido e abrir um novo — pede motivo.
 */
export function PipelineConflictModal({ open, onClose, contactName, pipeline, existing, busy = false, onChoose }: PipelineConflictModalProps) {
  // Reset por remontagem: o chamador passa `key={openDealId}` (useAddToPipeline).
  const [choice, setChoice] = useState<ConflictChoice>('open_existing')

  const noun = pipelineNoun(pipeline)
  const labels = terminalLabelsOf(pipeline)
  const stages = (pipeline?.stages ?? []).slice().sort((a, b) => a.order - b.order)
  const firstStage = stages.find((s) => !s.isWon && !s.isLost) ?? null
  const currentStage = existing ? stages.find((s) => s.id === existing.stageId) ?? null : null
  const since = existing ? timeInStage(existing) : null
  const by = existing?.lastMovedByActorName ?? null

  const OPTIONS: Array<{ id: ConflictChoice; icon: typeof Check; title: string; hint: string }> = [
    { id: 'open_existing', icon: Check, title: `Abrir o ${noun} existente`, hint: 'Continua o atendimento de onde parou.' },
    { id: 'move_to_first', icon: ArrowRight, title: `Mover o existente para "${firstStage?.label ?? 'primeira etapa'}"`, hint: 'Reinicia a passagem; histórico preservado.' },
    { id: 'close_and_new', icon: X, title: `Fechar o existente como ${labels.lost} e abrir um novo`, hint: 'Pede um motivo.' },
  ]

  const confirmLabel = choice === 'open_existing' ? `Abrir ${noun}` : choice === 'move_to_first' ? 'Mover' : `Fechar e abrir novo`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Já existe um ${noun} aberto`}
      className="max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="button" variant="primary" onClick={() => void onChoose(choice)} loading={busy} disabled={busy || !existing || (choice === 'move_to_first' && !firstStage)} data-testid="conflict-confirm">
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {existing ? (
          <p className="text-sm text-surface-300 leading-relaxed" data-testid="conflict-summary">
            <span className="font-medium text-surface-50">{contactName}</span> já está em{' '}
            <span className="font-medium text-surface-50">{pipeline?.name ?? 'este funil'}</span>
            {currentStage && <>, na etapa <span className="font-medium text-surface-50">{currentStage.label}</span></>}
            {(since || by) && (
              <span className="text-surface-400"> ({[since, by ? `aberto por ${by}` : null].filter(Boolean).join(', ')})</span>
            )}
            . O funil permite um {noun} aberto por contato.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-surface-400"><Loader2 className="w-4 h-4 animate-spin" /> Carregando o {noun} existente…</p>
        )}
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="O que fazer">
          {OPTIONS.map((opt) => {
            const active = opt.id === choice
            const Icon = opt.icon
            const disabled = opt.id === 'move_to_first' && !firstStage
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => setChoice(opt.id)}
                data-testid={`conflict-${opt.id}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all',
                  active ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 bg-surface-800 hover:border-surface-600',
                  disabled && 'opacity-40 cursor-not-allowed',
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brand-500' : 'text-surface-500')} />
                <span className="flex-1 min-w-0">
                  <span className={cn('block text-sm font-semibold', active ? 'text-surface-50' : 'text-surface-200')}>{opt.title}</span>
                  <span className={cn('block text-[11px]', active ? 'text-surface-400' : 'text-surface-500')}>{opt.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
