// ─── CheckoutModal ─────────────────────────────────────────────────────────────
// Checkout da Fase 3 (SCRUM-154 / Asaas): contratar um plano, trocar de plano
// (upgrade/downgrade) ou comprar um pacote de créditos. Pix (QR + copia-e-cola)
// e cartão recorrente. O webhook do Asaas confirma o pagamento e credita/renova
// no backend — aqui só iniciamos a cobrança e mostramos o QR/estado.

import { useState } from 'react'
import { Copy, Check, Loader2, AlertTriangle, QrCode, CreditCard, PartyPopper } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { billingApi } from '@/services/billingApi'
import type {
  BackendPlanTier, BillingMethod, CardInput, CheckoutResult, PlanOption,
} from '@/services/billingApi'

// 5.6 (PCI): não enviamos PAN/CVV do browser pelo nosso backend enquanto não
// houver tokenização server-side (Asaas) no subscribe/buy-credits. O cartão fica
// bloqueado por padrão — só Pix. Reabilitar via VITE_BILLING_CARD_ENABLED='true'
// depois que o backend tokenizar (ou com tokenização client-side direta no Asaas).
const CARD_ENABLED = import.meta.env.VITE_BILLING_CARD_ENABLED === 'true'

export type CheckoutIntent =
  | { kind: 'subscribe'; tier: BackendPlanTier; plan: PlanOption }
  | { kind: 'change'; tier: BackendPlanTier; plan: PlanOption }
  | { kind: 'credits'; packCredits: number; valueCents: number }

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  onDone: () => void
  intent: CheckoutIntent
}

const BRL = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function titleFor(intent: CheckoutIntent): string {
  if (intent.kind === 'credits') return `Comprar ${intent.packCredits.toLocaleString('pt-BR')} créditos`
  if (intent.kind === 'change') return `Trocar para ${intent.plan.displayName}`
  return `Contratar ${intent.plan.displayName}`
}

