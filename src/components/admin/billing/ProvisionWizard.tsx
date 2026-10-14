// ─── Console do operador: Nova conta em quatro passos (SCRUM-1205, onda C) ────
// Termos 6.2.1: a conta nasce pela equipe, com as condições da Proposta
// assinada. Substitui o ProvisionForm (página única de 65 controles) com as
// MESMAS chamadas e regras: catálogo, matriz vendável, prévia do backend
// (POST /admin/billing/provision/preview — o resumo é o cálculo do contrato) e
// provisionamento com Idempotency-Key. Muda a organização, decidida pelo PO em
// 13/10 com prévia lado a lado:
//
//   Cliente → Condições → Ajustes → Revisar e criar, um cartão por passo e um
//   painel à direita que acompanha tudo (passos com o que falta, resumo de
//   valores, o que difere do plano-modelo, ação do passo). Passo na URL
//   (?passo=), como pede a regra de estado de tela.
//
// Regras do PO:
//   - documento, razão social e endereço são obrigatórios: a 1ª fatura nasce
//     antes do primeiro acesso e o PDF usa esses dados (a NF é emitida fora do
//     Oryon com eles). A busca do CNPJ preenche; inscrições e financeiro ficam
//     num bloco opcional que o cliente completa no primeiro acesso;
//   - forma de pagamento fixa em Pix até o checkout hospedado (Gates2B: cartão
//     só no checkout hospedado; antes o cartão aceito virava Pix com baixa manual);
//   - Enterprise (sem preço de tabela) só tem preço negociado e fechado.
//
// Regressões herdadas do ProvisionForm, cobertas em ProvisionWizard.test.tsx:
// AD1 (busca de CNPJ campo a campo), AD4 (excedente na fatura seguinte só vai
// se o operador mexer), AD5 (parcelas = meses do prazo), AD8 (criar só com a
// prévia dos valores atuais; preço fechado R$ 0 bloqueia), AD9 (percentual com
// decimal), AD14 (signatário pela metade bloqueia; "ilimitado" = null).

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, UserRound, FileSignature, Search, CheckCircle2, Copy, ArrowLeft, ArrowRight, Pencil,
  Undo2, SlidersHorizontal, MapPin, Receipt, Loader2, Check,
} from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { NumberField } from '@/components/ui/NumberField'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { Badge } from '@/components/ui/Badge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { showToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { localIsoDate } from '@/lib/localDate'
import { humanizeValidationMessage } from '@/lib/validationMessage'
import { PLAN_MODULES, PLAN_MODULE_LABEL, isModuleOn, type PlanModuleId } from '@/lib/billingModules'
import {
  formatCep, formatTaxId, isValidTaxId, lookupCep, lookupCnpj, normalizeTaxId, onlyDigits, type DocumentType,
} from '@/lib/brDocuments'
import {
  companyFromCnpjLookup, defaultOnNextInvoice, formatPercent, parsePercent, pickProvisionCompany,
} from '@/lib/adminBillingForm'
import {
  adminBillingApi, ENTITLEMENT_LABELS, formatBRL,
  type CatalogPlan, type ContractTermId, type EntitlementKeyId, type OveragePolicyId, type PaymentMethodId,
  type PaymentModeId, type PlanTierId, type ProvisionBody, type ProvisionCompany, type ProvisionPreview,
  type ProvisionResult, type VendableCombo,
} from '@/services/adminBillingApi'

const PASSOS = ['Cliente', 'Condições', 'Ajustes', 'Revisar e criar'] as const
const ENT_KEYS = Object.keys(ENTITLEMENT_LABELS) as EntitlementKeyId[]
const MESES: Record<ContractTermId, number> = { annual: 12, semiannual: 6, monthly: 1 }
const METODO: Record<PaymentModeId, PaymentMethodId> = { upfront: 'upfront_pix', installments: 'pix_invoice', monthly: 'pix_invoice' }
const METODO_TEXTO: Record<PaymentModeId, string> = {
  upfront: 'Pix, valor total na 1ª fatura',
  installments: 'Fatura mensal por Pix',
  monthly: 'Fatura mensal por Pix',
}

/** Rótulos da tela para as mensagens de validação do backend (F10). */
const FIELD_LABELS: Record<string, string> = {
  planTier: 'Plano', term: 'Prazo', paymentMode: 'Condição', installments: 'Parcelas',
  contractedMonthlyCents: 'Preço fechado por mês', discountPct: 'Desconto', setupFeeCents: 'Setup',
  paymentMethod: 'Forma de pagamento', billingDay: 'Dia de vencimento', proposalRef: 'Número da Proposta',
  startsAt: 'Início da vigência', monthlyCredits: 'Créditos por mês', rolloverPct: 'Créditos não usados',
  priceCents: 'Preço do crédito excedente', blockCredits: 'Bloco mínimo do excedente', ceilingPct: 'Teto do excedente',
  readjustIndex: 'Índice de reajuste', readjustPeriodMonths: 'Reajuste a cada (meses)',
  companyName: 'Nome da conta', adminEmail: 'E-mail do administrador', adminFirstName: 'Nome do administrador',
  taxId: 'CPF/CNPJ', billingEmail: 'E-mail de cobrança', addressState: 'UF', addressZip: 'CEP',
  name: 'Signatário — nome', document: 'Signatário — CPF', email: 'Signatário — e-mail',
  ...Object.fromEntries(ENT_KEYS.map((k) => [k, ENTITLEMENT_LABELS[k]])),
}
const apiError = (e: unknown, fallback: string) => humanizeValidationMessage(getApiErrorMessage(e, fallback), FIELD_LABELS)

/** Nome da condição como o operador fala (a matriz guarda prazo × cobrança). */
function nomeDaCondicao(c: VendableCombo): { titulo: string; detalhe: string } {
  const meses = MESES[c.term]
  const prazo = c.term === 'annual' ? 'Anual' : c.term === 'semiannual' ? 'Semestral' : 'Mensal'
  const titulo = c.term === 'monthly' ? 'Mensal'
    : c.paymentMode === 'upfront' ? `${prazo} à vista`
      : c.paymentMode === 'installments' ? `${prazo} parcelado (até ${meses}×)` : `${prazo}, pago mês a mês`
  const partes = [
    c.discountPct > 0 ? `${c.discountPct}% de desconto` : c.term === 'monthly' ? 'sem fidelidade' : 'sem desconto',
    c.setupWaivable ? 'setup isento' : null,
  ].filter(Boolean)
  return { titulo, detalhe: partes.join(' · ') }
}

