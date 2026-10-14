// ─── /first-access — primeiro acesso do cliente (SCRUM-1212) ──────────────────
// Depois de definir a senha (/activate), o dono da conta passa por:
//   1. aceite dos Termos de Uso e da Política de Privacidade;
//   2. confirmação dos dados da empresa (pré-preenchidos pelo operador);
//   3. concluir → POST /first-access/complete ativa o contrato.
// A lista de etapas é um array para a próxima etapa (checkout do cartão no
// gateway) entrar como mais um item sem reescrever a tela.
//
// Apresentação (SCRUM-1200, 13/10, PO), no padrão da Nova conta do console:
//   - marca + título no topo, lateral com o progresso, as etapas e a conta;
//   - termos: o TEXTO aberto num leitor embutido (LeitorDeDocumentos) e o
//     aceite logo abaixo, por checkbox;
//   - dados da empresa: resumo em grade para conferir e formulário agrupado;
//   - conclusão: o que vem depois de entrar;
//   - sempre no tema escuro, como a landing e as telas de acesso;
//   - a etapa desliza na direção do avanço; nada se move com "reduzir movimento".
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, CheckCircle2, Loader2, Lock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { ErrorState } from '@/components/ui/ErrorState'
import { OryonLogo } from '@/components/brand/OryonLogo'
import { FiscalDataForm, validateFiscal, type FiscalErrors } from '@/components/billing/FiscalDataForm'
import { LeitorDeDocumentos, paraDocumentos } from '@/components/terms/LeitorDeDocumentos'
import { firstAccessApi, EMPTY_FISCAL, pickFiscal, type FiscalData, type FirstAccessStatus } from '@/services/firstAccessApi'
import { termsApi } from '@/services/termsApi'
import { useAuth } from '@/contexts/AuthContext'
import { useSomenteEscuro } from '@/hooks/useSomenteEscuro'
import { getApiErrorMessage, cn } from '@/lib/utils'
import { formatCep, formatTaxId } from '@/lib/brDocuments'
import { invalidateFirstAccessStatus } from '@/lib/firstAccessGate'

type StepId = 'password' | 'terms' | 'company' | 'finish'

const STEPS: Array<{ id: StepId; label: string; descricao: string }> = [
  { id: 'password', label: 'Senha', descricao: 'Definida na ativação' },
  { id: 'terms', label: 'Termos', descricao: 'Termos de Uso e Privacidade' },
  { id: 'company', label: 'Dados da empresa', descricao: 'Para as faturas e a nota' },
  { id: 'finish', label: 'Concluir', descricao: 'Ativar a conta' },
]

function Item({ k, v, largo }: { k: string; v: ReactNode; largo?: boolean }) {
  return (
    <div className={cn('min-w-0', largo && 'sm:col-span-2')}>
      <dt className="text-xs text-surface-400">{k}</dt>
      <dd className="text-[13px] text-surface-100 mt-0.5 break-words">{v || '—'}</dd>
    </div>
  )
}

