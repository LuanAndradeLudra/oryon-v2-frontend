import { Fragment, useState } from 'react'
import { Pencil, Save, X as XIcon } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import type { Contact } from '@/types'

type InfoFields = Pick<Contact, 'email' | 'company' | 'jobTitle' | 'industry' | 'city' | 'state' | 'country'>

interface ContactInfoCardProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  /** Esconde o título "Dados" quando uma seção já o rotula (ex.: acordeão "Perfil" da ficha completa). */
  hideTitle?: boolean
}

export function ContactInfoCard({ contact, onSave, hideTitle = false }: ContactInfoCardProps) {
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

  const actions = !editing ? (
    <button onClick={() => setEditing(true)} className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
      <Pencil className="w-3 h-3" />
    </button>
  ) : (
    <div className="flex items-center gap-1">
      <button onClick={handleCancel} disabled={saving} className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
        <XIcon className="w-3 h-3" />
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-surface-100 hover:bg-surface-50 text-surface-950 disabled:opacity-60 transition-all"
      >
        <Save className="w-2.5 h-2.5" />
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )

  const body = (
    <>
      {editing ? (
        <div className="flex flex-col gap-3">
          {FIELDS.map((f) => (
            <FormField key={f.key} label={f.label}>
              <Input
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value || undefined }))}
                placeholder={f.placeholder}
              />
            </FormField>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-2.5">
          {FIELDS.map((f) => {
            const val = contact[f.key]
            if (!val) return null
            return (
              <Fragment key={f.key}>
                <p className="text-[11px] text-surface-500 truncate">{f.label}</p>
                <p className="text-[12px] text-surface-200 truncate">{val}</p>
              </Fragment>
            )
          })}
          {FIELDS.every((f) => !contact[f.key]) && (
            <p className="col-span-2 text-xs text-surface-600 py-1">Nenhuma informação cadastrada. Clique em editar para adicionar.</p>
          )}
        </div>
      )}
    </>
  )

  if (hideTitle) {
    return (
      <div>
        <div className="flex items-center justify-end mb-2">{actions}</div>
        {body}
      </div>
    )
  }

  return (
    <CollapsibleSection title="Dados" storageKey="contact-drawer.info" actions={actions}>
      {body}
    </CollapsibleSection>
  )
}
