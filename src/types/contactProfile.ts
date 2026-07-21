// ── Tipos da página de perfil do contato (Customer 360) ─────────────────────
// Entidades que AINDA NÃO têm backend. Vivem fora de types/index.ts de
// propósito: quando os endpoints nascerem, estes tipos migram (ou são
// ajustados) junto com a troca do data source mock → API real.
// Mapa de endpoints futuros em components/contacts/profile/mockData.ts.

export type DealStatus = 'open' | 'won' | 'lost'

export interface Deal {
  id: string
  title: string
  /** Valor em reais (não centavos) — alinhar com amountCents na integração real. */
  value: number
  currency: string
  stageLabel: string
  status: DealStatus
  expectedCloseAt?: string
  createdAt: string
}

export interface ContactNote {
  id: string
  body: string
  authorName: string
  createdAt: string
  pinned?: boolean
}

export type ContactTaskStatus = 'pending' | 'done' | 'overdue'

export interface ContactTask {
  id: string
  title: string
  dueAt: string
  status: ContactTaskStatus
  assigneeName?: string
}

export type CampaignTouchStatus = 'sent' | 'delivered' | 'read' | 'replied' | 'failed'

export interface CampaignTouch {
  id: string
  campaignName: string
  channel: 'whatsapp'
  status: CampaignTouchStatus
  sentAt: string
}

export type AutomationRunStatus = 'completed' | 'running' | 'failed'

export interface AutomationRun {
  id: string
  automationName: string
  trigger: string
  status: AutomationRunStatus
  startedAt: string
  stepsDone: number
  stepsTotal: number
}
