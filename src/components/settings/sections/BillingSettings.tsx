// ─── BillingSettings ─────────────────────────────────────────────────────────
// Settings section: plano, uso de créditos e extrato — dados reais do ledger
// no backend (SCRUM-172). Faturas (Asaas) entram na Fase 3.

import { useState } from 'react'
import {
  Zap, TrendingUp, Users, Smartphone, Bot, RefreshCw,
  ChevronRight, CheckCircle2, AlertTriangle, ArrowUpRight,
  Receipt, Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SettingsSection } from '../SettingsSection'
import type { PlanTier } from '@/types'
import {
  PLANS, PLAN_ORDER, formatCredits, formatPlanPrice, annualSavings, mapBackendTier,
} from '@/config/plans'
import { useBilling } from '@/hooks/useBilling'
import type { CreditTransaction } from '@/services/billingApi'

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreditBar({ used, total }: { used: number; total: number | null }) {
  const pct = total ? Math.min((used / total) * 100, 100) : 0
  const warning = pct >= 80 && pct < 100
  const danger  = pct >= 100

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
      {warning && (
        <p className="text-xs text-status-pending flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Você usou {Math.round(pct)}% dos créditos. Considere fazer upgrade.
        </p>
      )}
      {danger && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Créditos esgotados — o Copilot é bloqueado e o atendimento sinaliza recarga.
        </p>
      )}
    </div>
  )
}

function LimitRow({
  icon,
  label,
  limit,
}: {
  icon: React.ReactNode
  label: string
  limit: number | null
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-800/50 last:border-0">
      <span className="text-surface-500 flex-shrink-0">{icon}</span>
      <span className="text-sm text-surface-300 flex-1">{label}</span>
      <span className="text-sm font-medium text-surface-200">{formatCredits(limit)}</span>
    </div>
  )
}

const TX_TYPE_LABEL: Record<CreditTransaction['type'], string> = {
  debit:      'Consumo',
  grant:      'Crédito',
  reset:      'Renovação',
  refund:     'Estorno',
  adjustment: 'Ajuste',
}

function TransactionRow({ tx }: { tx: CreditTransaction }) {
  const credits = Number(tx.credits)
  const isDebit = credits < 0
  const label = TX_TYPE_LABEL[tx.type] ?? tx.type
  const desc = tx.feature ?? tx.source ?? label

  return (
    <div className="flex items-center gap-4 py-3 border-b border-surface-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-200 truncate">{desc}</p>
        <p className="text-xs text-surface-500 mt-0.5">
          {label}
          {' · '}
          {new Date(tx.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {tx.model ? ` · ${tx.model}` : ''}
        </p>
      </div>
      <span className={`text-sm font-semibold w-24 text-right ${isDebit ? 'text-surface-300' : 'text-status-active'}`}>
        {isDebit ? '' : '+'}{credits.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
        <span className="text-xs text-surface-500"> cr</span>
      </span>
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
  const { billing, transactions, loading, error } = useBilling({ transactions: true })

  if (loading && !billing) {
    return (
      <div className="max-w-2xl flex items-center gap-2 text-surface-400 text-sm py-10">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando informações de cobrança…
      </div>
    )
  }

  if (error && !billing) {
    return (
      <div className="max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-300 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Não foi possível carregar a cobrança. Tente novamente em instantes.
      </div>
    )
  }

  if (!billing) return null

  const frontTier = mapBackendTier(billing.plan.tier)
  const plan = PLANS[frontTier]
  const priceMonthly = Math.round(billing.plan.priceMonthlyCents / 100)
  const atendimentos = billing.plan.monthlyCredits
  // Mesma regra do UpgradeCard: só há upgrade se existir próximo tier não-enterprise.
  const nextTier = PLAN_ORDER[PLAN_ORDER.indexOf(frontTier) + 1] as PlanTier | undefined
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
              <h2 className="text-xl font-bold text-surface-50">Oryon {billing.plan.displayName}</h2>
            </div>
            <p className="text-sm text-surface-400 mt-0.5">
              {billing.planResetsAt
                ? <>Próxima renovação: {new Date(billing.planResetsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</>
                : 'Cobrança mensal'}
              {atendimentos != null && <> {' · '} ≈ {atendimentos.toLocaleString('pt-BR')} atendimentos/mês</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-surface-50">
              R$&nbsp;{priceMonthly.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-surface-500">/mês</p>
          </div>
        </div>

        {/* Credit usage */}
        <div className="mt-5">
          <CreditBar used={billing.creditsUsed} total={billing.creditsTotal} />
        </div>

        <p className="text-xs text-surface-500 mt-3">
          1 crédito ≈ 1 atendimento (~7.000 tokens de conteúdo). Os créditos não acumulam entre períodos.
        </p>
      </SettingsSection>

      {/* Limits */}
      <SettingsSection
        title="Limites do plano"
        description="Recursos incluídos na sua assinatura atual."
      >
        <LimitRow icon={<TrendingUp className="w-4 h-4" />}  label="Créditos de IA / mês"    limit={billing.creditsTotal} />
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
          <UpgradeCard currentTier={frontTier} />
        </SettingsSection>
      )}

      {/* Extrato de créditos */}
      <SettingsSection
        title="Extrato de créditos"
        description="Consumo e recargas de crédito, mais recentes primeiro."
      >
        <div className="flex items-center gap-2 mb-2 text-surface-400">
          <Receipt className="w-3.5 h-3.5" />
        </div>
        {transactions.length > 0 ? (
          transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        ) : (
          <p className="text-sm text-surface-500 py-2">Nenhuma movimentação de crédito ainda.</p>
        )}
      </SettingsSection>
      {/* Faturas (Asaas) entram na Fase 3 — não há dado real ainda, então não
          renderizamos uma seção de invoices com placeholder/mock. */}
    </div>
  )
}
