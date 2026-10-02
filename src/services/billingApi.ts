// ─── Billing API ──────────────────────────────────────────────────────────────
// Leitura do ledger, faturas e status. Contratação, troca de plano e compra de
// créditos saíram do autoatendimento (SCRUM-1204, Termos 4.1 c). Nenhum dado
// de cartão passa pela Oryon. Tenant via sessão JWT/cookie.

import { api } from './api'
import { openPdfInNewTab } from '@/lib/openPdf'

export type BackendPlanTier = 'start' | 'professional' | 'scale' | 'enterprise'

export interface BillingPlanInfo {
  tier: BackendPlanTier
  displayName: string
  priceMonthlyCents: number
  currency: string
  monthlyCredits: number | null
  tokensPerCredit: number
  features: Record<string, unknown>
}

export interface BillingSnapshot {
  plan: BillingPlanInfo
  creditsTotal: number | null
  creditsUsed: number
  remaining: number | null
  planResetsAt: string | null
  status: string
  contract?: {
    id: string
    term: string
    status: string
    startsAt: string | null
    endsAt: string | null
    planSnapshot: Record<string, unknown>
  } | null
  cycle?: {
    startsAt: string | null
    resetsAt: string | null
    creditsRolledOver: number
    rolloverExpiresAt: string | null
    overageCredits: number
  }
}

export interface BillingInvoiceRow {
  id: string
  number: string | null
  kind: string
  amount: string
  currency: string
  status: string
  dueAt: string | null
  paidAt: string | null
  competenceMonth: string | null
  description: string | null
  createdAt: string
  /** Resposta da equipe à contestação (quando houve). */
  disputeResolution: string | null
  /** Total − notas de crédito. */
  netDueCents: number
  /** Dias corridos de atraso no calendário de Brasília (0 se não vencida). */
  daysLate: number
  /** daysLate ≥ 1, netDueCents > 0 e status pending/past_due — calculado no backend. */
  overdue: boolean
  /** Nota de crédito: a fatura estornada. */
  referenceInvoiceId?: string | null
  /** CL7 — preenchido quando o cliente já contestou (uma contestação por fatura). */
  disputedAt?: string | null
}

export type CreditTransactionType = 'debit' | 'grant' | 'reset' | 'refund' | 'adjustment'

export interface CreditTransaction {
  id: string
  type: CreditTransactionType
  credits: string
  balanceAfter: string | null
  source: string | null
  feature: string | null
  conversationId: string | null
  contentTokens: number | null
  costUsd: string | null
  model: string | null
  requestId: string | null
  createdAt: string
}

export interface PlanOption {
  tier: BackendPlanTier
  displayName: string
  priceMonthlyCents: number
  currency: string
  monthlyCredits: number | null
  tokensPerCredit: number
  features: Record<string, unknown>
}

export interface CreditPack {
  credits: number
  valueCents: number
}

/** Status da assinatura no gateway de pagamento (provider-agnostic). */
export interface PaymentStatus {
  provider: string
  subscribed: boolean
  tier: BackendPlanTier | null
  status: string | null
  billingType: string | null
  nextDueDate: string | null
  pendingTier: BackendPlanTier | null
  autoRechargeEnabled: boolean
}


export type PaymentMethodId = 'card_monthly' | 'pix_invoice' | 'upfront_pix' | 'upfront_card'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  card_monthly: 'Cartão — cobrança mensal',
  pix_invoice: 'Fatura mensal por Pix',
  upfront_pix: 'À vista no Pix',
  upfront_card: 'À vista no cartão',
}

export type EntitlementKeyId = 'users' | 'waNumbers' | 'agents' | 'automations' | 'pipelines' | 'customFields' | 'campaignsPerMonth'

