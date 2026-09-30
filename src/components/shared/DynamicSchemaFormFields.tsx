// ─── Dynamic Schema Form Fields ────────────────────────────────────────────
// Renders form inputs from a JSON Schema object the operator built in the
// editor. Used by the Tester (Phase 2D) to fill `config` and `inputs`, and
// later by the Assign screen (Phase 2E) to fill the per-instance config.
//
// Supported types: string, number, integer, boolean, array (csv), object
// (read-only JSON for now). Honours `description`, `enum`, `secret`.

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Eye, EyeOff } from 'lucide-react'
import type { JsonSchemaObject, JsonSchemaProperty } from '@/types/skills'

interface Props {
  schema: JsonSchemaObject | unknown[] | null | undefined
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  /** Hint shown when the schema has zero properties. */
  emptyHint?: string
}

export function DynamicSchemaFormFields({ schema, values, onChange, emptyHint }: Props) {
  if (!schema || Array.isArray(schema) || (schema as JsonSchemaObject).type !== 'object') {
    return <p className="text-xs text-surface-500">{emptyHint ?? 'Schema vazio.'}</p>
  }
  const obj = schema as JsonSchemaObject
  const required = new Set(obj.required ?? [])
  const entries = Object.entries(obj.properties ?? {})
  if (entries.length === 0) {
    return <p className="text-xs text-surface-500">{emptyHint ?? 'Sem campos para preencher.'}</p>
  }

  const update = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, prop]) => (
        <FieldRenderer
          key={key}
          name={key}
          prop={prop}
          required={required.has(key)}
          value={values[key]}
          onChange={(v) => update(key, v)}
        />
      ))}
    </div>
  )
}

function FieldRenderer({
  name,
  prop,
  required,
  value,
  onChange,
}: {
  name: string
  prop: JsonSchemaProperty
  required: boolean
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = (
    <label className="block text-xs font-medium text-surface-200 mb-1">
      <span className="font-mono text-surface-100">{name}</span>
      {required && <span className="text-danger ml-1">*</span>}
      <span className="text-surface-500 ml-2 font-normal">({prop.type})</span>
    </label>
  )
  const hint = prop.description && (
    <p className="text-[11px] text-surface-500 mt-1">{prop.description}</p>
  )

  // ── Enum (any type) ───────────────────────────────────────────────────────
  if (prop.enum && prop.enum.length > 0) {
    return (
      <div>
        {label}
        <Select
          value={String(value ?? '')}
          onChange={(e) => {
            const raw = e.target.value
            // Coerce back to number when the schema uses numeric enum values.
            if (prop.type === 'number' || prop.type === 'integer') onChange(raw === '' ? null : Number(raw))
            else onChange(raw)
          }}
        >
          <option value="">— escolher —</option>
          {prop.enum.map((v) => (
            <option key={String(v)} value={String(v)}>{String(v)}</option>
          ))}
        </Select>
        {hint}
      </div>
    )
  }

  // ── Boolean ───────────────────────────────────────────────────────────────
  if (prop.type === 'boolean') {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-surface-200">
            <span className="font-mono text-surface-100">{name}</span>
            {required && <span className="text-danger ml-1">*</span>}
          </label>
          {hint}
        </div>
        <Switch checked={!!value} onChange={onChange} />
      </div>
    )
  }

  // ── Number / Integer ──────────────────────────────────────────────────────
  if (prop.type === 'number' || prop.type === 'integer') {
    return (
      <div>
        {label}
        <Input
          type="number"
          step={prop.type === 'integer' ? 1 : 'any'}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return onChange(null)
            const n = Number(raw)
            onChange(Number.isFinite(n) ? n : raw)
          }}
        />
        {hint}
      </div>
    )
  }

  // ── Array (CSV input) ─────────────────────────────────────────────────────
  if (prop.type === 'array') {
    const arr = Array.isArray(value) ? value : []
    return (
      <div>
        {label}
        <Input
          value={arr.join(', ')}
          placeholder="item1, item2, item3"
          onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
        <p className="text-[11px] text-surface-500 mt-1">Separe valores por vírgula.</p>
      </div>
    )
  }

  // ── Object (raw JSON for now — rare in practice) ──────────────────────────
  if (prop.type === 'object') {
    return (
      <div>
        {label}
        <Textarea
          rows={3}
          value={value === undefined || value === null ? '' : JSON.stringify(value, null, 2)}
          placeholder='{"chave": "valor"}'
          onChange={(e) => {
            const raw = e.target.value
            if (!raw.trim()) return onChange(null)
            try { onChange(JSON.parse(raw)) } catch { onChange(raw) }
          }}
        />
        <p className="text-[11px] text-surface-500 mt-1">JSON válido (ainda não temos editor visual de objetos).</p>
      </div>
    )
  }

  // ── Default: string (with secret toggle) ──────────────────────────────────
  return <SecretAwareStringField name={name} prop={prop} required={required} label={label} hint={hint} value={value} onChange={onChange} />
}

function SecretAwareStringField({
  name,
  prop,
  label,
  hint,
  value,
  onChange,
}: {
  name: string
  prop: JsonSchemaProperty
  required: boolean
  label: React.ReactNode
  hint: React.ReactNode
  value: unknown
  onChange: (v: unknown) => void
}) {
  const [revealed, setRevealed] = useState(false)
  const isSecret = !!prop.secret
  return (
    <div>
      {label}
      <div className="relative">
        <Input
          type={isSecret && !revealed ? 'password' : 'text'}
          autoComplete={isSecret ? 'new-password' : 'off'}
          value={typeof value === 'string' ? value : (value === undefined || value === null ? '' : String(value))}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSecret ? '••••••••' : `valor para ${name}`}
          className={isSecret ? 'pr-10' : undefined}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setRevealed((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-surface-400 hover:text-surface-200 transition-colors"
            tabIndex={-1}
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint}
    </div>
  )
}
