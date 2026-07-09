import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'

interface CreatePipelineModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; color: string }) => Promise<void>
}

/** Cria um novo pipeline de negócio. Os estágios iniciais são provisionados
 *  automaticamente (mesmo conjunto default: Novo/Em negociação/Proposta
 *  enviada/Ganho/Perdido) — sem editor de estágios nesta v1. */
export function CreatePipelineModal({ open, onClose, onSave }: CreatePipelineModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_ENTITY_COLOR)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setColor(DEFAULT_ENTITY_COLOR)
      setError('')
    }
  }, [open])

  const handleSave = async () => {
    if (!name.trim()) { setError('O nome do pipeline é obrigatório.'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), color })
      onClose()
    } catch (e: unknown) {
      const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      const msg = typeof axiosMsg === 'string' ? axiosMsg : e instanceof Error ? e.message : 'Erro ao criar pipeline.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo pipeline" className="max-w-md">
      <div className="flex flex-col gap-4">
        <FormField label="Nome do pipeline" error={error} required>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="Ex: Suporte, Renovação, Pós-venda"
            autoFocus
          />
        </FormField>

        <FormField label="Cor" hint="Identifica o pipeline no seletor e nas listagens.">
          <ColorPicker value={color} onChange={setColor} />
        </FormField>

        <p className="text-xs text-surface-500 -mt-1">
          O pipeline nasce com os estágios padrão (Novo, Em negociação, Proposta enviada, Ganho, Perdido) — dá para ajustar depois.
        </p>

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
            {saving ? 'Criando...' : 'Criar pipeline'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
