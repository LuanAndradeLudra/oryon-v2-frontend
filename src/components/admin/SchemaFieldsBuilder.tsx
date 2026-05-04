// ─── Schema Fields Builder ─────────────────────────────────────────────────
// Visual editor for a JSON Schema's `properties` + `required` arrays. Renders
// a list of cards (one per field) with edit/remove, and exposes a "+ Adicionar
// campo" button that opens SchemaFieldModal. The builder produces a
// JsonSchemaObject — the parent never has to read or write JSON by hand.

import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit3, Lock } from 'lucide-react'
import { SchemaFieldModal, type SchemaFieldDraft } from './SchemaFieldModal'
import { cn } from '@/lib/utils'
import type { JsonSchemaObject, JsonSchemaProperty } from '@/types/skills'

interface Props {
  /** Either a real JsonSchemaObject or anything coerced to "no schema yet". */
  value: JsonSchemaObject | unknown[] | null | undefined
  onChange: (schema: JsonSchemaObject) => void
  /** Toggles the "secret" switch in the field modal. */
  allowSecret?: boolean
  /** Plain-text guidance shown above the list. */
  emptyHint?: string
}

const EMPTY_SCHEMA: JsonSchemaObject = { type: 'object', properties: {}, required: [] }

function normalize(value: Props['value']): JsonSchemaObject {
  if (!value || Array.isArray(value)) return EMPTY_SCHEMA
  if (typeof value !== 'object' || (value as JsonSchemaObject).type !== 'object') return EMPTY_SCHEMA
  const obj = value as JsonSchemaObject
  return {
    type: 'object',
    properties: obj.properties ?? {},
    required: obj.required ?? [],
  }
}

export function SchemaFieldsBuilder({
  value,
  onChange,
  allowSecret = false,
  emptyHint,
}: Props) {
  const schema = useMemo(() => normalize(value), [value])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SchemaFieldDraft | null>(null)

  const fields = Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    prop,
    required: schema.required?.includes(name) ?? false,
  }))

  const takenNames = useMemo(
    () => fields.filter((f) => f.name !== editing?.name).map((f) => f.name),
    [fields, editing],
  )

  function handleSave(draft: SchemaFieldDraft) {
    const oldName = editing?.name
    const newProperties: Record<string, JsonSchemaProperty> = { ...schema.properties }
    if (oldName && oldName !== draft.name) {
      delete newProperties[oldName]
    }
    newProperties[draft.name] = draft.prop

    let newRequired = (schema.required ?? []).filter((n) => n !== oldName && n !== draft.name)
    if (draft.required) newRequired.push(draft.name)

    onChange({ type: 'object', properties: newProperties, required: newRequired })
    setEditing(null)
  }

  function handleRemove(name: string) {
    const newProperties = { ...schema.properties }
    delete newProperties[name]
    const newRequired = (schema.required ?? []).filter((n) => n !== name)
    onChange({ type: 'object', properties: newProperties, required: newRequired })
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(field: SchemaFieldDraft) {
    setEditing(field)
    setModalOpen(true)
  }

  return (
    <div>
      {fields.length === 0 ? (
        <div className="border border-dashed border-surface-700 rounded-lg p-6 text-center bg-surface-900/40">
          <p className="text-sm text-surface-400 mb-3">
            {emptyHint ?? 'Nenhum campo ainda. Adicione o primeiro abaixo.'}
          </p>
          <button
            type="button"
            onClick={openNew}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold',
              'bg-brand-600 text-surface-950 hover:bg-brand-500 transition-colors',
            )}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar campo
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {fields.map((f) => (
              <FieldRow
                key={f.name}
                field={f}
                onEdit={() => openEdit(f)}
                onRemove={() => handleRemove(f.name)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar campo
          </button>
        </>
      )}

      <SchemaFieldModal
        open={modalOpen}
        initial={editing}
        takenNames={takenNames}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        allowSecret={allowSecret}
      />
    </div>
  )
}

function FieldRow({
  field,
  onEdit,
  onRemove,
}: {
  field: SchemaFieldDraft
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface-900 border border-surface-700">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-sm text-surface-100">{field.name}</span>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-800 text-surface-400">
            {field.prop.type}
          </span>
          {field.required && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-active-bg text-status-active">
              obrigatório
            </span>
          )}
          {field.prop.enum && field.prop.enum.length > 0 && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-600/15 text-brand-400">
              enum
            </span>
          )}
          {field.prop.secret && (
            <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-status-pending-bg text-status-pending">
              <Lock className="w-2.5 h-2.5" /> sensível
            </span>
          )}
        </div>
        {field.prop.description && (
          <p className="text-xs text-surface-400 line-clamp-2">{field.prop.description}</p>
        )}
        {field.prop.enum && field.prop.enum.length > 0 && (
          <p className="text-[11px] text-surface-500 mt-0.5 truncate">
            valores: {field.prop.enum.map(String).join(', ')}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-surface-300 hover:bg-surface-800 transition-colors"
        >
          <Edit3 className="w-3 h-3" /> Editar
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Remover
        </button>
      </div>
    </div>
  )
}
