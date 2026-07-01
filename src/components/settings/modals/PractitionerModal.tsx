import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import type { Practitioner } from '@/types'

interface PractitionerModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Practitioner>) => Promise<void>
  editPractitioner?: Practitioner | null
}

/** Limites de caracteres (espelham os @MaxLength do backend). */
const MAX_NAME = 100
const MAX_CATEGORY = 100

export function PractitionerModal({ open, onClose, onSave, editPractitioner }: PractitionerModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(editPractitioner?.name ?? '')
      setCategory(editPractitioner?.category ?? '')
      setActive(editPractitioner?.active ?? true)
      setError('')
    }
  }, [open, editPractitioner])

  // Validação de limites em tempo real — cada erro aparece abaixo do próprio campo.
  const nameError =
    name.length > MAX_NAME ? `O nome deve ter no máximo ${MAX_NAME} caracteres.` : ''
  const categoryError =
    category.length > MAX_CATEGORY ? `A especialidade deve ter no máximo ${MAX_CATEGORY} caracteres.` : ''
  const hasLimitError = !!(nameError || categoryError)

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError('O nome do profissional precisa de pelo menos 2 caracteres.')
      return
    }
    if (!category.trim()) {
      setError('A especialidade é obrigatória.')
      return
    }
    if (hasLimitError) return // mensagens de limite já visíveis em tempo real nos campos
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        active,
      })
      onClose()
    } catch (e: unknown) {
      // Mostra a mensagem específica do backend. O PractitionersManager extrai a msg e relança um
      // Error (lemos `e.message`); aceitamos também o formato axios direto por robustez.
      const axiosMsg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = axiosMsg ?? (e instanceof Error ? e.message : undefined)
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar profissional.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editPractitioner ? 'Editar profissional' : 'Novo profissional'}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <FormField
          label="Nome do profissional"
          requirement="required"
          filled={!!name.trim()}
          error={nameError || error}
          hint={name.length > 0 ? `${name.length}/${MAX_NAME}` : undefined}
        >
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Ex: Dr. Fulano de Tal"
            autoFocus
          />
        </FormField>

        <FormField
          label="Especialidade"
          requirement="required"
          filled={!!category.trim()}
          error={categoryError}
          hint={category.length > 0 ? `${category.length}/${MAX_CATEGORY}` : undefined}
        >
          <Input
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setError('')
            }}
            placeholder="Ex: Cardiologia"
          />
        </FormField>

        <div className="flex items-center justify-between py-2 border-t border-surface-800">
          <div>
            <p className="text-sm font-medium text-surface-200">Profissional ativo</p>
            <p className="text-xs text-surface-500 mt-0.5">Profissionais inativos não são citados pela IA</p>
          </div>
          <Switch checked={active} onChange={setActive} />
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
            disabled={saving || hasLimitError}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60 transition-all"
          >
            {saving ? 'Salvando...' : editPractitioner ? 'Salvar alterações' : 'Criar profissional'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
