// ─── BillingSettings ─────────────────────────────────────────────────────────
// Settings section: plano, uso de créditos e extrato — ledger + gateway mock.

import { useEffect, useState } from 'react'
import {
  Zap, TrendingUp, Users, Smartphone, Bot, RefreshCw,
  AlertTriangle, Receipt, Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SettingsSection } from '../SettingsSection'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
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

/** "01 out" / "30 set" — formato curto do mock 6a (sem "de" nem ponto). */
function formatDayMonth(iso: string): string {
  const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).formatToParts(new Date(iso))
  const day = parts.find((x) => x.type === 'day')?.value ?? ''
  const month = (parts.find((x) => x.type === 'month')?.value ?? '').replace('.', '')
  return `${day} ${month}`
}

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
  const numCls = danger ? 'text-red-400' : warning ? 'text-status-pending' : 'text-surface-200'

  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="font-semibold text-surface-100">Créditos de IA utilizados</span>
        <span className="text-surface-400">
          <span className={cn('font-semibold', numCls)}>{used.toLocaleString('pt-BR')}</span>
          {' / '}
          <span className={cn('font-semibold', numCls)}>{total ? total.toLocaleString('pt-BR') : '∞'}</span>
          {total ? <> · <span className={cn('font-semibold', numCls)}>{Math.round(pct)}</span>%</> : null}
        </span>
      </div>
      <div className="h-1.5 bg-[var(--sf2)] border border-surface-700 rounded-[3px] overflow-hidden mt-1.5">
        <motion.div
          className={`h-full ${danger ? 'bg-red-500' : warning ? 'bg-status-pending' : 'bg-brand-500'}`}
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

