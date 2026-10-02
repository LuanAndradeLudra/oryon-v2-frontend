// ─── Admin Billing API (super_admin) ──────────────────────────────────────────
// Console do operador (SCRUM-1205) e, depois, catálogo e carteira (SCRUM-1211).
// Tudo em /admin/billing/*, protegido por @Roles(SUPER_ADMIN) no backend.

import { api } from './api'

export type PlanTierId = 'start' | 'professional' | 'scale' | 'enterprise'
export type ContractTermId = 'annual' | 'semiannual' | 'monthly'
export type PaymentModeId = 'upfront' | 'installments' | 'monthly'
export type PaymentMethodId = 'card_monthly' | 'pix_invoice' | 'upfront_pix' | 'upfront_card'
export type OveragePolicyId = 'charge' | 'limit' | 'pack'
export type EntitlementKeyId =
  | 'users' | 'waNumbers' | 'agents' | 'automations' | 'pipelines' | 'customFields' | 'campaignsPerMonth'

export const ENTITLEMENT_LABELS: Record<EntitlementKeyId, string> = {
  users: 'Usuários',
  waNumbers: 'Números de WhatsApp',
  agents: 'Agentes de IA',
  automations: 'Automações ativas',
  pipelines: 'Funis',
  customFields: 'Campos customizados',
  campaignsPerMonth: 'Campanhas por mês (aviso)',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  card_monthly: 'Cartão — cobrança mensal recorrente',
  pix_invoice: 'Fatura mensal paga por Pix',
  upfront_pix: 'À vista no Pix',
  upfront_card: 'À vista no cartão (parcelado no checkout)',
}

export const TERM_LABELS: Record<ContractTermId, string> = {
  annual: 'Anual (12 meses)',
  semiannual: 'Semestral (6 meses)',
  monthly: 'Mensal',
}

export const PAYMENT_MODE_LABELS: Record<PaymentModeId, string> = {
  upfront: 'À vista',
  installments: 'Parcelado',
  monthly: 'Mensalidade',
}

export interface CatalogPlan {
  id: string
  tier: PlanTierId
  displayName: string
  priceMonthlyCents: number
  monthlyCredits: number | null
  tokensPerCredit: number
  features: { entitlements?: Partial<Record<EntitlementKeyId, number | null>>; modules?: Record<string, boolean> } & Record<string, unknown>
  active: boolean
  /** ISO — volta no PUT como `expectedUpdatedAt` (409 se outra pessoa salvou antes). */
  updatedAt?: string
}

export interface VendableCombo {
  term: ContractTermId
  paymentMode: PaymentModeId
  discountPct: number
  rollover: boolean
  setupWaivable: boolean
  sellable: boolean
  showcase: boolean
  note?: string
}

export interface ProvisionCompany {
  documentType?: 'cpf' | 'cnpj'
  taxId?: string
  legalName?: string
  stateRegistration?: string
  municipalRegistration?: string
  billingEmail?: string
  billingContact?: string
  billingPhone?: string
  addressZip?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressDistrict?: string
  addressCity?: string
  addressState?: string
  addressIbgeCode?: string
}

export interface ProvisionTermsBody {
  planTier: PlanTierId
  term: ContractTermId
  paymentMode: PaymentModeId
  installments?: number
  contractedMonthlyCents?: number
  discountPct?: number
  setupFeeCents?: number
  setupWaived?: boolean
  displayName?: string
  paymentMethod?: PaymentMethodId
  billingDay?: number
  proposalRef?: string
  startsAt?: string
  signatory?: { name: string; document: string; email: string }
  monthlyCredits?: number | null
  rolloverPct?: number
  overage?: { priceCents?: number; blockCredits?: number; policy?: OveragePolicyId; ceilingPct?: number; onNextInvoice?: boolean }
  entitlements?: Partial<Record<EntitlementKeyId, number | null>>
  modules?: Record<string, boolean>
  readjustIndex?: string | null
  readjustPeriodMonths?: number | null
  autoRechargeAuthorized?: boolean
}

