// ─── BillingSettings ─────────────────────────────────────────────────────────
// Settings section: plano, uso de créditos, extrato e faturas.
// Sem autoatendimento (SCRUM-1204, Termos 4.1 c): contratar, trocar de plano e
// comprar créditos passam pela equipe Oryon a partir da Proposta.

import { useEffect, useState } from 'react'
import {
  Zap, TrendingUp, Users, Smartphone, Bot, RefreshCw,
  AlertTriangle, Receipt, Loader2, MessageCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SettingsSection } from '../SettingsSection'
import { Banner } from '@/components/ui/Banner'
import {
  PLANS, formatCredits, mapBackendTier,
} from '@/config/plans'
import { useBilling } from '@/hooks/useBilling'
import { billingApi } from '@/services/billingApi'
import type { CreditTransaction, PaymentStatus } from '@/services/billingApi'
import { ConfirmModal } from '@/components/ui/Modal'

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
          Você usou {Math.round(pct)}% da franquia do mês.
        </p>
      )}
      {danger && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Franquia do mês esgotada. O atendimento continua e o consumo extra entra como excedente, conforme o seu contrato.
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

// ─── Main component ───────────────────────────────────────────────────────────

export function BillingSettings() {
  const { billing, transactions, loading, error, refetch } = useBilling({ transactions: true })
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  // Falha ao carregar payment-status NÃO assume "novo cliente" (evita cobrança duplicada).
  const [statusError, setStatusError] = useState(false)
  const [invoices, setInvoices] = useState<import('@/services/billingApi').BillingInvoiceRow[]>([])
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    let alive = true
    billingApi.getInvoices().then((inv) => { if (alive) setInvoices(inv) }).catch(() => {})
    billingApi.getPaymentStatus()
      .then((s) => { if (alive) { setStatus(s); setStatusError(false) } })
      .catch(() => { if (alive) { setStatus(null); setStatusError(true) } })
    return () => { alive = false }
  }, [])

  function onStatusChanged() {
    void refetch()
    billingApi.getPaymentStatus()
      .then((s) => { setStatus(s); setStatusError(false) })
      .catch(() => setStatusError(true))
  }

  async function confirmCancel() {
    setCanceling(true)
    try {
      await billingApi.cancel()
      onStatusChanged()
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
  const isCanceled = billing.status === 'canceled' || status?.status === 'canceled'
  const isSubscribed = (status?.subscribed ?? false) && !isCanceled
  const isPastDue = billing.status === 'past_due' || status?.status === 'past_due'
  const accessUntil = billing.planResetsAt
    ? new Date(billing.planResetsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const canCancel = isSubscribed && !isCanceled

  return (
    <div>

      {/* Alertas de cobrança (nível de página) */}
      {(statusError || isPastDue || isCanceled) && (
        <div className="space-y-3 pt-2">
          {/* Status de cobrança indisponível */}
          {statusError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-surface-200">
                <p className="font-medium">Status de cobrança indisponível</p>
                <p className="text-surface-400 text-xs mt-0.5">
                  Não foi possível confirmar a situação da sua assinatura agora. Tente
                  novamente em instantes.
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
                  Há fatura vencida. Regularize o pagamento para evitar a suspensão da conta; o acesso é restabelecido quando todas as faturas vencidas forem pagas.
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
                    : <>O acesso foi encerrado. Fale com a equipe Oryon para reativar.</>}
                </p>
              </div>
            </div>
          )}

        </div>
      )}

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

        {canCancel && (
          <div className="border-t border-surface-800/50 pt-3 mt-2 text-right">
            <button
              onClick={() => setCancelOpen(true)}
              className="text-xs text-surface-500 hover:text-red-400 transition-colors"
            >
              Cancelar assinatura
            </button>
          </div>
        )}
      </SettingsSection>

      {/* Mudanças no contrato passam pela equipe (Termos 4.1 c) */}
      <SettingsSection
        title="Mudar de plano ou comprar créditos"
        description="Upgrade, pacotes de créditos e mudanças no contrato são feitos pela equipe Oryon, com uma nova Proposta."
      >
        <div className="flex items-start gap-3 text-sm text-surface-300">
          <MessageCircle className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <p>
            Fale com o seu gerente de conta ou com o suporte Oryon. As condições novas
            valem a partir da assinatura da Proposta.
          </p>
        </div>
      </SettingsSection>

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
