// ─── Billing API ──────────────────────────────────────────────────────────────
// Consome o ledger real no backend (SCRUM-156/172). O tenant é inferido pela
// sessão (JWT/cookie) — nunca enviado pelo cliente.

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

// Valores numéricos vêm como string (TypeORM numeric). A UI faz o parse.
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
}
