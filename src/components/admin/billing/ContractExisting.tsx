import { useState } from 'react'
import { adminBillingApi, type PaymentModeId, type PlanTierId, type ContractTermId } from '@/services/adminBillingApi'

const inputCls = 'w-full rounded-[10px] border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100'

/** Contrata uma organização que já existe, sem criar outra nem um administrador. */
export function ContractExisting() {
  const [tenantId, setTenantId] = useState('')
  const [planTier, setPlanTier] = useState<PlanTierId>('professional')
  const [term, setTerm] = useState<ContractTermId>('annual')
  const [paymentMode, setPaymentMode] = useState<PaymentModeId>('upfront')
  const [monthlyCredits, setMonthlyCredits] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const credits = monthlyCredits.trim() === '' ? undefined : Number(monthlyCredits)
      const result = await adminBillingApi.contractExisting(tenantId.trim(), {
        planTier,
        term,
        paymentMode,
        ...(credits != null && Number.isFinite(credits) ? { monthlyCredits: credits } : {}),
      })
      setMessage(`Contrato ${result.contractId} ativo. O consumo anterior foi zerado e a franquia vale neste ciclo.`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Não foi possível contratar esta conta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl border border-surface-800 bg-surface-900/40 p-5">
      <div>
        <h2 className="text-sm font-medium text-surface-100">Contratar conta existente</h2>
        <p className="mt-1 text-xs text-surface-400">
          A conta já está no ar. O contrato nasce ativo, o consumo acumulado zera e a franquia da proposta vale no primeiro ciclo.
        </p>
      </div>
      <label className="block space-y-1 text-xs text-surface-400">
        Conta (tenant)
        <input className={inputCls} value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="UUID da conta" required />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block space-y-1 text-xs text-surface-400">
          Plano
          <select className={inputCls} value={planTier} onChange={(e) => setPlanTier(e.target.value as PlanTierId)}>
            <option value="start">Start</option>
            <option value="professional">Professional</option>
            <option value="scale">Scale</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs text-surface-400">
          Prazo
          <select className={inputCls} value={term} onChange={(e) => setTerm(e.target.value as ContractTermId)}>
            <option value="annual">Anual</option>
            <option value="semiannual">Semestral</option>
            <option value="monthly">Mensal</option>
          </select>
        </label>
        <label className="block space-y-1 text-xs text-surface-400">
          Pagamento
          <select className={inputCls} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentModeId)}>
            <option value="upfront">À vista</option>
            <option value="installments">Parcelado</option>
            <option value="monthly">Mensal</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-xs text-surface-400">
        Franquia do ciclo (créditos)
        <input className={inputCls} inputMode="numeric" value={monthlyCredits} onChange={(e) => setMonthlyCredits(e.target.value)} placeholder="Em branco usa a franquia do plano" />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}
      <button type="submit" disabled={busy} className="rounded-[10px] bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50">
        {busy ? 'Contratando…' : 'Contratar'}
      </button>
    </form>
  )
}
