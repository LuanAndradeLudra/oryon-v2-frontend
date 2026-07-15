// ─── Plan Definitions ─────────────────────────────────────────────────────────
// Single source of truth for all plan tiers, limits, prices, and feature gates.

import type { PlanTier, PlanDefinition, PlanModuleAccess } from '@/types'

// Nota (SCRUM-172): o antigo CREDIT_COSTS (custo de crédito por-operação) foi
// aposentado. O modelo agora é token-based (1 crédito ≈ 7.000 tokens de
// conteúdo) e a contabilidade vive no backend (ledger). O consumo real e o
// saldo vêm do snapshot de /settings/billing — ver services/billingApi.ts.

// ─── Module defaults ───────────────────────────────────────────────────────────

const BASE_MODULES: PlanModuleAccess = {
  conversations:       true,
  crm:                 true,
  campaigns:           true,
  automations:         true,
  dashboard:           true,
  marketing:           false,
  agentBuilder:        false,
  copilot:             true,
  nexus:               false,
  apiAccess:           false,
  webhooks:            false,
  advancedAnalytics:   false,
  customReports:       false,
  prioritySupport:     false,
  dedicatedOnboarding: false,
  sla:                 false,
  subAccounts:         false,
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export const PLANS: Record<PlanTier, PlanDefinition> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    limits: {
      creditsPerMonth:       100,
      users:                 2,
      waNumbers:             1,
      agents:                null,
      automations:           2,
      campaignsPerMonth:     1,
      copilotInteractions:   10,
      customFields:          5,
      dataRetentionMonths:   1,
      subAccounts:           null,
    },
    modules: {
      ...BASE_MODULES,
    },
  },
  essential: {
    tier: 'essential',
    name: 'Essential',
    // v1 token-based (SCRUM-172) — equivale ao "Start" do backend.
    monthlyPrice: 1497,
    annualMonthlyPrice: 1497,
    limits: {
      creditsPerMonth:       1500,
      users:                 3,
      waNumbers:             1,
      agents:                1,
      automations:           5,
      campaignsPerMonth:     3,
      copilotInteractions:   50,
      customFields:          10,
      dataRetentionMonths:   3,
      subAccounts:           null,
    },
    modules: {
      ...BASE_MODULES,
    },
  },

  pro: {
    tier: 'pro',
    name: 'Pro',
    // v1 token-based (SCRUM-172) — equivale ao "Professional" do backend.
    monthlyPrice: 2797,
    annualMonthlyPrice: 2797,
    limits: {
      creditsPerMonth:       4000,
      users:                 10,
      waNumbers:             3,
      agents:                3,
      automations:           20,
      campaignsPerMonth:     null,
      copilotInteractions:   300,
      customFields:          30,
      dataRetentionMonths:   12,
      subAccounts:           null,
    },
    modules: {
      ...BASE_MODULES,
      agentBuilder:  true,
      nexus:         true,
      marketing:     true,  // basic attribution (Meta Ads → Leads)
    },
  },

  business: {
    tier: 'business',
    name: 'Business',
    // v1 token-based (SCRUM-172) — equivale ao "Scale" do backend.
    monthlyPrice: 3997,
    annualMonthlyPrice: 3997,
    limits: {
      creditsPerMonth:       10000,
      users:                 30,
      waNumbers:             10,
      agents:                null,
      automations:           100,
      campaignsPerMonth:     null,
      copilotInteractions:   1000,
      customFields:          null,
      dataRetentionMonths:   24,
      subAccounts:           null,
    },
    modules: {
      ...BASE_MODULES,
      agentBuilder:        true,
      nexus:               true,
      marketing:           true,  // full attribution (ROAS/Revenue/ad sets/creatives)
      apiAccess:           true,
      webhooks:            true,
      advancedAnalytics:   true,
      customReports:       true,
      prioritySupport:     true,
      dedicatedOnboarding: true,
    },
  },

  scale: {
    tier: 'scale',
    name: 'Scale',
    monthlyPrice: 6997,
    annualMonthlyPrice: 5597,
    limits: {
      creditsPerMonth:       20000,
      users:                 null,
      waNumbers:             null,
      agents:                null,
      automations:           null,
      campaignsPerMonth:     null,
      copilotInteractions:   null,
      customFields:          null,
      dataRetentionMonths:   null,
      subAccounts:           5,
    },
    modules: {
      ...BASE_MODULES,
      agentBuilder:        true,
      nexus:               true,
      marketing:           true,
      apiAccess:           true,
      webhooks:            true,
      advancedAnalytics:   true,
      customReports:       true,
      prioritySupport:     true,
      dedicatedOnboarding: true,
      sla:                 true,
      subAccounts:         true,
    },
  },

  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualMonthlyPrice: null,
    limits: {
      creditsPerMonth:       null,
      users:                 null,
      waNumbers:             null,
      agents:                null,
      automations:           null,
      campaignsPerMonth:     null,
      copilotInteractions:   null,
      customFields:          null,
      dataRetentionMonths:   null,
      subAccounts:           null,
    },
    modules: {
      conversations:       true,
      crm:                 true,
      campaigns:           true,
      automations:         true,
      dashboard:           true,
      marketing:           true,
      agentBuilder:        true,
      copilot:             true,
      nexus:               true,
      apiAccess:           true,
      webhooks:            true,
      advancedAnalytics:   true,
      customReports:       true,
      prioritySupport:     true,
      dedicatedOnboarding: true,
      sla:                 true,
      subAccounts:         true,
    },
  },
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────