export function CheckoutModal({ open, onClose, onDone, intent }: CheckoutModalProps) {
  const [method, setMethod] = useState<BillingMethod>('PIX')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [card, setCard] = useState<CardInput>({
    holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '',
  })
  const [postalCode, setPostalCode] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [changed, setChanged] = useState<'now' | 'next_cycle' | null>(null)
  const [copied, setCopied] = useState(false)

  const amountCents =
    intent.kind === 'credits' ? intent.valueCents : intent.plan.priceMonthlyCents

  function reset() {
    setError(null); setResult(null); setChanged(null); setLoading(false)
  }

  async function submit() {
    setLoading(true); setError(null)
    try {
      const payer = {
        cpfCnpj: cpfCnpj || undefined,
        postalCode: postalCode || undefined,
        addressNumber: addressNumber || undefined,
      }
      // Nunca envia PAN/CVV enquanto o cartão está bloqueado (5.6 / PCI).
      const cardPayload = CARD_ENABLED && method === 'CREDIT_CARD' ? card : undefined

      if (intent.kind === 'change') {
        const r = await billingApi.changePlan(intent.tier)
        setChanged(r.applied)
        onDone()
      } else if (intent.kind === 'subscribe') {
        const r = await billingApi.subscribe({ tier: intent.tier, billingType: method, payer, card: cardPayload })
        setResult(r)
        onDone()
      } else {
        const r = await billingApi.buyCredits({
          packCredits: intent.packCredits, valueCents: intent.valueCents,
          billingType: method, payer, card: cardPayload,
        })
        setResult(r)
        onDone()
      }
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setError(err?.response?.data?.message || err?.message || 'Falha ao processar o pagamento.')
    } finally {
      setLoading(false)
    }
  }

  function copyPix() {
    const payload = result?.payment.pix?.payload
    if (!payload) return
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    reset()
    onClose()
  }

  // ── Estados de resultado ─────────────────────────────────────────────────
  const isChangeDone = changed !== null
  const isPaymentDone = result !== null
  const cardCharged = isPaymentDone && method === 'CREDIT_CARD'
  const pix = result?.payment.pix

  return (
    <Modal open={open} onClose={handleClose} title={titleFor(intent)}>
      {/* ── Sucesso: troca de plano ── */}
      {isChangeDone ? (
        <div className="text-center py-4 space-y-3">
          <PartyPopper className="w-10 h-10 text-brand-400 mx-auto" />
          <p className="text-sm text-surface-200">
            {changed === 'now'
              ? 'Plano atualizado imediatamente. A nova franquia já está disponível.'
              : 'Downgrade agendado para o próximo ciclo — você mantém o plano atual até lá.'}
          </p>
          <button onClick={handleClose} className="mt-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-semibold text-sm">
            Concluir
          </button>
        </div>
      ) : isPaymentDone ? (
        // ── Resultado do pagamento (Pix QR ou cartão) ──
        <div className="space-y-4">
          {pix ? (
            <>
              <p className="text-sm text-surface-300">
                Escaneie o QR code ou copie o código Pix. O acesso é liberado assim que o
                pagamento é confirmado.
              </p>
              {pix.encodedImage && (
                <img
                  src={`data:image/png;base64,${pix.encodedImage}`}
                  alt="QR code Pix"
                  className="w-48 h-48 mx-auto rounded-xl bg-white p-2"
                />
              )}
              <button
                onClick={copyPix}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-700 hover:bg-surface-800 text-sm text-surface-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-status-active" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar código Pix'}
              </button>
            </>
          ) : cardCharged ? (
            <div className="text-center py-2 space-y-2">
              <Check className="w-10 h-10 text-status-active mx-auto" />
              <p className="text-sm text-surface-200">
                Cobrança no cartão enviada (status: {result?.payment.status}). O acesso é
                liberado na confirmação.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-surface-300">
                Cobrança criada (status: {result?.payment.status}).
              </p>
              {result?.payment.invoiceUrl && (
                <a href={result.payment.invoiceUrl} target="_blank" rel="noreferrer"
                   className="text-sm text-brand-400 hover:underline">
                  Abrir fatura no Asaas →
                </a>
              )}
            </div>
          )}
          <button onClick={handleClose} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-semibold text-sm">
            Concluir
          </button>
        </div>
      ) : (
        // ── Formulário ──
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-surface-400">
              {intent.kind === 'credits' ? 'Pacote' : 'Mensalidade'}
            </span>
            <span className="text-lg font-bold text-surface-50">{BRL(amountCents)}</span>
          </div>

          {intent.kind === 'change' ? (
            <p className="text-sm text-surface-400">
              A troca usa o método de pagamento da assinatura atual. Upgrades valem na hora
              (franquia maior já disponível); downgrades entram no próximo ciclo.
            </p>
          ) : (
            <>
              {/* Método */}
              <div className="grid grid-cols-2 gap-2">
                {(['PIX', 'CREDIT_CARD'] as BillingMethod[]).map((m) => {
                  // Cartão bloqueado até tokenização server-side (5.6 / PCI).
                  const cardBlocked = m === 'CREDIT_CARD' && !CARD_ENABLED
                  return (
                    <button
                      key={m}
                      onClick={() => { if (!cardBlocked) setMethod(m) }}
                      disabled={cardBlocked}
                      title={cardBlocked ? 'Pagamento com cartão em breve' : undefined}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        method === m
                          ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                          : 'border-surface-700 text-surface-300 hover:bg-surface-800',
                        cardBlocked && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                      )}
                    >
                      {m === 'PIX' ? <QrCode className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                      {m === 'PIX' ? 'Pix' : cardBlocked ? 'Cartão (em breve)' : 'Cartão'}
                    </button>
                  )
                })}
              </div>

              {/* CPF/CNPJ (Asaas exige p/ cobranças) */}
              <Field label="CPF/CNPJ">
                <input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="Somente números" className={inputCls} />
              </Field>

              {/* Cartão */}
              {method === 'CREDIT_CARD' && (
                <div className="space-y-3 border-t border-surface-800 pt-3">
                  <Field label="Nome impresso no cartão">
                    <input value={card.holderName} onChange={(e) => setCard({ ...card, holderName: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Número do cartão">
                    <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="0000 0000 0000 0000" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Mês"><input value={card.expiryMonth} onChange={(e) => setCard({ ...card, expiryMonth: e.target.value })} placeholder="MM" className={inputCls} /></Field>
                    <Field label="Ano"><input value={card.expiryYear} onChange={(e) => setCard({ ...card, expiryYear: e.target.value })} placeholder="AAAA" className={inputCls} /></Field>
                    <Field label="CVV"><input value={card.ccv} onChange={(e) => setCard({ ...card, ccv: e.target.value })} placeholder="123" className={inputCls} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="CEP"><input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} /></Field>
                    <Field label="Nº endereço"><input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className={inputCls} /></Field>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className={cn(
              'w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-semibold text-sm flex items-center justify-center gap-2',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {intent.kind === 'change'
              ? 'Confirmar troca'
              : method === 'PIX' ? 'Gerar Pix' : 'Pagar com cartão'}
          </button>
        </div>
      )}
    </Modal>
  )
}

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-surface-950 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-surface-400">{label}</span>
      {children}
    </label>
  )
}
