import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import type { TenantStage } from '@/types'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#64748b', '#475569',
  '#84cc16', '#f97316',
]

interface StageModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { label: string; color: string; isTerminal: boolean; key?: string }) => Promise<void>
  editStage?: TenantStage | null
}

export function StageModal({ open, onClose, onSave, editStage }: StageModalProps) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [isTerminal, setIsTerminal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(editStage?.label ?? '')
      setColor(editStage?.color ?? '#6366f1')
      setIsTerminal(editStage?.isTerminal ?? false)
      setError('')
    }
  }, [open, editStage])

  const handleSave = async () => {
    if (!label.trim()) { setError('O nome do estágio é obrigatório.'); return }
    setSaving(true)
    try {
      await onSave({ label: label.trim(), color, isTerminal })
      onClose()
    } catch (e: unknown) {
      const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      const msg = typeof axiosMsg === 'string' ? axiosMsg : e instanceof Error ? e.message : 'Erro ao salvar estágio.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editStage ? 'Editar estágio' : 'Novo estágio'}
      className="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nome do estágio" error={error} required>
          <Input
            value={label}
            onChange={(e) => { setLabel(e.target.value); setError('') }}
            placeholder="Ex: Proposta Enviada"
            autoFocus
          />
        </FormField>

        <FormField label="Cor">
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? '#fff' : 'transparent',
                  boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-surface-700 flex-shrink-0" style={{ backgroundColor: color }} />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#6366f1"
              className="font-mono text-sm"
            />
          </div>
        </FormField>

        <div className="flex items-center justify-between py-2 border-t border-surface-800">
          <div>
            <p className="text-sm font-medium text-surface-200">Estágio terminal</p>
            <p className="text-xs text-surface-500 mt-0.5">Ficará oculto por padrão no Kanban (ex: Churned, Inativo)</p>
          </div>
          <Switch checked={isTerminal} onChange={setIsTerminal} />
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
