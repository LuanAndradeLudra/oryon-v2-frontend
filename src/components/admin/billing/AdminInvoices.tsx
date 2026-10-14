// ─── Faturas — operador (SCRUM-1209) ─────────────────────────────────────────
// Até a integração com o gateway, o recebimento é conferido pelo financeiro e
// registrado aqui (baixa manual, auditada). Pagar a última fatura vencida
// reativa a conta suspensa. Também: nota de crédito (estorno), resolução de
// contestação, índice IPCA da segunda via e "emitir agora".

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, CheckCircle2, Undo2, Scale, RefreshCw, Play, Receipt } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormDialog } from '@/components/ui/FormDialog'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage, cn } from '@/lib/utils'
import { localIsoDate } from '@/lib/localDate'
import { isOverdueBrt, paidAtForPayDate } from '@/lib/adminBillingForm'
import { invoiceStatusText, isCreditNote, signedAmount } from '@/lib/invoiceDisplay'
import {
  adminBillingApi, ADMIN_INVOICES_PAGE, formatBRL, INVOICE_KIND_LABEL, INVOICE_STATUS_LABEL, openPdf,
  type AdminInvoiceRow, type IndexRateRow, type InvoiceDetail,
} from '@/services/adminBillingApi'

type Filter = 'open' | 'overdue' | 'disputed' | 'paid' | 'all'
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'open', label: 'Em aberto' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'disputed', label: 'Contestadas' },
  { value: 'paid', label: 'Pagas' },
  { value: 'all', label: 'Todas' },
]

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')
const fmtComp = (c: string | null) => (c ? `${c.slice(5, 7)}/${c.slice(0, 4)}` : '—')

const STATUS_TONE: Record<string, string> = {
  pending: 'text-surface-300',
  past_due: 'text-danger',
  paid: 'text-status-active',
  disputed: 'text-status-pending',
  refunded: 'text-surface-500',
  canceled: 'text-surface-500',
}

