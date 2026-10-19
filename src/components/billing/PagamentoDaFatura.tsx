// ─── Como pagar uma fatura (gateway Gates2B, integração 1200) ─────────────────
// Pix: QR + copia e cola + validade. Cartão: checkout hospedado do gateway
// (nenhum dado de cartão passa pela Oryon — SCRUM-1204). Sem gateway, ou se o
// gateway falhar, as instruções de pagamento de sempre. A baixa é automática
// pelo aviso do gateway.

import { useEffect, useState } from 'react'
import { Copy, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { showToast } from '@/hooks/useToast'
import { billingApi, type InvoicePaymentOption } from '@/services/billingApi'

const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const validade = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

export function PagamentoDaFatura({ invoiceId, instrucoes }: { invoiceId: string; instrucoes: string }) {
  const [opcao, setOpcao] = useState<InvoicePaymentOption | null | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    setOpcao(undefined)
    billingApi.getInvoicePayment(invoiceId)
      .then((p) => { if (vivo) setOpcao(p) })
      // Falha ao gerar o Pix não bloqueia a fatura: ficam as instruções.
      .catch(() => { if (vivo) setOpcao(null) })
    return () => { vivo = false }
  }, [invoiceId])

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      showToast('Código Pix copiado.', 'success')
    } catch {
      showToast('Não foi possível copiar. Selecione o código e copie manualmente.', 'error')
    }
  }

  if (opcao === undefined) {
    return (
      <p className="flex items-center gap-2 text-xs text-surface-400" role="status">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparando o pagamento…
      </p>
    )
  }

  if (opcao?.method === 'PIX' && opcao.pixPayload) {
    const ate = validade(opcao.expiresAt)
    return (
      <div className="flex flex-col sm:flex-row gap-4" data-testid="pagamento-pix">
        {opcao.pixImage && (
          <img
            src={`data:image/png;base64,${opcao.pixImage}`}
            alt="QR Code do Pix desta fatura"
            width={160}
            height={160}
            className="w-40 h-40 shrink-0 self-center sm:self-start rounded-lg bg-white p-2"
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-surface-100">Pague {brl(opcao.amountCents)} com Pix</p>
          <p className="text-xs text-surface-400">Abra o app do seu banco, escolha pagar com Pix e leia o QR Code, ou use o código copia e cola.</p>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-500 mb-1">Pix copia e cola</p>
            <p className="font-mono text-[11px] leading-relaxed text-surface-200 break-all rounded-md border border-surface-700 bg-[var(--sf2)] px-2.5 py-2 select-all">{opcao.pixPayload}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button size="sm" variant="secondary" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={() => copiar(opcao.pixPayload!)}>Copiar código</Button>
            {ate && <span className="text-[11px] text-surface-500">Válido até {ate}</span>}
          </div>
          <p className="text-[11px] text-surface-500">A confirmação é automática: assim que o pagamento cair, a fatura muda para Paga.</p>
        </div>
      </div>
    )
  }

  if (opcao?.checkoutUrl) {
    return (
      <div className="space-y-2" data-testid="pagamento-cartao">
        <p className="text-sm font-semibold text-surface-100">Pague {brl(opcao.amountCents)} com cartão</p>
        <p className="text-xs text-surface-400">O pagamento é feito na página segura do nosso parceiro de pagamentos. Nenhum dado de cartão passa pela Oryon.</p>
        <a
          href={opcao.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-8 px-3 rounded-[6px] bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5" /> Pagar com cartão
        </a>
      </div>
    )
  }

  return <p className="text-xs text-surface-400 whitespace-pre-line">{instrucoes}</p>
}
