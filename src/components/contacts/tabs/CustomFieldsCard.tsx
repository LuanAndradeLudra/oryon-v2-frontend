import { useState, useEffect } from 'react'
import { Pencil, Save, X as XIcon, Plus, Trash2, Settings2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { contactsApi } from '@/services/api'
import type { Contact, ContactCustomField, ContactCustomFieldDef } from '@/types'

interface CustomFieldsCardProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
}

function FieldInput({
  field,
  def,
  onChange,
}: {
  field: ContactCustomField
  def?: ContactCustomFieldDef
  onChange: (value: string) => void
}) {
  const options = def?.options ?? []

  switch (field.type) {
    case 'boolean':
      return <Switch checked={field.value === 'true'} onChange={(v) => onChange(String(v))} />

    case 'textarea':
      return (
        <textarea
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def?.placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 resize-none transition-colors"
        />
      )

    case 'select':
      return (
        <select
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
        >
          <option value="">— Selecione —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )

    case 'multiselect': {
      const selected = field.value ? field.value.split('|') : []
      const toggle = (opt: string) => {
        const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]
        onChange(next.join('|'))
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                selected.includes(opt)
                  ? 'bg-brand-600 border-brand-500 text-surface-950'
                  : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-brand-500/40'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )
    }

    case 'phone':
      return <Input type="tel" value={field.value} onChange={(e) => onChange(e.target.value)} placeholder={def?.placeholder} />

    case 'email':
      return <Input type="email" value={field.value} onChange={(e) => onChange(e.target.value)} placeholder={def?.placeholder} />

    case 'number':
      return <Input type="number" value={field.value} onChange={(e) => onChange(e.target.value)} placeholder={def?.placeholder} />

    case 'date':
      return <Input type="date" value={field.value} onChange={(e) => onChange(e.target.value)} />

    case 'url':
      return <Input type="url" value={field.value} onChange={(e) => onChange(e.target.value)} placeholder={def?.placeholder} />

    default:
      return <Input type="text" value={field.value} onChange={(e) => onChange(e.target.value)} placeholder={def?.placeholder} />
  }
}

function FieldDisplay({ field }: { field: ContactCustomField }) {
  if (field.type === 'boolean') {
    return <p className="text-sm text-surface-200">{field.value === 'true' ? 'Sim' : 'Não'}</p>
  }
  if (field.type === 'multiselect') {
    const items = field.value ? field.value.split('|').filter(Boolean) : []
    if (items.length === 0) return <p className="text-sm text-surface-500">—</p>
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span key={item} className="px-2 py-0.5 rounded-full text-xs bg-brand-900/30 border border-brand-800/50 text-brand-300">{item}</span>
        ))}
      </div>
    )
  }
  if (field.type === 'url' && field.value) {
    return (
      <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-400 hover:underline truncate block">
        {field.value}
      </a>
    )
  }
  return <p className="text-sm text-surface-200">{field.value || '—'}</p>
}

export function CustomFieldsCard({ contact, onSave }: CustomFieldsCardProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [defs, setDefs] = useState<ContactCustomFieldDef[]>([])
  const [fields, setFields] = useState<ContactCustomField[]>(contact.customFields ?? [])

  useEffect(() => {
    contactsApi.getCustomFieldDefs().then((r) => setDefs(r.data)).catch(() => {})
  }, [])

  const availableDefs = defs.filter((d) => !fields.some((f) => f.key === d.key))

  const handleAddField = (def: ContactCustomFieldDef) => {
    setFields((prev) => [...prev, { key: def.key, label: def.label, value: '', type: def.type }])
  }

  const handleRemoveField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key))
  }

  const handleValueChange = (key: string, value: string) => {
    setFields((prev) => prev.map((f) => f.key === key ? { ...f, value } : f))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await contactsApi.updateCustomFields(
        contact.id,
        fields.map((f) => ({ key: f.key, value: f.value })),
      )
      setFields(res.data.customFields ?? [])
      setEditing(false)
    } catch {
      // revert on error
      setFields(contact.customFields ?? [])
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFields(contact.customFields ?? [])
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2"><Settings2 className="w-4 h-4 text-surface-400" /> Campos Personalizados</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={handleCancel} disabled={saving} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <XIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60 transition-all"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {fields.length === 0 && !editing && (
          <p className="text-sm text-surface-600 py-1">Nenhum campo personalizado. Clique em editar para adicionar.</p>
        )}

        {fields.map((field) => {
          const def = defs.find((d) => d.key === field.key)
          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-surface-500 font-medium uppercase tracking-wide">{field.label}</p>
                {editing && (
                  <button onClick={() => handleRemoveField(field.key)} className="text-surface-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editing
                ? <FieldInput field={field} def={def} onChange={(v) => handleValueChange(field.key, v)} />
                : <FieldDisplay field={field} />
              }
            </div>
          )
        })}

        {editing && availableDefs.length > 0 && (
          <div className="pt-2 border-t border-surface-800">
            <p className="text-[11px] text-surface-500 font-medium mb-2">Adicionar campo:</p>
            <div className="flex flex-wrap gap-1.5">
              {availableDefs.map((def) => (
                <button
                  key={def.key}
                  onClick={() => handleAddField(def)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-surface-800 border border-surface-700 text-surface-300 hover:border-brand-500/40 hover:text-brand-300 transition-all"
                >
                  <Plus className="w-3 h-3" /> {def.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
