// ─── Console do operador: criar conta a partir da Proposta (SCRUM-1205) ───────
// Termos 6.2.1: a conta nasce pela equipe, com as condições da Proposta
// assinada. O resumo mostrado antes de confirmar vem do MESMO cálculo do
// backend (POST /admin/billing/provision/preview), então o operador confirma
// exatamente o que vai para o contrato.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Copy, Loader2, Search, UserRound, FileSignature, Receipt, CheckCircle2 } from 'lucide-react'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { NumberField } from '@/components/ui/NumberField'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { PLAN_MODULES, isModuleOn } from '@/lib/billingModules'
import { localIsoDate } from '@/lib/localDate'
import { humanizeValidationMessage } from '@/lib/validationMessage'
import {
  formatCep, formatTaxId, isValidTaxId, lookupCep, lookupCnpj, normalizeTaxId, onlyDigits, type DocumentType,
} from '@/lib/brDocuments'
import {
  companyFromCnpjLookup, defaultInstallments, defaultOnNextInvoice, formatPercent, parsePercent,
  pickProvisionCompany, termMonthsOf,
} from '@/lib/adminBillingForm'
import {
  adminBillingApi, ENTITLEMENT_LABELS, formatBRL, PAYMENT_METHOD_LABELS, PAYMENT_MODE_LABELS, TERM_LABELS,
  type CatalogPlan, type ContractTermId, type EntitlementKeyId, type OveragePolicyId, type PaymentMethodId,
  type PaymentModeId, type PlanTierId, type ProvisionBody, type ProvisionCompany, type ProvisionPreview,
  type ProvisionResult, type VendableCombo,
} from '@/services/adminBillingApi'

const ENTITLEMENT_KEYS = Object.keys(ENTITLEMENT_LABELS) as EntitlementKeyId[]
const METHODS_BY_MODE: Record<PaymentModeId, PaymentMethodId[]> = {
  upfront: ['upfront_pix', 'upfront_card'],
  installments: ['pix_invoice', 'card_monthly'],
  monthly: ['pix_invoice', 'card_monthly'],
}
const COMMON_MODULES: readonly string[] = PLAN_MODULES

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-surface-800 bg-surface-900/40 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-100 mb-4">{icon}{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  )
}

/**
 * AD9 — percentual com decimal ("7,5"). O NumberField só aceita dígitos e
 * "7,5" virava 75%. Guarda o texto digitado ("7,") enquanto o número não
 * fecha; valor trocado de fora reescreve o texto.
 */
function PercentField({ value, onChange, min = 0, max = 100, placeholder }: {
  value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; placeholder?: string
}) {
  const [state, setState] = useState<{ text: string; value: number | null }>({ text: formatPercent(value), value })
  let text = state.text
  if (state.value !== value) {
    // Padrão "estado derivado" do React: ajusta durante o render, sem efeito.
    text = formatPercent(value)
    setState({ text, value })
  }
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '')
        const p = parsePercent(t)
        // Texto incompleto ("7,") mantém o último número válido.
        const next = p == null ? null : Number.isNaN(p) ? value : p
        setState({ text: t, value: next })
        if (next !== value) onChange(next)
      }}
      onBlur={() => {
        const clamped = value == null ? null : Math.min(max, Math.max(min, value))
        setState({ text: formatPercent(clamped), value: clamped })
        if (clamped !== value) onChange(clamped)
      }}
    />
  )
}

// Data LOCAL: em UTC, das 21h à meia-noite o padrão já seria "amanhã".
const today = () => localIsoDate()

