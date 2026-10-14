// ─── Admin Billing API (super_admin) ──────────────────────────────────────────
// Console do operador (SCRUM-1205) e, depois, catálogo e carteira (SCRUM-1211).
// Tudo em /admin/billing/*, protegido por @Roles(SUPER_ADMIN) no backend.

import { api } from './api'
import { openPdfInNewTab } from '@/lib/openPdf'

/** A lista de faturas do operador vem paginada de 200 em 200 (`offset`). */
export const ADMIN_INVOICES_PAGE = 200

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

export interface InvoiceLine {
  id: string
  kind: string
  description: string
  quantity: number
  unitPriceCents: number
  amountCents: number
}

export interface AdminInvoiceRow {
  id: string
  tenantId: string
  companyName: string | null
  contractId: string | null
  number: string | null
  kind: string
  status: string
  amountCents: number
  competenceMonth: string | null
  dueAt: string | null
  paidAt: string | null
  paidAmountCents: number | null
  disputeReason: string | null
  disputedAmountCents: number | null
  description: string | null
  issuedAt: string
  /** Nota de crédito: a fatura estornada. */
  referenceInvoiceId?: string | null
}

export interface LateCharges {
  daysLate: number
  principalCents: number
  fineCents: number
  interestCents: number
  correctionCents: number
  totalCents: number
  missingIndexMonths: string[]
}

export interface InvoiceDetail {
  invoice: AdminInvoiceRow & { lines: InvoiceLine[]; usageReport: unknown }
  charges: LateCharges
  paymentInstructions: string
}

export interface IndexRateRow { id: string; indexCode: string; month: string; ratePct: number }

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: 'Em aberto',
  past_due: 'Vencida',
  paid: 'Paga',
  canceled: 'Cancelada',
  failed: 'Falhou',
  disputed: 'Em contestação',
  refunded: 'Estornada',
}

export const INVOICE_KIND_LABEL: Record<string, string> = {
  subscription: 'Mensalidade/parcela',
  setup: 'Setup',
  overage: 'Excedente',
  credit_pack: 'Pacote',
  upgrade_difference: 'Diferença de upgrade',
  credit_note: 'Nota de crédito',
}

/** Abre um PDF autenticado (cookie) numa aba nova. Rejeita com mensagem legível. */
export function openPdf(path: string): Promise<void> {
  return openPdfInNewTab(async () => (await api.get(path, { responseType: 'blob' })).data as Blob)
}

