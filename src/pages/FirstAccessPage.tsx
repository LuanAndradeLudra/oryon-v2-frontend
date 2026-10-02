// ─── /first-access — primeiro acesso do cliente (SCRUM-1212) ──────────────────
// Depois de definir a senha (/activate), o dono da conta passa por:
//   1. aceite dos Termos de Uso e da Política de Privacidade;
//   2. confirmação dos dados da empresa (pré-preenchidos pelo operador);
//   3. concluir → POST /first-access/complete ativa o contrato.
// A lista de etapas é um array para a próxima etapa (checkout do cartão no
// gateway) entrar como mais um item sem reescrever a tela.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, FileText, Building2, Loader2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { FiscalDataForm, validateFiscal, type FiscalErrors } from '@/components/billing/FiscalDataForm'
import { ErrorState } from '@/components/ui/ErrorState'
import { firstAccessApi, EMPTY_FISCAL, pickFiscal, type FiscalData, type FirstAccessStatus } from '@/services/firstAccessApi'
import { termsApi, DOCUMENT_LABEL, type TermsDocument } from '@/services/termsApi'
import { getApiErrorMessage, cn } from '@/lib/utils'
import { formatCep, formatTaxId } from '@/lib/brDocuments'
import { invalidateFirstAccessStatus } from '@/lib/firstAccessGate'

type StepId = 'terms' | 'company' | 'finish'

const STEPS: Array<{ id: StepId; label: string; icon: typeof FileText }> = [
  { id: 'terms', label: 'Termos', icon: FileText },
  { id: 'company', label: 'Dados da empresa', icon: Building2 },
  { id: 'finish', label: 'Concluir', icon: Rocket },
]

