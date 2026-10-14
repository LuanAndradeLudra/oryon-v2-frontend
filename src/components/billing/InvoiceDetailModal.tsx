// ─── Detalhe da fatura do cliente (SCRUM-1210) ────────────────────────────────
// Composição (linhas), relatório de consumo do período, encargos do dia
// (segunda via), PDF, instruções de pagamento e contestação em até 10 dias
// (Termos 7.5.5). Espaço reservado para o Pix na tela (próxima etapa).
// "Vencida" vem do backend (`overdue`, calendário de Brasília e já descontadas
// as notas de crédito). Nota de crédito aparece com valor negativo e link para
// a fatura estornada, nunca como "Paga".

import { useEffect, useState } from 'react'
import { FileText, QrCode, Scale } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { Input } from '@/components/ui/Input'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { invoiceStatusText, isCreditNote, signedAmount } from '@/lib/invoiceDisplay'
import { billingApi, openInvoicePdf, type InvoiceDetailView } from '@/services/billingApi'

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
const DAY = 24 * 60 * 60 * 1000

const STATUS: Record<string, string> = {
  pending: 'Em aberto', past_due: 'Vencida', paid: 'Paga', disputed: 'Em contestação', refunded: 'Estornada', canceled: 'Cancelada',
}

export function InvoiceDetailModal({ invoiceId, onClose, onChanged, onOpenInvoice }: {
  invoiceId: string | null
  onClose: () => void
  onChanged?: () => void
  /** Abre outra fatura (ex.: a original de uma nota de crédito). */
  onOpenInvoice?: (id: string) => void
}) {
  const [d, setD] = useState<InvoiceDetailView | null>(null)
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setD(null); setDisputing(false); setReason('')
    if (!invoiceId) return
    billingApi.getInvoice(invoiceId).then(setD).catch((e) => {
      showToast(getApiErrorMessage(e, 'Não foi possível abrir a fatura'), 'error')
      onClose()
    })
  }, [invoiceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const inv = d?.invoice
  const creditNote = isCreditNote(inv?.kind)
  const open = !creditNote && ['pending', 'past_due'].includes(inv?.status ?? '')
  const late = open && !!inv?.overdue
  // CL7 — uma contestação por fatura: depois de respondida a fatura volta a
  // "Em aberto", mas o backend recusa a segunda (`disputedAt` preenchido).
  const canDispute = open && inv && !inv.disputedAt && Date.now() - new Date(inv.issuedAt).getTime() <= 10 * DAY
  // CL4 — `charges.principalCents` já é LÍQUIDO (o backend desconta as notas em
  // `lateChargesFor`). Valor de face = amountCents (ou `amount`); abatido = face − líquido.
  const grossCents = inv ? (inv.amountCents ?? Math.round(parseFloat(inv.amount) * 100)) : 0
  const credited = inv && !creditNote && typeof inv.netDueCents === 'number' ? Math.max(0, grossCents - inv.netDueCents) : 0

  function pdf(id: string, secondCopy = false) {
    openInvoicePdf(id, secondCopy).catch((e) => showToast(getApiErrorMessage(e, 'Não foi possível abrir o PDF'), 'error'))
  }

  async function submitDispute() {
    if (!inv || reason.trim().length < 5) return
    setBusy(true)
    try {
      await billingApi.disputeInvoice(inv.id, reason.trim())
      showToast('Contestação registrada. A equipe Oryon vai analisar e responder.', 'success')
      onChanged?.()
      onClose()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível registrar a contestação'), 'error')
    } finally { setBusy(false) }
  }

  return (
    <Modal open={!!invoiceId} onClose={onClose} title={inv ? `Fatura ${inv.number ?? ''}` : 'Fatura'} className="max-w-2xl">
      {!d || !inv ? <p className="text-sm text-surface-400">Carregando…</p> : (
        <div className="space-y-5 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><p className="text-xs text-surface-500">Status</p><p className="text-surface-100">{invoiceStatusText(inv, STATUS, late)}</p></div>
            <div><p className="text-xs text-surface-500">Competência</p><p className="text-surface-100">{inv.competenceMonth ? `${inv.competenceMonth.slice(5, 7)}/${inv.competenceMonth.slice(0, 4)}` : '—'}</p></div>
            <div><p className="text-xs text-surface-500">Vencimento</p><p className="text-surface-100">{fmt(inv.dueAt)}</p></div>
            <div><p className="text-xs text-surface-500">Valor</p><p className={`font-semibold ${creditNote ? 'text-status-active' : 'text-surface-100'}`}>{brl(signedAmount(inv.kind, grossCents))}</p></div>
          </div>

          {creditNote && (
            <Banner variant="info">
              Nota de crédito: este valor é abatido {inv.referenceInvoiceId ? 'da fatura original' : 'do que você deve'}.
              {inv.description && <> {inv.description}</>}
              {inv.referenceInvoiceId && onOpenInvoice && (
                <> <button type="button" className="underline font-medium" onClick={() => onOpenInvoice(inv.referenceInvoiceId!)}>Ver fatura original</button></>
              )}
            </Banner>
          )}

          {credited > 0 && (
            <p className="text-xs text-surface-400">
              Notas de crédito abatidas: {brl(-credited)}.
              {open && <> Saldo desta fatura: <strong className="text-surface-200">{brl(inv.netDueCents)}</strong>.</>}
            </p>
          )}

          {inv.disputeResolution && (
            <Banner variant="neutral">
              <p className="font-medium">Resposta da equipe Oryon à sua contestação</p>
              <p className="mt-0.5 whitespace-pre-line">{inv.disputeResolution}</p>
            </Banner>
          )}

          <table className="w-full">
            <tbody className="divide-y divide-surface-800">
              {inv.lines.map((l) => (
                <tr key={l.id}><td className="py-2 text-surface-300">{l.description}</td><td className="py-2 text-right text-surface-100 tabular-nums">{brl(l.amountCents)}</td></tr>
              ))}
            </tbody>
          </table>

          {late && (
            <Banner variant="danger">
              {d.charges.daysLate} dia(s) de atraso. Valor atualizado hoje: <strong>{brl(d.charges.totalCents)}</strong> (multa {brl(d.charges.fineCents)}, juros {brl(d.charges.interestCents)}{d.charges.correctionCents > 0 && <>, correção {brl(d.charges.correctionCents)}</>} — Termos 7.5.4.1).
            </Banner>
          )}

          {inv.usageReport && (
            <div className="rounded-xl border border-surface-800 p-4">
              <p className="text-xs font-semibold text-surface-200 mb-2">Relatório de consumo — {fmt(inv.usageReport.periodStart)} a {fmt(inv.usageReport.periodEnd)}</p>
              <p className="text-xs text-surface-400 mb-2">{inv.usageReport.totalCredits.toLocaleString('pt-BR')} créditos em {inv.usageReport.services.toLocaleString('pt-BR')} atendimentos.</p>
              <ul className="text-xs text-surface-400 space-y-1">
                {inv.usageReport.byFeature.slice(0, 10).map((f) => (
                  <li key={`${f.feature}-${f.source}`} className="flex justify-between"><span>{f.feature}</span><span className="tabular-nums">{f.credits.toLocaleString('pt-BR')} cr</span></li>
                ))}
              </ul>
            </div>
          )}

          {open && (
            <div className="rounded-xl border border-surface-800 p-4">
              <p className="text-xs font-semibold text-surface-200 mb-1">Como pagar</p>
              <p className="text-xs text-surface-400 whitespace-pre-line">{d.paymentInstructions}</p>
              {/* Próxima etapa (Gates2B): QR Pix e copia-e-cola aqui, com baixa automática. */}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-surface-500"><QrCode className="w-3.5 h-3.5" />Em breve: pagamento por Pix direto nesta tela.</div>
            </div>
          )}

          {disputing ? (
            <div className="space-y-2">
              <p className="text-xs text-surface-400">Explique o que não reconhece nesta fatura. Os valores não contestados continuam devidos (Termos 7.5.5).</p>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da contestação" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDisputing(false)}>Voltar</Button>
                <Button onClick={submitDispute} loading={busy} disabled={reason.trim().length < 5}>Enviar contestação</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {canDispute && <Button variant="ghost" leftIcon={<Scale className="w-4 h-4" />} onClick={() => setDisputing(true)}>Contestar</Button>}
              {late && <Button variant="secondary" leftIcon={<FileText className="w-4 h-4" />} onClick={() => pdf(inv.id, true)}>2ª via (PDF)</Button>}
              <Button leftIcon={<FileText className="w-4 h-4" />} onClick={() => pdf(inv.id)}>PDF</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
