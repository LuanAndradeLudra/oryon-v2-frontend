// ─── Carteira do operador (SCRUM-1211) ────────────────────────────────────────
// Contratos vigentes, renovações dos próximos 120 dias, inadimplência (com a
// dívida por cliente) e conciliação — sem SQL. Ações do operador: troca de
// plano (SCRUM-1213, Termos 7.4.2/7.4.3) e vencimento antecipado (7.1.2.1).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpDown, Ban, FastForward, RefreshCw, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FormDialog } from '@/components/ui/FormDialog'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage, cn } from '@/lib/utils'
import {
  adminBillingApi, formatBRL, PAYMENT_METHOD_LABELS, TERM_LABELS,
  type PlanChangeDecision, type PlanTierId, type PortfolioRow,
} from '@/services/adminBillingApi'

type View = 'active' | 'renewals' | 'overdue' | 'reconciliation'
const VIEWS: Array<{ value: View; label: string }> = [
  { value: 'active', label: 'Contratos' },
  { value: 'renewals', label: 'Renovações (120 dias)' },
  { value: 'overdue', label: 'Inadimplência' },
  { value: 'reconciliation', label: 'Conciliação' },
]
const TIERS: PlanTierId[] = ['start', 'professional', 'scale', 'enterprise']
const DAY = 24 * 60 * 60 * 1000
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

