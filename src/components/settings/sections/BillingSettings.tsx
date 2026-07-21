// ─── BillingSettings ─────────────────────────────────────────────────────────
// Settings section: current plan, credit usage, invoices, upgrade CTA.

import { useState } from 'react'
import {
  Zap, TrendingUp, Users, Smartphone, Bot, RefreshCw,
  ChevronRight, CheckCircle2, AlertTriangle, ExternalLink,
  CreditCard, ArrowUpRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SettingsSection } from '../SettingsSection'
import type { PlanTier } from '@/types'
import { PLANS, PLAN_ORDER, formatCredits, formatPlanPrice, annualSavings } from '@/config/plans'

// ─── Mock data (replace with real API calls) ──────────────────────────────────

const MOCK_BILLING = {
  tier: 'pro' as PlanTier,
  creditsUsed: 2847,
  creditsTotal: 4000,
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  nextRenewal: '2026-04-01',
  billingCycle: 'monthly' as 'monthly' | 'annual',
  invoices: [
    { id: 'inv_003', date: '2026-03-01', description: 'Oryon Pro — Março 2026', amount: 1997, status: 'paid' as const },
    { id: 'inv_002', date: '2026-02-01', description: 'Oryon Pro — Fevereiro 2026', amount: 1997, status: 'paid' as const },
    { id: 'inv_001', date: '2026-01-01', description: 'Oryon Pro — Janeiro 2026', amount: 1997, status: 'paid' as const },
  ],
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreditBar({ used, total }: { used: number; total: number | null }) {
  const pct = total ? Math.min((used / total) * 100, 100) : 0
  const warning = pct >= 80
  const danger  = pct >= 95

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-400">Créditos de IA utilizados</span>
        <span className={`font-semibold ${danger ? 'text-red-400' : warning ? 'text-status-pending' : 'text-surface-200'}`}>
          {used.toLocaleString('pt-BR')} / {total ? total.toLocaleString('pt-BR') : '∞'}
        </span>
      </div>
      <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${danger ? 'bg-red-500' : warning ? 'bg-status-pending' : 'bg-brand-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {warning && !danger && (
        <p className="text-xs text-status-pending flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Você usou {Math.round(pct)}% dos créditos. Considere fazer upgrade.
        </p>
      )}
      {danger && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Créditos quase esgotados — funcionalidades de IA serão limitadas.
        </p>
      )}
    </div>
  )
}

function LimitRow({
  icon,
  label,
  used,
  limit,
}: {
  icon: React.ReactNode
  label: string
  used?: number
  limit: number | null
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-800/50 last:border-0">
      <span className="text-surface-500 flex-shrink-0">{icon}</span>
      <span className="text-sm text-surface-300 flex-1">{label}</span>
      <span className="text-sm font-medium text-surface-200">
        {used !== undefined ? `${used} / ` : ''}{formatCredits(limit)}
      </span>
    </div>
  )
}

function InvoiceRow({ invoice }: { invoice: typeof MOCK_BILLING.invoices[0] }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-surface-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-200 truncate">{invoice.description}</p>
        <p className="text-xs text-surface-500 mt-0.5">
          {new Date(invoice.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <span
        className="color-chip border text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          ['--chip']:
            invoice.status === 'paid'
              ? 'var(--color-status-active)'
              : invoice.status === 'pending'
                ? 'var(--color-status-pending)'
                : 'var(--color-danger)',
        } as React.CSSProperties}
      >
        {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Falhou'}
      </span>
      <span className="text-sm font-semibold text-surface-200 w-24 text-right">
        R$&nbsp;{invoice.amount.toLocaleString('pt-BR')}
      </span>
      <button className="text-surface-500 hover:text-surface-300 transition-colors">
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  )
}

