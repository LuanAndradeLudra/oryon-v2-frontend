import { Users, Tag as TagIcon, BarChart2, UserCheck, SlidersHorizontal } from 'lucide-react'
import type { ContactIntent, ContactSource, ContactSentiment, CampaignSegment } from '@/types'

export const CONTACT_FIELDS = [
  { value: 'displayName', label: 'Nome do contato' },
  { value: 'company',     label: 'Empresa' },
  { value: 'email',       label: 'E-mail' },
  { value: 'city',        label: 'Cidade' },
  { value: 'jobTitle',    label: 'Cargo' },
]

export const SEGMENT_OPTIONS: {
  value: CampaignSegment['type']
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'all',    label: 'Toda a base',       description: 'Todos os contatos cadastrados na sua conta',              icon: Users },
  { value: 'tag',    label: 'Por tags',           description: 'Filtra contatos com uma ou mais tags específicas',         icon: TagIcon },
  { value: 'stage',  label: 'Situação do contato', description: 'Contatos em determinadas situações do ciclo de vida',     icon: BarChart2 },
  { value: 'manual', label: 'Seleção manual',    description: 'Busque e escolha cada contato individualmente',            icon: UserCheck },
  { value: 'filter', label: 'Filtro avançado',   description: 'Combine intenção, origem, opt-in e estágio livremente',   icon: SlidersHorizontal },
]

export const INTENT_OPTIONS: { value: ContactIntent; label: string; chip: string }[] = [
  { value: 'high',    label: 'Alta',       chip: 'var(--color-status-active)' },
  { value: 'medium',  label: 'Média',      chip: 'var(--color-status-pending)' },
  { value: 'low',     label: 'Baixa',      chip: 'var(--color-danger)' },
  { value: 'unknown', label: 'Indefinida', chip: 'var(--color-status-muted)' },
]

export const SOURCE_OPTIONS: { value: ContactSource; label: string }[] = [
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'website',   label: 'Website' },
  { value: 'referral',  label: 'Indicação' },
  { value: 'campaign',  label: 'Campanha' },
  { value: 'manual',    label: 'Manual' },
  { value: 'import',    label: 'Importação' },
]

export const SENTIMENT_OPTIONS: { value: ContactSentiment; label: string; chip: string }[] = [
  { value: 'positive', label: 'Positivo',     chip: 'var(--color-status-active)' },
  { value: 'neutral',  label: 'Neutro',       chip: 'var(--color-status-pending)' },
  { value: 'negative', label: 'Negativo',     chip: 'var(--color-danger)' },
  { value: 'unknown',  label: 'Desconhecido', chip: 'var(--color-status-muted)' },
]
