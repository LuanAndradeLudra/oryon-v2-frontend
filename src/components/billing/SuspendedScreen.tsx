// ─── Conta suspensa (SCRUM-1210, Termos 17) ───────────────────────────────────
// A conta suspensa por inadimplência continua com login liberado. O DONO vê a
// dívida total, as faturas vencidas com encargos do dia e como pagar; os
// demais usuários veem só o aviso para procurar o administrador. Cobrança e
// dados da empresa continuam acessíveis (a rota não passa por aqui).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { billingApi, openInvoicePdf, type DebtView } from '@/services/billingApi'
import { billingHref } from '@/lib/billingLinks'

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

export function SuspendedScreen({ isOwner }: { isOwner: boolean }) {
  const [debt, setDebt] = useState<DebtView | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // CL5 — sem a tela de cobrança no build, o link cairia em "Minha conta".
  const invoicesHref = billingHref()

  useEffect(() => {
    if (!isOwner) return
    let alive = true
    billingApi.getDebt()
      .then((r) => { if (alive) { setDebt(r); setFailed(false) } })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [isOwner, reloadKey])

  return (
    <div className="h-full overflow-y-auto bg-surface-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-50">Conta suspensa por pendência financeira</h1>
            <p className="text-sm text-surface-400 mt-1">
              A IA de atendimento, o Copilot e a criação de recursos estão pausados. Os seus dados continuam preservados.
            </p>
          </div>
        </div>

        {!isOwner ? (
          <div className="rounded-2xl border border-surface-800 bg-surface-900/40 p-5 text-sm text-surface-300">
            Procure o administrador da conta na sua empresa para regularizar a situação. Assim que o pagamento for confirmado, tudo volta a funcionar.
          </div>
        ) : failed ? (
          <div className="rounded-2xl border border-surface-800 p-5 text-sm text-surface-300 space-y-3">
            <p>
              Não foi possível carregar as faturas agora.
              {invoicesHref && <> Abra <Link className="text-brand-400 underline" to={invoicesHref}>Plano & faturamento</Link> para ver o que está em aberto.</>}
            </p>
            <Button size="sm" variant="secondary" onClick={() => { setFailed(false); setReloadKey((k) => k + 1) }}>Tentar novamente</Button>
          </div>
        ) : !debt ? (
          <div className="flex items-center gap-2 text-sm text-surface-400"><Loader2 className="w-4 h-4 animate-spin" />Carregando faturas em aberto…</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
              <p className="text-xs text-surface-400">Total em aberto hoje (com os encargos de atraso)</p>
              <p className="text-3xl font-bold text-surface-50 mt-1">{brl(debt.totalUpdatedCents)}</p>
              <p className="text-xs text-surface-500 mt-1">Valor original: {brl(debt.totalCents)}</p>
            </div>
            <ul className="rounded-2xl border border-surface-800 divide-y divide-surface-800">
              {debt.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="text-surface-100 font-medium">{i.number ?? i.id.slice(0, 8)}</p>
                    <p className="text-xs text-surface-500">Venceu em {fmt(i.dueAt)} · {i.daysLate} dia(s) de atraso</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-surface-100 tabular-nums">{brl(i.updatedCents)}</span>
                    <Button size="sm" variant="secondary" leftIcon={<FileText className="w-3.5 h-3.5" />} onClick={() => openInvoicePdf(i.id, true).catch((e) => showToast(getApiErrorMessage(e, 'Não foi possível abrir a 2ª via'), 'error'))}>2ª via</Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl border border-surface-800 p-5">
              <p className="text-sm font-semibold text-surface-100 mb-2">Como pagar</p>
              <p className="text-sm text-surface-300 whitespace-pre-line">{debt.paymentInstructions}</p>
              <p className="text-xs text-surface-500 mt-3">A conta é reativada automaticamente quando TODAS as faturas vencidas forem pagas.</p>
            </div>
            {invoicesHref && <Link to={invoicesHref} className="inline-block text-sm text-brand-400 hover:text-brand-300">Ver todas as faturas →</Link>}
          </div>
        )}
      </div>
    </div>
  )
}
