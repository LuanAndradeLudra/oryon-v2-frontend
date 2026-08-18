// ─── BillingSettings ─────────────────────────────────────────────────────────
// Settings section: plano, uso de créditos e extrato — ledger + gateway mock.

import { useEffect, useState } from 'react'
import {
  Zap, TrendingUp, Users, Smartphone, Bot, RefreshCw,
  ChevronRight, CheckCircle2, AlertTriangle, ArrowUpRight,
  Receipt, Loader2, Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  PLANS, formatCredits, mapBackendTier,
} from '@/config/plans'
import { useBilling } from '@/hooks/useBilling'
import { billingApi } from '@/services/billingApi'
import type {
  CreditTransaction, PlanOption, PaymentStatus, BackendPlanTier, CreditPack,
} from '@/services/billingApi'
import { CheckoutModal, type CheckoutIntent } from '@/components/settings/modals/CheckoutModal'
import { ConfirmModal } from '@/components/ui/Modal'

// Tiers contratáveis do backend, em ordem. enterprise é "sob consulta" (não
// self-serve). O próximo tier de upgrade sai daqui, não do PLAN_ORDER do front.
const BACKEND_ORDER: BackendPlanTier[] = ['start', 'professional', 'scale', 'enterprise']

function nextBackendTier(current: BackendPlanTier): BackendPlanTier | null {
  const i = BACKEND_ORDER.indexOf(current)
  const next = BACKEND_ORDER[i + 1]
  return next && next !== 'enterprise' ? next : null
}

// Pacotes de crédito vêm do backend (GET /settings/billing/credit-packs) —
// preço/quantidade são fonte de verdade server-side (SCRUM-154). O front só
// exibe; o backend valida o valor no buy-credits.

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