function UpgradeCard({ currentTier }: { currentTier: PlanTier }) {
  const currentIdx  = PLAN_ORDER.indexOf(currentTier)
  const nextTier    = PLAN_ORDER[currentIdx + 1] as PlanTier | undefined
  const [annual, setAnnual] = useState(false)

  if (!nextTier || nextTier === 'enterprise') return null
  const next    = PLANS[nextTier]
  const savings = annualSavings(nextTier)

  const newModules = Object.entries(next.modules)
    .filter(([key, val]) => val && !PLANS[currentTier].modules[key as keyof typeof next.modules])
    .map(([key]) => MODULE_LABELS[key as keyof typeof MODULE_LABELS] ?? key)
    .filter(Boolean)
    .slice(0, 4)

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-950/40 to-surface-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Upgrade disponível</span>
          </div>
          <h3 className="text-lg font-bold text-surface-50">Plano {next.name}</h3>
          <p className="text-2xl font-bold text-brand-400 mt-1">
            {formatPlanPrice(next, annual)}
          </p>
          {savings && (
            <p className="text-xs text-surface-400 mt-0.5">
              Ou R$&nbsp;{next.annualMonthlyPrice!.toLocaleString('pt-BR')}/mês no anual — economia de R$&nbsp;{savings.toLocaleString('pt-BR')}/ano
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`cursor-pointer ${!annual ? 'text-surface-200 font-semibold' : 'text-surface-500'}`} onClick={() => setAnnual(false)}>Mensal</span>
          <button
            onClick={() => setAnnual(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${annual ? 'bg-brand-600' : 'bg-surface-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${annual ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className={`cursor-pointer ${annual ? 'text-surface-200 font-semibold' : 'text-surface-500'}`} onClick={() => setAnnual(true)}>Anual</span>
        </div>
      </div>

      {newModules.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {newModules.map((label) => (
            <li key={label} className="flex items-center gap-2 text-sm text-surface-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
              {label}
            </li>
          ))}
        </ul>
      )}

      <button className="mt-5 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 transition-colors text-surface-950 font-semibold text-sm flex items-center justify-center gap-2">
        Fazer upgrade para {next.name}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

const MODULE_LABELS: Partial<Record<string, string>> = {
  agentBuilder:        'Agent Builder — crie agentes de IA',
  nexus:               'Nexus — chat interno da equipe',
  marketing:           'Marketing Attribution completo',
  apiAccess:           'Acesso à API',
  webhooks:            'Webhooks avançados',
  advancedAnalytics:   'Analytics avançado',
  customReports:       'Relatórios customizados',
  prioritySupport:     'Suporte prioritário 4h',
  dedicatedOnboarding: 'Onboarding dedicado',
  sla:                 'SLA de uptime 99,5%',
  subAccounts:         'Sub-contas para agências',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BillingSettings() {
  const { tier, creditsUsed, creditsTotal, periodEnd, nextRenewal, billingCycle, invoices } = MOCK_BILLING
  const plan = PLANS[tier]
  // Mesma regra do UpgradeCard: só há upgrade se existir próximo tier não-enterprise.
  const nextTier = PLAN_ORDER[PLAN_ORDER.indexOf(tier) + 1] as PlanTier | undefined
  const hasUpgrade = !!nextTier && nextTier !== 'enterprise'

  return (
    <div>
      {/* Current plan */}
      <SettingsSection
        title="Plano atual"
        description="Sua assinatura, ciclo de cobrança e consumo de créditos de IA."
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-surface-950" fill="currentColor" />
              </div>
              <h2 className="text-xl font-bold text-surface-50">Oryon {plan.name}</h2>
            </div>
            <p className="text-sm text-surface-400 mt-1">
              Próxima renovação:{' '}
              {new Date(nextRenewal).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' · '}
              {billingCycle === 'annual' ? 'Cobrança anual' : 'Cobrança mensal'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-surface-50">
              R$&nbsp;{(plan.monthlyPrice ?? 0).toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-surface-500">/mês</p>
          </div>
        </div>

        {/* Credit usage */}
        <div className="mt-5">
          <CreditBar used={creditsUsed} total={creditsTotal} />
        </div>

        {/* Period info */}
        <p className="text-xs text-surface-500 mt-3">
          Período de créditos: {new Date('2026-03-01').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} –{' '}
          {new Date(periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}.
          Os créditos não acumulam entre períodos.
        </p>
      </SettingsSection>

      {/* Limits */}
      <SettingsSection
        title="Limites do plano"
        description="Recursos incluídos na sua assinatura atual."
      >
        <LimitRow icon={<TrendingUp className="w-4 h-4" />}  label="Créditos de IA / mês"    limit={plan.limits.creditsPerMonth} />
        <LimitRow icon={<Users className="w-4 h-4" />}       label="Usuários"                 limit={plan.limits.users} />
        <LimitRow icon={<Smartphone className="w-4 h-4" />}  label="Números WhatsApp"         limit={plan.limits.waNumbers} />
        <LimitRow icon={<Bot className="w-4 h-4" />}         label="Agentes de IA"            limit={plan.limits.agents} />
        <LimitRow icon={<RefreshCw className="w-4 h-4" />}   label="Automações ativas"        limit={plan.limits.automations} />
        <LimitRow icon={<Zap className="w-4 h-4" />}         label="Interações Copilot / mês" limit={plan.limits.copilotInteractions} />
      </SettingsSection>

      {/* Upgrade CTA — card comparativo de plano é opção selecionável, pode continuar card */}
      {hasUpgrade && (
        <SettingsSection
          title="Upgrade"
          description="Desbloqueie mais módulos e créditos no próximo plano."
        >
          <UpgradeCard currentTier={tier} />
        </SettingsSection>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <SettingsSection
          title="Histórico de faturas"
          description="Pagamentos anteriores e método de pagamento."
        >
          <div>
            {invoices.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
          <button className="mt-3 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 transition-colors">
            <CreditCard className="w-3.5 h-3.5" />
            Gerenciar método de pagamento
          </button>
        </SettingsSection>
      )}
    </div>
  )
}