/** Rótulos da tela para as mensagens de validação do backend (F10). */
const FIELD_LABELS: Record<string, string> = {
  planTier: 'Plano-modelo', term: 'Prazo', paymentMode: 'Cobrança', installments: 'Parcelas',
  contractedMonthlyCents: 'Preço fechado por mês', discountPct: 'Desconto', setupFeeCents: 'Taxa de setup',
  paymentMethod: 'Forma de pagamento', billingDay: 'Dia de vencimento', proposalRef: 'Número da Proposta',
  startsAt: 'Início da vigência', monthlyCredits: 'Créditos por mês', rolloverPct: 'Rollover',
  priceCents: 'Excedente — preço por crédito', blockCredits: 'Excedente — bloco mínimo', ceilingPct: 'Teto do excedente',
  readjustIndex: 'Índice de reajuste', readjustPeriodMonths: 'Reajuste a cada (meses)',
  companyName: 'Nome da conta', adminEmail: 'E-mail do administrador', adminFirstName: 'Nome do administrador',
  taxId: 'CPF/CNPJ', billingEmail: 'E-mail de cobrança', addressState: 'UF', addressZip: 'CEP',
  name: 'Signatário — nome', document: 'Signatário — CPF', email: 'Signatário — e-mail',
  ...Object.fromEntries(ENTITLEMENT_KEYS.map((k) => [k, ENTITLEMENT_LABELS[k]])),
}
const apiError = (e: unknown, fallback: string) => humanizeValidationMessage(getApiErrorMessage(e, fallback), FIELD_LABELS)

