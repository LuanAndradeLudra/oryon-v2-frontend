// ─── BillingSettings ─────────────────────────────────────────────────────────
// Settings section: o que o cliente contratou, quanto consumiu, por que foi
// cobrado e o que deve (SCRUM-1210, Termos 7.2.6 / 7.2.8).
// Fonte: o CONTRATO (GET /settings/billing/contract) — preço contratado,
// franquia, limites e módulos da Proposta, não a tabela fixa do plans.ts.
// Sem autoatendimento (SCRUM-1204, Termos 4.1 c): contratar, trocar de plano e
// comprar créditos passam pela equipe Oryon a partir da Proposta.

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Zap, Users, Smartphone, Bot, RefreshCw, Handshake, ListChecks, Send,
  AlertTriangle, Receipt, Loader2, MessageCircle, FileText, CheckCircle2, XCircle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SettingsSection } from '../SettingsSection'
import { Banner } from '@/components/ui/Banner'
import { ErrorState } from '@/components/ui/ErrorState'
import { useBilling } from '@/hooks/useBilling'
import { billingApi, PAYMENT_METHOD_LABEL } from '@/services/billingApi'
import type {
  BillingInvoiceRow, ClientContract, CreditTransaction, EntitlementKeyId, PaymentStatus,
} from '@/services/billingApi'
import { ORYON_CONTACT } from '@/lib/copilotBlock'
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal'
import { invoiceStatusText, isCreditNote, signedAmount } from '@/lib/invoiceDisplay'

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: string | null | undefined, long = false) =>
  d ? new Date(d).toLocaleDateString('pt-BR', long ? { day: '2-digit', month: 'long', year: 'numeric' } : undefined) : '—'

const TERM_LABEL: Record<string, string> = { annual: 'Anual', semiannual: 'Semestral', monthly: 'Mensal' }

