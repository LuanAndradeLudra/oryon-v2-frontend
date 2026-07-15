import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { getApiErrorMessage } from '@/lib/utils'
import type { Pipeline } from '@/types'

interface CreatePipelineModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; color: string }) => Promise<void>
  /** Presente = edita este pipeline (renomear/cor) em vez de criar um novo. */
  editPipeline?: Pipeline | null
}

/** Cria ou edita um pipeline de negócio (renomear/cor — via `editPipeline`).
 *  Na criação, os estágios iniciais são provisionados automaticamente (mesmo
 *  conjunto default: Novo/Em negociação/Proposta enviada/Ganho/Perdido) —
 *  sem editor de estágios nesta v1. */
export function CreatePipelineModal({ open, onClose, onSave, editPipeline }: CreatePipelineModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_ENTITY_COLOR)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(editPipeline?.name ?? '')
      setColor(editPipeline?.color ?? DEFAULT_ENTITY_COLOR)
      setError('')
    }
  }, [open, editPipeline])

  const handleSave = async () => {
    if (!name.trim()) { setError('O nome do pipeline é obrigatório.'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), color })
      onClose()
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Erro ao salvar pipeline.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editPipeline ? 'Editar funil' : 'Novo funil'} className="max-w-md">
      <div className="flex flex-col gap-4">
        <FormField label="Nome do funil" error={error} required>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="Ex: Suporte, Renovação, Pós-venda"
            autoFocus
          />
        </FormField>

        {/* Cor só é editável depois, via "Editar funil" — na criação o funil
            nasce com a cor padrão para manter o formulário enxuto. */}
        {editPipeline && (
          <FormField label="Cor" hint="Identifica o funil no segmentado e nas listagens.">
            <ColorPicker value={color} onChange={setColor} />
          </FormField>
        )}

        {!editPipeline && (
          <p className="text-xs text-surface-500 -mt-1">
            O funil nasce com os estágios padrão (Novo, Em negociação, Proposta enviada, Ganho, Perdido) — dá para ajustar depois.
          </p>
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
            {saving ? 'Salvando...' : editPipeline ? 'Salvar alterações' : 'Criar funil'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
