import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/ui/FormDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import type { TenantStage } from '@/types'

interface StageModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { label: string; color: string; isTerminal: boolean; key?: string }) => Promise<void>
  editStage?: TenantStage | null
}

export function StageModal({ open, onClose, onSave, editStage }: StageModalProps) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(DEFAULT_ENTITY_COLOR)
  const [isTerminal, setIsTerminal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(editStage?.label ?? '')
      setColor(editStage?.color ?? DEFAULT_ENTITY_COLOR)
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
    <FormDialog
      open={open}
      onClose={onClose}
      title={editStage ? 'Editar estágio' : 'Novo estágio'}
      onSubmit={handleSave}
      submitLabel={editStage ? 'Salvar alterações' : 'Criar estágio'}
      loading={saving}
      error={error || null}
      className="max-w-md"
    >
      <FormField label="Nome do estágio" required>
        <Input
          value={label}
          onChange={(e) => { setLabel(e.target.value); setError('') }}
          placeholder="Ex: Proposta Enviada"
          autoFocus
        />
      </FormField>

      <FormField label="Cor">
        <ColorPicker value={color} onChange={setColor} />
      </FormField>

      <div className="flex items-center justify-between py-2 border-t border-surface-800">
        <div>
          <p className="text-sm font-medium text-surface-200">Estágio terminal</p>
          <p className="text-xs text-surface-500 mt-0.5">Ficará oculto por padrão no Kanban (ex: Churned, Inativo)</p>
        </div>
        <Switch checked={isTerminal} onChange={setIsTerminal} />
      </div>
    </FormDialog>
  )
}