/** GET /settings/billing/contract (SCRUM-1210) — o contrato, não a tabela. */
export interface ClientContract {
  contract: {
    displayName: string
    tier: string
    term: 'annual' | 'semiannual' | 'monthly'
    termMonths: number
    installments: number
    contractedMonthlyCents: number
    paymentMethod: PaymentMethodId
    billingDay: number
    startsAt: string
    endsAt: string | null
    autoRenew: boolean
    monthlyCredits: number | null
    overage: { priceCents: number; onNextInvoice: boolean; policy: string }
    entitlements: Partial<Record<EntitlementKeyId, number | null>>
    modules: Record<string, boolean>
    proposalRef: string | null
    status: string
    /** Cancelamento registrado pela equipe (A18). `afterRenewal`: renova uma vez antes de encerrar. */
    cancellation?: { requestedAt: string; effectiveAt: string; afterRenewal: boolean } | null
  } | null
  state: { status: string; suspended: boolean; canCreateResources: boolean; accessUntil: string | null }
  usage: Partial<Record<EntitlementKeyId, number | null>>
  cycle: {
    creditsTotal: number | null
    creditsUsed: number
    overageCredits: number
    startsAt: string | null
    resetsAt: string | null
    pendingOverageCredits: number
  } | null
  nextInvoice: { id: string; number: string | null; dueAt: string | null; amountCents: number } | null
}

export interface InvoiceLineRow { id: string; kind: string; description: string; quantity: number; unitPriceCents: number; amountCents: number }

export interface UsageReportView {
  periodStart: string
  periodEnd: string
  totalCredits: number
  services: number
  byFeature: Array<{ feature: string; source: string | null; credits: number; count: number }>
}

export interface InvoiceDetailView {
  invoice: BillingInvoiceRow & { amountCents: number | null; issuedAt: string; lines: InvoiceLineRow[]; usageReport: UsageReportView | null; disputeReason: string | null }
  charges: { daysLate: number; principalCents: number; fineCents: number; interestCents: number; correctionCents: number; totalCents: number; missingIndexMonths: string[] }
  paymentInstructions: string
}

export interface DebtView {
  state: { suspended: boolean }
  items: Array<{ id: string; number: string | null; kind: string; dueAt: string | null; amountCents: number; updatedCents: number; daysLate: number }>
  totalCents: number
  totalUpdatedCents: number
  paymentInstructions: string
}

/** Abre um PDF autenticado (cookie) numa aba nova. Rejeita com mensagem legível. */
export function openInvoicePdf(invoiceId: string, secondCopy = false): Promise<void> {
  return openPdfInNewTab(
    async () => (await api.get(`/settings/billing/invoices/${invoiceId}/pdf${secondCopy ? '?secondCopy=1' : ''}`, { responseType: 'blob' })).data as Blob,
    secondCopy ? 'fatura-2a-via.pdf' : 'fatura.pdf',
  )
}

export const billingApi = {
  async getContract(): Promise<ClientContract> {
    return (await api.get<ClientContract>('/settings/billing/contract')).data
  },
  async getDebt(): Promise<DebtView> {
    return (await api.get<DebtView>('/settings/billing/debt')).data
  },
  async getInvoice(id: string): Promise<InvoiceDetailView> {
    return (await api.get<InvoiceDetailView>(`/settings/billing/invoices/${id}`)).data
  },
  async disputeInvoice(id: string, reason: string, amountCents?: number): Promise<BillingInvoiceRow> {
    return (await api.post<BillingInvoiceRow>(`/settings/billing/invoices/${id}/dispute`, { reason, amountCents })).data
  },
  async getBilling(): Promise<BillingSnapshot> {
    const res = await api.get<BillingSnapshot>('/settings/billing')
    return res.data
  },
  async getTransactions(limit = 50): Promise<CreditTransaction[]> {
    const res = await api.get<CreditTransaction[]>('/settings/billing/transactions', {
      params: { limit },
    })
    return res.data
  },
  async getPlans(): Promise<PlanOption[]> {
    const res = await api.get<PlanOption[]>('/settings/billing/plans')
    return res.data
  },
  async getPaymentStatus(): Promise<PaymentStatus> {
    const res = await api.get<PaymentStatus>('/settings/billing/payment-status')
    return res.data
  },
  async getCreditPacks(): Promise<CreditPack[]> {
    const res = await api.get<CreditPack[]>('/settings/billing/credit-packs')
    return res.data
  },
  async getInvoices(): Promise<BillingInvoiceRow[]> {
    const res = await api.get<BillingInvoiceRow[]>('/settings/billing/invoices')
    return res.data
  },
}
