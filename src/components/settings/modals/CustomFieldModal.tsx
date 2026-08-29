import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { FormDialog } from '@/components/ui/FormDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import type { ContactCustomFieldDef, CustomFieldType } from '@/types'

const FIELD_TYPES: { value: CustomFieldType; label: string; description: string }[] = [
  { value: 'text',        label: 'Texto',         description: 'Campo de texto livre' },
  { value: 'textarea',    label: 'Texto longo',   description: 'Área de texto multilinha' },
  { value: 'number',      label: 'Número',        description: 'Valor numérico' },
  { value: 'date',        label: 'Data',          description: 'Seletor de data' },
  { value: 'boolean',     label: 'Sim / Não',     description: 'Alternância verdadeiro/falso' },
  { value: 'url',         label: 'URL',           description: 'Link externo' },
  { value: 'email',       label: 'E-mail',        description: 'Endereço de e-mail' },
  { value: 'phone',       label: 'Telefone',      description: 'Número de telefone' },
  { value: 'select',      label: 'Seleção única', description: 'Uma opção de uma lista' },
  { value: 'multiselect', label: 'Múltipla escolha', description: 'Várias opções de uma lista' },
]

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface CustomFieldModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<ContactCustomFieldDef, 'order'>) => Promise<void>
  editField?: ContactCustomFieldDef | null
  existingKeys: string[]
}

export function CustomFieldModal({ open, onClose, onSave, editField, existingKeys }: CustomFieldModalProps) {
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(editField?.label ?? '')
      setKey(editField?.key ?? '')
      setType(editField?.type ?? 'text')
      setPlaceholder(editField?.placeholder ?? '')
      setRequired(editField?.required ?? false)
      setOptions(editField?.options ?? [])
      setNewOption('')
      setKeyManuallyEdited(!!editField)
      setError('')
    }
  }, [open, editField])

  const handleLabelChange = (val: string) => {
    setLabel(val)
    if (!keyManuallyEdited) setKey(slugify(val))
  }

  const addOption = () => {
    const trimmed = newOption.trim()
    if (!trimmed || options.includes(trimmed)) return
    setOptions([...options, trimmed])
    setNewOption('')
  }

  const removeOption = (opt: string) => {
    setOptions(options.filter((o) => o !== opt))
  }

  const handleSave = async () => {
    if (!label.trim()) { setError('O nome do campo é obrigatório.'); return }
    if (!key.trim()) { setError('A chave interna é obrigatória.'); return }
    const finalKey = slugify(key)
    if (!editField && existingKeys.includes(finalKey)) {
      setError(`Já existe um campo com a chave "${finalKey}".`); return
    }
    if ((type === 'select' || type === 'multiselect') && options.length === 0) {
      setError('Adicione pelo menos uma opção para este tipo de campo.'); return
    }
    setSaving(true)
    try {
      await onSave({
        key: finalKey,
        label: label.trim(),
        type,
        placeholder: placeholder || undefined,
        required,
        options: (type === 'select' || type === 'multiselect') ? options : undefined,
      })
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar campo.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const hasOptions = type === 'select' || type === 'multiselect'
  const showPlaceholder = type !== 'boolean' && !hasOptions

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editField ? 'Editar campo' : 'Novo campo personalizado'}
      onSubmit={handleSave}
      submitLabel={editField ? 'Salvar alterações' : 'Criar campo'}
      loading={saving}
      error={error || null}
      className="max-w-md"
    >
        <FormField label="Nome do campo" required>
          <Input
            value={label}
            onChange={(e) => { handleLabelChange(e.target.value); setError('') }}
            placeholder="Ex: CPF, Receita Anual, Segmento"
            autoFocus
          />
        </FormField>

        <FormField label="Chave interna" hint="Identificador único, gerado automaticamente. Não pode ser alterado após criação.">
          <Input
            value={key}
            onChange={(e) => { setKey(e.target.value); setKeyManuallyEdited(true) }}
            placeholder="cpf, receita-anual, segmento"
            disabled={!!editField}
            className="font-mono text-sm"
          />
        </FormField>

        <FormField label="Tipo do campo">
          <Select value={type} onChange={(e) => { setType(e.target.value as CustomFieldType); setError('') }}>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
            ))}
          </Select>
        </FormField>

        {hasOptions && (
          <FormField label="Opções" hint="Digite cada opção e pressione Enter ou clique em Adicionar.">
            <div className="flex gap-2 mb-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                placeholder="Digite uma opção..."
              />
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-surface-200 transition-all whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
            {options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {options.map((opt) => (
                  <span
                    key={opt}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-surface-800 border border-surface-700 text-surface-200"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => removeOption(opt)}
                      className="text-surface-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {options.length === 0 && (
              <p className="text-xs text-surface-600 mt-1">Nenhuma opção adicionada ainda.</p>
            )}
          </FormField>
        )}

        {showPlaceholder && (
          <FormField label="Placeholder (opcional)">
            <Input
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Texto de exemplo para o campo"
            />
          </FormField>
        )}

        <div className="flex items-center justify-between py-2 border-t border-surface-800">
          <div>
            <p className="text-sm font-medium text-surface-200">Campo obrigatório</p>
            <p className="text-xs text-surface-500 mt-0.5">Bloqueia salvar contato sem preencher</p>
          </div>
          <Switch checked={required} onChange={setRequired} />
        </div>
    </FormDialog>
  )
}