export interface ProvisionBody extends ProvisionTermsBody {
  companyName: string
  adminEmail: string
  adminFirstName: string
  adminLastName?: string
  company?: ProvisionCompany
  frontendUrl: string
}

export interface ProvisionSummary {
  monthlyCents: number
  totalContractCents: number
  setupCents: number
  firstInvoiceCents: number
  installmentCents: number
  installments: number
}

export interface ProvisionPreview {
  termMonths: number
  installments: number
  contractedMonthlyCents: number
  discountPct: number
  setupFeeCents: number
  paymentMethod: PaymentMethodId
  summary: ProvisionSummary
}

export interface ProvisionResult {
  organizationId: string
  contractId: string
  activationUrl: string
  adminUserId: string
  summary: ProvisionSummary
}

export interface PendingActivation {
  tenantId: string
  contractId: string
  companyName: string | null
  adminUserId: string | null
  adminEmail: string | null
  planTier: string
  createdAt: string
  linkExpiresAt: string | null
  linkExpired: boolean
  /** `link`: ainda não definiu a senha; `steps`: senha definida, faltam termos/dados da empresa. */
  stage?: 'link' | 'steps'
  daysPending: number
}

export interface CatalogHistoryRow {
  id: string
  entity: 'plan' | 'pack'
  entityKey: string
  changedBy: string | null
  changedByName: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown>
  createdAt: string
}

export interface CreditPackRow { id: string; credits: number; valueCents: number; active: boolean; sortOrder: number; updatedAt?: string }

export const adminBillingApi = {
  async packs(): Promise<CreditPackRow[]> {
    return (await api.get<CreditPackRow[]>('/admin/billing/catalog/packs')).data
  },
  async upsertPlan(tier: PlanTierId, body: {
    displayName: string; priceMonthlyCents: number; monthlyCredits?: number | null; active?: boolean
    entitlements?: Partial<Record<EntitlementKeyId, number | null>>; modules?: Record<string, boolean>; overagePriceCents?: number | null
    expectedUpdatedAt?: string
  }): Promise<{ warnings: string[] }> {
    return (await api.put(`/admin/billing/catalog/plans/${tier}`, body)).data
  },
  async upsertPack(credits: number, body: { valueCents: number; active?: boolean; sortOrder?: number; expectedUpdatedAt?: string }): Promise<{ warnings: string[] }> {
    return (await api.put(`/admin/billing/catalog/packs/${credits}`, body)).data
  },
  async catalogHistory(): Promise<CatalogHistoryRow[]> {
    return (await api.get<CatalogHistoryRow[]>('/admin/billing/catalog/history')).data
  },
  async catalogWarnings(): Promise<string[]> {
    return (await api.get<string[]>('/admin/billing/catalog/warnings')).data
  },
  async listCatalog(): Promise<CatalogPlan[]> {
    return (await api.get<CatalogPlan[]>('/admin/billing/catalog/plans')).data
  },
  async vendableMatrix(): Promise<VendableCombo[]> {
    return (await api.get<VendableCombo[]>('/admin/billing/catalog/matrix')).data
  },
  async preview(body: ProvisionTermsBody & { adminEmail?: string }): Promise<ProvisionPreview> {
    return (await api.post<ProvisionPreview>('/admin/billing/provision/preview', body)).data
  },
  /** `idempotencyKey`: gerada uma vez por envio e repetida no retry do mesmo corpo (não cria a conta duas vezes). */
  async provision(body: ProvisionBody, idempotencyKey?: string): Promise<ProvisionResult> {
    return (await api.post<ProvisionResult>('/admin/billing/provision', body, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    })).data
  },
  async pendingActivations(): Promise<PendingActivation[]> {
    return (await api.get<PendingActivation[]>('/admin/billing/pending-activations')).data
  },
  async newActivationLink(tenantId: string): Promise<{ activationUrl: string; expiresAt: string; adminEmail: string }> {
    const frontendUrl = window.location.origin
    return (await api.post(`/admin/billing/pending-activations/${tenantId}/new-link`, { frontendUrl })).data
  },
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}