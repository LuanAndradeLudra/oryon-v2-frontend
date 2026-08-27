// ─── Billing API ──────────────────────────────────────────────────────────────
// Ledger + payment gateway (mock hoje). Tenant via sessão JWT/cookie.

import { api } from './api'

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

export type BillingMethod = 'PIX' | 'CREDIT_CARD'

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


export interface PayerInput {
  name?: string
  email?: string
  cpfCnpj?: string
  postalCode?: string
  addressNumber?: string
  phone?: string
}

export interface CardInput {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface CheckoutResult {
  provider?: string
  subscriptionId?: string
  payment: {
    id: string
    status: string
    value: number
    billingType: string
    invoiceUrl?: string
    pix?: { encodedImage: string; payload: string; expirationDate?: string }
  }
}

export const billingApi = {
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
  async subscribe(input: {
    tier: BackendPlanTier
    billingType: BillingMethod
    payer?: PayerInput
    card?: CardInput
  }): Promise<CheckoutResult> {
    const res = await api.post<CheckoutResult>('/settings/billing/subscribe', input)
    return res.data
  },
  async changePlan(tier: BackendPlanTier): Promise<{ applied: 'now' | 'next_cycle' }> {
    const res = await api.post('/settings/billing/change-plan', { tier })
    return res.data
  },
  async cancel(): Promise<{ canceled: boolean; accessUntil: string | null }> {
    const res = await api.post('/settings/billing/cancel')
    return res.data
  },
  async buyCredits(input: {
    packCredits: number
    valueCents: number
    billingType: BillingMethod
    payer?: PayerInput
    card?: CardInput
  }): Promise<CheckoutResult> {
    const res = await api.post<CheckoutResult>('/settings/billing/buy-credits', input)
    return res.data
  },
}
