import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { getApiErrorMessage } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/types'

interface PipelineStageModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { label: string; color: string; isWon: boolean; isLost: boolean }) => Promise<void>
  editStage?: PipelineStage | null
}

type Kind = 'normal' | 'won' | 'lost'

const KIND_OPTIONS: { key: Kind; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'won', label: 'Ganho' },
  { key: 'lost', label: 'Perdido' },
]

export function PipelineStageModal({ open, onClose, onSave, editStage }: PipelineStageModalProps) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(DEFAULT_ENTITY_COLOR)
  const [kind, setKind] = useState<Kind>('normal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(editStage?.label ?? '')
      setColor(editStage?.color ?? DEFAULT_ENTITY_COLOR)
      setKind(editStage?.isWon ? 'won' : editStage?.isLost ? 'lost' : 'normal')
      setError('')
    }
  }, [open, editStage])

  const handleSave = async () => {
    if (!label.trim()) { setError('O nome do estágio é obrigatório.'); return }
    setSaving(true)
    try {
      await onSave({
        label: label.trim(),
        color,
        isWon: kind === 'won',
        isLost: kind === 'lost',
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
            Ganho/Perdido são terminais — fecham o negócio ao entrar neles.
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