export function FirstAccessPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<FirstAccessStatus | null>(null)
  const [step, setStep] = useState<StepId>('terms')
  const [agreed, setAgreed] = useState(false)
  const [fiscal, setFiscal] = useState<FiscalData>(EMPTY_FISCAL)
  const [errors, setErrors] = useState<FiscalErrors>({})
  const [busy, setBusy] = useState(false)
  // A20: dados já preenchidos (operador) aparecem como resumo para o dono
  // confirmar; "Corrigir" abre o formulário.
  const [editingCompany, setEditingCompany] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // CL3 — estado da carga dos dados fiscais. Sem os dados carregados não há
  // resumo, "Está correto" nem formulário: confirmar o que o dono não viu
  // fere a A20, e o formulário vazio apagaria os opcionais no PUT.
  const [fiscalLoad, setFiscalLoad] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const [fiscalKey, setFiscalKey] = useState(0)

  useEffect(() => {
    firstAccessApi.status()
      .then((s) => {
        if (!s.required) {
          // CL2 — o portão pode ter em cache "precisa"; sem invalidar, /home
          // devolve para cá e a tela pula entre as duas rotas sem parar.
          invalidateFirstAccessStatus()
          navigate('/home', { replace: true })
          return
        }
        setStatus(s)
        setStep(!s.steps.terms.done ? 'terms' : !s.steps.company.done ? 'company' : 'finish')
      })
      .catch(() => setError('Não foi possível carregar o primeiro acesso. Recarregue a página.'))
  }, [navigate])

  useEffect(() => {
    let alive = true
    setFiscalLoad('loading')
    firstAccessApi.getFiscal()
      .then((r) => {
        if (!alive) return
        // Só os campos do formulário (a resposta traz também complete/confirmedAt — CL1).
        setFiscal(pickFiscal(r))
        setFiscalLoad('loaded')
      })
      .catch(() => { if (alive) setFiscalLoad('failed') })
    return () => { alive = false }
  }, [fiscalKey])

  async function acceptTerms() {
    if (!status) return
    setBusy(true); setError(null)
    try {
      for (const v of status.steps.terms.pending) await termsApi.accept(v.id)
      setStatus({ ...status, steps: { ...status.steps, terms: { done: true, pending: [] } } })
      setStep(status.steps.company.done ? 'finish' : 'company')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível registrar o aceite.'))
    } finally { setBusy(false) }
  }

  async function saveCompany() {
    if (fiscalLoad !== 'loaded') return // CL3
    const errs = validateFiscal(fiscal)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setBusy(true); setError(null)
    try {
      await firstAccessApi.saveFiscal(fiscal)
      if (status) setStatus({ ...status, steps: { ...status.steps, company: { done: true, complete: true } } })
      setStep('finish')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível salvar os dados da empresa.'))
    } finally { setBusy(false) }
  }

  async function confirmCompany() {
    if (fiscalLoad !== 'loaded') return // CL3 — nunca confirmar dados que o dono não viu (A20)
    setBusy(true); setError(null)
    try {
      await firstAccessApi.confirmFiscal()
      if (status) setStatus({ ...status, steps: { ...status.steps, company: { done: true, complete: true } } })
      setStep('finish')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível confirmar os dados da empresa.'))
    } finally { setBusy(false) }
  }

  async function finish() {
    setBusy(true); setError(null)
    try {
      await firstAccessApi.complete()
      invalidateFirstAccessStatus()
      navigate('/home', { replace: true })
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível concluir o primeiro acesso.'))
    } finally { setBusy(false) }
  }

  if (!status && !error) {
    return <div className="min-h-screen flex items-center justify-center bg-surface-950"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
  }

  const doneOf = (id: StepId) =>
    id === 'terms' ? !!status?.steps.terms.done : id === 'company' ? !!status?.steps.company.done : false

  return (
    <div className="h-full min-h-0 bg-surface-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <img src="/oryon-logo.svg" alt="Oryon" className="w-10 h-10" draggable={false} />
          <div>
            <h1 className="text-xl font-bold text-surface-50">Bem-vindo ao Oryon</h1>
            <p className="text-sm text-surface-400">Faltam poucos passos para liberar a sua conta.</p>
          </div>
        </div>

        <ol className="flex items-center gap-2 mb-8" aria-label="Etapas do primeiro acesso">
          <li className="flex items-center gap-2 text-xs text-status-active"><CheckCircle2 className="w-4 h-4" />Senha</li>
          {STEPS.map((s) => {
            const Icon = doneOf(s.id) ? CheckCircle2 : s.icon
            return (
              <li key={s.id} className={cn('flex items-center gap-2 text-xs', step === s.id ? 'text-surface-50 font-semibold' : doneOf(s.id) ? 'text-status-active' : 'text-surface-500')}>
                <span className="text-surface-700">›</span><Icon className="w-4 h-4" />{s.label}
              </li>
            )
          })}
        </ol>

        {error && <Banner variant="danger" className="mb-5">{error}</Banner>}

        {step === 'terms' && status && (
          <section className="rounded-2xl border border-surface-800 bg-surface-900/40 p-6 space-y-4">
            <h2 className="text-base font-semibold text-surface-100">Termos de Uso e Política de Privacidade</h2>
            <p className="text-sm text-surface-400">Leia os documentos vigentes. O aceite fica registrado com data, IP e a versão aceita.</p>
            {(status.steps.terms.unpublished?.length ?? 0) > 0 && (
              <Banner variant="warning">
                Os Termos de Uso da Oryon ainda não estão disponíveis para aceite. Fale com a equipe Oryon para concluir a ativação.
              </Banner>
            )}
            <ul className="space-y-2">
              {status.steps.terms.pending.map((v) => (
                <li key={v.id} className="flex items-center justify-between rounded-xl bg-surface-800/60 border border-surface-700/60 px-4 py-3">
                  <span className="text-sm text-surface-200">{DOCUMENT_LABEL[v.document as TermsDocument] ?? v.document} <span className="text-surface-500 text-xs">versão {v.version}</span></span>
                  {v.contentUrl && <a href={v.contentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 underline">Ler</a>}
                </li>
              ))}
              {status.steps.terms.pending.length === 0 && <li className="text-sm text-surface-400">Nenhum documento pendente.</li>}
            </ul>
            <label className="flex items-start gap-2 text-sm text-surface-300">
              <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              Li e aceito os Termos de Uso e a Política de Privacidade.
            </label>
            <div className="flex justify-end">
              <Button onClick={acceptTerms} loading={busy} disabled={!agreed || (status.steps.terms.unpublished?.length ?? 0) > 0}>Aceitar e continuar</Button>
            </div>
          </section>
        )}

        {step === 'company' && (
          <section className="rounded-2xl border border-surface-800 bg-surface-900/40 p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-surface-100">Dados da empresa</h2>
              <p className="text-sm text-surface-400">Confirme os dados usados nas faturas e na nota fiscal. Complete o que faltar.</p>
            </div>
            {fiscalLoad === 'failed' ? (
              <ErrorState
                compact
                title="Não foi possível carregar os dados da empresa"
                retryLabel="Tentar de novo"
                onRetry={() => setFiscalKey((k) => k + 1)}
              />
            ) : fiscalLoad === 'loading' ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-brand-400" aria-label="Carregando dados da empresa" /></div>
            ) : status?.steps.company.complete && !editingCompany ? (
              <>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-surface-800 bg-surface-900/60 p-4 text-sm">
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-surface-500">{fiscal.documentType === 'cpf' ? 'Nome completo' : 'Razão social'}</dt>
                    <dd className="text-surface-100">{fiscal.legalName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-surface-500">{fiscal.documentType === 'cpf' ? 'CPF' : 'CNPJ'}</dt>
                    <dd className="text-surface-100 tabular-nums">{fiscal.taxId ? formatTaxId(fiscal.documentType ?? 'cnpj', fiscal.taxId) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-surface-500">E-mail que recebe as faturas</dt>
                    <dd className="text-surface-100 break-all">{fiscal.billingEmail || '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-surface-500">Endereço</dt>
                    <dd className="text-surface-100">
                      {[fiscal.addressStreet, fiscal.addressNumber, fiscal.addressComplement].filter(Boolean).join(', ')}
                      {fiscal.addressDistrict ? ` — ${fiscal.addressDistrict}` : ''}
                      {fiscal.addressCity ? ` — ${fiscal.addressCity}/${fiscal.addressState ?? ''}` : ''}
                      {fiscal.addressZip ? ` — CEP ${formatCep(fiscal.addressZip)}` : ''}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-surface-500">As faturas e os avisos de cobrança vão para o e-mail acima (Termos 25.5). Confira antes de continuar.</p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditingCompany(true)} disabled={busy}>Corrigir</Button>
                  <Button onClick={confirmCompany} loading={busy}>Está correto</Button>
                </div>
              </>
            ) : (
              <>
                <FiscalDataForm value={fiscal} onChange={setFiscal} errors={errors} />
                <div className="flex justify-end">
                  <Button onClick={saveCompany} loading={busy}>Salvar e continuar</Button>
                </div>
              </>
            )}
          </section>
        )}

        {step === 'finish' && (
          <section className="rounded-2xl border border-brand-500/30 bg-brand-950/20 p-6 space-y-4 text-center">
            <Rocket className="w-8 h-8 text-brand-400 mx-auto" />
            <h2 className="text-base font-semibold text-surface-100">Tudo pronto</h2>
            <p className="text-sm text-surface-400">Ao entrar, a sua conta é ativada e você já pode configurar a plataforma.</p>
            <Button onClick={finish} loading={busy}>Entrar na plataforma</Button>
          </section>
        )}
      </div>
    </div>
  )
}