const LIMITS: Array<{ key: EntitlementKeyId; label: string; icon: React.ReactNode }> = [
  { key: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
  { key: 'waNumbers', label: 'Números de WhatsApp', icon: <Smartphone className="w-4 h-4" /> },
  { key: 'agents', label: 'Agentes de IA', icon: <Bot className="w-4 h-4" /> },
  { key: 'automations', label: 'Automações ativas', icon: <RefreshCw className="w-4 h-4" /> },
  { key: 'pipelines', label: 'Funis', icon: <Handshake className="w-4 h-4" /> },
  { key: 'customFields', label: 'Campos customizados', icon: <ListChecks className="w-4 h-4" /> },
  { key: 'campaignsPerMonth', label: 'Campanhas por mês', icon: <Send className="w-4 h-4" /> },
]

const MODULE_LABEL: Record<string, string> = {
  copilot: 'Copilot',
  agentBuilder: 'Construtor de agentes de IA',
  marketing: 'Marketing e atribuição',
  campaigns: 'Disparos',
  automations: 'Automações',
  nexus: 'Nexus (chat interno)',
  apiAccess: 'Acesso à API',
  advancedAnalytics: 'Relatórios avançados',
}

const INVOICE_STATUS: Record<string, string> = {
  pending: 'Em aberto', past_due: 'Vencida', paid: 'Paga', disputed: 'Em contestação', refunded: 'Estornada', canceled: 'Cancelada', failed: 'Falhou',
}
const INVOICE_KIND: Record<string, string> = {
  subscription: 'Mensalidade/parcela', setup: 'Implantação', overage: 'Excedente', credit_pack: 'Pacote',
  upgrade_difference: 'Diferença de upgrade', credit_note: 'Nota de crédito',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CreditBar({ used, total }: { used: number; total: number | null }) {
  const pct = total ? Math.min((used / total) * 100, 100) : 0
  const warning = pct >= 80 && pct < 100
  const danger = pct >= 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-400">Créditos de IA usados no ciclo</span>
        <span className={`font-semibold ${danger ? 'text-red-400' : warning ? 'text-status-pending' : 'text-surface-200'}`}>
          {used.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} / {total != null ? total.toLocaleString('pt-BR') : '∞'}
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

function LimitRow({ icon, label, limit, usage }: { icon: React.ReactNode; label: string; limit: number | null | undefined; usage: number | null | undefined }) {
  const unlimited = limit == null
  const over = !unlimited && usage != null && usage >= (limit as number)
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-800/50 last:border-0">
      <span className="text-surface-500 flex-shrink-0">{icon}</span>
      <span className="text-sm text-surface-300 flex-1">{label}</span>
      <span className={`text-sm font-medium ${over ? 'text-status-pending' : 'text-surface-200'}`}>
        {unlimited
          ? (usage != null ? `${usage.toLocaleString('pt-BR')} · ilimitado` : 'Ilimitado')
          : `${usage != null ? usage.toLocaleString('pt-BR') : '—'} de ${(limit as number).toLocaleString('pt-BR')}`}
      </span>
    </div>
  )
}

const TX_TYPE_LABEL: Record<CreditTransaction['type'], string> = {
  debit: 'Consumo', grant: 'Crédito', reset: 'Renovação', refund: 'Estorno', adjustment: 'Ajuste',
}

function TransactionRow({ tx }: { tx: CreditTransaction }) {
  const credits = Number(tx.credits)
  const isDebit = credits < 0
  const label = TX_TYPE_LABEL[tx.type] ?? tx.type
  return (
    <div className="flex items-center gap-4 py-3 border-b border-surface-800/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-200 truncate">{tx.feature ?? tx.source ?? label}</p>
        <p className="text-xs text-surface-500 mt-0.5">
          {label} · {new Date(tx.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
  const { billing, transactions, loading, error } = useBilling({ transactions: true })
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [statusError, setStatusError] = useState(false)
  const [contract, setContract] = useState<ClientContract | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoiceRow[]>([])
  // CL6 — falha de rede não pode virar "nenhuma fatura" nem "sem contrato".
  const [contractError, setContractError] = useState(false)
  const [invoicesError, setInvoicesError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const openInvoiceId = searchParams.get('invoice')

  const loadContract = useCallback(() => {
    billingApi.getContract()
      .then((r) => { setContract(r); setContractError(false) })
      .catch(() => setContractError(true))
    billingApi.getInvoices()
      .then((r) => { setInvoices(r); setInvoicesError(false) })
      .catch(() => setInvoicesError(true))
  }, [])

  useEffect(() => {
    let alive = true
    const loadStatus = () => {
      billingApi.getPaymentStatus()
        .then((s) => { if (alive) { setStatus(s); setStatusError(false) } })
        .catch(() => { if (alive) { setStatus(null); setStatusError(true) } })
    }
    loadContract()
    loadStatus()
    // Saldo ao vivo (SCRUM-805/1210): o socket avisa, a tela refaz o fetch.
    // O saldo já vem do useBilling; o contrato (consumo do ciclo, limites) é
    // mais caro — um fetch só ao fim de cada rajada de débitos.
    let timer: ReturnType<typeof setTimeout> | undefined
    const onBalance = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { if (alive) loadContract() }, 5000)
    }
    // CL6 — suspensão/reativação/baixa (socket `billing:account-state`): a
    // tela recarrega contrato, faturas e status na hora, sem F5.
    const onAccountState = () => { if (alive) { loadContract(); loadStatus() } }
    window.addEventListener('billing:balance-updated', onBalance)
    window.addEventListener('billing:account-state', onAccountState)
    return () => {
      alive = false; clearTimeout(timer)
      window.removeEventListener('billing:balance-updated', onBalance)
      window.removeEventListener('billing:account-state', onAccountState)
    }
  }, [loadContract])

  function openInvoice(id: string | null) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('invoice', id); else next.delete('invoice')
    setSearchParams(next, { replace: true })
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

  const c = contract?.contract ?? null
  const cycle = contract?.cycle ?? null
  const suspended = !!contract?.state?.suspended
  const isCanceled = billing.status === 'canceled' || status?.status === 'canceled'
  const isSubscribed = (status?.subscribed ?? false) && !isCanceled
  // "Vencida" é decisão do backend (calendário de Brasília, já descontadas as
  // notas de crédito) — comparar dueAt com o relógio local errava perto da meia-noite.
  const overdue = invoices.filter((i) => i.overdue)
  const overdueCents = overdue.reduce((a, i) => a + (i.netDueCents ?? 0), 0)
  const accessUntil = c?.endsAt ?? billing.planResetsAt
  const monthlyCents = c?.contractedMonthlyCents ?? billing.plan.priceMonthlyCents
  const planName = c?.displayName ?? billing.plan.displayName
  // Mesma fonte (assinatura): o useBilling revalida a cada débito, o contrato não.
  const used = billing.creditsUsed ?? cycle?.creditsUsed
  const total = cycle ? cycle.creditsTotal : billing.creditsTotal
  const overageCredits = (cycle?.overageCredits ?? 0) + (cycle?.pendingOverageCredits ?? 0)

  return (
    <div>
      {(statusError || contractError || suspended || overdue.length > 0 || isCanceled) && (
        <div className="space-y-3 pt-2">
          {contractError && (
            <ErrorState
              compact
              title="Não foi possível carregar o seu contrato"
              hint="Preço contratado, limites e situação da conta podem estar desatualizados."
              onRetry={loadContract}
            />
          )}

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

          {(suspended || overdue.length > 0) && (
            <div className={`rounded-2xl border p-4 flex items-start gap-3 ${suspended ? 'border-red-500/30 bg-red-500/5' : 'border-status-pending/40 bg-status-pending/5'}`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${suspended ? 'text-red-400' : 'text-status-pending'}`} />
              <div className="text-sm text-surface-200">
                <p className="font-medium">{suspended ? 'Conta suspensa por pendência financeira' : 'Pagamento em atraso'}</p>
                <p className="text-surface-400 text-xs mt-0.5">
                  {overdue.length} fatura(s) vencida(s){overdueCents > 0 ? ` — ${brl(overdueCents)} em aberto, sem encargos` : ''}. {suspended
                    ? 'IA e Copilot estão pausados. A conta volta quando todas as faturas vencidas forem pagas.'
                    : 'Regularize para evitar a suspensão; o acesso segue normal até lá.'}
                </p>
              </div>
            </div>
          )}

          {isCanceled && (
            <div className="rounded-2xl border border-surface-700 bg-surface-800/40 p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-surface-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-surface-200">
                <p className="font-medium">Assinatura cancelada</p>
                <p className="text-surface-400 text-xs mt-0.5">
                  {accessUntil
                    ? <>O contrato não será renovado. Acesso e franquia até {fmtDate(accessUntil, true)}.</>
                    : <>O acesso foi encerrado. Fale com a equipe Oryon para reativar.</>}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plano atual — preço CONTRATADO */}
      <SettingsSection title="Plano atual" description="O que está no seu contrato com a Oryon.">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-surface-950" fill="currentColor" />
              </div>
              <h2 className="text-xl font-bold text-surface-50">Oryon {planName}</h2>
            </div>
            <p className="text-sm text-surface-400 mt-1">
              {c ? <>{TERM_LABEL[c.term] ?? c.term} · {PAYMENT_METHOD_LABEL[c.paymentMethod] ?? c.paymentMethod}</> : 'Cobrança mensal'}
              {c?.monthlyCredits != null && <> · {c.monthlyCredits.toLocaleString('pt-BR')} créditos/mês</>}
            </p>
            {contract?.nextInvoice && (
              <p className="text-xs text-surface-500 mt-1">
                Próximo vencimento: {fmtDate(contract.nextInvoice.dueAt, true)} — {brl(contract.nextInvoice.amountCents)}
              </p>
            )}
            {c?.endsAt && <p className="text-xs text-surface-500 mt-0.5">Vigência até {fmtDate(c.endsAt, true)}{c.autoRenew ? ' (renovação automática)' : ' (sem renovação)'}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-surface-50">{brl(monthlyCents)}</p>
            <p className="text-xs text-surface-500">/mês contratado</p>
          </div>
        </div>
      </SettingsSection>

      {/* Consumo do ciclo — atualiza sem recarregar (socket) */}
      <SettingsSection title="Consumo do mês" description="Franquia do contrato e excedente do ciclo atual.">
        <CreditBar used={used} total={total} />
        {overageCredits > 0 && c && (
          <p className="text-xs text-surface-400 mt-3">
            Excedente acumulado: <span className="text-surface-200 font-medium">{overageCredits.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} créditos</span>
            {' '}× {brl(c.overage.priceCents)} — {c.overage.onNextInvoice ? 'entra na sua próxima fatura' : 'cobrado em fatura à parte no fechamento do ciclo'}.
          </p>
        )}
        <p className="text-xs text-surface-500 mt-3">
          {cycle?.resetsAt ? <>A franquia renova em {fmtDate(cycle.resetsAt, true)}. </> : null}
          Créditos não usados não acumulam para o mês seguinte, salvo previsão no contrato (Termos 7.3.5).
        </p>
      </SettingsSection>

      {/* Limites e módulos — do contrato */}
      <SettingsSection title="Limites do plano" description="Quantidades contratadas e o que você usa hoje.">
        {LIMITS.map((l) => (
          <LimitRow key={l.key} icon={l.icon} label={l.label} limit={c?.entitlements?.[l.key]} usage={contract?.usage?.[l.key]} />
        ))}
        {c && Object.keys(c.modules ?? {}).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(c.modules).map(([k, on]) => (
              <span key={k} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${on ? 'bg-status-active/10 text-status-active' : 'bg-surface-800 text-surface-500'}`}>
                {on ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {MODULE_LABEL[k] ?? k}
              </span>
            ))}
          </div>
        )}
        {/* A5/A18 — cancelamento só pela equipe Oryon (sem botão na plataforma). */}
        {contract?.contract?.cancellation ? (
          <div className="border-t border-surface-800/50 pt-3 mt-3 text-xs text-surface-400">
            {contract.contract.cancellation.afterRenewal
              ? <>Cancelamento registrado fora do prazo de 30 dias (Termos 18.1.2): o contrato renova em {fmtDate(contract.contract.endsAt, true)} e se encerra em {fmtDate(contract.contract.cancellation.effectiveAt, true)}.</>
              : <>Cancelamento registrado: acesso e franquia até {fmtDate(contract.contract.cancellation.effectiveAt, true)}, sem renovação.</>}
          </div>
        ) : isSubscribed && (
          <div className="border-t border-surface-800/50 pt-3 mt-3 text-xs text-surface-500 text-right">
            Para cancelar ou não renovar, fale com a equipe Oryon em{' '}
            <a className="text-brand-400 hover:underline" href={`mailto:${ORYON_CONTACT}?subject=${encodeURIComponent('Cancelamento do contrato')}`}>{ORYON_CONTACT}</a>
            {contract?.contract?.term && contract.contract.term !== 'monthly' && <> — até 30 dias antes do fim da vigência (Termos 18.1.2)</>}.
          </div>
        )}
      </SettingsSection>

      {/* Faturas */}
      <SettingsSection title="Faturas" description="Mensalidades, parcelas, implantação e excedente. Clique para ver a composição, o PDF e a segunda via.">
        {invoicesError ? (
          <ErrorState compact title="Não foi possível carregar as faturas" onRetry={loadContract} />
        ) : invoices.length === 0 ? (
          <p className="text-sm text-surface-500 py-2">Nenhuma fatura emitida ainda.</p>
        ) : (
          <ul className="divide-y divide-surface-800">
            {invoices.map((inv) => {
              const late = inv.overdue
              const creditNote = isCreditNote(inv.kind)
              const ref = creditNote && inv.referenceInvoiceId ? invoices.find((x) => x.id === inv.referenceInvoiceId) : null
              return (
                <li key={inv.id}>
                  <button onClick={() => openInvoice(inv.id)} className="w-full py-2.5 flex items-center justify-between gap-3 text-sm text-left hover:bg-surface-800/40 rounded-lg px-1">
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-surface-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-surface-100 font-medium truncate">
                          {inv.number ?? inv.id.slice(0, 8)} · {INVOICE_KIND[inv.kind] ?? inv.kind}
                        </p>
                        <p className="text-xs text-surface-500 truncate">
                          {creditNote
                            ? <>Estorno{inv.referenceInvoiceId ? ` da fatura ${ref?.number ?? inv.referenceInvoiceId.slice(0, 8)}` : ''} · {fmtDate(inv.createdAt)}</>
                            : <>
                                {inv.competenceMonth ? `Competência ${inv.competenceMonth.slice(5, 7)}/${inv.competenceMonth.slice(0, 4)} · ` : ''}
                                vence {fmtDate(inv.dueAt)}
                              </>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${creditNote ? 'text-status-active' : 'text-surface-100'}`}>
                        {signedAmount(inv.kind, Number(inv.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <p className={`text-[11px] uppercase tracking-wide ${late ? 'text-danger' : inv.status === 'paid' && !creditNote ? 'text-status-active' : 'text-surface-500'}`}>
                        {invoiceStatusText(inv, INVOICE_STATUS, late)}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
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
      <SettingsSection title="Extrato de créditos" description="Consumo e recargas de crédito, mais recentes primeiro.">
        <div className="flex items-center gap-2 mb-2 text-surface-400">
          <Receipt className="w-3.5 h-3.5" />
        </div>
        {transactions.length > 0 ? (
          transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        ) : (
          <p className="text-sm text-surface-500 py-2">Nenhuma movimentação de crédito ainda.</p>
        )}
      </SettingsSection>

      <InvoiceDetailModal invoiceId={openInvoiceId} onClose={() => openInvoice(null)} onChanged={loadContract} onOpenInvoice={openInvoice} />

    </div>
  )
}