export function ProvisionForm({ onProvisioned }: { onProvisioned?: () => void }) {
  const [plans, setPlans] = useState<CatalogPlan[]>([])
  const [matrix, setMatrix] = useState<VendableCombo[]>([])

  // Empresa
  const [docType, setDocType] = useState<DocumentType>('cnpj')
  const [taxId, setTaxId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [company, setCompany] = useState<ProvisionCompany>({})
  const [lookingUp, setLookingUp] = useState(false)
  // Administrador
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  // Plano e pagamento
  const [planTier, setPlanTier] = useState<PlanTierId>('professional')
  const [term, setTerm] = useState<ContractTermId>('annual')
  const [paymentMode, setPaymentMode] = useState<PaymentModeId>('installments')
  const [installments, setInstallments] = useState<number | null>(12)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('pix_invoice')
  const [billingDay, setBillingDay] = useState<number | null>(10)
  const [contractedCents, setContractedCents] = useState<number>(0)
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [discountPct, setDiscountPct] = useState<number | null>(null)
  const [setupCents, setSetupCents] = useState<number>(0)
  const [setupWaived, setSetupWaived] = useState(false)
  // Proposta
  const [proposalRef, setProposalRef] = useState('')
  const [startsAt, setStartsAt] = useState(today())
  const [signatoryName, setSignatoryName] = useState('')
  const [signatoryDoc, setSignatoryDoc] = useState('')
  const [signatoryEmail, setSignatoryEmail] = useState('')
  // Ajustes por cliente
  const [monthlyCredits, setMonthlyCredits] = useState<number | null>(null)
  const [limits, setLimits] = useState<Partial<Record<EntitlementKeyId, number | null>>>({})
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [overagePrice, setOveragePrice] = useState<number | null>(null)
  const [overageBlock, setOverageBlock] = useState<number | null>(null)
  const [overagePolicy, setOveragePolicy] = useState<OveragePolicyId>('charge')
  const [overageCeiling, setOverageCeiling] = useState<number | null>(null)
  // AD4 — null = o operador não mexeu: vale o padrão do backend (parcelas ≥
  // meses) e o campo NÃO vai no corpo. Antes nascia ligado e sempre ia,
  // desfazendo a correção E8 (no 3× o excedente esperava até 4 meses).
  const [onNextInvoice, setOnNextInvoice] = useState<boolean | null>(null)
  const [rolloverPct, setRolloverPct] = useState<number | null>(0)
  const [readjustIndex, setReadjustIndex] = useState('IPCA')
  const [readjustMonths, setReadjustMonths] = useState<number | null>(12)

  // AD8 — a prévia guarda a chave (corpo) a que se refere: só a prévia dos
  // valores ATUAIS libera o "Criar conta" (antes uma prévia velha liberava).
  const [previewState, setPreviewState] = useState<{ key: string; data: ProvisionPreview | null; error: string | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ProvisionResult | null>(null)

  useEffect(() => {
    adminBillingApi.listCatalog().then(setPlans).catch(() => showToast('Não foi possível carregar os planos-modelo', 'error'))
    adminBillingApi.vendableMatrix().then(setMatrix).catch(() => {})
  }, [])

  const plan = plans.find((p) => p.tier === planTier) ?? null
  const sellable = useMemo(() => matrix.filter((c) => c.sellable), [matrix])
  const modesForTerm = sellable.filter((c) => c.term === term).map((c) => c.paymentMode)
  const methods = METHODS_BY_MODE[paymentMode]
  const termMonths = termMonthsOf(term)

  // Mantém as escolhas dependentes coerentes com a matriz vendável.
  useEffect(() => {
    if (modesForTerm.length && !modesForTerm.includes(paymentMode)) setPaymentMode(modesForTerm[0])
  }, [term, matrix]) // eslint-disable-line react-hooks/exhaustive-deps
  // AD5 — trocar prazo ou cobrança volta as parcelas ao padrão (meses do
  // prazo; à vista = 1). Antes só ajustava se passasse do máximo: de mensal
  // para anual as parcelas ficavam presas em 1.
  useEffect(() => {
    if (!methods.includes(paymentMethod)) setPaymentMethod(methods[0])
    setInstallments(defaultInstallments(paymentMode, termMonths))
  }, [paymentMode, term]) // eslint-disable-line react-hooks/exhaustive-deps
  // Fora da fatura Pix o excedente é sempre faturado à parte (AD4: volta ao padrão).
  useEffect(() => { if (paymentMethod !== 'pix_invoice') setOnNextInvoice(null) }, [paymentMethod])

  // AD5 — na mensalidade as parcelas são sempre os meses do prazo (campo escondido).
  const effectiveInstallments =
    paymentMode === 'upfront' ? 1 : paymentMode === 'monthly' ? termMonths : (installments ?? termMonths)
  const onNextInvoiceShown =
    paymentMethod === 'pix_invoice' && (onNextInvoice ?? defaultOnNextInvoice(paymentMethod, effectiveInstallments, termMonths))

  const taxIdValid = taxId === '' || isValidTaxId(docType, taxId)
  const combosOk = sellable.length === 0 || sellable.some((c) => c.term === term && c.paymentMode === paymentMode)
  // AD8 — preço fechado ligado com R$ 0 virava contrato de R$ 0.
  const customPriceMissing = useCustomPrice && contractedCents <= 0
  // AD14 — signatário pela metade era descartado sem aviso: agora bloqueia o
  // envio e aponta os campos que faltam (ou deixa os três em branco).
  const signatoryFilled = [signatoryName, signatoryDoc, signatoryEmail].filter((v) => v.trim() !== '').length
  const signatoryPartial = signatoryFilled > 0 && signatoryFilled < 3
  const signatoryError = (v: string) =>
    signatoryPartial && v.trim() === '' ? 'Preencha nome, CPF e e-mail do signatário (ou deixe os três em branco)' : undefined

  function termsBody(): Omit<ProvisionBody, 'companyName' | 'adminEmail' | 'adminFirstName' | 'frontendUrl'> {
    const ent: Partial<Record<EntitlementKeyId, number | null>> = {}
    // AD14 — chave presente com null = "ilimitado" explícito (sobrepõe o plano-modelo).
    for (const k of ENTITLEMENT_KEYS) if (k in limits) ent[k] = limits[k] ?? null
    return {
      planTier, term, paymentMode,
      installments: paymentMode === 'upfront' ? undefined : paymentMode === 'monthly' ? termMonths : (installments ?? undefined),
      contractedMonthlyCents: useCustomPrice ? contractedCents : undefined,
      discountPct: !useCustomPrice && discountPct != null ? discountPct : undefined,
      setupFeeCents: setupCents || undefined,
      setupWaived,
      paymentMethod,
      billingDay: billingDay ?? undefined,
      proposalRef: proposalRef.trim() || undefined,
      startsAt: startsAt ? new Date(`${startsAt}T12:00:00`).toISOString() : undefined,
      signatory: signatoryFilled === 3
        ? { name: signatoryName.trim(), document: onlyDigits(signatoryDoc), email: signatoryEmail.trim() }
        : undefined,
      monthlyCredits: monthlyCredits ?? undefined,
      rolloverPct: rolloverPct ?? 0,
      overage: {
        priceCents: overagePrice ?? undefined,
        blockCredits: overageBlock ?? undefined,
        policy: overagePolicy,
        ceilingPct: overageCeiling ?? undefined,
        // AD4 — só vai se o operador mexeu; senão o backend aplica o padrão.
        ...(paymentMethod === 'pix_invoice' && onNextInvoice != null ? { onNextInvoice } : {}),
      },
      entitlements: Object.keys(ent).length ? ent : undefined,
      modules: Object.keys(modules).length ? modules : undefined,
      readjustIndex: readjustIndex || null,
      readjustPeriodMonths: readjustMonths,
    }
  }

  // Prévia com debounce sempre que as condições mudam. O e-mail do
  // administrador NÃO vai na prévia: o resumo não depende dele, e um e-mail a
  // meio caminho (400 "must be an email") travava o botão com um erro que não
  // sumia ao corrigir o e-mail (a chave da prévia não o incluía). O e-mail é
  // validado no envio. Resposta de uma chave antiga é descartada.
  const previewKey = JSON.stringify(termsBody())
  useEffect(() => {
    if (!combosOk) return
    let cancelled = false
    const key = previewKey
    const t = setTimeout(() => {
      adminBillingApi.preview(JSON.parse(key))
        .then((p) => { if (!cancelled) setPreviewState({ key, data: p, error: null }) })
        .catch((e) => { if (!cancelled) setPreviewState({ key, data: null, error: apiError(e, 'Não foi possível calcular o resumo') }) })
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [previewKey, combosOk])
  // Só vale a prévia/erro dos valores atuais; outra chave = "Calculando…".
  const current = previewState?.key === previewKey ? previewState : null
  const preview = current?.data ?? null
  const previewError = current?.error ?? null

  // Idempotency-Key do envio (F14): a mesma chave em retry do MESMO corpo (ex.:
  // a rede caiu depois de o backend criar a conta → não cria duas); corpo
  // diferente, chave nova.
  const idempotency = useRef<{ body: string; key: string } | null>(null)

  async function fillFromCnpj() {
    setLookingUp(true)
    try {
      const r = await lookupCnpj(taxId)
      // AD1 — campo a campo: espalhar o retorno punha `tradeName`/`email`/
      // `phone` no `company` e o backend recusava todo "Criar conta" (400).
      setCompany((c) => companyFromCnpjLookup(c, r))
      if (!companyName && (r.tradeName || r.legalName)) setCompanyName(r.tradeName || r.legalName || '')
      showToast('Dados da Receita preenchidos. Confira antes de salvar.', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Consulta de CNPJ indisponível', 'error')
    } finally {
      setLookingUp(false)
    }
  }

  async function fillFromCep() {
    try {
      const r = await lookupCep(company.addressZip ?? '')
      setCompany((c) => ({ ...c, ...r, addressNumber: c.addressNumber, addressComplement: c.addressComplement }))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Consulta de CEP indisponível', 'error')
    }
  }

  const setC = (k: keyof ProvisionCompany) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCompany((c) => ({ ...c, [k]: e.target.value }))

  const canSubmit =
    companyName.trim().length >= 2 && adminFirstName.trim() && /\S+@\S+\.\S+/.test(adminEmail) &&
    taxIdValid && combosOk && !!plan && !!preview && !previewError && !customPriceMissing && !signatoryPartial

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const body: ProvisionBody = {
        ...termsBody(),
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim() || undefined,
        company: {
          ...company,
          documentType: taxId ? docType : undefined,
          taxId: taxId ? normalizeTaxId(docType, taxId) : undefined,
          addressZip: company.addressZip ? onlyDigits(company.addressZip) : undefined,
          addressState: company.addressState?.toUpperCase() || undefined,
        },
        frontendUrl: window.location.origin,
      }
      // Remove vazios e qualquer campo fora do DTO da empresa (AD1: o backend
      // recusa campo desconhecido).
      body.company = pickProvisionCompany(body.company as Record<string, unknown>)
      const bodyKey = JSON.stringify(body)
      if (idempotency.current?.body !== bodyKey) idempotency.current = { body: bodyKey, key: crypto.randomUUID() }
      const r = await adminBillingApi.provision(body, idempotency.current.key)
      setResult(r)
      onProvisioned?.()
    } catch (e) {
      showToast(apiError(e, 'Não foi possível criar a conta'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl space-y-4">
        <Banner variant="success">Conta criada. Envie o link abaixo ao administrador do cliente (válido por 7 dias).</Banner>
        <div className="rounded-2xl border border-surface-800 p-5 space-y-3">
          <p className="text-sm text-surface-300">Link de ativação</p>
          <div className="flex gap-2">
            <Input readOnly value={result.activationUrl} className="font-mono text-xs" />
            <Button
              variant="secondary"
              leftIcon={<Copy className="w-4 h-4" />}
              onClick={() => { void navigator.clipboard.writeText(result.activationUrl); showToast('Link copiado', 'success') }}
            >
              Copiar
            </Button>
          </div>
          <p className="text-xs text-surface-500">
            Primeira fatura: {formatBRL(result.summary.firstInvoiceCents)} · Mensal: {formatBRL(result.summary.monthlyCents)} · Total do contrato: {formatBRL(result.summary.totalContractCents)}
          </p>
        </div>
        <Button variant="ghost" onClick={() => window.location.reload()}>Criar outra conta</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-5 pb-10">
      <Section icon={<Building2 className="w-4 h-4 text-brand-400" />} title="Empresa">
        <FormField label="Tipo de documento" required>
          <Select value={docType} onChange={(e) => { setDocType(e.target.value as DocumentType); setTaxId('') }}>
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF (empresário individual ou profissional)</option>
          </Select>
        </FormField>
        <FormField label={docType === 'cnpj' ? 'CNPJ' : 'CPF'} error={taxIdValid ? undefined : `${docType.toUpperCase()} inválido`}>
          <div className="flex gap-2">
            <Input value={formatTaxId(docType, taxId)} onChange={(e) => setTaxId(normalizeTaxId(docType, e.target.value))} />
            {docType === 'cnpj' && (
              <Button variant="secondary" onClick={fillFromCnpj} loading={lookingUp} disabled={!taxId || !taxIdValid} leftIcon={<Search className="w-4 h-4" />}>
                Buscar
              </Button>
            )}
          </div>
        </FormField>
        <FormField label="Nome da conta (nome fantasia)" required>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </FormField>
        <FormField label={docType === 'cnpj' ? 'Razão social' : 'Nome completo'}>
          <Input value={company.legalName ?? ''} onChange={setC('legalName')} />
        </FormField>
        <FormField label="Inscrição estadual"><Input value={company.stateRegistration ?? ''} onChange={setC('stateRegistration')} /></FormField>
        <FormField label="Inscrição municipal"><Input value={company.municipalRegistration ?? ''} onChange={setC('municipalRegistration')} /></FormField>
        <FormField label="E-mail de cobrança" hint="Recebe as faturas. Em branco, usa o e-mail do administrador.">
          <Input type="email" value={company.billingEmail ?? ''} onChange={setC('billingEmail')} />
        </FormField>
        <FormField label="Contato financeiro"><Input value={company.billingContact ?? ''} onChange={setC('billingContact')} /></FormField>
        <FormField label="Telefone do financeiro"><Input value={company.billingPhone ?? ''} onChange={setC('billingPhone')} /></FormField>
        <FormField label="CEP">
          <div className="flex gap-2">
            <Input value={formatCep(company.addressZip ?? '')} onChange={(e) => setCompany((c) => ({ ...c, addressZip: onlyDigits(e.target.value) }))} inputMode="numeric" />
            <Button variant="secondary" onClick={fillFromCep} disabled={onlyDigits(company.addressZip).length !== 8}>Preencher</Button>
          </div>
        </FormField>
        <FormField label="Rua"><Input value={company.addressStreet ?? ''} onChange={setC('addressStreet')} /></FormField>
        <FormField label="Número"><Input value={company.addressNumber ?? ''} onChange={setC('addressNumber')} /></FormField>
        <FormField label="Complemento"><Input value={company.addressComplement ?? ''} onChange={setC('addressComplement')} /></FormField>
        <FormField label="Bairro"><Input value={company.addressDistrict ?? ''} onChange={setC('addressDistrict')} /></FormField>
        <FormField label="Cidade"><Input value={company.addressCity ?? ''} onChange={setC('addressCity')} /></FormField>
        <FormField label="UF"><Input maxLength={2} value={company.addressState ?? ''} onChange={setC('addressState')} /></FormField>
      </Section>

      <Section icon={<UserRound className="w-4 h-4 text-brand-400" />} title="Administrador inicial">
        <FormField label="Nome" required><Input value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} /></FormField>
        <FormField label="Sobrenome"><Input value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} /></FormField>
        <FormField label="E-mail" required hint="Recebe o link de ativação. Não pode já estar em uso.">
          <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        </FormField>
      </Section>

      <Section icon={<Receipt className="w-4 h-4 text-brand-400" />} title="Plano, prazo e pagamento">
        <FormField label="Plano-modelo" required>
          <Select value={planTier} onChange={(e) => setPlanTier(e.target.value as PlanTierId)}>
            {plans.filter((p) => p.active).map((p) => (
              <option key={p.tier} value={p.tier}>{p.displayName} — {formatBRL(p.priceMonthlyCents)}/mês</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Prazo" required>
          <Select value={term} onChange={(e) => setTerm(e.target.value as ContractTermId)}>
            {(Object.keys(TERM_LABELS) as ContractTermId[]).map((t) => <option key={t} value={t}>{TERM_LABELS[t]}</option>)}
          </Select>
        </FormField>
        <FormField label="Cobrança" required error={combosOk ? undefined : 'Combinação não vendável'}>
          <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentModeId)}>
            {(modesForTerm.length ? modesForTerm : (['upfront', 'installments', 'monthly'] as PaymentModeId[])).map((m) => (
              <option key={m} value={m}>{PAYMENT_MODE_LABELS[m]}{sellable.find((c) => c.term === term && c.paymentMode === m)?.note ? ` (${sellable.find((c) => c.term === term && c.paymentMode === m)?.note})` : ''}</option>
            ))}
          </Select>
        </FormField>
        {/* AD5 — mensalidade: parcelas = meses do prazo, sem campo. */}
        {paymentMode === 'installments' && (
          <FormField label="Parcelas">
            <NumberField value={installments} onChange={setInstallments} min={1} max={termMonths} />
          </FormField>
        )}
        <FormField label="Forma de pagamento" required>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodId)}>
            {methods.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
          </Select>
        </FormField>
        <FormField label="Dia de vencimento" hint="Entre 1 e 28">
          <NumberField value={billingDay} onChange={setBillingDay} min={1} max={28} />
        </FormField>
        <FormField label="Preço fechado por mês" error={customPriceMissing ? 'Informe o preço fechado (maior que zero)' : undefined}>
          <div className="flex items-center gap-3">
            <Switch checked={useCustomPrice} onChange={setUseCustomPrice} />
            {useCustomPrice
              ? <MoneyInput value={contractedCents} onChange={setContractedCents} />
              : <span className="text-xs text-surface-500">Preço de tabela {plan ? formatBRL(plan.priceMonthlyCents) : ''} com desconto</span>}
          </div>
        </FormField>
        {!useCustomPrice && (
          <FormField label="Desconto (%)" hint="Em branco: desconto padrão da periodicidade. Aceita decimais (7,5).">
            <PercentField value={discountPct} onChange={setDiscountPct} min={0} max={100} />
          </FormField>
        )}
        <FormField label="Taxa de setup">
          <MoneyInput value={setupCents} onChange={setSetupCents} disabled={setupWaived} />
        </FormField>
        <FormField label="Isentar setup">
          <Switch checked={setupWaived} onChange={setSetupWaived} />
        </FormField>
      </Section>

      <Section icon={<FileSignature className="w-4 h-4 text-brand-400" />} title="Proposta Comercial">
        <FormField label="Número da Proposta"><Input value={proposalRef} onChange={(e) => setProposalRef(e.target.value)} /></FormField>
        <FormField label="Início da vigência" hint="Data da Proposta (Termos 7.5.2): conta mesmo sem ativação">
          <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </FormField>
        <FormField label="Signatário — nome" error={signatoryError(signatoryName)}><Input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} /></FormField>
        <FormField label="Signatário — CPF" error={signatoryError(signatoryDoc)}><Input value={signatoryDoc} onChange={(e) => setSignatoryDoc(e.target.value)} /></FormField>
        <FormField label="Signatário — e-mail" error={signatoryError(signatoryEmail)}><Input type="email" value={signatoryEmail} onChange={(e) => setSignatoryEmail(e.target.value)} /></FormField>
      </Section>

      <CollapsibleSection title="Ajustes por cliente (créditos, limites, módulos, excedente)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <FormField label="Créditos por mês" hint={`Em branco: ${plan?.monthlyCredits?.toLocaleString('pt-BR') ?? 'do plano-modelo'}`}>
            <NumberField value={monthlyCredits} onChange={setMonthlyCredits} min={0} />
          </FormField>
          <FormField label="Rollover (%)" hint="Termos 7.3.5: só se a Proposta prevê. Padrão 0.">
            <PercentField value={rolloverPct} onChange={setRolloverPct} min={0} max={100} />
          </FormField>
          {ENTITLEMENT_KEYS.map((k) => {
            // AD14 — chave com null = "ilimitado" explícito; sem chave = valor do plano-modelo.
            const unlimited = k in limits && limits[k] === null
            return (
              <FormField key={k} label={ENTITLEMENT_LABELS[k]} hint={unlimited ? 'Ilimitado nesta conta' : `Em branco: ${plan?.features?.entitlements?.[k] ?? 'ilimitado'}`}>
                <div className="flex items-center gap-3">
                  <NumberField
                    value={unlimited ? null : limits[k] ?? null}
                    disabled={unlimited}
                    placeholder={unlimited ? 'ilimitado' : undefined}
                    onChange={(v) => setLimits((l) => {
                      const n = { ...l }
                      if (v == null) delete n[k]; else n[k] = v
                      return n
                    })}
                    min={0}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-surface-400 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={unlimited}
                      aria-label={`${ENTITLEMENT_LABELS[k]} ilimitado`}
                      onChange={(e) => setLimits((l) => {
                        const n = { ...l }
                        if (e.target.checked) n[k] = null; else delete n[k]
                        return n
                      })}
                    />
                    Ilimitado
                  </label>
                </div>
              </FormField>
            )
          })}
          <div className="md:col-span-2">
            <p className="text-xs text-surface-400 mb-2">Módulos</p>
            <div className="flex flex-wrap gap-4">
              {Array.from(new Set([...COMMON_MODULES, ...Object.keys(plan?.features?.modules ?? {})])).map((m) => {
                // B21: módulo ausente no plano-modelo = ligado; só `false` explícito desliga.
                const base = isModuleOn(plan?.features?.modules, m)
                const val = modules[m] ?? base
                return (
                  <label key={m} className="flex items-center gap-2 text-sm text-surface-300">
                    <Switch checked={val} onChange={(v) => setModules((s) => ({ ...s, [m]: v }))} />
                    {m}
                  </label>
                )
              })}
            </div>
          </div>
          <FormField label="Excedente — preço por crédito (centavos)" hint="Em branco: preço do plano ÷ franquia">
            <NumberField value={overagePrice} onChange={setOveragePrice} min={0} />
          </FormField>
          <FormField label="Excedente — bloco mínimo (créditos)"><NumberField value={overageBlock} onChange={setOverageBlock} min={1} /></FormField>
          <FormField label="Ao atingir a franquia">
            <Select value={overagePolicy} onChange={(e) => setOveragePolicy(e.target.value as OveragePolicyId)}>
              <option value="charge">Cobrar excedente</option>
              <option value="limit">Limitar</option>
              <option value="pack">Oferecer pacote</option>
            </Select>
          </FormField>
          <FormField label="Teto do excedente (% da franquia)"><PercentField value={overageCeiling} onChange={setOverageCeiling} min={0} max={1000} /></FormField>
          <FormField
            label="Excedente entra na fatura Pix seguinte"
            hint={`Só fatura Pix mensal; precisa estar na Proposta (7.3.2). Padrão: ${paymentMethod === 'pix_invoice' && defaultOnNextInvoice(paymentMethod, effectiveInstallments, termMonths) ? 'sim' : 'não'} (só com uma fatura por mês).`}
          >
            <Switch checked={onNextInvoiceShown} onChange={setOnNextInvoice} disabled={paymentMethod !== 'pix_invoice'} />
          </FormField>
          <FormField label="Índice de reajuste"><Input value={readjustIndex} onChange={(e) => setReadjustIndex(e.target.value)} /></FormField>
          <FormField label="Reajuste a cada (meses)"><NumberField value={readjustMonths} onChange={setReadjustMonths} min={1} max={60} /></FormField>
        </div>
      </CollapsibleSection>

      <section className="rounded-2xl border border-brand-500/30 bg-brand-950/20 p-5">
        <h3 className="text-sm font-semibold text-surface-100 mb-3">Resumo antes de confirmar</h3>
        {previewError && <Banner variant="danger" className="mb-3">{previewError}</Banner>}
        {preview ? (
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div><dt className="text-surface-500 text-xs">Mensal</dt><dd className="text-surface-100 font-semibold">{formatBRL(preview.summary.monthlyCents)}</dd></div>
            <div><dt className="text-surface-500 text-xs">Parcela</dt><dd className="text-surface-100 font-semibold">{preview.summary.installments}× {formatBRL(preview.summary.installmentCents)}</dd></div>
            <div><dt className="text-surface-500 text-xs">Setup</dt><dd className="text-surface-100 font-semibold">{formatBRL(preview.summary.setupCents)}</dd></div>
            <div><dt className="text-surface-500 text-xs">Primeira fatura</dt><dd className="text-surface-100 font-semibold">{formatBRL(preview.summary.firstInvoiceCents)}</dd></div>
            <div><dt className="text-surface-500 text-xs">Total do contrato</dt><dd className="text-surface-100 font-semibold">{formatBRL(preview.summary.totalContractCents)}</dd></div>
          </dl>
        ) : !previewError && <p className="text-xs text-surface-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Calculando…</p>}
        <div className="mt-5 flex items-center justify-end gap-3">
          {(customPriceMissing || signatoryPartial) && (
            <p className="text-xs text-danger">
              {customPriceMissing ? 'Informe o preço fechado por mês.' : 'Complete o signatário (nome, CPF e e-mail) ou deixe os três em branco.'}
            </p>
          )}
          <Button onClick={submit} loading={submitting} disabled={!canSubmit} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
            Criar conta e gerar link
          </Button>
        </div>
      </section>
    </div>
  )
}
