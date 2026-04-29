// ─── Schema Field Modal ────────────────────────────────────────────────────
// Visual editor for a single JSON Schema property — used by both the input
// schema (what the LLM fills) and the config schema (what Oryon staff fills
// when attaching a skill). Replaces the JSON-by-hand experience the legacy
// "Tools" tab relied on.

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import type { JsonSchemaProperty } from '@/types/skills'

const NAME_RE = /^[a-z][a-z0-9_]*$/

export interface SchemaFieldDraft {
  name: string
  prop: JsonSchemaProperty
  required: boolean
}

interface Props {
  open: boolean
  /** When set, the modal opens in edit mode and pre-fills from this draft. */
  initial?: SchemaFieldDraft | null
  /** Field names that already exist in the schema; used to block duplicates
   *  on submit. The field's own current name is excluded by the parent before
   *  passing this prop. */
  takenNames: string[]
  onClose: () => void
  onSave: (draft: SchemaFieldDraft) => void
  /** Hide the "Sensível (mascarar na UI)" switch — only meaningful for
   *  config_schema, not input_schema. */
  allowSecret?: boolean
}

const TYPE_OPTIONS: Array<{ value: JsonSchemaProperty['type']; label: string; hint?: string }> = [
  { value: 'string',  label: 'Texto',     hint: 'Nome, e-mail, descrição…' },
  { value: 'number',  label: 'Número',    hint: 'Inteiro ou decimal' },
  { value: 'integer', label: 'Inteiro',   hint: 'Apenas inteiros' },
  { value: 'boolean', label: 'Sim/Não',   hint: 'true ou false' },
  { value: 'array',   label: 'Lista',     hint: 'Array de valores' },
  { value: 'object',  label: 'Objeto',    hint: 'Sub-objeto avançado' },
]

export function SchemaFieldModal({
  open,
  initial,
  takenNames,
  onClose,
  onSave,
  allowSecret = false,
}: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<JsonSchemaProperty['type']>('string')
  const [description, setDescription] = useState('')
  const [required, setRequired] = useState(false)
  const [enumEnabled, setEnumEnabled] = useState(false)
  const [enumValuesRaw, setEnumValuesRaw] = useState('')
  const [secret, setSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when the modal opens — covers both "new" (initial null) and
  // "edit" (initial provided). useEffect on `open` is the cleanest hook here
  // because the parent passes a fresh `initial` every time it opens.
  useEffect(() => {
    if (!open) return
    setError(null)
    if (initial) {
      setName(initial.name)
      setType(initial.prop.type)
      setDescription(initial.prop.description ?? '')
      setRequired(initial.required)
      const en = initial.prop.enum
      setEnumEnabled(Array.isArray(en) && en.length > 0)
      setEnumValuesRaw(Array.isArray(en) ? en.map(String).join(', ') : '')
      setSecret(!!initial.prop.secret)
    } else {
      setName('')
      setType('string')
      setDescription('')
      setRequired(false)
      setEnumEnabled(false)
      setEnumValuesRaw('')
      setSecret(false)
    }
  }, [open, initial])

  function handleSave() {
    const trimmed = name.trim()
    if (!NAME_RE.test(trimmed)) {
      setError('Nome inválido — use apenas letras minúsculas, números e _ (começando por letra).')
      return
    }
    if (takenNames.includes(trimmed)) {
      setError(`Já existe um campo chamado "${trimmed}".`)
      return
    }

    const prop: JsonSchemaProperty = { type }
    const desc = description.trim()
    if (desc) prop.description = desc

    if (enumEnabled) {
      const values = enumValuesRaw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      if (values.length === 0) {
        setError('Lista de valores está vazia — adicione pelo menos um valor ou desative o enum.')
        return
      }
      // Keep numeric values typed when the field is numeric so JSON Schema
      // matches what the LLM will actually generate.
      if (type === 'number' || type === 'integer') {
        const numeric = values.map((v) => Number(v))
        if (numeric.some((n) => !Number.isFinite(n))) {
          setError('Valores numéricos inválidos no enum.')
          return
        }
        prop.enum = numeric
      } else {
        prop.enum = values
      }
    }

    if (allowSecret && secret) prop.secret = true

    onSave({ name: trimmed, prop, required })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Editar campo "${initial.name}"` : 'Novo campo'}
      className="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <Field label="Nome do campo" hint="Identificador técnico — em snake_case">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: nome_paciente"
          />
        </Field>

        <Field label="Tipo">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as JsonSchemaProperty['type'])}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <p className="text-xs text-surface-500 mt-1">
            {TYPE_OPTIONS.find((o) => o.value === type)?.hint}
          </p>
        </Field>

        <Field
          label={allowSecret ? 'Descrição (visível para você)' : 'Descrição (a IA lê)'}
          hint={allowSecret
            ? 'Texto curto explicando o que esse campo representa.'
            : 'Diga à IA o que esse campo significa e como preenchê-lo.'}
        >
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={allowSecret
              ? 'ex: ID interno da unidade onde esse agente atende'
              : 'ex: Nome completo do paciente, como ele preferir ser chamado'}
          />
        </Field>

        <RowSwitch
          label="Obrigatório"
          hint={allowSecret
            ? 'Tornar o preenchimento obrigatório quando o template for atribuído.'
            : 'Forçar a IA a sempre preencher esse campo.'}
          checked={required}
          onChange={setRequired}
        />

        <RowSwitch
          label="Lista de valores fixos"
          hint="Restringe o campo a um conjunto fechado (separado por vírgulas)."
          checked={enumEnabled}
          onChange={setEnumEnabled}
        />
        {enumEnabled && (
          <Input
            value={enumValuesRaw}
            onChange={(e) => setEnumValuesRaw(e.target.value)}
            placeholder="ex: clinico, cardio, derma"
          />
        )}

        {allowSecret && (
          <RowSwitch
            label="Campo sensível"
            hint="Mascarado na UI ao preencher (tipo password). Use para tokens, chaves de API."
            checked={secret}
            onChange={setSecret}
          />
        )}

        {error && (
          <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              'bg-brand-600 text-surface-950 hover:bg-brand-500',
            )}
          >
            {initial ? 'Salvar alterações' : 'Adicionar campo'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Tiny helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-200 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-surface-500 mt-1">{hint}</p>}
    </div>
  )
}

function RowSwitch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-surface-100">{label}</p>
        {hint && <p className="text-[11px] text-surface-500 mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}