export interface AddOn {
  id: string
  name: string
  description: string
  price: number
  unit: string
  minQuantity?: number
  quantityStep?: number
}

export const ADD_ONS: AddOn[] = [
  {
    id: 'extra_credits',
    name: 'Créditos extras',
    description: 'Pacotes de créditos adicionais',
    price: 1.20,
    unit: 'crédito',
    minQuantity: 500,
    quantityStep: 500,
  },
  {
    id: 'extra_user',
    name: 'Usuário adicional',
    description: 'Acima do limite do plano',
    price: 97,
    unit: 'usuário/mês',
    minQuantity: 1,
    quantityStep: 1,
  },
  {
    id: 'extra_wa_number',
    name: 'Número WhatsApp extra',
    description: 'Acima do limite do plano',
    price: 97,
    unit: 'número/mês',
    minQuantity: 1,
    quantityStep: 1,
  },
  {
    id: 'onboarding_setup',
    name: 'Onboarding Setup',
    description: '2h de configuração com especialista',
    price: 497,
    unit: 'one-time',
  },
  {
    id: 'copilot_pro',
    name: 'Copilot Pro',
    description: '+1.000 interações de Copilot',
    price: 397,
    unit: 'mês',
  },
  {
    id: 'advanced_reports',
    name: 'Relatórios avançados',
    description: 'Export, BI, dashboards custom',
    price: 197,
    unit: 'mês',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPlan(tier: PlanTier): PlanDefinition {
  return PLANS[tier]
}

export function canAccessModule(tier: PlanTier, module: keyof PlanModuleAccess): boolean {
  return PLANS[tier].modules[module]
}

export function formatCredits(n: number | null): string {
  if (n === null) return 'Ilimitado'
  return n.toLocaleString('pt-BR')
}

export function formatPlanPrice(plan: PlanDefinition, annual: boolean): string {
  const price = annual ? plan.annualMonthlyPrice : plan.monthlyPrice
  if (price === null) return 'Consultar'
  return `R$\u00A0${price.toLocaleString('pt-BR')}/mês`
}

export const PLAN_ORDER: PlanTier[] = ['essential', 'pro', 'business', 'scale', 'enterprise']

// ─── Backend tier mapping (SCRUM-172) ──────────────────────────────────────────
// O backend (config-store) usa start/professional/scale/enterprise. O painel de
// billing renderiza nome/preço/créditos direto do snapshot do backend; este mapa
// só resolve a grade secundária de "limites do plano" para o PLANS do front.
export type BackendPlanTier = 'start' | 'professional' | 'scale' | 'enterprise'

const BACKEND_TIER_MAP: Record<BackendPlanTier, PlanTier> = {
  start:        'essential',
  professional: 'pro',
  scale:        'business',
  enterprise:   'enterprise',
}

export function mapBackendTier(tier: string | null | undefined): PlanTier {
  return BACKEND_TIER_MAP[(tier ?? '') as BackendPlanTier] ?? 'essential'
}

export function isHigherTier(a: PlanTier, b: PlanTier): boolean {
  return PLAN_ORDER.indexOf(a) > PLAN_ORDER.indexOf(b)
}

export function annualSavings(tier: PlanTier): number | null {
  const p = PLANS[tier]
  if (!p.monthlyPrice || !p.annualMonthlyPrice) return null
  return (p.monthlyPrice - p.annualMonthlyPrice) * 12
}
