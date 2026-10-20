// ─── Contas que ainda não ativaram (SCRUM-1205) ───────────────────────────────
// Lista as contas provisionadas cujo administrador não fez o primeiro acesso,
// com a validade do link. "Gerar novo link" invalida o anterior. "Enviar
// e-mail" manda o link vigente ao administrador (20/10).

import { useCallback, useEffect, useState } from 'react'
import { Copy, Link2, Mail, RefreshCw, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { adminBillingApi, type PendingActivation } from '@/services/adminBillingApi'

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function PendingActivations({ reloadKey = 0 }: { reloadKey?: number }) {
  const [rows, setRows] = useState<PendingActivation[] | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    setError(false)
    adminBillingApi.pendingActivations().then(setRows).catch(() => setError(true))
  }, [])

  useEffect(() => { load() }, [load, reloadKey])

  async function sendEmail(row: PendingActivation) {
    setBusy(`mail:${row.tenantId}`)
    try {
      const r = await adminBillingApi.sendActivationEmail(row.tenantId)
      if (r.status === 'sent') showToast(`E-mail de ativação enviado para ${r.to}`, 'success')
      else if (r.status === 'no_smtp') showToast('O e-mail não saiu: o envio de e-mails não está configurado', 'error')
      else showToast('O envio do e-mail falhou. Veja o erro em E-mails.', 'error')
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível enviar o e-mail'), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function regenerate(row: PendingActivation) {
    setBusy(row.tenantId)
    try {
      const r = await adminBillingApi.newActivationLink(row.tenantId)
      setLinks((l) => ({ ...l, [row.tenantId]: r.activationUrl }))
      showToast('Novo link gerado. O link anterior deixou de valer.', 'success')
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível gerar o link'), 'error')
    } finally {
      setBusy(null)
    }
  }

  if (error) return <ErrorState onRetry={load} />
  if (!rows) return <SkeletonTable rows={4} />
  if (rows.length === 0) {
    return <EmptyState icon={Hourglass} title="Nenhuma conta pendente de ativação" hint="Todas as contas provisionadas já fizeram o primeiro acesso." />
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={load}>Atualizar</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-surface-800">
        <table className="w-full text-sm">
          <thead className="bg-surface-900/60 text-surface-400 text-xs">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Empresa</th>
              <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Administrador</th>
              <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Plano</th>
              <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Pendente há</th>
              <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Link</th>
              <th className="px-4 py-2.5 whitespace-nowrap" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {rows.map((r) => (
              <tr key={r.contractId} className="align-top">
                <td className="px-4 py-3 text-surface-100">{r.companyName ?? r.tenantId.slice(0, 8)}</td>
                <td className="px-4 py-3 text-surface-300">{r.adminEmail ?? '—'}</td>
                <td className="px-4 py-3 text-surface-300">{r.planTier}</td>
                <td className="px-4 py-3 text-surface-300">{r.daysPending} dia(s)</td>
                <td className="px-4 py-3">
                  {r.stage === 'steps'
                    ? <span className="text-xs text-surface-400">Senha definida — faltam termos e dados da empresa</span>
                    : r.linkExpired
                      ? <span className="text-xs text-danger">Expirado</span>
                      : <span className="text-xs text-surface-400">Vale até {fmtDate(r.linkExpiresAt)}</span>}
                  {links[r.tenantId] && (
                    <button
                      className="mt-1 flex items-center gap-1 text-xs text-brand-400 hover:underline"
                      onClick={() => { void navigator.clipboard.writeText(links[r.tenantId]); showToast('Link copiado', 'success') }}
                    >
                      <Copy className="w-3 h-3" /> Copiar novo link
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === `mail:${r.tenantId}`}
                    disabled={!r.adminUserId || r.stage === 'steps'}
                    leftIcon={<Mail className="w-3.5 h-3.5" />}
                    onClick={() => sendEmail(r)}
                  >
                    Enviar e-mail
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === r.tenantId}
                    disabled={!r.adminUserId || r.stage === 'steps'}
                    leftIcon={<Link2 className="w-3.5 h-3.5" />}
                    onClick={() => regenerate(r)}
                  >
                    Gerar novo link
                  </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
