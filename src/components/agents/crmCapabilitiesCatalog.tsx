// ─── CRM Capabilities Catalog (client-side) ──────────────────────────────────
//
// Phase 25 — mirror of agent-server/src/config/crmCapabilities/index.ts.
// Lives client-side so both the post-creation editing tab (CapabilitiesTab)
// and the wizard's review step (Step8 in AgentBuilderWizard) can render
// labels, descriptions and conservative defaults without an extra fetch.
//
// IMPORTANT: when the server-side catalog changes, mirror the change here.

import { CheckCircle, Tag as TagIcon, MoveRight, UserCog, MessageSquare } from 'lucide-react'
import type {
  ConversationStatus,
  CrmCapabilityCategory,
  CrmCapabilityConstraints,
  CrmCapabilityId,
} from '@/services/agentsApi'

export interface CrmCapabilityCatalogEntry {
  id: CrmCapabilityId
  category: CrmCapabilityCategory
  label: string
  description: string
  icon: React.ReactNode
  /** Which constraint pickers this capability supports. */
  supports: Array<'users' | 'statuses' | 'tags' | 'stages'>
  /**
   * Conservative defaults applied the first time the user enables this
   * capability. Mirrors the agent-server's defaultConstraints.
   */
  defaultConstraints?: CrmCapabilityConstraints
}

export const STATUS_OPTIONS: Array<{ id: ConversationStatus; label: string; help: string }> = [
  { id: 'open',      label: 'Aberta',     help: 'Conversa em atendimento normal' },
  { id: 'pending',   label: 'Pendente',   help: 'Movida para a fila aguardando humano' },
  { id: 'resolved',  label: 'Resolvida',  help: 'Encerramento — use só com confirmação do cliente' },
  { id: 'abandoned', label: 'Abandonada', help: 'Arquivada por inatividade' },
]

export const CRM_CAPABILITIES_CATALOG: CrmCapabilityCatalogEntry[] = [
  {
    id: 'manage_conversation_status',
    category: 'conversation',
    label: 'Encerrar e reabrir conversas',
    description: 'O agente pode mover a conversa entre os status (aberta, pendente, resolvida, abandonada).',
    icon: <CheckCircle className="w-4 h-4" />,
    supports: ['statuses'],
    defaultConstraints: {
      // Default conservador: bloquear "resolved" — exige opt-in explícito
      // para impedir que o LLM encerre sozinho conversas antes de hora.
      allowedStatuses: ['open', 'pending', 'abandoned'],
    },
  },
  {
    id: 'assign_conversation_to_user',
    category: 'conversation',
    label: 'Atribuir conversa a um atendente',
    description: 'O agente pode encaminhar a conversa para um atendente humano específico (ex: time de Suporte).',
    icon: <UserCog className="w-4 h-4" />,
    supports: ['users'],
  },
  {
    id: 'manage_conversation_tags',
    category: 'tags',
    label: 'Etiquetar conversas',
    description: 'O agente pode adicionar e remover etiquetas na conversa atual.',
    icon: <TagIcon className="w-4 h-4" />,
    supports: ['tags'],
  },
  {
    id: 'tag_contact',
    category: 'tags',
    label: 'Etiquetar contato',
    description: 'O agente pode adicionar/remover etiquetas no perfil do contato (separado da conversa).',
    icon: <TagIcon className="w-4 h-4" />,
    supports: ['tags'],
  },
  {
    id: 'manage_contact_pipeline',
    category: 'pipeline',
    label: 'Mover contato no funil',
    description: 'O agente pode atualizar o estágio do contato (ex: Lead → Qualificado).',
    icon: <MoveRight className="w-4 h-4" />,
    supports: ['stages'],
  },
]

export const CRM_CATEGORY_META: Record<CrmCapabilityCategory, { label: string; icon: React.ReactNode }> = {
  conversation: { label: 'Conversas', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  contact:      { label: 'Contato',   icon: <UserCog className="w-3.5 h-3.5" /> },
  tags:         { label: 'Etiquetas', icon: <TagIcon className="w-3.5 h-3.5" /> },
  pipeline:     { label: 'Funil',     icon: <MoveRight className="w-3.5 h-3.5" /> },
}
