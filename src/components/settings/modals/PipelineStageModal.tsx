import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { getApiErrorMessage } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PipelineStage, TerminalLabels } from '@/types'

interface PipelineStageModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { label: string; color: string; isWon: boolean; isLost: boolean; probability?: number | null }) => Promise<void>
  editStage?: PipelineStage | null
  /** F7 (SCRUM-868): rótulos dos terminais do funil (Ganho/Perdido × Concluído/Cancelado). */
  terminalLabels?: TerminalLabels
  /** B5 (D0-7): oferece o campo de probabilidade default — só em funil de vendas
   *  (em processo não há valor ponderado). Terminais nunca mostram o campo: são 100/0 fixos. */
  showProbability?: boolean
}

type Kind = 'normal' | 'won' | 'lost'

const DEFAULT_TERMINAL_LABELS: TerminalLabels = { won: 'Ganho', lost: 'Perdido' }

export function PipelineStageModal({ open, onClose, onSave, editStage, terminalLabels = DEFAULT_TERMINAL_LABELS, showProbability = false }: PipelineStageModalProps) {
  const KIND_OPTIONS: { key: Kind; label: string }[] = [
    { key: 'normal', label: 'Normal' },
    { key: 'won', label: terminalLabels.won },
    { key: 'lost', label: terminalLabels.lost },
  ]
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(DEFAULT_ENTITY_COLOR)
  const [kind, setKind] = useState<Kind>('normal')
  const [probability, setProbability] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(editStage?.label ?? '')
      setColor(editStage?.color ?? DEFAULT_ENTITY_COLOR)
      setKind(editStage?.isWon ? 'won' : editStage?.isLost ? 'lost' : 'normal')
      setProbability(editStage?.probability != null ? String(editStage.probability) : '')
      setError('')
    }
  }, [open, editStage])

  const handleSave = async () => {
    if (!label.trim()) { setError('O nome do estágio é obrigatório.'); return }
    if (probability.trim()) {
      const n = Number(probability)
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        setError('A probabilidade precisa ser um número inteiro entre 0 e 100.')
        return
      }
    }
    setSaving(true)
    try {
      await onSave({
        label: label.trim(),
        color,
        isWon: kind === 'won',
        isLost: kind === 'lost',
        ...(showProbability && kind === 'normal'
          ? { probability: probability.trim() ? Number(probability) : null }
          : {}),
      })
      onClose()
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Erro ao salvar estágio.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editStage ? 'Editar estágio do funil' : 'Novo estágio do funil'}
      className="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nome do estágio" error={error} required>
          <Input
            value={label}
            onChange={(e) => { setLabel(e.target.value); setError('') }}
            placeholder="Ex: Proposta enviada"
            autoFocus
          />
        </FormField>

        <FormField label="Cor">
          <ColorPicker value={color} onChange={setColor} />
        </FormField>

        <div className="pt-1">
          <p className="text-sm font-medium text-surface-200 mb-1">Tipo de estágio</p>
          <p className="text-xs text-surface-500 mb-2">
            {terminalLabels.won}/{terminalLabels.lost} são terminais — fecham o registro ao entrar neles.
          </p>
          <div className="flex items-center bg-surface-800 border border-surface-700 rounded-xl p-1 w-fit">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setKind(opt.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  kind === opt.key
                    ? 'bg-surface-700 text-surface-50 shadow-sm'
                    : 'text-surface-400 hover:text-surface-200',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {showProbability && kind === 'normal' && (
          <FormField label="Probabilidade default (%)" error={undefined}>
            <Input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => { setProbability(e.target.value); setError('') }}
              placeholder="Ex: 40"
            />
            <p className="text-[11px] text-surface-500 mt-1">
              Herdada por todo negócio nesta etapa, salvo override individual. Deixe em branco para "não configurada".
            </p>
          </FormField>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60 transition-all"
          >
            {saving ? 'Salvando...' : editStage ? 'Salvar alterações' : 'Criar estágio'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
