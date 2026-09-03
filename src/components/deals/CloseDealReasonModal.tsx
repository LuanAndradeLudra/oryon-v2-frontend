import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getApiErrorMessage } from '@/lib/utils'
import { terminalLabelsOf, pipelineNoun } from '@/lib/pipelineKinds'
import type { CloseReason, Deal, Pipeline, PipelineStage } from '@/types'

export interface CloseDealReasonInput {
  outcome: 'won' | 'lost'
  reason: string
  note?: string
}

interface CloseDealReasonModalProps {
  open: boolean
  onClose: () => void
  /** Registro sendo fechado (arrastado para um terminal). */
  deal: Deal | null
  /** Etapa terminal de destino — decide o desfecho (`isWon` → won, `isLost` → lost). */
  stage: PipelineStage | null
  /** Funil do registro — traz `closeReasons` (catálogo por tipo, F1) e o vocabulário. */
  pipeline: Pipeline | null
  onConfirm: (input: CloseDealReasonInput) => Promise<void>
}

/**
 * Mini-modal de motivo ao mover um registro para um terminal (F8 · SCRUM-872,
 * invariante I5): fechar sem escolher um motivo do catálogo é impossível pela
 * UI. O catálogo vem do próprio funil (`pipeline.closeReasons`, por `kind`),
 * filtrado pelo desfecho da etapa de destino; `outro` vale para qualquer
 * desfecho. Backend anterior ao épico (sem catálogo) → fallback `outro`.
 */
export function CloseDealReasonModal({ open, onClose, deal, stage, pipeline, onConfirm }: CloseDealReasonModalProps) {
  const outcome: 'won' | 'lost' = stage?.isLost ? 'lost' : 'won'
  const labels = terminalLabelsOf(pipeline)
  const noun = pipelineNoun(pipeline)
  const reasons = useMemo<CloseReason[]>(() => {
    const all = pipeline?.closeReasons ?? []
    const filtered = all.filter((r) => r.outcome === 'any' || r.outcome === outcome)
    return filtered.length > 0 ? filtered : [{ key: 'outro', label: 'Outro', outcome: 'any' }]
  }, [pipeline, outcome])

  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('')
    setNote('')
    setError('')
    setSaving(false)
  }, [open, deal?.id, stage?.id])

  const handleConfirm = async () => {
    if (!reason) { setError('Escolha um motivo.'); return }
    setSaving(true)
    setError('')
    try {
      await onConfirm({ outcome, reason, note: note.trim() || undefined })
      onClose()
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, `Não foi possível fechar o ${noun}.`))
    } finally {
      setSaving(false)
    }
  }

  const terminalLabel = stage?.label ?? (outcome === 'won' ? labels.won : labels.lost)
  const title = `${terminalLabel} — motivo`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            variant={outcome === 'lost' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={saving}
            disabled={saving || !reason}
            data-testid="close-deal-confirm"
          >
            {outcome === 'won' ? `Marcar como ${labels.won}` : `Marcar como ${labels.lost}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-surface-300">
          Mover <span className="font-medium text-surface-100">{deal?.contact?.displayName ?? deal?.title ?? `este ${noun}`}</span> para{' '}
          <span className="font-medium text-surface-100">{terminalLabel}</span> fecha o {noun}. Registre o motivo — ele fica no histórico e alimenta os relatórios.
        </p>
        <FormField label="Motivo" required error={error}>
          <Select
            aria-label="Motivo do desfecho"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError('') }}
            autoFocus
          >
            <option value="">— escolher —</option>
            {reasons.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Observação (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: paciente confirmou por telefone" maxLength={2000} />
        </FormField>
      </div>
    </Modal>
  )
}