function UpgradeCard({
  currentTier, nextPlan, isSubscribed, onUpgrade, disabled,
}: {
  currentTier: BackendPlanTier
  nextPlan: PlanOption | null
  isSubscribed: boolean
  onUpgrade: (intent: CheckoutIntent) => void
  disabled?: boolean
}) {
  if (!nextPlan) return null

  const currentFront = mapBackendTier(currentTier)
  const nextFront = mapBackendTier(nextPlan.tier)
  const priceMonthly = Math.round(nextPlan.priceMonthlyCents / 100)

  // Módulos que o próximo tier desbloqueia (grade do front, via mapeamento).
  const newModules = Object.entries(PLANS[nextFront].modules)
    .filter(([key, val]) => val && !PLANS[currentFront].modules[key as keyof typeof PLANS[typeof nextFront]['modules']])
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
          <h3 className="text-lg font-bold text-surface-50">Plano {nextPlan.displayName}</h3>
          <p className="text-2xl font-bold text-brand-400 mt-1">
            R$&nbsp;{priceMonthly.toLocaleString('pt-BR')}<span className="text-sm text-surface-400 font-normal">/mês</span>
          </p>
          {nextPlan.monthlyCredits != null && (
            <p className="text-xs text-surface-400 mt-0.5">
              ≈ {nextPlan.monthlyCredits.toLocaleString('pt-BR')} atendimentos/mês
            </p>
          )}
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

      <button
        disabled={disabled}
        onClick={() => onUpgrade({
          kind: isSubscribed ? 'change' : 'subscribe',
          tier: nextPlan.tier,
          plan: nextPlan,
        })}
        className="mt-5 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 transition-colors text-surface-950 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
      >
        {isSubscribed ? 'Fazer upgrade' : 'Contratar'} {nextPlan.displayName}
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
  const { billing, transactions, loading, error, refetch } = useBilling({ transactions: true })
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  // Falha ao carregar payment-status NÃO assume "novo cliente" (evita cobrança duplicada).
  const [statusError, setStatusError] = useState(false)
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [intent, setIntent] = useState<CheckoutIntent | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    let alive = true
    // Planos e pacotes são independentes do status — carregam à parte.
    billingApi.getPlans().then((p) => { if (alive) setPlans(p) }).catch(() => {})
    billingApi.getCreditPacks().then((cp) => { if (alive) setPacks(cp) }).catch(() => {})
    billingApi.getPaymentStatus()
      .then((s) => { if (alive) { setStatus(s); setStatusError(false) } })
      .catch(() => { if (alive) { setStatus(null); setStatusError(true) } })
    return () => { alive = false }
  }, [])

  function openCredits(pack: CreditPack) {
    setIntent({ kind: 'credits', packCredits: pack.credits, valueCents: pack.valueCents })
  }

  function onCheckoutDone() {
    void refetch()
    billingApi.getPaymentStatus()
      .then((s) => { setStatus(s); setStatusError(false) })
      .catch(() => setStatusError(true))
  }

  async function confirmCancel() {
    setCanceling(true)
    try {
      await billingApi.cancel()
      onCheckoutDone()
      setCancelOpen(false)
    } finally {
      setCanceling(false)
    }
  }

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
  const backendTier = billing.plan.tier as BackendPlanTier
  const isCanceled = billing.status === 'canceled' || status?.status === 'canceled'
  const isSubscribed = (status?.subscribed ?? false) && !isCanceled
  const nextTier = nextBackendTier(backendTier)
  const nextPlan = nextTier ? plans.find((p) => p.tier === nextTier) ?? null : null
  const isPastDue = billing.status === 'past_due' || status?.status === 'past_due'
  const accessUntil = billing.planResetsAt
    ? new Date(billing.planResetsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const canCancel = isSubscribed && !isCanceled

  return (
    <div className="max-w-2xl space-y-6">

      {/* Status do gateway indisponível: bloqueia CTAs de pagamento */}
      {statusError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-surface-200">
            <p className="font-medium">Status de cobrança indisponível</p>
            <p className="text-surface-400 text-xs mt-0.5">
              Não foi possível confirmar sua assinatura agora. Contratar, trocar de
              plano e comprar créditos estão temporariamente desabilitados para
              evitar cobrança duplicada. Tente novamente em instantes.
            </p>
          </div>
        </div>
      )}

      {/* Inadimplência */}
      {isPastDue && (
        <div className="rounded-2xl border border-status-pending/40 bg-status-pending/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-status-pending flex-shrink-0 mt-0.5" />
          <div className="text-sm text-surface-200">
            <p className="font-medium">Pagamento em atraso</p>
            <p className="text-surface-400 text-xs mt-0.5">
              Regularize a cobrança para manter o plano ativo. O acesso é restabelecido na confirmação do pagamento.
            </p>
          </div>
        </div>
      )}

      {/* Assinatura cancelada — acesso até o fim do ciclo */}
      {isCanceled && (
        <div className="rounded-2xl border border-surface-700 bg-surface-800/40 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-surface-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-surface-200">
            <p className="font-medium">Assinatura cancelada</p>
            <p className="text-surface-400 text-xs mt-0.5">
              {accessUntil
                ? <>Você mantém o acesso até {accessUntil}. Não haverá nova cobrança.</>
                : <>O acesso foi encerrado. Contrate um plano para reativar.</>}
            </p>
          </div>
        </div>
      )}

      {/* Contratação (quando ainda não há assinatura paga) — nunca em statusError */}
      {status && !statusError && !isSubscribed && !isCanceled && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-950/20 p-4 flex items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-medium text-surface-100">Ative sua assinatura</p>
            <p className="text-surface-400 text-xs mt-0.5">Contrate o plano {billing.plan.displayName} (gateway mock confirma na hora).</p>
          </div>
          <button
            onClick={() => setIntent({
              kind: 'subscribe', tier: backendTier,
              plan: plans.find((p) => p.tier === backendTier) ?? {
                tier: backendTier, displayName: billing.plan.displayName,
                priceMonthlyCents: billing.plan.priceMonthlyCents, currency: billing.plan.currency,
                monthlyCredits: billing.plan.monthlyCredits, tokensPerCredit: billing.plan.tokensPerCredit,
                features: billing.plan.features,
              },
            })}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-semibold text-sm whitespace-nowrap"
          >
            Contratar
          </button>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900 p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-surface-950" fill="currentColor" />
              </div>
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Plano atual</span>
            </div>
            <h2 className="text-2xl font-bold text-surface-50">Oryon {billing.plan.displayName}</h2>
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
        <CreditBar used={billing.creditsUsed} total={billing.creditsTotal} />

        <p className="text-xs text-surface-500">
          1 crédito ≈ 1 atendimento (~7.000 tokens de conteúdo). Os créditos não acumulam entre períodos.
        </p>

        {/* Limits grid */}
        <div className="border-t border-surface-800/50 pt-4">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Limites do plano</p>
          <LimitRow icon={<TrendingUp className="w-4 h-4" />}  label="Créditos de IA / mês"    limit={billing.creditsTotal} />
          <LimitRow icon={<Users className="w-4 h-4" />}       label="Usuários"                 limit={plan.limits.users} />
          <LimitRow icon={<Smartphone className="w-4 h-4" />}  label="Números WhatsApp"         limit={plan.limits.waNumbers} />
          <LimitRow icon={<Bot className="w-4 h-4" />}         label="Agentes de IA"            limit={plan.limits.agents} />
          <LimitRow icon={<RefreshCw className="w-4 h-4" />}   label="Automações ativas"        limit={plan.limits.automations} />
          <LimitRow icon={<Zap className="w-4 h-4" />}         label="Interações Copilot / mês" limit={plan.limits.copilotInteractions} />
        </div>

        {canCancel && (
          <div className="border-t border-surface-800/50 pt-3 text-right">
            <button
              onClick={() => setCancelOpen(true)}
              className="text-xs text-surface-500 hover:text-red-400 transition-colors"
            >
              Cancelar assinatura
            </button>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      <UpgradeCard
        currentTier={backendTier}
        nextPlan={nextPlan}
        isSubscribed={isSubscribed}
        onUpgrade={setIntent}
        disabled={statusError}
      />

      {/* Pacotes de crédito */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="w-4 h-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-300">Comprar créditos avulsos</h3>
        </div>
        <p className="text-xs text-surface-500 mb-4">
          Pacotes não renovam — somam ao saldo atual. Ideal para picos de atendimento.
        </p>
        {packs.length === 0 ? (
          <p className="text-sm text-surface-500 py-2">Pacotes indisponíveis no momento.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {packs.map((pack) => (
              <button
                key={pack.credits}
                onClick={() => openCredits(pack)}
                disabled={statusError}
                className="rounded-xl border border-surface-700 hover:border-brand-500 hover:bg-surface-800 transition-colors p-3 text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-surface-700 disabled:hover:bg-transparent"
              >
                <p className="text-sm font-bold text-surface-100">{pack.credits.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-surface-500">créditos</p>
                <p className="text-xs text-brand-400 font-semibold mt-1">
                  R$ {(pack.valueCents / 100).toLocaleString('pt-BR')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Extrato de créditos */}
      <div className="rounded-2xl border border-surface-800 bg-surface-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-300">Extrato de créditos</h3>
        </div>
        {transactions.length > 0 ? (
          transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        ) : (
          <p className="text-sm text-surface-500 py-2">Nenhuma movimentação de crédito ainda.</p>
        )}
      </div>

      {/* Checkout (Pix / cartão) */}
      {intent && (
        <CheckoutModal
          open
          intent={intent}
          onClose={() => setIntent(null)}
          onDone={onCheckoutDone}
        />
      )}

      {/* Cancelamento (fim do ciclo) */}
      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
        title="Cancelar assinatura"
        description={accessUntil
          ? `Sua assinatura será cancelada, mas você mantém o acesso até ${accessUntil}. Não haverá nova cobrança e os créditos não são reembolsados.`
          : 'Sua assinatura será cancelada e o acesso encerrado. Não haverá nova cobrança.'}
        confirmLabel="Cancelar assinatura"
        danger
        loading={canceling}
      />
    </div>
  )
}
