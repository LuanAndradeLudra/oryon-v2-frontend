import { TagsCard } from './tabs/TagsCard'
import { ContactInfoCard } from './tabs/ContactInfoCard'
import { CustomFieldsCard } from './tabs/CustomFieldsCard'
import { cn } from '@/lib/utils'
import type { Contact, Tag } from '@/types'

interface ContactIdentityPanelProps {
  contact: Contact
  onSave: (patch: Partial<Contact>) => Promise<void>
  onAddTag: (tag: Tag) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
  /** Painel acoplado (400px): a coluna vira uma seção empilhada no topo do
   *  corpo, que rola inteiro — o breakpoint `md:` é da viewport, não do painel,
   *  então sem isto ela ficaria em 260px lateral dentro de 400px. */
  stacked?: boolean
}

/**
 * Coluna de identidade (Dados/Etiquetas/Campos personalizados) — README
 * 3.2: "corpo em 2 colunas 260px | 1fr", coluna esquerda fixa. Vive no
 * `ContactDetailPanel`, ao lado do conteúdo trocado pela aba ativa, não
 * dentro de uma aba — antes ficava só na Visão Geral e sumia ao trocar de
 * aba (achado da reauditoria de fidelidade, item 4: "o painel de
 * identidade... some ao trocar de aba"; no mockup ele fica fixo).
 */
export function ContactIdentityPanel({ contact, onSave, onAddTag, onRemoveTag, stacked = false }: ContactIdentityPanelProps) {
  return (
    <div className={cn(
      'flex flex-col gap-3.5 flex-shrink-0 border-surface-700 px-[18px] py-3.5',
      stacked ? 'w-full border-b' : 'w-full md:w-[260px] md:border-r overflow-y-auto',
    )}>
      <TagsCard contact={contact} onAddTag={onAddTag} onRemoveTag={onRemoveTag} flat />
      <ContactInfoCard contact={contact} onSave={onSave} flat />
      <CustomFieldsCard contact={contact} onSave={onSave} flat />
    </div>
  )
}
