// ─── PricingPage ──────────────────────────────────────────────────────────────
// Public-facing pricing page with plan comparison, monthly/annual toggle, CTAs.

import { useState } from 'react'
import {
  CheckCircle2, XCircle, Zap, ArrowRight, ChevronDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PLANS, PLAN_ORDER, formatPlanPrice, annualSavings } from '@/config/plans'
import type { PlanTier } from '@/types'

// ─── Feature comparison rows ──────────────────────────────────────────────────

interface FeatureRow {
  label: string
  group?: string
  getValue: (tier: PlanTier) => string | boolean | null
}

const FEATURE_ROWS: FeatureRow[] = [
  // Volumes
  { label: 'Créditos de IA / mês',     getValue: (t) => formatLimit(PLANS[t].limits.creditsPerMonth) },
  { label: 'Usuários',                  getValue: (t) => formatLimit(PLANS[t].limits.users) },
  { label: 'Números WhatsApp',          getValue: (t) => formatLimit(PLANS[t].limits.waNumbers) },
  { label: 'Agentes de IA',            getValue: (t) => formatLimit(PLANS[t].limits.agents) },
  { label: 'Automações ativas',         getValue: (t) => formatLimit(PLANS[t].limits.automations) },
  { label: 'Disparos / mês',           getValue: (t) => formatLimit(PLANS[t].limits.campaignsPerMonth) },
  { label: 'Copilot interactions / mês', getValue: (t) => formatLimit(PLANS[t].limits.copilotInteractions) },
  { label: 'Campos customizados',       getValue: (t) => formatLimit(PLANS[t].limits.customFields) },
  { label: 'Retenção de dados',         getValue: (t) => {
    const m = PLANS[t].limits.dataRetentionMonths
    return m === null ? 'Ilimitado' : m < 12 ? `${m} meses` : `${m / 12} ${m / 12 === 1 ? 'ano' : 'anos'}`
  }},
  // Modules
  { label: 'Conversas WhatsApp',       getValue: (t) => PLANS[t].modules.conversations },
  { label: 'CRM',                      getValue: (t) => PLANS[t].modules.crm },
  { label: 'Campanhas',                getValue: (t) => PLANS[t].modules.campaigns },
  { label: 'Automações',               getValue: (t) => PLANS[t].modules.automations },
  { label: 'Dashboard',                getValue: (t) => PLANS[t].modules.dashboard },
  { label: 'Agent Builder',            getValue: (t) => PLANS[t].modules.agentBuilder },
  { label: 'Nexus (chat interno)',     getValue: (t) => PLANS[t].modules.nexus },
  { label: 'Marketing Attribution',   getValue: (t) => PLANS[t].modules.marketing },
  { label: 'Analytics avançado',      getValue: (t) => PLANS[t].modules.advancedAnalytics },
  { label: 'Relatórios customizados', getValue: (t) => PLANS[t].modules.customReports },
  { label: 'Acesso à API',            getValue: (t) => PLANS[t].modules.apiAccess },
  { label: 'Webhooks avançados',      getValue: (t) => PLANS[t].modules.webhooks },
  { label: 'Sub-contas (agências)',   getValue: (t) => {
    const n = PLANS[t].limits.subAccounts
    if (!PLANS[t].modules.subAccounts) return false
    return n === null ? 'Ilimitadas' : `Até ${n}`
  }},
  { label: 'Suporte prioritário 4h',  getValue: (t) => PLANS[t].modules.prioritySupport },
  { label: 'Onboarding dedicado',     getValue: (t) => PLANS[t].modules.dedicatedOnboarding },
  { label: 'SLA 99,5%',              getValue: (t) => PLANS[t].modules.sla },
]

function formatLimit(n: number | null): string {
  return n === null ? 'Ilimitado' : n.toLocaleString('pt-BR')
}

// ─── Plan card ────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  essential: 'from-slate-800 to-surface-900',
  pro:       'from-brand-950 to-surface-900',
  business:  'from-violet-950 to-surface-900',
  scale:     'from-amber-950 to-surface-900',
  enterprise:'from-surface-800 to-surface-900',
}

