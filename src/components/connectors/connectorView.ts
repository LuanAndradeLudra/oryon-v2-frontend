// Forma de exibição dos conectores na casca visual da reestilização
// (SCRUM-1110) — Card, Tile e DetailModal leem esta forma. Os dados vêm da
// API real do épico SCRUM-1071 (`connectorsApi.ts` / `types/connectors.ts`)
// por `toConnectorView`; o catálogo de exemplo (connectorsMock) saiu na
// integração da release 2026-09-29.
import type { ConnectorDetail, ConnectorSummary } from '@/types/connectors'
import { getBrandIcon } from '@/data/brandIcons'
import { getCategoryAccent } from '@/components/skills/CategoryIcon'

export type ConnectorStatus = 'installed' | 'available' | 'business' | 'comingSoon'

export interface ConnectorCapability {
  title: string
  description: string
}

export interface Connector {
  id: string
  name: string
  vendor: string
  /** Rótulo em português da categoria (ver CATEGORY_LABELS). */
  category: string
  status: ConnectorStatus
  logoInitial: string
  /** Cor da marca (hex) ou, sem logo confirmado, o acento da categoria. */
  brandColor: string
  description: string
  version?: string
  auth?: string
  dataAccessed?: string
  sync?: string
  planRequirement?: string
  /** Só quando a API informar — nunca inventar número (regra 6). */
  agentsUsing?: number
  requestCount?: number
  capabilities: ConnectorCapability[]
  howItWorks: string
  guideUrl?: string
  socialProof?: string
}

/** Categorias da tabela `connectors` (agent-server) → rótulo da tela. */
export const CATEGORY_LABELS: Record<string, string> = {
  clinic: 'Clínicas',
  crm: 'CRM & Leads',
  payments: 'Pagamentos',
  calendar: 'Agenda',
  productivity: 'Produtividade',
  tasks: 'Tarefas',
  forms: 'Formulários',
  ecommerce: 'E-commerce',
  marketing: 'Marketing',
  communication: 'Comunicação',
  documents: 'Documentos',
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Outros')
}

/** Status do ciclo de vida que já dá para instalar (igual ao agent-server). */
const INSTALLABLE_STATUSES = new Set(['live', 'pilot'])

export function toConnectorView(summary: ConnectorSummary, detail?: ConnectorDetail | null): Connector {
  const status: ConnectorStatus = summary.installed
    ? 'installed'
    : INSTALLABLE_STATUSES.has(summary.status) ? 'available' : 'comingSoon'
  return {
    id: summary.id,
    name: summary.name,
    vendor: summary.vendor ?? summary.name,
    category: categoryLabel(summary.category),
    status,
    logoInitial: summary.name.trim().charAt(0).toUpperCase() || '?',
    brandColor: getBrandIcon(summary.slug)?.hex ?? getCategoryAccent(summary.category as never),
    description: summary.description,
    capabilities: (detail?.capabilities ?? []).map((c) => ({ title: c, description: '' })),
    howItWorks: detail?.long_description ?? summary.setup_instructions ?? summary.description,
    guideUrl: summary.docs_url ?? undefined,
  }
}