export function Portfolio() {
  const [view, setView] = useState<View>('active')
  const [rows, setRows] = useState<PortfolioRow[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState(false)
  const [recon, setRecon] = useState<unknown>(null)
  const [changeFor, setChangeFor] = useState<PortfolioRow | null>(null)
  const [tier, setTier] = useState<PlanTierId>('professional')
  const [customPrice, setCustomPrice] = useState(false)
  const [price, setPrice] = useState(0)
  const [preview, setPreview] = useState<PlanChangeDecision | null>(null)
  const [accelFor, setAccelFor] = useState<PortfolioRow | null>(null)
  const [cancelFor, setCancelFor] = useState<PortfolioRow | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelPreview, setCancelPreview] = useState<{ message: string; afterRenewal: boolean } | null>(null)
  const [accelReason, setAccelReason] = useState('')
  // AD10 — sobe a cada abertura/fechamento do cancelamento: a prévia de uma
  // conta que chega depois de abrir o diálogo de OUTRA é descartada.
  const cancelReq = useRef(0)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError(false)
    setRows(null)
    adminBillingApi.portfolio()
      .then((r) => { setRows(r.rows); setTruncated(r.truncated) })
      .catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (view === 'reconciliation') adminBillingApi.reconciliation().then(setRecon).catch(() => setRecon({ erro: 'indisponível' }))
  }, [view])

  const shown = useMemo(() => {
    if (!rows) return null
    const now = Date.now()
    if (view === 'renewals') return rows.filter((r) => r.endsAt && new Date(r.endsAt).getTime() - now <= 120 * DAY).sort((a, b) => (a.endsAt ?? '').localeCompare(b.endsAt ?? ''))
    if (view === 'overdue') return rows.filter((r) => r.overdueCount > 0 || r.suspended).sort((a, b) => b.overdueCents - a.overdueCents)
    return rows
  }, [rows, view])

  // Mesmo plano sem preço negociado não é troca: nada a prever (o backend
  // recusaria e o operador veria um toast de erro só por abrir o diálogo).
  const sameAsCurrent = !!changeFor && tier === changeFor.tier && !customPrice

  // A prévia some assim que tier/preço mudam ("Aplicar troca" fica desabilitado
  // até a prévia NOVA chegar) e resposta atrasada de uma escolha anterior é
  // descartada — senão dava para aplicar uma troca com a prévia de outra.
  useEffect(() => {
    setPreview(null)
    if (!changeFor || sameAsCurrent) return
    let cancelled = false
    const t = setTimeout(() => {
      adminBillingApi.previewPlanChange(changeFor.tenantId, { tier, contractedMonthlyCents: customPrice ? price : undefined })
        .then((p) => { if (!cancelled) setPreview(p) })
        .catch((e) => {
          if (cancelled) return
          setPreview(null)
          showToast(getApiErrorMessage(e, 'Prévia indisponível'), 'error')
        })
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [changeFor, tier, customPrice, price, sameAsCurrent])

  async function submitChange() {
    if (!changeFor) return
    setBusy(true)
    try {
      const r = await adminBillingApi.changePlan(changeFor.tenantId, { tier, contractedMonthlyCents: customPrice ? price : undefined })
      showToast(r.message, 'success', undefined, 8000)
      setChangeFor(null)
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível trocar o plano'), 'error')
    } finally { setBusy(false) }
  }

  async function submitAccel() {
    if (!accelFor) return
    setBusy(true)
    try {
      const r = await adminBillingApi.accelerate(accelFor.contractId, { reason: accelReason })
      showToast(`${r.accelerated} parcela(s) emitida(s) com vencimento em ${fmt(r.dueAt)}.`, 'success')
      setAccelFor(null)
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível antecipar'), 'error')
    } finally { setBusy(false) }
  }

  async function openCancel(r: PortfolioRow) {
    const req = ++cancelReq.current
    setCancelFor(r)
    setCancelReason('')
    setCancelPreview(null)
    try {
      const p = await adminBillingApi.cancelPreview(r.tenantId)
      if (req !== cancelReq.current) return
      setCancelPreview({ message: p.message, afterRenewal: p.afterRenewal })
    } catch (e) {
      if (req !== cancelReq.current) return
      showToast(getApiErrorMessage(e, 'Prévia do cancelamento indisponível'), 'error')
      setCancelFor(null)
    }
  }

  function closeCancel() {
    cancelReq.current++
    setCancelFor(null)
    setCancelPreview(null)
  }

  async function submitCancel() {
    if (!cancelFor) return
    setBusy(true)
    try {
      const r = await adminBillingApi.cancelContract(cancelFor.tenantId, cancelReason.trim())
      showToast(r.message, 'success', undefined, 8000)
      closeCancel()
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível registrar o cancelamento'), 'error')
    } finally { setBusy(false) }
  }

  const totalOverdue = (rows ?? []).reduce((a, r) => a + r.overdueCents, 0)

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} label="Visão da carteira" />
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={load}>Atualizar</Button>
      </div>

      {truncated && view !== 'reconciliation' && (
        <Banner variant="warning">
          A carteira mostra os 2.000 contratos mais recentes. Contratos mais antigos não aparecem aqui nem entram nos totais.
        </Banner>
      )}

      {view === 'overdue' && rows && (
        <Banner variant={totalOverdue > 0 ? 'warning' : 'success'}>
          {totalOverdue > 0 ? <>Dívida vencida na carteira: <strong>{formatBRL(totalOverdue)}</strong> (sem encargos).</> : 'Nenhuma fatura vencida na carteira.'}
        </Banner>
      )}

      {view === 'reconciliation' ? (
        <pre className="text-xs text-surface-300 bg-surface-900/60 rounded-2xl border border-surface-800 p-4 overflow-auto max-h-[60vh]">
          {recon ? JSON.stringify(recon, null, 2) : 'Carregando…'}
        </pre>
      ) : error ? <ErrorState onRetry={load} /> : !shown ? <SkeletonTable rows={5} /> : shown.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nada nesta visão" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-800">
          <table className="w-full text-sm">
            <thead className="bg-surface-900/60 text-surface-400 text-xs">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Cliente</th>
                <th className="text-left px-3 py-2.5 font-medium">Plano</th>
                <th className="text-left px-3 py-2.5 font-medium">Pagamento</th>
                <th className="text-right px-3 py-2.5 font-medium">Mensal</th>
                <th className="text-left px-3 py-2.5 font-medium">Vigência</th>
                <th className="text-right px-3 py-2.5 font-medium">Em atraso</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {shown.map((r) => (
                <tr key={r.contractId}>
                  <td className="px-3 py-2.5">
                    <p className="text-surface-100">{r.companyName ?? r.tenantId.slice(0, 8)}</p>
                    <p className={cn('text-[11px]', r.suspended ? 'text-danger' : 'text-surface-500')}>
                      {r.suspended ? 'Suspensa' : r.status === 'pending_activation' ? 'Aguardando ativação' : r.status === 'renewing' ? 'Em renovação' : 'Ativa'}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-surface-300">{r.displayName}<p className="text-[11px] text-surface-500">{TERM_LABELS[r.term]}</p></td>
                  <td className="px-3 py-2.5 text-surface-400 text-xs">{PAYMENT_METHOD_LABELS[r.paymentMethod]}</td>
                  <td className="px-3 py-2.5 text-right text-surface-100 tabular-nums">{formatBRL(r.contractedMonthlyCents)}</td>
                  <td className="px-3 py-2.5 text-surface-400 text-xs">
                    {fmt(r.startsAt)} → {fmt(r.endsAt)}
                    <p className="text-[11px] text-surface-500">
                      {r.cancellation
                        ? (r.cancellation.afterRenewal ? `cancelado: renova e encerra em ${fmt(r.cancellation.effectiveAt)}` : `cancelado: encerra em ${fmt(r.cancellation.effectiveAt)}`)
                        : r.autoRenew ? 'renova' : 'não renova'}
                    </p>
                  </td>
                  <td className={cn('px-3 py-2.5 text-right tabular-nums', r.overdueCents > 0 ? 'text-danger' : 'text-surface-500')}>
                    {r.overdueCents > 0 ? <>{formatBRL(r.overdueCents)}<p className="text-[11px]">{r.overdueCount} fatura(s) · desde {fmt(r.oldestDueAt)}</p></> : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="secondary" leftIcon={<ArrowUpDown className="w-3.5 h-3.5" />} disabled={r.status === 'pending_activation'}
                        onClick={() => { setChangeFor(r); setTier(r.tier); setCustomPrice(false); setPrice(r.contractedMonthlyCents) }}>
                        Trocar plano
                      </Button>
                      {r.installments > 1 && (
                        <Button size="sm" variant="ghost" title="Vencimento antecipado das parcelas restantes" onClick={() => { setAccelFor(r); setAccelReason('') }}>
                          <FastForward className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {!r.cancellation && r.status !== 'pending_activation' && (
                        <Button size="sm" variant="ghost" title="Registrar cancelamento pedido pelo cliente" onClick={() => void openCancel(r)}>
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog
        open={!!changeFor}
        onClose={() => setChangeFor(null)}
        title={`Trocar plano — ${changeFor?.companyName ?? ''}`}
        onSubmit={submitChange}
        submitLabel="Aplicar troca"
        submitDisabled={!preview}
        loading={busy}
      >
        <div className="space-y-3 text-sm">
          <FormField label="Novo plano-modelo">
            <Select value={tier} onChange={(e) => setTier(e.target.value as PlanTierId)}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Preço negociado (mensal)" hint="Desligado: tabela do plano novo com o desconto da periodicidade">
            <div className="flex items-center gap-3">
              <Switch checked={customPrice} onChange={setCustomPrice} />
              {customPrice && <MoneyInput value={price} onChange={setPrice} />}
            </div>
          </FormField>
          {sameAsCurrent && (
            <p className="text-xs text-surface-500">Este já é o plano atual. Escolha outro plano ou ligue o preço negociado para ver a prévia.</p>
          )}
          {preview && (
            <Banner variant={preview.isUpgrade ? 'info' : 'warning'}>
              {preview.message}
              {preview.differenceCents > 0 && <> Diferença: <strong>{formatBRL(preview.differenceCents)}</strong>.</>}
            </Banner>
          )}
        </div>
      </FormDialog>

      <FormDialog
        open={!!accelFor}
        onClose={() => setAccelFor(null)}
        title="Vencimento antecipado das parcelas restantes"
        onSubmit={submitAccel}
        submitLabel="Antecipar parcelas"
        submitDisabled={accelReason.trim().length < 3}
        loading={busy}
        danger
      >
        <div className="space-y-3 text-sm">
          <p className="text-surface-400">Termos 7.1.2.1: todas as parcelas ainda não emitidas de {accelFor?.companyName ?? 'este contrato'} serão emitidas agora, com vencimento em 5 dias.</p>
          <FormField label="Motivo (fica na auditoria)"><Input value={accelReason} onChange={(e) => setAccelReason(e.target.value)} /></FormField>
        </div>
      </FormDialog>

      <FormDialog
        open={!!cancelFor}
        onClose={closeCancel}
        title={`Cancelar contrato — ${cancelFor?.companyName ?? ''}`}
        onSubmit={submitCancel}
        submitLabel="Registrar cancelamento"
        submitDisabled={!cancelPreview || cancelReason.trim().length < 3}
        loading={busy}
        danger
      >
        <div className="space-y-3 text-sm">
          {!cancelPreview ? <p className="text-surface-400">Calculando a data pela regra dos Termos…</p> : (
            <Banner variant={cancelPreview.afterRenewal ? 'warning' : 'info'}>{cancelPreview.message}</Banner>
          )}
          <p className="text-xs text-surface-500">O que já venceu continua devido e a régua segue valendo; o cliente recebe aviso no app e por e-mail.</p>
          <FormField label="Motivo / como o cliente pediu (fica na auditoria)"><Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} /></FormField>
        </div>
      </FormDialog>
    </div>
  )
}