export function FirstAccessPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Só escuro, como a landing e o login (porta de entrada, sem alternância).
  useSomenteEscuro()
  const semMovimento = useReducedMotion()
  const [status, setStatus] = useState<FirstAccessStatus | null>(null)
  const [step, setStep] = useState<StepId>('terms')
  const [agreed, setAgreed] = useState(false)
  // Leitura exigida (PO 13/10, opção 1): só no primeiro acesso, o momento
  // contratual; o re-aceite segue livre.
  const [lidos, setLidos] = useState<string[]>([])
  const [docAtivo, setDocAtivo] = useState<string | undefined>(undefined)
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

  // Direção da transição: +1 avança, -1 volta (o "Corrigir" não troca de etapa).
  const indice = STEPS.findIndex((s) => s.id === step)
  const anterior = useRef(indice)
  const direcao = indice >= anterior.current ? 1 : -1
  useEffect(() => { anterior.current = indice }, [indice])

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
      // O aceite só libera depois da leitura até o fim: registra isso junto.
      for (const v of status.steps.terms.pending) await termsApi.accept(v.id, { readToEnd: true })
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

  const feito = (id: StepId) =>
    id === 'password' ? true : id === 'terms' ? !!status?.steps.terms.done : id === 'company' ? !!status?.steps.company.done : false
  const semTermos = (status?.steps.terms.unpublished?.length ?? 0) > 0
  const documentos = paraDocumentos(status?.steps.terms.pending ?? [])
  // Resumo para conferir (A20) quando já está completo; senão, o formulário.
  const resumo = !!status?.steps.company.complete && !editingCompany
  const concluidos = STEPS.filter((s) => feito(s.id)).length
  const t = semMovimento ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }

  // ── Conteúdo de cada etapa ─────────────────────────────────────────────────
  // Termos (PO 13/10): o texto ocupa a altura que sobra da tela; o aceite fica
  // no rodapé, ao lado do botão (marca e clica sem mover o olho); o registro do
  // aceite vai no subtítulo; "lido até o fim" já aparece no ✓ da aba e na barra.
  const faltam = documentos.filter((d) => !lidos.includes(d.id))
  const leuTudo = faltam.length === 0
  const termos = status && (
    <>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-surface-50">Termos de Uso e Política de Privacidade</h2>
        <p className="text-[13px] text-surface-400 mt-1">Valem para toda a equipe da empresa. O aceite fica registrado com data, hora, IP e versão.</p>
      </header>
      {semTermos ? (
        <Banner variant="warning">Os documentos ainda não estão disponíveis para aceite. Fale com a equipe Oryon para concluir a ativação.</Banner>
      ) : (
        <LeitorDeDocumentos documentos={documentos} onLidos={setLidos} ativo={docAtivo} onAtivo={setDocAtivo}
          altura="h-[clamp(260px,calc(100dvh-340px),720px)]" />
      )}
      <footer className="mt-4 pt-4 border-t border-surface-700 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {!semTermos ? (
          <div className="min-w-0">
            <label className={cn('flex items-center gap-2.5 min-w-0', leuTudo ? 'cursor-pointer' : 'cursor-not-allowed')}>
              <Checkbox checked={agreed} disabled={!leuTudo} aria-describedby={leuTudo ? undefined : 'falta-ler'}
                onChange={(e) => setAgreed(e.target.checked)} />
              <span className={cn('text-[13px] font-medium transition-colors', leuTudo ? 'text-surface-100' : 'text-surface-400')}>
                Li e aceito os Termos de Uso e a Política de Privacidade
              </span>
            </label>
            {/* Diz o que falta e leva até lá; some quando tudo foi lido. */}
            <p id="falta-ler" aria-live="polite" className={cn('text-xs text-surface-500 pl-[26px] mt-1', leuTudo && 'sr-only')}>
              {leuTudo ? 'Documentos lidos. Já pode aceitar.' : (
                <>
                  Role até o fim para liberar o aceite. Falta ler:{' '}
                  {faltam.map((d, k) => (
                    <span key={d.id}>
                      {k > 0 && (k === faltam.length - 1 ? ' e ' : ', ')}
                      <button type="button" onClick={() => setDocAtivo(d.id)}
                        className="text-surface-300 underline underline-offset-2 hover:text-surface-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-sm">
                        {d.titulo}
                      </button>
                    </span>
                  ))}
                  .
                </>
              )}
            </p>
          </div>
        ) : <span />}
        <Button onClick={acceptTerms} loading={busy} disabled={!agreed || !leuTudo || semTermos}>Aceitar e continuar</Button>
      </footer>
    </>
  )

  const empresa = (
    <>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-surface-50">Dados da empresa</h2>
          <p className="text-[13px] text-surface-400 mt-1">
            {!resumo ? 'Complete ou corrija os dados usados nas faturas e na nota fiscal.' : 'A equipe Oryon já preencheu estes dados. Confira antes de continuar.'}
          </p>
        </div>
        {resumo && fiscalLoad === 'loaded' && (
          <Button variant="ghost" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditingCompany(true)} disabled={busy}>Corrigir</Button>
        )}
      </header>
      {fiscalLoad === 'failed' ? (
        <ErrorState compact title="Não foi possível carregar os dados da empresa" retryLabel="Tentar de novo" onRetry={() => setFiscalKey((k) => k + 1)} />
      ) : fiscalLoad === 'loading' ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-400" aria-label="Carregando dados da empresa" /></div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {resumo ? (
            <motion.div key="resumo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 rounded-[10px] border border-surface-700 p-4">
                <Item largo k={fiscal.documentType === 'cpf' ? 'Nome completo' : 'Razão social'} v={fiscal.legalName} />
                <Item k={fiscal.documentType === 'cpf' ? 'CPF' : 'CNPJ'} v={fiscal.taxId ? formatTaxId(fiscal.documentType ?? 'cnpj', fiscal.taxId) : ''} />
                <Item k="Inscrição municipal" v={fiscal.municipalRegistration} />
                <Item largo k="Endereço" v={[
                  [fiscal.addressStreet, fiscal.addressNumber, fiscal.addressComplement].filter(Boolean).join(', '),
                  fiscal.addressDistrict, fiscal.addressCity ? `${fiscal.addressCity}/${fiscal.addressState ?? ''}` : '',
                  fiscal.addressZip ? `CEP ${formatCep(fiscal.addressZip)}` : '',
                ].filter(Boolean).join(' · ')} />
                <Item k="E-mail que recebe as faturas" v={fiscal.billingEmail} />
                <Item k="Contato do financeiro" v={[fiscal.billingContact, fiscal.billingPhone].filter(Boolean).join(' · ')} />
              </dl>
              <Banner variant="info" className="mt-4">As faturas e os avisos de cobrança vão para o e-mail acima (Termos 25.5).</Banner>
              <footer className="mt-5 pt-4 border-t border-surface-700 flex justify-end">
                <Button onClick={confirmCompany} loading={busy} leftIcon={<Check className="w-4 h-4" />}>Está correto, continuar</Button>
              </footer>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={t}>
              <FiscalDataForm value={fiscal} onChange={setFiscal} errors={errors} />
              <footer className="mt-5 pt-4 border-t border-surface-700 flex justify-end gap-2">
                {status?.steps.company.complete && <Button variant="ghost" onClick={() => setEditingCompany(false)} disabled={busy}>Cancelar</Button>}
                <Button onClick={saveCompany} loading={busy}>Salvar e continuar</Button>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  )

  const concluir = (
    <div className="py-6 text-center max-w-md mx-auto">
      <motion.span
        initial={semMovimento ? false : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
        className="relative mx-auto w-14 h-14 rounded-full bg-brand-500/12 flex items-center justify-center"
      >
        {!semMovimento && (
          <motion.span className="absolute inset-0 rounded-full border border-brand-500/40"
            initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.1, delay: 0.25 }} />
        )}
        <CheckCircle2 className="w-7 h-7 text-brand-500" />
      </motion.span>
      <h2 className="text-base font-semibold text-surface-50 mt-4">Tudo pronto{user?.firstName ? `, ${user.firstName}` : ''}</h2>
      <p className="text-[13px] text-surface-400 mt-1">Ao entrar, a sua conta é ativada. Em seguida vem a configuração inicial:</p>
      <ol className="mt-5 space-y-2 text-left">
        {['Conectar o número de WhatsApp da empresa', 'Definir quem responde: agente de IA, equipe ou os dois'].map((txt, i) => (
          <motion.li key={txt}
            initial={semMovimento ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={semMovimento ? { duration: 0 } : { delay: 0.3 + i * 0.08, duration: 0.22 }}
            className="flex items-center gap-3 rounded-[10px] border border-surface-700 px-3.5 py-2.5 text-[13px] text-surface-200">
            <span className="w-5 h-5 rounded-full border border-[var(--bd2)] text-2xs font-semibold text-surface-300 flex items-center justify-center flex-shrink-0">{i + 1}</span>
            {txt}
          </motion.li>
        ))}
      </ol>
      <Button className="mt-6" onClick={finish} loading={busy}>Entrar na plataforma</Button>
    </div>
  )

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-surface-950 bg-[radial-gradient(70%_45%_at_50%_0%,color-mix(in_srgb,var(--color-brand-500)_9%,transparent),transparent)]">
      <div className="max-w-5xl mx-auto px-5 py-5">
        {/* Topo: marca + título da página na mesma linha, para os blocos subirem. */}
        <header className="flex items-center gap-4 mb-5">
          {/* Proporção do kit da marca (a mesma da landing: símbolo 26 : palavra 22). */}
          <div className="flex items-start gap-2.5 flex-shrink-0">
            <OryonLogo variant="symbol" decorativa className="h-7 select-none" />
            <OryonLogo variant="wordmark" className="mt-[5px] h-6 max-sm:hidden" />
          </div>
          <span className="w-px h-8 bg-surface-700 flex-shrink-0" aria-hidden />
          <motion.div className="min-w-0 flex-1" initial={semMovimento ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={t}>
            <p className="eyebrow">Primeiro acesso</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1 key={step === 'finish' ? 'pronto' : 'passos'}
                initial={semMovimento ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={semMovimento ? undefined : { opacity: 0, y: -4 }} transition={t}
                className="text-base font-semibold text-surface-50 mt-0.5 truncate">
                Olá{user?.firstName ? `, ${user.firstName}` : ''}. {step === 'finish' ? 'Sua conta está pronta para ser ativada.' : 'Faltam poucos passos para liberar a sua conta.'}
              </motion.h1>
            </AnimatePresence>
          </motion.div>
          <span className="text-xs text-surface-400 inline-flex items-center gap-1.5 flex-shrink-0 max-md:hidden"><Lock className="w-3.5 h-3.5" />Conexão segura</span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
          <Card noPadding className="md:sticky md:top-0 overflow-hidden">
            <div className="px-4 pt-3.5 pb-3 border-b border-surface-700">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-surface-400">Progresso</span>
                <span className="text-xs text-surface-300 tabular-nums">{concluidos} de {STEPS.length}</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-surface-700 overflow-hidden">
                <motion.div className="h-full bg-brand-500 rounded-full" initial={false}
                  animate={{ width: `${(concluidos / STEPS.length) * 100}%` }} transition={semMovimento ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }} />
              </div>
            </div>
            <ol className="p-1.5" aria-label="Etapas do primeiro acesso">
              {STEPS.map((s, i) => {
                const atual = s.id === step
                const ok = feito(s.id) && !atual
                return (
                  <li key={s.id} aria-current={atual ? 'step' : undefined} className="relative flex items-start gap-2.5 rounded-[6px] px-2.5 py-2">
                    {atual && <motion.span layoutId="passo-atual" className="absolute inset-0 rounded-[6px] bg-[var(--sf2)]" transition={semMovimento ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }} />}
                    <span className={cn('relative mt-px w-[18px] h-[18px] rounded-full flex items-center justify-center text-2xs font-semibold flex-shrink-0 transition-colors duration-300',
                      ok && 'bg-accent-soft text-accent-dark',
                      atual && 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]',
                      !ok && !atual && 'border border-[var(--bd2)] text-surface-400')}>
                      {ok
                        ? <motion.span initial={semMovimento ? false : { scale: 0.3 }} animate={{ scale: 1 }}><Check className="w-2.5 h-2.5" strokeWidth={3} /></motion.span>
                        : i + 1}
                    </span>
                    <span className="relative min-w-0">
                      <span className={cn('block text-[13px] font-medium transition-colors duration-300', ok || atual ? 'text-surface-100' : 'text-surface-400')}>{s.label}</span>
                      <span className="block text-xs text-surface-500">{s.descricao}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
            {fiscal.legalName && (
              <div className="px-4 py-3 border-t border-surface-700">
                <p className="text-xs text-surface-400">Conta</p>
                <p className="text-[13px] text-surface-100 truncate mt-0.5" title={fiscal.legalName}>{fiscal.legalName}</p>
                {user?.email && <p className="text-xs text-surface-500 truncate">{user.email}</p>}
              </div>
            )}
          </Card>

          <div className="min-w-0 space-y-4">
            <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Banner variant="danger">{error}</Banner></motion.div>}</AnimatePresence>
            <Card className="p-5 overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={direcao}>
                <motion.div key={step}
                  custom={direcao}
                  initial={semMovimento ? false : { opacity: 0, x: 18 * direcao }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={semMovimento ? undefined : { opacity: 0, x: -18 * direcao }}
                  transition={t}>
                  {step === 'terms' ? termos : step === 'company' ? empresa : concluir}
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