const BADGE_COLORS: Record<string, string> = {
  essential: 'bg-surface-700 text-surface-300',
  pro:       'bg-brand-900 text-brand-300',
  business:  'bg-accent-violet/20 text-accent-violet',
  scale:     'bg-accent-amber/20 text-accent-amber',
  enterprise:'bg-surface-700 text-surface-300',
}

const POPULAR_TIER: PlanTier = 'pro'

function PlanCard({ tier, annual }: { tier: PlanTier; annual: boolean }) {
  const plan    = PLANS[tier]
  const savings = annualSavings(tier)
  const popular = tier === POPULAR_TIER

  const highlights: string[] = []
  if (plan.limits.creditsPerMonth) highlights.push(`${plan.limits.creditsPerMonth.toLocaleString('pt-BR')} créditos/mês`)
  if (plan.limits.users)           highlights.push(`${plan.limits.users} usuários`)
  if (plan.limits.waNumbers)       highlights.push(`${plan.limits.waNumbers} número${plan.limits.waNumbers > 1 ? 's' : ''} WhatsApp`)
  if (plan.modules.agentBuilder)   highlights.push('Agent Builder')
  if (plan.modules.marketing)      highlights.push('Marketing Attribution')
  if (plan.modules.nexus)          highlights.push('Nexus (chat interno)')
  if (plan.modules.apiAccess)      highlights.push('Acesso à API')
  if (plan.modules.sla)            highlights.push('SLA 99,5%')

  return (
    <div className={`relative flex flex-col rounded-2xl border ${popular ? 'border-brand-500' : 'border-surface-800'} bg-gradient-to-b ${PLAN_COLORS[tier]} p-6 gap-5`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-600 text-surface-950 text-xs font-semibold">
          Mais popular
        </div>
      )}

      <div>
        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${BADGE_COLORS[tier]}`}>
          {plan.name}
        </span>

        {plan.monthlyPrice === null ? (
          <div>
            <p className="text-3xl font-bold text-surface-50">Consultar</p>
            <p className="text-sm text-surface-400 mt-1">Preço customizado</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-surface-50">
              R$&nbsp;{(annual ? plan.annualMonthlyPrice! : plan.monthlyPrice).toLocaleString('pt-BR')}
              <span className="text-base font-normal text-surface-400">/mês</span>
            </p>
            {annual && savings && (
              <p className="text-xs text-status-active mt-1 font-medium">
                Economia de R$&nbsp;{savings.toLocaleString('pt-BR')}/ano
              </p>
            )}
            {!annual && (
              <p className="text-xs text-surface-500 mt-1">
                ou R$&nbsp;{plan.annualMonthlyPrice!.toLocaleString('pt-BR')}/mês no anual
              </p>
            )}
          </div>
        )}
      </div>

      <ul className="space-y-1.5 flex-1">
        {highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-sm text-surface-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            {h}
          </li>
        ))}
      </ul>

      <button className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
        popular
          ? 'bg-brand-600 hover:bg-brand-500 text-surface-950 shadow-lg shadow-brand-900/40'
          : tier === 'enterprise'
            ? 'bg-surface-700 hover:bg-surface-600 text-surface-200'
            : 'bg-surface-800 hover:bg-surface-700 text-surface-200'
      }`}>
        {tier === 'enterprise' ? 'Falar com vendas' : 'Começar agora'}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function ComparisonTable() {
  const tiers = PLAN_ORDER.filter(t => t !== 'enterprise') as PlanTier[]

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left py-3 pr-6 text-surface-500 font-medium w-48">Funcionalidade</th>
            {tiers.map((t) => (
              <th key={t} className="text-center py-3 px-4 text-surface-300 font-semibold">
                {PLANS[t].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-surface-900/40' : ''}>
              <td className="py-2.5 pr-6 text-surface-400">{row.label}</td>
              {tiers.map((t) => {
                const val = row.getValue(t)
                return (
                  <td key={t} className="py-2.5 px-4 text-center">
                    {val === true  ? <CheckCircle2 className="w-4 h-4 text-brand-400 mx-auto" /> :
                     val === false ? <XCircle className="w-4 h-4 text-surface-700 mx-auto" /> :
                     <span className="text-surface-300 font-medium">{val}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'O que são créditos de IA?',
    a: 'Créditos medem o consumo de IA na plataforma. Uma mensagem do agente WhatsApp custa 0,1 crédito. Uma interação do Copilot simples custa 2 créditos. Créditos são renovados mensalmente e não acumulam.',
  },
  {
    q: 'Posso mudar de plano a qualquer momento?',
    a: 'Sim. Upgrades têm efeito imediato (créditos adicionais pro-rated). Downgrades entram em vigor na próxima data de renovação.',
  },
  {
    q: 'Como funciona o desconto anual?',
    a: 'Equivale a 2 meses grátis (~16,7% de desconto). Aceitamos parcelamento em 12x no cartão ou boleto anual com 5% adicional.',
  },
  {
    q: 'O que acontece se eu esgotar os créditos?',
    a: 'Funcionalidades de IA (agente, Copilot, Agent Builder) ficam pausadas. Conversas, CRM e campanhas continuam normalmente. Você pode comprar créditos extras avulsos a R$1,20/crédito.',
  },
  {
    q: 'O preço é fixo em reais?',
    a: 'Sim, sempre em R$ — sem variação cambial. O preço é fixado na data da contratação e não muda durante a vigência do plano.',
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {FAQS.map((faq, i) => (
        <div key={i} className="rounded-xl border border-surface-800 bg-surface-900 overflow-hidden">
          <button
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-surface-200">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-surface-400 flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="px-5 pb-4 text-sm text-surface-400 leading-relaxed">{faq.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [showTable, setShowTable] = useState(false)

  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-16">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
              <Zap className="w-5 h-5 text-surface-950" fill="currentColor" />
            </div>
            <span className="text-xl font-bold">Oryon</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Planos e preços
          </h1>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto">
            O CRM conversacional com IA que transforma WhatsApp em receita. Preço fixo em R$, sem variação cambial.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm cursor-pointer ${!annual ? 'text-surface-200 font-semibold' : 'text-surface-500'}`} onClick={() => setAnnual(false)}>
              Mensal
            </span>
            <button
              onClick={() => setAnnual(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-brand-600' : 'bg-surface-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${annual ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm cursor-pointer ${annual ? 'text-surface-200 font-semibold' : 'text-surface-500'}`} onClick={() => setAnnual(true)}>
              Anual
              <span className="ml-1.5 text-xs bg-status-active-bg text-status-active font-semibold px-1.5 py-0.5 rounded-full">
                2 meses grátis
              </span>
            </span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(PLAN_ORDER.filter(t => t !== 'enterprise') as PlanTier[]).map((tier) => (
            <PlanCard key={tier} tier={tier} annual={annual} />
          ))}
        </div>

        {/* Enterprise strip */}
        <div className="rounded-2xl border border-surface-800 bg-surface-900 p-6 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h3 className="text-lg font-bold text-surface-50">Enterprise</h3>
            <p className="text-sm text-surface-400 mt-1">
              Redes, franquias e grandes operações. SLA contratual, sub-contas ilimitadas, suporte 24/7, LGPD customizado.
            </p>
          </div>
          <button className="flex-shrink-0 px-6 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 text-surface-200 font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap">
            Falar com vendas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison table toggle */}
        <div>
          <button
            onClick={() => setShowTable(v => !v)}
            className="flex items-center gap-2 mx-auto text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
          >
            {showTable ? 'Ocultar' : 'Ver'} comparativo completo
            <ChevronDown className={`w-4 h-4 transition-transform ${showTable ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showTable && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mt-6"
              >
                <div className="rounded-2xl border border-surface-800 bg-surface-900 p-6">
                  <ComparisonTable />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-surface-50 mb-6 text-center">Perguntas frequentes</h2>
          <FAQ />
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-3">
          <p className="text-surface-400 text-sm">
            Tem um plano customizado em mente? Redes de clínicas, imobiliárias e agências têm condições especiais.
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-semibold text-sm transition-colors shadow-lg shadow-brand-900/40">
            Falar com um especialista
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