// SCRUM-1109 (Leva 11): o mock (tela `6a`) desenha uma mini-barra de uso por
// linha, mas hoje só existe uso real para créditos (`billing.creditsUsed`) —
// não há endpoint de "usuários ativos", "números conectados" etc. por tenant
// nesta tela. Fabricar esses números seria "sabidamente falso" (mesmo
// problema já sinalizado no Dashboard, DESIGN-SYSTEM.md §19) — a linha de
// créditos ganha a barra real; as demais mostram só o limite incluído.
function LimitRow({
  icon,
  label,
  limit,
  used,
}: {
  icon: React.ReactNode
  label: string
  limit: number | null
  /** Só a linha de créditos tem uso real hoje — ver comentário acima. */
  used?: number
}) {
  const hasUsage = used !== undefined && limit !== null
  const pct = hasUsage ? Math.min((used / limit) * 100, 100) : 0
  const atCeiling = hasUsage && used >= limit

  return (
    <div className="grid grid-cols-[1fr_160px_90px] items-center h-9 border-b border-surface-700 last:border-b-0">
      <span className="flex items-center gap-2 text-[13px] text-surface-100 min-w-0">
        <span className="text-surface-500 flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="h-1 rounded-[2px] bg-[var(--sf2)] overflow-hidden">
        {hasUsage && (
          <span
            className={cn('block h-full rounded-full', atCeiling ? 'bg-warning' : 'bg-brand-500')}
            style={{ width: `${pct}%` }}
          />
        )}
      </span>
      <span className={cn('text-sm text-right tabular-nums', atCeiling ? 'font-semibold text-warning' : 'text-surface-400')}>
        {hasUsage ? `${used.toLocaleString('pt-BR')}/${limit.toLocaleString('pt-BR')}` : formatCredits(limit)}
      </span>
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
    <div className="flex items-center gap-4 py-3 border-b border-surface-700 last:border-0">
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

// README §3.11: "uma tabela de 3 colunas dentro de UMA borda (não três
// cards)". Colunas = tier atual + até 2 próximos da cadeia backend; a
// coluna imediatamente seguinte ao atual é a recomendada (inset accent +
// chip). Preço/nome vêm de `plans` (API, autoritativo); os "recursos
// incluídos" de cada coluna vêm da config estática do front
// (`PLANS[...].limits`) — mesma fonte que o resto da página já usa para a
// grade de limites, não é dado novo.
function UpgradeTable({
  currentTier,
  billingDisplayName,
  billingPriceMonthly,
  plans,
  isSubscribed,
  onUpgrade,
  disabled,
}: {
  currentTier: BackendPlanTier
  billingDisplayName: string
  billingPriceMonthly: number
  plans: PlanOption[]
  isSubscribed: boolean
  onUpgrade: (intent: CheckoutIntent) => void
  disabled?: boolean
}) {
  const chain = BACKEND_ORDER.slice(BACKEND_ORDER.indexOf(currentTier)).slice(0, 3)
  if (chain.length < 2) return null

  return (
    <div className="border border-surface-700 rounded-md overflow-hidden flex flex-col sm:flex-row">
      {chain.map((tier, i) => {
        const isCurrent = tier === currentTier
        const isRecommended = i === 1
        const opt = plans.find((p) => p.tier === tier) ?? null
        const front = mapBackendTier(tier)
        const limits = PLANS[front].limits
        const name = isCurrent ? billingDisplayName : (opt?.displayName ?? PLANS[front].name)
        const priceLabel = isCurrent
          ? `R$ ${billingPriceMonthly.toLocaleString('pt-BR')}`
          : opt
            ? `R$ ${Math.round(opt.priceMonthlyCents / 100).toLocaleString('pt-BR')}`
            : 'Consultar'
        const credits = isCurrent ? undefined : (opt?.monthlyCredits ?? limits.creditsPerMonth)
        const resourceLine = [
          credits != null ? `${formatCredits(credits)} créditos` : null,
          limits.users != null ? `${limits.users} usuários` : null,
          limits.waNumbers != null ? `${limits.waNumbers} números` : null,
          limits.agents != null ? `${limits.agents} agentes` : null,
        ].filter(Boolean).join(' · ')

        return (
          <div
            key={tier}
            style={isRecommended ? { boxShadow: 'inset 0 2px 0 var(--color-brand-500)' } : undefined}
            className={cn(
              'flex-1 p-3.5 border-t sm:border-t-0 sm:border-l first:border-l-0 first:border-t-0 border-surface-700',
              isCurrent && 'bg-[var(--sf2)]',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12.5px] font-semibold text-surface-100">{name}</span>
              {isCurrent && <span className="text-[11px] font-medium text-surface-500">· atual</span>}
              {isRecommended && (
                <span className="inline-flex items-center h-4 bg-accent-soft text-accent-dark text-[10px] font-bold px-[5px] rounded-[4px]">
                  Recomendado
                </span>
              )}
            </div>
            <p className="text-lg font-extrabold text-surface-50 tabular-nums mt-1" style={{ letterSpacing: '-.02em' }}>
              {priceLabel}<span className="text-[11px] text-surface-500 font-medium" style={{ letterSpacing: 0 }}>/mês</span>
            </p>
            <p className="text-[11.5px] text-surface-400 mt-2 leading-[1.6]">{resourceLine}</p>
            {!isCurrent && (
              <Button
                size="sm"
                variant={isRecommended ? 'primary' : 'neutral'}
                className="mt-2.5"
                disabled={disabled || !opt}
                onClick={() => opt && onUpgrade({ kind: isSubscribed ? 'change' : 'subscribe', tier, plan: opt })}
                title={!opt ? 'Sob consulta' : undefined}
              >
                {opt ? `Mudar para ${name}` : 'Falar com vendas'}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BillingSettings() {
  const { billing, transactions, loading, error, refetch } = useBilling({ transactions: true })
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  // Falha ao carregar payment-status NÃO assume "novo cliente" (evita cobrança duplicada).
  const [statusError, setStatusError] = useState(false)
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [invoices, setInvoices] = useState<import('@/services/billingApi').BillingInvoiceRow[]>([])
  const [intent, setIntent] = useState<CheckoutIntent | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    let alive = true
    // Planos e pacotes são independentes do status — carregam à parte.
    billingApi.getPlans().then((p) => { if (alive) setPlans(p) }).catch(() => {})
    billingApi.getCreditPacks().then((cp) => { if (alive) setPacks(cp) }).catch(() => {})
    billingApi.getInvoices().then((inv) => { if (alive) setInvoices(inv) }).catch(() => {})
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
      <Banner variant="danger" className="max-w-2xl">
        Não foi possível carregar a cobrança. Tente novamente em instantes.
      </Banner>
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
  // PLAN-04/PLAN-14 (spec/6a-faturamento.GAPS.md): "Avaliação · N dias
  // restantes" e "Renova em N dias" vêm do mesmo dado real (planResetsAt),
  // não é número inventado.
  const daysUntilReset = billing.planResetsAt
    ? Math.max(0, Math.ceil((new Date(billing.planResetsAt).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <div>

      {/* Alertas de cobrança (nível de página) — Banner compartilhado para os
          3 estados de status/erro; a ativação é a ÚNICA exceção "sem cards"
          do README §3.11 (borda acento + fundo acento suave), porque é CTA
          positivo de conversão, não um status de warning/danger/neutral. */}
      {statusError && (
        <Banner variant="danger" className="mt-2">
          <p className="font-medium">Status de cobrança indisponível</p>
          <p className="text-xs opacity-80 mt-0.5">
            Não foi possível confirmar sua assinatura agora. Contratar, trocar de
            plano e comprar créditos estão temporariamente desabilitados para
            evitar cobrança duplicada. Tente novamente em instantes.
          </p>
        </Banner>
      )}

      {isPastDue && (
        <Banner variant="warning" className="mt-2">
          <p className="font-medium">Pagamento em atraso</p>
          <p className="text-xs opacity-80 mt-0.5">
            Regularize a cobrança para manter o plano ativo. O acesso é restabelecido na confirmação do pagamento.
          </p>
        </Banner>
      )}

      {isCanceled && (
        <Banner variant="neutral" className="mt-2">
          <p className="font-medium">Assinatura cancelada</p>
          <p className="text-xs opacity-80 mt-0.5">
            {accessUntil
              ? <>Você mantém o acesso até {accessUntil}. Não haverá nova cobrança.</>
              : <>O acesso foi encerrado. Contrate um plano para reativar.</>}
          </p>
        </Banner>
      )}

      {status && !statusError && !isSubscribed && !isCanceled && (
        <div className="mt-0 mb-1 flex items-center justify-between gap-3 rounded-lg border border-brand-500 bg-accent-soft px-3.5 py-2.5">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-surface-100">Ative sua assinatura</p>
              <p className="text-xs text-surface-400 mt-0.5">
                Você está no período de avaliação. Contrate o plano {billing.plan.displayName} para manter os agentes ativos
                {billing.planResetsAt && <> após {formatDayMonth(billing.planResetsAt)}</>}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="flex-shrink-0 h-8 px-3.5 text-[12.5px]"
            onClick={() => setIntent({
              kind: 'subscribe', tier: backendTier,
              plan: plans.find((p) => p.tier === backendTier) ?? {
                tier: backendTier, displayName: billing.plan.displayName,
                priceMonthlyCents: billing.plan.priceMonthlyCents, currency: billing.plan.currency,
                monthlyCredits: billing.plan.monthlyCredits, tokensPerCredit: billing.plan.tokensPerCredit,
                features: billing.plan.features,
              },
            })}
          >
            Contratar {billing.plan.displayName}
          </Button>
        </div>
      )}

      {/* Current plan */}
      <SettingsSection
        labelWidth={220}
        dense
        title="Plano atual"
        description="Sua assinatura, ciclo de cobrança e consumo de créditos de IA."
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-accent-soft flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-accent-dark" fill="currentColor" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-surface-50" style={{ letterSpacing: '-.01em' }}>Oryon {billing.plan.displayName}</h2>
                {!isSubscribed && !isCanceled && daysUntilReset != null && (
                  <span
                    className="color-chip-soft inline-flex items-center h-5 px-[7px] rounded-[5px] border text-[11px] font-bold"
                    style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
                  >
                    Avaliação · {daysUntilReset} dia{daysUntilReset === 1 ? '' : 's'} restante{daysUntilReset === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-400 mt-0.5">
                Cobrança mensal
                {atendimentos != null && <> · ≈ {atendimentos.toLocaleString('pt-BR')} atendimentos/mês</>}
                {billing.planResetsAt && <> · próximo ciclo {formatDayMonth(billing.planResetsAt)}</>}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[22px] font-extrabold text-surface-50 tabular-nums leading-[1.1]" style={{ letterSpacing: '-.02em' }}>
              R$&nbsp;{priceMonthly.toLocaleString('pt-BR')}<span className="text-[11.5px] text-surface-500 font-normal">/mês</span>
            </p>
          </div>
        </div>

        {/* Credit usage */}
        <div className="mt-3.5">
          <CreditBar used={billing.creditsUsed} total={billing.creditsTotal} />
        </div>

        <div className="flex items-center justify-between gap-3 mt-[5px]">
          <p className="text-[11.5px] text-surface-500">
            1 crédito ≈ 1 atendimento (~7.000 tokens de conteúdo). Os créditos não acumulam entre períodos.
          </p>
          {daysUntilReset != null && (
            <span className="text-[11.5px] text-surface-500 flex-shrink-0">
              Renova em {daysUntilReset} dia{daysUntilReset === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </SettingsSection>

      {/* Limits */}
      <SettingsSection
        labelWidth={220}
        dense
        title="Limites do plano"
        description="Recursos incluídos na sua assinatura atual."
      >
        <LimitRow icon={<TrendingUp className="w-3.5 h-3.5" />}  label="Créditos de IA / mês"    limit={billing.creditsTotal} used={billing.creditsUsed} />
        <LimitRow icon={<Users className="w-3.5 h-3.5" />}       label="Usuários"                 limit={plan.limits.users} />
        <LimitRow icon={<Smartphone className="w-3.5 h-3.5" />}  label="Números WhatsApp"         limit={plan.limits.waNumbers} />
        <LimitRow icon={<Bot className="w-3.5 h-3.5" />}         label="Agentes de IA"            limit={plan.limits.agents} />
        <LimitRow icon={<RefreshCw className="w-3.5 h-3.5" />}   label="Automações ativas"        limit={plan.limits.automations} />
        <LimitRow icon={<Zap className="w-3.5 h-3.5" />}         label="Interações Copilot / mês" limit={plan.limits.copilotInteractions} />

        {canCancel && (
          <div className="border-t border-surface-700 pt-3 mt-2 text-right">
            <button
              onClick={() => setCancelOpen(true)}
              className="text-xs text-surface-500 hover:text-red-400 transition-colors"
            >
              Cancelar assinatura
            </button>
          </div>
        )}
      </SettingsSection>

      {/* Upgrade CTA */}
      {nextPlan && (
        <SettingsSection
          labelWidth={220}
        dense
        title="Upgrade"
          description="O próximo plano libera mais usuários, números e agentes."
        >
          <UpgradeTable
            currentTier={backendTier}
            billingDisplayName={billing.plan.displayName}
            billingPriceMonthly={priceMonthly}
            plans={plans}
            isSubscribed={isSubscribed}
            onUpgrade={setIntent}
            disabled={statusError}
          />
        </SettingsSection>
      )}

      {/* Pacotes de crédito */}
      <SettingsSection
        labelWidth={220}
        dense
        title="Comprar créditos avulsos"
        description="Pacotes não renovam — somam ao saldo atual. Ideal para picos de atendimento."
      >
        {packs.length === 0 ? (
          <p className="text-sm text-surface-500 py-2">Pacotes indisponíveis no momento.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {packs.map((pack) => (
              <button
                key={pack.credits}
                onClick={() => openCredits(pack)}
                disabled={statusError}
                className="rounded-sm border border-surface-700 hover:border-brand-500 hover:bg-[var(--rowhover)] transition-colors p-3 text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-surface-700 disabled:hover:bg-transparent"
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
      </SettingsSection>

      {/* Extrato de créditos */}
      <SettingsSection
        labelWidth={220}
        dense
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

      {/* Faturas (F3) — fonte: GET /settings/billing/invoices */}
      <SettingsSection
        title="Faturas"
        description="Cobranças de assinatura, setup, excedente e pacotes."
      >
        {invoices.length === 0 ? (
          <p className="text-sm text-surface-500 py-2">Nenhuma fatura emitida ainda.</p>
        ) : (
          <ul className="divide-y divide-surface-800">
            {invoices.map((inv) => (
              <li key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-surface-100 font-medium truncate">
                    {inv.number ?? inv.id.slice(0, 8)} · {inv.kind}
                  </p>
                  <p className="text-xs text-surface-500 truncate">
                    {inv.description ?? '—'}
                    {inv.dueAt
                      ? ` · vence ${new Date(inv.dueAt).toLocaleDateString('pt-BR')}`
                      : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-surface-100 font-semibold">
                    R$ {Number(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-surface-500">{inv.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

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
        impact={{
          label: accessUntil ? `Acesso mantido até ${accessUntil}` : 'Acesso encerrado imediatamente',
          tone: accessUntil ? 'warning' : 'danger',
        }}
        description={accessUntil
          ? 'Sua assinatura será cancelada. Não haverá nova cobrança e os créditos não são reembolsados.'
          : 'Sua assinatura será cancelada. Não haverá nova cobrança.'}
        confirmLabel="Cancelar assinatura"
        danger
        loading={canceling}
      />
    </div>
  )
}