// ── Peças (fora do componente: recriadas a cada render, perdiam o foco) ──────

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

function Opcao({ ativo, onClick, titulo, detalhe }: { ativo: boolean; onClick: () => void; titulo: string; detalhe: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'text-left rounded-[10px] border px-3.5 py-2.5 transition-colors min-w-0 outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500/50',
        ativo ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)]',
      )}
    >
      <span className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[13px] font-medium text-surface-100 truncate">{titulo}</span>
        <span className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0', ativo ? 'bg-brand-500 text-white' : 'border border-[var(--bd2)]')} aria-hidden>
          {ativo && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
        </span>
      </span>
      <span className="block text-xs text-surface-400 mt-0.5 truncate">{detalhe}</span>
    </button>
  )
}

/** Seletor no tamanho do conteúdo e na altura dos campos (36px): dentro do
 *  FormField (flex-col) ele esticava na largura da coluna. */
function Seletor<T extends string>(props: { label: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="flex">
      <SegmentedControl label={props.label} size="md" value={props.value} onChange={props.onChange} options={props.options} />
    </div>
  )
}

/** Seção dentro do cartão único do passo: título 13/600 e divisória fina. */
function Secao({ icone, titulo, descricao, acao, primeira, children }: {
  icone?: ReactNode; titulo: string; descricao?: string; acao?: ReactNode; primeira?: boolean; children: ReactNode
}) {
  return (
    <section className={cn('space-y-3.5', !primeira && 'mt-5 pt-5 border-t border-surface-700')}>
      <div className="flex items-start justify-between gap-3 min-h-7">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-surface-100">{icone}{titulo}</h3>
          {descricao && <p className="text-xs text-surface-400 mt-0.5">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

function Rotulo({ texto, alterado }: { texto: string; alterado: boolean }) {
  return <span className="inline-flex items-center gap-2">{texto}{alterado && <Badge variant="pending">alterado</Badge>}</span>
}

function ListaRevisao({ linhas }: { linhas: Array<[string, ReactNode]> }) {
  return (
    <dl className="space-y-2">
      {linhas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-[13px] min-w-0">
          <dt className="text-surface-400 flex-shrink-0">{k}</dt>
          <dd className="text-surface-100 text-right break-words min-w-0">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function Linha({ k, v, forte }: { k: string; v: ReactNode; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-surface-400">{k}</dt>
      <dd className={cn('tabular-nums text-right', forte ? 'text-base font-semibold text-surface-50' : 'text-surface-100')}>{v}</dd>
    </div>
  )
}

function CampoFixo({ children }: { children: ReactNode }) {
  return <div className="flex h-9 items-center rounded-[6px] border border-dashed border-surface-700 px-2.5 text-[13px] text-surface-200">{children}</div>
}

// ── Componente ───────────────────────────────────────────────────────────────

export function ProvisionWizard({ onProvisioned }: { onProvisioned?: () => void }) {
  const [params, setParams] = useSearchParams()
  const passo = Math.min(4, Math.max(1, Number(params.get('passo')) || 1))
  const irPara = (n: number) => setParams((p) => { const q = new URLSearchParams(p); q.set('passo', String(n)); return q })

  const [plans, setPlans] = useState<CatalogPlan[]>([])
  const [matrix, setMatrix] = useState<VendableCombo[]>([])

  // 1 · Cliente
  const [docType, setDocType] = useState<DocumentType>('cnpj')
  const [taxId, setTaxId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [company, setCompany] = useState<ProvisionCompany>({})
  const [buscou, setBuscou] = useState<'nada' | 'completo' | 'incompleto'>('nada')
  const [buscando, setBuscando] = useState(false)
  const [mostrarOpcionais, setMostrarOpcionais] = useState(false)
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  // 2 · Condições
  const [planTier, setPlanTier] = useState<PlanTierId>('professional')
  const [comboKey, setComboKey] = useState('annual/installments')
  const [installments, setInstallments] = useState<number | null>(null)
  const [preco, setPreco] = useState<'tabela' | 'negociado'>('tabela')
  const [negociadoModo, setNegociadoModo] = useState<'fechado' | 'desconto'>('fechado')
  const [contractedCents, setContractedCents] = useState(0)
  const [tocouPreco, setTocouPreco] = useState(false)
  const [discountPct, setDiscountPct] = useState<number | null>(null)
  const [setupCents, setSetupCents] = useState(0)
  const [setupWaived, setSetupWaived] = useState(false)
  const [billingDay, setBillingDay] = useState<number | null>(10)
  const [proposalRef, setProposalRef] = useState('')
  const [startsAt, setStartsAt] = useState(localIsoDate())
  const [sigName, setSigName] = useState('')
  const [sigDoc, setSigDoc] = useState('')
  const [sigEmail, setSigEmail] = useState('')

  // 3 · Ajustes — `undefined` = vale o plano-modelo (a chave não vai no corpo)
  const [monthlyCredits, setMonthlyCredits] = useState<number | null | undefined>(undefined)
  const [limits, setLimits] = useState<Partial<Record<EntitlementKeyId, number | null>>>({})
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [overagePolicy, setOveragePolicy] = useState<OveragePolicyId>('charge')
  const [overagePrice, setOveragePrice] = useState<number | null>(null)
  const [overageBlock, setOverageBlock] = useState<number | null>(null)
  const [overageCeiling, setOverageCeiling] = useState<number | null>(null)
  // AD4 — null = o operador não mexeu: vale o padrão do backend e o campo não vai.
  const [onNextInvoice, setOnNextInvoice] = useState<boolean | null>(null)
  const [rolloverPct, setRolloverPct] = useState<number | null>(0)
  const [readjustIndex, setReadjustIndex] = useState('IPCA')
  const [readjustMonths, setReadjustMonths] = useState<number | null>(12)

  const [preview, setPreview] = useState<{ key: string; data: ProvisionPreview | null; error: string | null } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<ProvisionResult | null>(null)
  const idem = useRef<{ body: string; key: string } | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  // Trocar de passo volta ao topo (ficava rolado no meio do passo anterior).
  useEffect(() => { raiz.current?.closest('.overflow-y-auto')?.scrollTo?.({ top: 0 }) }, [passo])

  useEffect(() => {
    adminBillingApi.listCatalog().then(setPlans).catch(() => showToast('Não foi possível carregar os planos-modelo', 'error'))
    adminBillingApi.vendableMatrix().then(setMatrix).catch(() => {})
  }, [])

  const plan = plans.find((p) => p.tier === planTier) ?? null
  const semPrecoDeTabela = !!plan && !plan.priceMonthlyCents
  useEffect(() => { if (semPrecoDeTabela) { setPreco('negociado'); setNegociadoModo('fechado') } }, [semPrecoDeTabela])

  const condicoes = useMemo(() => matrix.filter((c) => c.sellable), [matrix])
  const combo = condicoes.find((c) => `${c.term}/${c.paymentMode}` === comboKey) ?? condicoes[0] ?? null
  const term: ContractTermId = combo?.term ?? 'annual'
  const paymentMode: PaymentModeId = combo?.paymentMode ?? 'installments'
  const meses = MESES[term]
  const paymentMethod = METODO[paymentMode]
  // AD5 — trocar a condição volta as parcelas ao padrão do prazo novo.
  useEffect(() => { setInstallments(null) }, [comboKey])
  const parcelas = paymentMode === 'upfront' ? 1 : paymentMode === 'monthly' ? meses : (installments ?? meses)
  const onNextInvoiceShown = paymentMethod === 'pix_invoice' && (onNextInvoice ?? defaultOnNextInvoice(paymentMethod, parcelas, meses))

  // ── Obrigatoriedade ────────────────────────────────────────────────────────
  const docOk = taxId !== '' && isValidTaxId(docType, taxId)
  const enderecoOk = !!(company.addressZip && company.addressStreet && company.addressNumber && company.addressDistrict && company.addressCity && company.addressState)
  const razaoOk = !!company.legalName?.trim()
  const adminOk = !!adminFirstName.trim() && /\S+@\S+\.\S+/.test(adminEmail)
  const faltas1 = [
    !docOk && 'documento válido',
    docOk && (!razaoOk || !enderecoOk) && 'razão social e endereço',
    companyName.trim().length < 2 && 'nome da conta',
    !adminOk && 'nome e e-mail do administrador',
  ].filter(Boolean) as string[]
  const negociadoFaltando = preco === 'negociado' && negociadoModo === 'fechado' && contractedCents <= 0
  const sigPreenchido = [sigName, sigDoc, sigEmail].filter((v) => v.trim()).length
  const sigParcial = sigPreenchido > 0 && sigPreenchido < 3
  const faltas2 = [
    (!plan || !combo) && 'plano e condição',
    negociadoFaltando && 'preço fechado',
    sigParcial && 'signatário completo (ou nenhum)',
  ].filter(Boolean) as string[]
  const passo1Ok = faltas1.length === 0
  const passo2Ok = faltas2.length === 0

  // ── Corpo (contrato do backend) ────────────────────────────────────────────
  function termsBody(): Omit<ProvisionBody, 'companyName' | 'adminEmail' | 'adminFirstName' | 'frontendUrl'> {
    const ent: Partial<Record<EntitlementKeyId, number | null>> = {}
    // AD14 — chave presente com null = "ilimitado" explícito (sobrepõe o plano-modelo).
    for (const k of ENT_KEYS) if (k in limits) ent[k] = limits[k] ?? null
    return {
      planTier, term, paymentMode,
      installments: paymentMode === 'upfront' ? undefined : parcelas,
      contractedMonthlyCents: preco === 'negociado' && negociadoModo === 'fechado' ? contractedCents : undefined,
      discountPct: preco === 'negociado' && negociadoModo === 'desconto' && discountPct != null ? discountPct : undefined,
      setupFeeCents: preco === 'negociado' && setupCents ? setupCents : undefined,
      setupWaived: preco === 'negociado' ? setupWaived : false,
      paymentMethod,
      billingDay: billingDay ?? undefined,
      proposalRef: proposalRef.trim() || undefined,
      startsAt: startsAt ? new Date(`${startsAt}T12:00:00`).toISOString() : undefined,
      signatory: sigPreenchido === 3 ? { name: sigName.trim(), document: onlyDigits(sigDoc), email: sigEmail.trim() } : undefined,
      monthlyCredits,
      rolloverPct: rolloverPct ?? 0,
      overage: {
        priceCents: overagePrice ?? undefined,
        blockCredits: overageBlock ?? undefined,
        policy: overagePolicy,
        ceilingPct: overageCeiling ?? undefined,
        ...(paymentMethod === 'pix_invoice' && onNextInvoice != null ? { onNextInvoice } : {}),
      },
      entitlements: Object.keys(ent).length ? ent : undefined,
      modules: Object.keys(modules).length ? modules : undefined,
      readjustIndex: readjustIndex.trim() || null,
      readjustPeriodMonths: readjustMonths,
    }
  }
  // Prévia com debounce; resposta de uma chave antiga é descartada. AD8: só a
  // prévia dos valores ATUAIS libera o "Criar conta".
  const previewKey = JSON.stringify(termsBody())
  useEffect(() => {
    if (!combo) return
    let cancelado = false
    const key = previewKey
    const t = setTimeout(() => {
      adminBillingApi.preview(JSON.parse(key))
        .then((p) => { if (!cancelado) setPreview({ key, data: p, error: null }) })
        .catch((e) => { if (!cancelado) setPreview({ key, data: null, error: apiError(e, 'Não foi possível calcular o resumo') }) })
    }, 350)
    return () => { cancelado = true; clearTimeout(t) }
  }, [previewKey, combo])
  const atual = preview?.key === previewKey ? preview : null
  // Enquanto recalcula, os últimos valores continuam à vista (sem piscar).
  const exibido = atual?.data ?? preview?.data ?? null
  const recalculando = !atual && !!preview

  // ── O que difere do plano-modelo ───────────────────────────────────────────
  const planoLimite = (k: EntitlementKeyId) => plan?.features?.entitlements?.[k] ?? null
  const diferencas: Array<[string, string]> = []
  if (preco === 'negociado' && negociadoModo === 'fechado' && contractedCents > 0) diferencas.push(['Preço negociado', `${formatBRL(contractedCents)}/mês`])
  if (preco === 'negociado' && negociadoModo === 'desconto' && discountPct) diferencas.push(['Desconto negociado', `${formatPercent(discountPct)}%`])
  if (paymentMode === 'installments' && installments != null && installments !== meses) diferencas.push(['Parcelas', `${installments}×`])
  if (monthlyCredits !== undefined) diferencas.push(['Créditos por mês', `${monthlyCredits?.toLocaleString('pt-BR') ?? 'ilimitado'}`])
  for (const k of ENT_KEYS) if (k in limits) diferencas.push([ENTITLEMENT_LABELS[k], `${limits[k] ?? 'ilimitado'} (plano: ${planoLimite(k) ?? 'ilimitado'})`])
  for (const [m, v] of Object.entries(modules)) diferencas.push([PLAN_MODULE_LABEL[m as PlanModuleId] ?? m, v ? 'incluído' : 'fora do contrato'])
  if (overagePolicy !== 'charge') diferencas.push(['Ao acabar a franquia', overagePolicy === 'limit' ? 'limita' : 'oferece pacote'])
  if (rolloverPct) diferencas.push(['Créditos não usados', `${formatPercent(rolloverPct)}% acumulam`])
  if (readjustMonths !== 12 || readjustIndex.trim() !== 'IPCA') diferencas.push(['Reajuste', `${readjustIndex || 'sem índice'} a cada ${readjustMonths ?? '—'} meses`])

  async function buscarCnpj() {
    setBuscando(true)
    try {
      const r = await lookupCnpj(taxId)
      // AD1 — campo a campo: espalhar o retorno punha tradeName/email/phone no
      // `company` e o backend recusava todo "Criar conta" (400).
      const novo = companyFromCnpjLookup(company, r)
      setCompany(novo)
      if (!companyName && (r.tradeName || r.legalName)) setCompanyName(r.tradeName || r.legalName || '')
      const completo = !!(novo.legalName && novo.addressZip && novo.addressStreet && novo.addressNumber && novo.addressDistrict && novo.addressCity && novo.addressState)
      setBuscou(completo ? 'completo' : 'incompleto')
      showToast('Dados da Receita preenchidos. Confira antes de criar.', 'success')
    } catch (e) {
      setBuscou('incompleto')
      showToast(e instanceof Error ? e.message : 'Consulta de CNPJ indisponível — preencha os dados', 'error')
    } finally {
      setBuscando(false)
    }
  }

  async function preencherCep() {
    try {
      const r = await lookupCep(company.addressZip ?? '')
      setCompany((c) => ({ ...c, ...r, addressNumber: c.addressNumber, addressComplement: c.addressComplement }))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Consulta de CEP indisponível', 'error')
    }
  }

  async function criar() {
    if (!passo1Ok || !passo2Ok || !atual?.data) return
    setEnviando(true)
    try {
      const body: ProvisionBody = {
        ...termsBody(),
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminFirstName: adminFirstName.trim(),
        adminLastName: adminLastName.trim() || undefined,
        // Remove vazios e qualquer campo fora do DTO da empresa (AD1).
        company: pickProvisionCompany({
          ...company, documentType: docType, taxId: normalizeTaxId(docType, taxId),
          addressZip: company.addressZip ? onlyDigits(company.addressZip) : undefined,
          addressState: company.addressState?.toUpperCase() || undefined,
        } as Record<string, unknown>),
        frontendUrl: window.location.origin,
      }
      // F14 — mesma chave em retry do MESMO corpo (a rede cai depois de o
      // backend criar a conta → não cria duas); corpo diferente, chave nova.
      const k = JSON.stringify(body)
      if (idem.current?.body !== k) idem.current = { body: k, key: crypto.randomUUID() }
      setResultado(await adminBillingApi.provision(body, idem.current.key))
      onProvisioned?.()
    } catch (e) {
      showToast(apiError(e, 'Não foi possível criar a conta'), 'error')
    } finally {
      setEnviando(false)
    }
  }

  const setC = (k: keyof ProvisionCompany) => (e: React.ChangeEvent<HTMLInputElement>) => setCompany((c) => ({ ...c, [k]: e.target.value }))

  if (resultado) {
    return (
      <Card className="max-w-2xl p-5">
        <CardHeader title="Conta criada" description={`${companyName} · ${plan?.displayName ?? ''}`} />
        <div className="space-y-3">
          <Banner variant="success">Envie o link ao administrador do cliente. Ele vale por 7 dias.</Banner>
          <div className="flex gap-2">
            <Input readOnly value={resultado.activationUrl} className="font-mono text-xs" aria-label="Link de ativação" />
            <Button variant="secondary" leftIcon={<Copy className="w-4 h-4" />} onClick={() => { void navigator.clipboard.writeText(resultado.activationUrl).catch(() => {}); showToast('Link copiado', 'success') }}>Copiar</Button>
          </div>
          <p className="text-xs text-surface-500">
            Primeira fatura: {formatBRL(resultado.summary.firstInvoiceCents)} · Mensal: {formatBRL(resultado.summary.monthlyCents)} · Total do contrato: {formatBRL(resultado.summary.totalContractCents)}
          </p>
          <Button variant="ghost" onClick={() => window.location.assign(window.location.pathname)}>Criar outra conta</Button>
        </div>
      </Card>
    )
  }

  // ── Grade: 12 colunas na largura da coluna do formulário (container query).
  const G = 'grid grid-cols-12 gap-x-4 gap-y-4'
  const metade = 'col-span-12 @xl:col-span-6'
  const terco = 'col-span-12 @xl:col-span-6 @3xl:col-span-4'
  const seloReceita = buscou === 'completo' ? <span className="flex-shrink-0 whitespace-nowrap"><Badge variant="resolved">da Receita</Badge></span> : undefined

  // ── Passo 1 · Cliente ──────────────────────────────────────────────────────
  const passo1 = (
    <Card className="p-5">
      <Secao primeira icone={<Building2 className="w-4 h-4 text-brand-400" />} titulo="Empresa" descricao="Identificação do cliente na plataforma.">
        <div className={G}>
          <div className="col-span-12 @3xl:col-span-7">
            <FormField label="Documento" required error={taxId && !docOk ? `${docType.toUpperCase()} inválido` : undefined}>
              <div className="flex gap-2">
                <Seletor label="Tipo de documento" value={docType} onChange={(v) => { setDocType(v); setTaxId(''); setBuscou('nada') }} options={[{ value: 'cnpj', label: 'CNPJ' }, { value: 'cpf', label: 'CPF' }]} />
                <Input className="flex-1 min-w-0" value={taxId} aria-label={docType === 'cnpj' ? 'CNPJ' : 'CPF'}
                  onChange={(e) => { setTaxId(formatTaxId(docType, e.target.value)); setBuscou('nada') }}
                  placeholder={docType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'} />
                {docType === 'cnpj' && (
                  <Button variant="secondary" loading={buscando} disabled={!docOk} leftIcon={<Search className="w-4 h-4" />} onClick={buscarCnpj} title="Buscar na Receita">Buscar</Button>
                )}
              </div>
            </FormField>
          </div>
          <div className="col-span-12 @3xl:col-span-5">
            <FormField label="Nome da conta" required hint="Como o cliente aparece no Oryon.">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome fantasia" />
            </FormField>
          </div>
        </div>
      </Secao>

      <Secao icone={<MapPin className="w-4 h-4 text-brand-400" />} titulo="Dados da primeira fatura" acao={seloReceita}
        descricao="Saem no PDF da primeira fatura, que nasce antes do primeiro acesso. O cliente confere tudo quando ativar a conta.">
        {buscou === 'incompleto' && docType === 'cnpj' && (
          <Banner variant="warning">A consulta não trouxe todos os dados. Complete a razão social e o endereço.</Banner>
        )}
        <div className={G}>
          <div className="col-span-12 @3xl:col-span-7"><FormField label={docType === 'cnpj' ? 'Razão social' : 'Nome completo'} required><Input value={company.legalName ?? ''} onChange={setC('legalName')} /></FormField></div>
          <div className="col-span-12 @3xl:col-span-5">
            <FormField label="CEP" required>
              <div className="flex gap-2">
                <Input value={formatCep(company.addressZip ?? '')} onChange={(e) => setCompany((c) => ({ ...c, addressZip: e.target.value }))} placeholder="00000-000" aria-label="CEP" />
                <Button variant="secondary" disabled={onlyDigits(company.addressZip).length !== 8} onClick={preencherCep}>Preencher</Button>
              </div>
            </FormField>
          </div>
          <div className="col-span-12 @xl:col-span-8 @3xl:col-span-7"><FormField label="Rua" required><Input value={company.addressStreet ?? ''} onChange={setC('addressStreet')} /></FormField></div>
          <div className="col-span-4 @3xl:col-span-2"><FormField label="Número" required><Input value={company.addressNumber ?? ''} onChange={setC('addressNumber')} /></FormField></div>
          <div className="col-span-8 @xl:col-span-12 @3xl:col-span-3"><FormField label="Complemento"><Input value={company.addressComplement ?? ''} onChange={setC('addressComplement')} /></FormField></div>
          <div className="col-span-12 @xl:col-span-5"><FormField label="Bairro" required><Input value={company.addressDistrict ?? ''} onChange={setC('addressDistrict')} /></FormField></div>
          <div className="col-span-9 @xl:col-span-5"><FormField label="Cidade" required><Input value={company.addressCity ?? ''} onChange={setC('addressCity')} /></FormField></div>
          <div className="col-span-3 @xl:col-span-2"><FormField label="UF" required><Input maxLength={2} value={company.addressState ?? ''} onChange={(e) => setCompany((c) => ({ ...c, addressState: e.target.value.toUpperCase() }))} /></FormField></div>
        </div>
        <div className="rounded-[10px] border border-surface-700">
          <button type="button" onClick={() => setMostrarOpcionais((v) => !v)} aria-expanded={mostrarOpcionais}
            className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--rowhover)] rounded-[10px]">
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-surface-100">Inscrições e financeiro</span>
              <span className="block text-xs text-surface-400">Opcional — inscrições estadual e municipal, e-mail de cobrança e contato do financeiro.</span>
            </span>
            <span className="text-xs text-surface-400 flex-shrink-0">{mostrarOpcionais ? 'Ocultar' : 'Mostrar'}</span>
          </button>
          {mostrarOpcionais && (
            <div className={cn(G, 'px-3.5 pb-3.5 pt-1')}>
              <div className={metade}><FormField label="Inscrição estadual"><Input value={company.stateRegistration ?? ''} onChange={setC('stateRegistration')} /></FormField></div>
              <div className={metade}><FormField label="Inscrição municipal"><Input value={company.municipalRegistration ?? ''} onChange={setC('municipalRegistration')} /></FormField></div>
              <div className={metade}><FormField label="E-mail de cobrança" hint="Em branco: o e-mail do administrador."><Input type="email" value={company.billingEmail ?? ''} onChange={setC('billingEmail')} /></FormField></div>
              <div className={metade}><FormField label="Contato do financeiro"><Input value={company.billingContact ?? ''} onChange={setC('billingContact')} /></FormField></div>
              <div className={metade}><FormField label="Telefone do financeiro"><Input value={company.billingPhone ?? ''} onChange={setC('billingPhone')} /></FormField></div>
            </div>
          )}
        </div>
      </Secao>

      <Secao icone={<UserRound className="w-4 h-4 text-brand-400" />} titulo="Administrador inicial" descricao="Recebe o link de ativação por e-mail e faz o primeiro acesso.">
        <div className={G}>
          <div className={terco}><FormField label="Nome" required><Input value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} /></FormField></div>
          <div className={terco}><FormField label="Sobrenome"><Input value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} /></FormField></div>
          <div className="col-span-12 @3xl:col-span-4"><FormField label="E-mail" required hint="Não pode já estar em uso."><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></FormField></div>
        </div>
      </Secao>
    </Card>
  )

  // ── Passo 2 · Condições ────────────────────────────────────────────────────
  const planosOrdenados = plans.filter((p) => p.active).sort((a, b) => (a.priceMonthlyCents || Infinity) - (b.priceMonthlyCents || Infinity))
  const tabela = plan?.priceMonthlyCents ?? 0
  const passo2 = (
    <Card className="p-5">
      <Secao primeira icone={<Receipt className="w-4 h-4 text-brand-400" />} titulo="Plano" descricao="Plano-modelo do catálogo: define créditos, limites e módulos de partida.">
        <div className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-4 gap-2.5">
          {planosOrdenados.map((p) => (
            <Opcao key={p.tier} ativo={p.tier === planTier} onClick={() => setPlanTier(p.tier)} titulo={p.displayName}
              detalhe={p.priceMonthlyCents ? `${formatBRL(p.priceMonthlyCents)}/mês · ${p.monthlyCredits?.toLocaleString('pt-BR') ?? '∞'} créditos` : 'Preço na Proposta'} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Condição de pagamento" descricao="Só as combinações vendáveis do catálogo.">
        <div className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 gap-2.5">
          {condicoes.map((c) => {
            const n = nomeDaCondicao(c)
            const k = `${c.term}/${c.paymentMode}`
            return <Opcao key={k} ativo={k === `${term}/${paymentMode}`} onClick={() => setComboKey(k)} titulo={n.titulo} detalhe={n.detalhe} />
          })}
        </div>
        <div className={G}>
          <div className={cn('col-span-12', paymentMode === 'installments' ? '@xl:col-span-6' : '@xl:col-span-8')}>
            <FormField label="Forma de pagamento" hint="Cartão entra quando o checkout hospedado estiver no ar.">
              <CampoFixo>{METODO_TEXTO[paymentMode]}</CampoFixo>
            </FormField>
          </div>
          {paymentMode === 'installments' && (
            <div className="col-span-6 @xl:col-span-3"><FormField label="Parcelas" hint={`De 1 a ${meses}`}><NumberField value={parcelas} onChange={setInstallments} min={1} max={meses} /></FormField></div>
          )}
          <div className={cn(paymentMode === 'installments' ? 'col-span-6 @xl:col-span-3' : 'col-span-12 @xl:col-span-4')}>
            <FormField label="Dia de vencimento" hint="De 1 a 28"><NumberField value={billingDay} onChange={setBillingDay} min={1} max={28} /></FormField>
          </div>
        </div>
      </Secao>

      <Secao titulo="Preço" descricao={semPrecoDeTabela ? 'O Enterprise não tem preço de tabela: informe o preço fechado da Proposta.' : 'Use o preço de tabela ou o que foi negociado na Proposta.'}
        acao={<Seletor label="Preço" value={preco} onChange={(v) => { if (!semPrecoDeTabela) setPreco(v) }}
          options={semPrecoDeTabela ? [{ value: 'negociado', label: 'Negociado' }] : [{ value: 'tabela', label: 'Tabela' }, { value: 'negociado', label: 'Negociado' }]} />}>
        {preco === 'tabela' ? (
          <div className="grid grid-cols-1 @xl:grid-cols-3 gap-2.5">
            {[
              ['Tabela do plano', `${formatBRL(tabela)}/mês`],
              ['Desconto da condição', combo?.discountPct ? `${combo.discountPct}%` : 'sem desconto'],
              ['Setup', combo?.setupWaivable ? 'isento nesta condição' : 'o da tabela'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[10px] border border-surface-700 px-3 py-2.5">
                <p className="text-xs text-surface-400">{k}</p>
                <p className="text-[13px] font-medium text-surface-100 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className={G}>
            {!semPrecoDeTabela && (
              <div className="col-span-12 @3xl:col-span-5">
                <FormField label="Como foi negociado"><Seletor label="Como foi negociado" value={negociadoModo} onChange={setNegociadoModo} options={[{ value: 'fechado', label: 'Preço fechado' }, { value: 'desconto', label: 'Desconto' }]} /></FormField>
              </div>
            )}
            <div className={cn('col-span-12 @xl:col-span-6', semPrecoDeTabela ? '@3xl:col-span-6' : '@3xl:col-span-4')}>
              {negociadoModo === 'fechado'
                ? <FormField label="Preço fechado por mês" required error={negociadoFaltando && tocouPreco ? 'Informe o preço fechado (maior que zero)' : undefined}><MoneyInput value={contractedCents} onChange={setContractedCents} onBlur={() => setTocouPreco(true)} /></FormField>
                : <FormField label="Desconto (%)" hint={`Tabela: ${formatBRL(tabela)}/mês. Aceita decimais (7,5).`}><PercentField value={discountPct} onChange={setDiscountPct} /></FormField>}
            </div>
            <div className={cn('col-span-12 @xl:col-span-6', semPrecoDeTabela ? '@3xl:col-span-6' : '@3xl:col-span-3')}>
              <FormField label="Setup" hint={combo?.setupWaivable ? 'Isento nesta condição.' : 'Em branco: o da tabela.'}><MoneyInput value={setupCents} onChange={setSetupCents} disabled={!!combo?.setupWaivable || setupWaived} /></FormField>
            </div>
            {!combo?.setupWaivable && (
              <label className="col-span-12 flex items-center gap-2.5 text-[13px] text-surface-200">
                <Switch checked={setupWaived} onChange={setSetupWaived} aria-label="Isentar setup" />
                Isentar o setup nesta Proposta
              </label>
            )}
          </div>
        )}
      </Secao>

      <Secao icone={<FileSignature className="w-4 h-4 text-brand-400" />} titulo="Proposta Comercial" descricao="A vigência conta a partir da data da Proposta, mesmo antes da ativação (Termos 7.5.2).">
        <div className={G}>
          <div className={metade}><FormField label="Número da Proposta"><Input value={proposalRef} onChange={(e) => setProposalRef(e.target.value)} placeholder="PC-2026-000" /></FormField></div>
          <div className={metade}><FormField label="Início da vigência"><Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></FormField></div>
          <p className="col-span-12 eyebrow">Signatário da Proposta — opcional</p>
          {[
            ['Signatário — nome', sigName, (v: string) => setSigName(v), 'text', terco],
            ['Signatário — CPF', sigDoc, (v: string) => setSigDoc(formatTaxId('cpf', v)), 'text', terco],
            ['Signatário — e-mail', sigEmail, (v: string) => setSigEmail(v), 'email', 'col-span-12 @3xl:col-span-4'],
          ].map(([rot, val, set, tipo, cls]) => (
            <div key={rot as string} className={cls as string}>
              <FormField label={rot as string} error={sigParcial && !(val as string).trim() ? 'Preencha nome, CPF e e-mail do signatário (ou deixe os três em branco)' : undefined}>
                <Input type={tipo as string} value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} />
              </FormField>
            </div>
          ))}
        </div>
      </Secao>
    </Card>
  )

  // ── Passo 3 · Ajustes: tudo editável à vista, agrupado ────────────────────
  const creditosBase = plan?.monthlyCredits ?? null
  const semLimite = (k: EntitlementKeyId) => { setLimits((l) => { const n = { ...l }; delete n[k]; return n }) }
  const passo3 = (
    <Card className="p-5">
      <p className="text-[13px] text-surface-400 mb-5 pb-4 border-b border-surface-700">
        Partindo do <b className="font-medium text-surface-200">{plan?.displayName ?? 'plano'}</b>. Mude só o que a Proposta tiver de diferente — o que mudar fica marcado aqui e no resumo.
      </p>

      <Secao primeira icone={<SlidersHorizontal className="w-4 h-4 text-brand-400" />} titulo="Créditos e franquia">
        <div className={G}>
          <div className={terco}>
            <FormField label={<Rotulo texto="Créditos de IA por mês" alterado={monthlyCredits !== undefined} />} hint={`Plano: ${creditosBase?.toLocaleString('pt-BR') ?? 'ilimitado'}`}>
              <div className="flex gap-2 items-center">
                <NumberField value={monthlyCredits === undefined ? creditosBase : monthlyCredits} onChange={(v) => setMonthlyCredits(v === creditosBase ? undefined : v)} min={0} />
                {monthlyCredits !== undefined && <Button variant="ghost" size="sm" iconOnly aria-label="Voltar ao valor do plano" title="Voltar ao valor do plano" onClick={() => setMonthlyCredits(undefined)}><Undo2 className="w-3.5 h-3.5" /></Button>}
              </div>
            </FormField>
          </div>
          <div className={terco}>
            <FormField label={<Rotulo texto="Créditos não usados (%)" alterado={!!rolloverPct} />} hint="Rollover: só se a Proposta prevê (Termos 7.3.5).">
              <PercentField value={rolloverPct} onChange={setRolloverPct} />
            </FormField>
          </div>
          <div className="col-span-12 @3xl:col-span-4">
            <FormField label={<Rotulo texto="Ao acabar a franquia" alterado={overagePolicy !== 'charge'} />}>
              <Seletor label="Ao acabar a franquia" value={overagePolicy} onChange={setOveragePolicy}
                options={[{ value: 'charge', label: 'Cobrar' }, { value: 'limit', label: 'Limitar' }, { value: 'pack', label: 'Pacote' }]} />
            </FormField>
          </div>
          <div className={terco}><FormField label="Preço do crédito excedente (centavos)" hint="Em branco: preço do plano ÷ franquia."><NumberField value={overagePrice} onChange={setOveragePrice} min={0} /></FormField></div>
          <div className={terco}><FormField label="Bloco mínimo do excedente (créditos)"><NumberField value={overageBlock} onChange={setOverageBlock} min={1} /></FormField></div>
          <div className="col-span-12 @3xl:col-span-4"><FormField label="Teto do excedente (% da franquia)"><PercentField value={overageCeiling} onChange={setOverageCeiling} max={1000} /></FormField></div>
          {paymentMethod === 'pix_invoice' && (
            <label className="col-span-12 flex items-center gap-2.5 text-[13px] text-surface-200">
              <Switch checked={onNextInvoiceShown} onChange={(v) => setOnNextInvoice(v)} aria-label="Excedente entra na fatura Pix seguinte" />
              Excedente entra na fatura Pix seguinte
              {onNextInvoice == null && <span className="text-xs text-surface-500">padrão: {onNextInvoiceShown ? 'sim' : 'não'} ({parcelas}× em {meses} meses)</span>}
            </label>
          )}
        </div>
      </Secao>

      <Secao titulo="Limites" descricao="“Ilimitado”: sem teto nesta conta, mesmo que o plano tenha.">
        <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-4 gap-y-3">
          {ENT_KEYS.map((k) => {
            const base = planoLimite(k)
            const alterado = k in limits
            const valor = alterado ? limits[k] ?? null : base
            const ilimitado = valor === null
            return (
              <div key={k} className={cn('rounded-[10px] border px-3 py-2.5 space-y-2', alterado ? 'border-brand-500/50 bg-brand-500/[0.06]' : 'border-surface-700')}>
                <div className="flex items-center justify-between gap-2 min-h-6">
                  <span className="text-[13px] font-medium text-surface-100 truncate">{ENTITLEMENT_LABELS[k]}</span>
                  {alterado
                    ? <button type="button" className="text-xs text-surface-400 hover:text-surface-100 inline-flex items-center gap-1" onClick={() => semLimite(k)}><Undo2 className="w-3 h-3" />plano: {base ?? 'ilimitado'}</button>
                    : <span className="text-xs text-surface-500">do plano</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <NumberField value={ilimitado ? null : valor} min={0} size="sm"
                      onChange={(v) => { if (v === base) semLimite(k); else setLimits((l) => ({ ...l, [k]: v })) }} />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-surface-400 flex-shrink-0">
                    <Switch checked={ilimitado} aria-label={`${ENTITLEMENT_LABELS[k]} ilimitado`}
                      onChange={(on) => { const alvo = on ? null : (base ?? 0); if (alvo === base) semLimite(k); else setLimits((l) => ({ ...l, [k]: alvo })) }} />
                    Ilimitado
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      </Secao>

      <Secao titulo="Módulos" descricao="Módulo fora do contrato some do menu do cliente."
        acao={Object.keys(modules).length > 0 ? <Button variant="ghost" size="sm" leftIcon={<Undo2 className="w-3.5 h-3.5" />} onClick={() => setModules({})}>Desfazer</Button> : undefined}>
        <div className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-4 gap-2.5">
          {PLAN_MODULES.map((m) => {
            const base = isModuleOn(plan?.features?.modules, m)
            const ligado = modules[m] ?? base
            return (
              <label key={m} className={cn('flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] cursor-pointer', m in modules ? 'border-brand-500/50 bg-brand-500/[0.06]' : 'border-surface-700', ligado ? 'text-surface-100' : 'text-surface-400')}>
                <Switch checked={ligado} onChange={(v) => setModules((s) => { const n = { ...s }; if (v === base) delete n[m]; else n[m] = v; return n })} aria-label={PLAN_MODULE_LABEL[m]} />
                <span className="truncate">{PLAN_MODULE_LABEL[m]}</span>
              </label>
            )
          })}
        </div>
      </Secao>

      <Secao titulo="Reajuste" descricao="Índice e período de reajuste do contrato.">
        <div className={G}>
          <div className={terco}><FormField label={<Rotulo texto="Índice" alterado={readjustIndex.trim() !== 'IPCA'} />}><Input value={readjustIndex} onChange={(e) => setReadjustIndex(e.target.value)} /></FormField></div>
          <div className={terco}><FormField label={<Rotulo texto="A cada (meses)" alterado={readjustMonths !== 12} />}><NumberField value={readjustMonths} onChange={setReadjustMonths} min={1} max={60} /></FormField></div>
        </div>
      </Secao>
    </Card>
  )

  // ── Passo 4 · Revisar (um cartão, Cliente | Condições lado a lado) ─────────
  const editar = (n: number) => <Button variant="ghost" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => irPara(n)}>Editar</Button>
  const passo4 = (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-x-8">
          <Secao primeira titulo="Cliente" acao={editar(1)}>
            <ListaRevisao linhas={[
              ['Conta', companyName], [docType.toUpperCase(), taxId], ['Razão social', company.legalName],
              ['Endereço', company.addressCity ? `${[company.addressStreet, company.addressNumber].filter(Boolean).join(', ')} · ${company.addressCity}/${company.addressState}` : ''],
              ['Administrador', `${adminFirstName} ${adminLastName}`.trim()], ['E-mail', adminEmail],
            ]} />
          </Secao>
          <div className="@3xl:[&>section]:mt-0 @3xl:[&>section]:pt-0 @3xl:[&>section]:border-t-0 @3xl:border-l @3xl:border-surface-700 @3xl:pl-8">
            <Secao titulo="Condições" acao={editar(2)}>
              <ListaRevisao linhas={[
                ['Plano', plan?.displayName], ['Condição', combo ? nomeDaCondicao(combo).titulo : ''],
                ['Pagamento', paymentMode === 'installments' ? `${METODO_TEXTO[paymentMode]} · ${parcelas}×` : METODO_TEXTO[paymentMode]],
                ['Vencimento', billingDay ? `dia ${billingDay}` : ''],
                ['Proposta', proposalRef], ['Início da vigência', startsAt.split('-').reverse().join('/')],
              ]} />
            </Secao>
          </div>
        </div>
        <Secao titulo="Ajustes" acao={editar(3)}>
          <ListaRevisao linhas={diferencas.length ? diferencas : [['Sem ajustes', 'igual ao plano-modelo']]} />
        </Secao>
      </Card>
      <Banner variant="info">Ao criar, a conta nasce com o contrato pendente e o administrador recebe o link de ativação por e-mail. As faturas correm a partir do início da vigência.</Banner>
    </div>
  )

  // ── Painel: acompanhamento + resumo num cartão só ─────────────────────────
  const estadoDoPasso = (n: number): 'feito' | 'atual' | 'pendente' => (n === passo ? 'atual' : n < passo ? 'feito' : 'pendente')
  const podeIr = (n: number) => n <= passo || (n === 2 && passo1Ok) || (n >= 3 && passo1Ok && passo2Ok)
  const faltasDoPasso = passo === 1 ? faltas1 : passo === 2 ? faltas2 : []

  const painel = (
    <Card noPadding>
      <ol className="p-1.5 border-b border-surface-700" aria-label="Passos do cadastro">
        {PASSOS.map((titulo, i) => {
          const n = i + 1
          const est = estadoDoPasso(n)
          const ok = podeIr(n)
          return (
            <li key={titulo}>
              <button type="button" disabled={!ok} onClick={() => irPara(n)} aria-current={est === 'atual' ? 'step' : undefined}
                className={cn('w-full flex items-start gap-2.5 rounded-[6px] px-2 py-1.5 text-left transition-colors',
                  est === 'atual' ? 'bg-[var(--sf2)]' : ok ? 'hover:bg-[var(--rowhover)]' : 'cursor-default')}>
                <span className={cn('mt-px w-[18px] h-[18px] rounded-full flex items-center justify-center text-2xs font-semibold flex-shrink-0',
                  est === 'feito' && 'bg-accent-soft text-accent-dark',
                  est === 'atual' && 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]',
                  est === 'pendente' && 'border border-[var(--bd2)] text-surface-400')}>
                  {est === 'feito' ? <Check className="w-2.5 h-2.5" strokeWidth={3} /> : n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('flex items-baseline justify-between gap-2 text-[13px] font-medium', est === 'pendente' ? 'text-surface-400' : 'text-surface-100')}>
                    <span>{titulo}</span>
                    {n === 3 && <span className="text-xs font-normal text-surface-500">{diferencas.length ? `${diferencas.length} ajuste(s)` : 'opcional'}</span>}
                  </span>
                  {est === 'atual' && faltasDoPasso.length > 0 && <span className="block text-xs text-surface-400 mt-0.5">Falta: {faltasDoPasso.join(', ')}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-surface-100">Resumo</p>
            <p className="text-xs text-surface-400 truncate">{plan && combo ? `${plan.displayName} · ${nomeDaCondicao(combo).titulo}` : 'Escolha o plano e a condição'}</p>
          </div>
          {recalculando && <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin text-surface-500" aria-label="Recalculando" />}
        </div>
        {atual?.error && <Banner variant="danger" className="mb-3">{atual.error}</Banner>}
        {negociadoFaltando
          ? <p className="text-xs text-surface-400">Informe o preço fechado para calcular.</p>
          : exibido ? (
            <dl className={cn('space-y-1.5 text-[13px] transition-opacity', recalculando && 'opacity-60')}>
              <Linha k="Mensal" v={formatBRL(exibido.summary.monthlyCents)} forte />
              <Linha k={paymentMode === 'upfront' ? 'Pagamento' : 'Parcelas'} v={paymentMode === 'upfront' ? `à vista ${formatBRL(exibido.summary.installmentCents)}` : `${exibido.summary.installments}× ${formatBRL(exibido.summary.installmentCents)}`} />
              <Linha k="Setup" v={exibido.summary.setupCents ? formatBRL(exibido.summary.setupCents) : 'isento'} />
              <Linha k="1ª fatura" v={formatBRL(exibido.summary.firstInvoiceCents)} />
              <div className="pt-1.5 border-t border-surface-700"><Linha k="Total do contrato" v={formatBRL(exibido.summary.totalContractCents)} /></div>
            </dl>
          ) : !atual?.error && <p className="text-xs text-surface-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Calculando…</p>}

        {diferencas.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-surface-700 space-y-1">
            <p className="eyebrow">Diferente do plano-modelo</p>
            {diferencas.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-xs">
                <span className="text-surface-400 truncate">{k}</span>
                <span className="text-[var(--color-warning)] text-right">{v}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3.5 flex gap-2">
          {passo > 1 && <Button variant="secondary" iconOnly aria-label="Voltar" title="Voltar" onClick={() => irPara(passo - 1)}><ArrowLeft className="w-4 h-4" /></Button>}
          {passo < 4
            ? <Button className="flex-1" disabled={faltasDoPasso.length > 0} rightIcon={<ArrowRight className="w-4 h-4" />} onClick={() => irPara(passo + 1)}>{passo === 3 ? 'Revisar' : 'Continuar'}</Button>
            : <Button className="flex-1" loading={enviando} disabled={!passo1Ok || !passo2Ok || !atual?.data} leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={criar}>Criar conta e gerar link</Button>}
        </div>
      </div>
    </Card>
  )

  return (
    <div ref={raiz} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_264px] lg:grid-cols-[minmax(0,1fr)_288px] gap-4 items-start pb-8">
      <div className="@container min-w-0 space-y-3">
        {/* No celular o painel vai para baixo: aqui fica uma linha de contexto. */}
        <p className="md:hidden eyebrow">Passo {passo} de 4 · {PASSOS[passo - 1]}</p>
        {passo === 1 ? passo1 : passo === 2 ? passo2 : passo === 3 ? passo3 : passo4}
      </div>
      <div className="md:sticky md:top-0">{painel}</div>
    </div>
  )
}