export interface PortfolioRow {
  tenantId: string
  contractId: string
  companyName: string | null
  tier: PlanTierId
  displayName: string
  term: ContractTermId
  paymentMethod: PaymentMethodId
  installments: number
  contractedMonthlyCents: number
  status: string
  suspended: boolean
  startsAt: string
  endsAt: string | null
  autoRenew: boolean
  /** Cancelamento registrado (A18): encerra em `effectiveAt`; `afterRenewal` = renova uma vez antes. */
  cancellation?: { effectiveAt: string; afterRenewal: boolean } | null
  overdueCount: number
  overdueCents: number
  oldestDueAt: string | null
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

/** A carteira volta limitada aos contratos mais recentes; `truncated` avisa o corte. */
export interface PortfolioResult { rows: PortfolioRow[]; truncated: boolean }

export interface PlanChangeDecision {
  mode: 'upgrade_next_cycle_price' | 'upgrade_difference_invoice' | 'upgrade_recalculated_installments' | 'downgrade_scheduled'
  isUpgrade: boolean
  newContractedMonthlyCents: number
  monthsRemaining: number
  differenceCents: number
  message: string
}

export const adminBillingApi = {
  async portfolio(): Promise<PortfolioResult> {
    const data = (await api.get<PortfolioResult | PortfolioRow[]>('/admin/billing/portfolio')).data
    // Tolerância ao formato antigo (array) enquanto o backend é atualizado.
    return Array.isArray(data) ? { rows: data, truncated: false } : data
  },
  async reconciliation(): Promise<unknown> {
    return (await api.get('/admin/billing/reconciliation')).data
  },
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
  async previewPlanChange(tenantId: string, body: { tier: PlanTierId; contractedMonthlyCents?: number }): Promise<PlanChangeDecision> {
    return (await api.post<PlanChangeDecision>(`/admin/billing/accounts/${tenantId}/change-plan/preview`, body)).data
  },
  async changePlan(tenantId: string, body: { tier: PlanTierId; contractedMonthlyCents?: number }): Promise<{ message: string }> {
    return (await api.post(`/admin/billing/accounts/${tenantId}/change-plan`, body)).data
  },
  /** Prévia do cancelamento pela regra da 18.1.2 (A18). */
  async cancelPreview(tenantId: string): Promise<{ afterRenewal: boolean; effectiveAt: string; currentEndsAt: string | null; alreadyCanceled: boolean; message: string }> {
    return (await api.get(`/admin/billing/accounts/${tenantId}/cancel/preview`)).data
  },
  /** Cancelamento pedido pelo cliente à equipe (A5: não há botão na plataforma). */
  async cancelContract(tenantId: string, reason: string): Promise<{ afterRenewal: boolean; effectiveAt: string; message: string }> {
    return (await api.post(`/admin/billing/accounts/${tenantId}/cancel`, { reason })).data
  },
  async accelerate(contractId: string, body: { dueInDays?: number; reason: string }): Promise<{ accelerated: number; dueAt: string }> {
    return (await api.post(`/admin/billing/contracts/${contractId}/accelerate`, body)).data
  },
  async listInvoices(filter: { status?: string; tenantId?: string; overdue?: boolean; offset?: number } = {}): Promise<AdminInvoiceRow[]> {
    const params: Record<string, string> = {}
    if (filter.status) params.status = filter.status
    if (filter.tenantId) params.tenantId = filter.tenantId
    if (filter.overdue) params.overdue = '1'
    if (filter.offset) params.offset = String(filter.offset)
    return (await api.get<AdminInvoiceRow[]>('/admin/billing/invoices', { params })).data
  },
  /** `at` (AAAA-MM-DD): encargos calculados naquela data (baixa com data retroativa). */
  async invoiceDetail(id: string, at?: string): Promise<InvoiceDetail> {
    return (await api.get<InvoiceDetail>(`/admin/billing/invoices/${id}`, { params: at ? { at } : undefined })).data
  },
  async registerPayment(id: string, body: { paidAt?: string; amountCents?: number; note?: string }) {
    return (await api.post<{ reactivated: boolean; remainingOverdue: number }>(`/admin/billing/invoices/${id}/payment`, body)).data
  },
  async creditNote(id: string, body: { amountCents: number; reason: string }) {
    return (await api.post(`/admin/billing/invoices/${id}/credit-note`, body)).data
  },
  async resolveDispute(id: string, body: { acceptedCents: number; note: string }) {
    return (await api.post(`/admin/billing/invoices/${id}/dispute/resolve`, body)).data
  },
  async indexRates(): Promise<IndexRateRow[]> {
    return (await api.get<IndexRateRow[]>('/admin/billing/index-rates')).data
  },
  /** Correção pelo IPCA ligada? (DECISOES A16: desligada até o contador validar.) */
  async indexRatesStatus(): Promise<{ correctionEnabled: boolean }> {
    return (await api.get<{ correctionEnabled: boolean }>('/admin/billing/index-rates/status')).data
  },
  async upsertIndexRate(month: string, ratePct: number) {
    return (await api.put(`/admin/billing/index-rates/IPCA/${month}`, { ratePct })).data
  },
  async runIssuance(): Promise<{ issued: number; overage: number; dueSoon: number }> {
    return (await api.post('/admin/billing/issuance/run')).data
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