export function AdminInvoices() {
  const [filter, setFilter] = useState<Filter>('open')
  const [rows, setRows] = useState<AdminInvoiceRow[] | null>(null)
  const [error, setError] = useState(false)
  // Veio página cheia → pode haver mais (paginação de 200 em 200 por `offset`).
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [payFor, setPayFor] = useState<InvoiceDetail | null>(null)
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState(() => localIsoDate())
  const [payAmount, setPayAmount] = useState(0)
  const [recalculating, setRecalculating] = useState(false)
  // Sobe a cada abertura/troca de data: resposta de um pedido antigo é descartada.
  const payReq = useRef(0)
  // Sobe a cada recarga da lista: "Carregar mais" de um filtro antigo é descartado.
  const listGen = useRef(0)
  const [creditFor, setCreditFor] = useState<AdminInvoiceRow | null>(null)
  const [creditAmount, setCreditAmount] = useState(0)
  const [creditReason, setCreditReason] = useState('')
  const [disputeFor, setDisputeFor] = useState<AdminInvoiceRow | null>(null)
  const [accepted, setAccepted] = useState(0)
  const [disputeNote, setDisputeNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [rates, setRates] = useState<IndexRateRow[]>([])
  const [correctionOn, setCorrectionOn] = useState<boolean | null>(null)
  const [rateMonth, setRateMonth] = useState('')
  const [rateValue, setRateValue] = useState('')

  const filterParams = useCallback(() => (
    filter === 'open' ? { status: 'pending,past_due' }
    : filter === 'overdue' ? { overdue: true }
    : filter === 'disputed' ? { status: 'disputed' }
    : filter === 'paid' ? { status: 'paid,refunded' }
    : {}
  ), [filter])

  const load = useCallback(() => {
    setError(false)
    setRows(null)
    setHasMore(false)
    const gen = ++listGen.current
    adminBillingApi.listInvoices(filterParams())
      .then((r) => { if (gen === listGen.current) { setRows(r); setHasMore(r.length >= ADMIN_INVOICES_PAGE) } })
      .catch(() => { if (gen === listGen.current) setError(true) })
  }, [filterParams])

  async function loadMore() {
    if (!rows) return
    setLoadingMore(true)
    const gen = listGen.current
    try {
      const more = await adminBillingApi.listInvoices({ ...filterParams(), offset: rows.length })
      if (gen !== listGen.current) return
      // Sem duplicar se uma fatura nova deslocou a página entre um pedido e outro.
      setRows((cur) => {
        const seen = new Set((cur ?? []).map((r) => r.id))
        return [...(cur ?? []), ...more.filter((r) => !seen.has(r.id))]
      })
      setHasMore(more.length >= ADMIN_INVOICES_PAGE)
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível carregar mais faturas'), 'error')
    } finally { setLoadingMore(false) }
  }

  useEffect(() => { load() }, [load])
  useEffect(() => {
    adminBillingApi.indexRates().then(setRates).catch(() => {})
    adminBillingApi.indexRatesStatus().then((s) => setCorrectionOn(s.correctionEnabled)).catch(() => setCorrectionOn(null))
  }, [])

  function pdf(path: string) {
    openPdf(path).catch((e) => showToast(getApiErrorMessage(e, 'Não foi possível abrir o PDF'), 'error'))
  }

  // Cada abertura começa do zero: data de hoje (relógio local, não UTC) e o
  // valor atualizado de hoje — nada herdado da fatura aberta antes.
  async function openPay(row: AdminInvoiceRow) {
    const req = ++payReq.current
    setRecalculating(false)
    try {
      const d = await adminBillingApi.invoiceDetail(row.id)
      if (req !== payReq.current) return
      setPayFor(d)
      setPayDate(localIsoDate())
      setPayAmount(d.charges.totalCents)
      setPayNote('')
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível abrir a fatura'), 'error')
    }
  }

  function closePay() {
    payReq.current++
    setRecalculating(false)
    setPayFor(null)
  }

  // Mudou a data do recebimento → encargos (multa, juros, correção) daquela
  // data, e o valor sugerido acompanha.
  async function changePayDate(value: string) {
    setPayDate(value)
    if (!payFor || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    const req = ++payReq.current
    setRecalculating(true)
    try {
      const d = await adminBillingApi.invoiceDetail(payFor.invoice.id, value)
      if (req !== payReq.current) return
      setPayFor(d)
      setPayAmount(d.charges.totalCents)
    } catch (e) {
      if (req === payReq.current) showToast(getApiErrorMessage(e, 'Não foi possível recalcular os encargos nesta data'), 'error')
    } finally {
      if (req === payReq.current) setRecalculating(false)
    }
  }

  async function submitPay() {
    if (!payFor) return
    setBusy(true)
    try {
      const r = await adminBillingApi.registerPayment(payFor.invoice.id, {
        // AD2 — hoje: sem `paidAt` (o backend usa o instante dele); meio-dia
        // de hoje antes do meio-dia era "data no futuro" (400).
        paidAt: paidAtForPayDate(payDate),
        amountCents: payAmount || undefined,
        note: payNote || undefined,
      })
      showToast(r.reactivated ? 'Pagamento registrado. A conta foi reativada.' : r.remainingOverdue > 0 ? `Pagamento registrado. Ainda há ${r.remainingOverdue} fatura(s) vencida(s).` : 'Pagamento registrado.', 'success')
      closePay()
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível registrar o pagamento'), 'error')
    } finally { setBusy(false) }
  }

  async function submitCredit() {
    if (!creditFor) return
    setBusy(true)
    try {
      await adminBillingApi.creditNote(creditFor.id, { amountCents: creditAmount, reason: creditReason })
      showToast('Nota de crédito emitida.', 'success')
      setCreditFor(null)
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível emitir a nota de crédito'), 'error')
    } finally { setBusy(false) }
  }

  async function submitDispute() {
    if (!disputeFor) return
    setBusy(true)
    try {
      await adminBillingApi.resolveDispute(disputeFor.id, { acceptedCents: accepted, note: disputeNote })
      showToast('Contestação resolvida.', 'success')
      setDisputeFor(null)
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível resolver a contestação'), 'error')
    } finally { setBusy(false) }
  }

  async function runIssuance() {
    try {
      const r = await adminBillingApi.runIssuance()
      showToast(`Emissão concluída: ${r.issued} fatura(s), ${r.overage} de excedente.`, 'success')
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Falha ao emitir'), 'error')
    }
  }

  async function saveRate() {
    // AD12 — taxa vazia virava 0% (`Number('')`): só número de verdade passa.
    const raw = rateValue.trim()
    const v = /^-?\d+([.,]\d+)?$/.test(raw) ? Number(raw.replace(',', '.')) : Number.NaN
    if (!/^\d{4}-\d{2}$/.test(rateMonth) || !Number.isFinite(v)) {
      showToast('Informe o mês (AAAA-MM) e a taxa em %', 'error')
      return
    }
    try {
      await adminBillingApi.upsertIndexRate(rateMonth, v)
      setRates(await adminBillingApi.indexRates())
      setRateMonth(''); setRateValue('')
      showToast('Índice salvo.', 'success')
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível salvar o índice'), 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Filtro de faturas" />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={load}>Atualizar</Button>
          <Button variant="secondary" size="sm" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={runIssuance}>Emitir agora</Button>
        </div>
      </div>

      {error ? <ErrorState onRetry={load} /> : !rows ? <SkeletonTable rows={5} /> : rows.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma fatura neste filtro" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-800">
          <table className="w-full text-sm">
            <thead className="bg-surface-900/60 text-surface-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Fatura</th>
                <th className="text-left px-3 py-2.5 font-medium">Cliente</th>
                <th className="text-left px-3 py-2.5 font-medium">Tipo</th>
                <th className="text-left px-3 py-2.5 font-medium">Competência</th>
                <th className="text-left px-3 py-2.5 font-medium">Vencimento</th>
                <th className="text-right px-3 py-2.5 font-medium">Valor</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {rows.map((r) => {
                // AD7 — vencida só a partir do dia seguinte ao vencimento (dia civil de Brasília).
                const overdue = ['pending', 'past_due'].includes(r.status) && isOverdueBrt(r.dueAt)
                const creditNote = isCreditNote(r.kind)
                const ref = creditNote && r.referenceInvoiceId ? rows.find((x) => x.id === r.referenceInvoiceId) : null
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 text-surface-100 font-mono text-xs whitespace-nowrap">{r.number ?? r.id.slice(0, 8)}</td>
                    <td className="px-3 py-2.5 text-surface-200">{r.companyName ?? r.tenantId.slice(0, 8)}</td>
                    <td className="px-3 py-2.5 text-surface-400">
                      {INVOICE_KIND_LABEL[r.kind] ?? r.kind}
                      {creditNote && r.referenceInvoiceId && (
                        <p className="text-[11px] text-surface-500">ref. fatura {ref?.number ?? r.referenceInvoiceId.slice(0, 8)}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-surface-400">{fmtComp(r.competenceMonth)}</td>
                    <td className={cn('px-3 py-2.5', overdue ? 'text-danger' : 'text-surface-400')}>{fmtDate(r.dueAt)}</td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', creditNote ? 'text-status-active' : 'text-surface-100')}>{formatBRL(signedAmount(r.kind, r.amountCents))}</td>
                    <td className={cn('px-3 py-2.5 text-xs', creditNote ? 'text-surface-400' : STATUS_TONE[r.status] ?? 'text-surface-400')}>
                      {invoiceStatusText(r, INVOICE_STATUS_LABEL, !!overdue && r.status === 'pending')}
                      {r.status === 'disputed' && r.disputeReason && <p className="text-[11px] text-surface-500 max-w-[200px] truncate" title={r.disputeReason}>{r.disputeReason}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="PDF" onClick={() => pdf(`/admin/billing/invoices/${r.id}/pdf${overdue ? '?secondCopy=1' : ''}`)}>
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                        {['pending', 'past_due'].includes(r.status) && r.kind !== 'credit_note' && (
                          <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => void openPay(r)}>Baixa</Button>
                        )}
                        {r.status === 'disputed' && (
                          <Button size="sm" variant="secondary" leftIcon={<Scale className="w-3.5 h-3.5" />} onClick={() => { setDisputeFor(r); setAccepted(r.disputedAmountCents ?? 0); setDisputeNote('') }}>Resolver</Button>
                        )}
                        {/* AD13 — contestada: o backend recusa nota de crédito avulsa (resolva a contestação). */}
                        {r.kind !== 'credit_note' && !['refunded', 'canceled', 'disputed'].includes(r.status) && (
                          <Button size="sm" variant="ghost" title="Nota de crédito" onClick={() => { setCreditFor(r); setCreditAmount(0); setCreditReason('') }}>
                            <Undo2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {hasMore && (
            <div className="flex justify-center border-t border-surface-800 p-3">
              <Button variant="ghost" size="sm" loading={loadingMore} onClick={() => void loadMore()}>Carregar mais</Button>
            </div>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-surface-800 p-5 max-w-xl">
        <h3 className="text-sm font-semibold text-surface-100 mb-1">IPCA mensal (segunda via)</h3>
        <p className="text-xs text-surface-500 mb-3">Usado na correção monetária das faturas em atraso (Termos 7.5.4.1). Mês sem índice conta como 0%.</p>
        {correctionOn === false && (
          <Banner variant="info" className="mb-3">
            A correção pelo IPCA está desligada até a validação do contador: hoje o atraso cobra só multa e juros. Os índices cadastrados aqui passam a valer quando ela for ligada.
          </Banner>
        )}
        <div className="flex gap-2 items-end mb-3">
          <FormField label="Mês (AAAA-MM)"><Input value={rateMonth} onChange={(e) => setRateMonth(e.target.value)} placeholder="2026-09" /></FormField>
          <FormField label="Taxa (%)"><Input value={rateValue} onChange={(e) => setRateValue(e.target.value)} placeholder="0,44" inputMode="decimal" /></FormField>
          <Button variant="secondary" onClick={saveRate}>Salvar</Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-surface-400">
          {rates.length === 0 ? 'Nenhum índice cadastrado.' : rates.map((r) => (
            <span key={r.id} className="px-2 py-1 rounded-lg bg-surface-800">{r.month.slice(0, 7)}: {r.ratePct.toLocaleString('pt-BR')}%</span>
          ))}
        </div>
      </section>

      <FormDialog
        open={!!payFor}
        onClose={closePay}
        title={`Registrar pagamento — ${payFor?.invoice.number ?? ''}`}
        onSubmit={submitPay}
        submitLabel="Registrar baixa"
        submitDisabled={recalculating}
        loading={busy}
      >
        {payFor && (
          <div className="space-y-3 text-sm">
            <p className="text-surface-400">
              Valor da fatura {formatBRL(payFor.charges.principalCents)}
              {payFor.charges.daysLate > 0 && <> · {payFor.charges.daysLate} dia(s) de atraso: multa {formatBRL(payFor.charges.fineCents)}, juros {formatBRL(payFor.charges.interestCents)}{payFor.charges.correctionCents > 0 && <>, correção {formatBRL(payFor.charges.correctionCents)}</>}</>}
            </p>
            <FormField label="Data do recebimento"><Input type="date" value={payDate} onChange={(e) => void changePayDate(e.target.value)} /></FormField>
            <FormField label="Valor recebido" hint={recalculating ? 'Recalculando os encargos nesta data…' : 'Padrão: valor atualizado com encargos na data do recebimento'}>
              <MoneyInput value={payAmount} onChange={setPayAmount} disabled={recalculating} />
            </FormField>
            <FormField label="Observação (comprovante, banco, etc.)"><Input value={payNote} onChange={(e) => setPayNote(e.target.value)} /></FormField>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={!!creditFor}
        onClose={() => setCreditFor(null)}
        title={`Nota de crédito — ${creditFor?.number ?? ''}`}
        onSubmit={submitCredit}
        submitLabel="Emitir nota de crédito"
        submitDisabled={creditAmount <= 0 || creditReason.trim().length < 3}
        loading={busy}
        danger
      >
        <div className="space-y-3">
          <FormField label="Valor do estorno" hint={creditFor ? `Até ${formatBRL(creditFor.amountCents)}` : undefined}><MoneyInput value={creditAmount} onChange={setCreditAmount} /></FormField>
          <FormField label="Motivo"><Input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} /></FormField>
        </div>
      </FormDialog>

      <FormDialog
        open={!!disputeFor}
        onClose={() => setDisputeFor(null)}
        title={`Resolver contestação — ${disputeFor?.number ?? ''}`}
        onSubmit={submitDispute}
        submitLabel="Resolver"
        submitDisabled={disputeNote.trim().length < 3}
        loading={busy}
      >
        <div className="space-y-3 text-sm">
          {disputeFor?.disputeReason && <p className="text-surface-400">Motivo do cliente: “{disputeFor.disputeReason}”</p>}
          <FormField label="Valor aceito (vira nota de crédito)" hint="0 = contestação improcedente; o valor segue devido"><MoneyInput value={accepted} onChange={setAccepted} /></FormField>
          <FormField label="Resposta ao cliente"><Input value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} /></FormField>
        </div>
      </FormDialog>
    </div>
  )
}
