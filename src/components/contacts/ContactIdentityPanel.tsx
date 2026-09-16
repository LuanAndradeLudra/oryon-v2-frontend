import { TagsCard } from './tabs/TagsCard'
import { ContactInfoCard } from './tabs/ContactInfoCard'
import { CustomFieldsCard } from './tabs/CustomFieldsCard'
import type { Contact, Tag } from '@/types'

interface ContactIdentityPanelProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
}

/**
 * Coluna de identidade (Dados/Etiquetas/Campos personalizados) — README
 * 3.2: "corpo em 2 colunas 260px | 1fr", coluna esquerda fixa. Vive no
 * `ContactDetailPanel`, ao lado do conteúdo trocado pela aba ativa, não
 * dentro de uma aba — antes ficava só na Visão Geral e sumia ao trocar de
 * aba (achado da reauditoria de fidelidade, item 4: "o painel de
 * identidade... some ao trocar de aba"; no mockup ele fica fixo).
 */
export function ContactIdentityPanel({ contact, onSave, onAddTag, onRemoveTag }: ContactIdentityPanelProps) {
  return (
    <div className="flex flex-col gap-3.5 w-full md:w-[260px] flex-shrink-0 md:border-r border-surface-700 px-[18px] py-3.5 overflow-y-auto">
      <TagsCard contact={contact} onAddTag={onAddTag} onRemoveTag={onRemoveTag} flat />
      <ContactInfoCard contact={contact} onSave={onSave} flat />
      <CustomFieldsCard contact={contact} onSave={onSave} flat />
    </div>
  )
}
