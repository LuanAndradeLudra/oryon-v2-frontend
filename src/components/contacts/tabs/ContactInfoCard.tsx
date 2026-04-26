import { useState } from 'react'
import { Pencil, Save, X as XIcon, User } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import type { Contact } from '@/types'

type InfoFields = Pick<Contact, 'email' | 'company' | 'jobTitle' | 'industry' | 'city' | 'state' | 'country'>

interface ContactInfoCardProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
}

export function ContactInfoCard({ contact, onSave }: ContactInfoCardProps) {
  const { vocab } = useTenantVocab()
  const FIELDS: { key: keyof InfoFields; label: string; placeholder: string }[] = [
    { key: 'email',    label: 'E-mail',       placeholder: 'nome@empresa.com' },
    { key: 'company',  label: vocab.company,   placeholder: `Nome da ${vocab.company.toLowerCase()}` },
    { key: 'jobTitle', label: vocab.jobTitle,  placeholder: `${vocab.jobTitle} ou função` },
    { key: 'industry', label: 'Setor',         placeholder: 'Tecnologia, Saúde...' },
    { key: 'city',     label: 'Cidade',        placeholder: 'São Paulo' },
    { key: 'state',    label: 'Estado',        placeholder: 'SP' },
    { key: 'country',  label: 'País',          placeholder: 'Brasil' },
  ]
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<InfoFields>({
    email: contact.email,
    company: contact.company,
    jobTitle: contact.jobTitle,
    industry: contact.industry,
    city: contact.city,
    state: contact.state,
    country: contact.country,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(form)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      email: contact.email, company: contact.company, jobTitle: contact.jobTitle,
      industry: contact.industry, city: contact.city, state: contact.state, country: contact.country,
    })
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border border-surface-800 bg-surface-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2"><User className="w-4 h-4 text-surface-400" /> Informações</h3>
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

      <div className="px-4 py-4">
        {editing ? (
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.key === 'email' || f.key === 'company' ? 'col-span-2' : ''}>
                <FormField label={f.label}>
                  <Input
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value || undefined }))}
                    placeholder={f.placeholder}
                  />
                </FormField>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {FIELDS.map((f) => {
              const val = contact[f.key]
              if (!val) return null
              return (
                <div key={f.key} className={f.key === 'email' || f.key === 'company' ? 'col-span-2' : ''}>
                  <p className="text-[11px] text-surface-500 font-medium uppercase tracking-wide mb-0.5">{f.label}</p>
                  <p className="text-sm text-surface-200 truncate">{val}</p>
                </div>
              )
            })}
            {FIELDS.every((f) => !contact[f.key]) && (
              <p className="col-span-2 text-sm text-surface-600 py-2">Nenhuma informação cadastrada. Clique em editar para adicionar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
