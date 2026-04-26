import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, Sparkles, Bot, BarChart2,
  Globe, Instagram, Linkedin, Phone, CheckCircle2, Brain,
  UploadCloud, FileText, FileImage, File, X, Loader2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { saveHub, loadHub, type CompanyHubData, type BrandFile, DEFAULT_HUB } from '@/services/companyContextService'
import { extractBrandFile } from '@/services/agentsApi'
import { CRMOnboarding } from '@/components/contacts/CRMOnboarding'

// ─── Types ─────────────────────────────────────────────────────────────────────

type WizardStep = 'hub' | 'crm' | 'done'

// ─── Brand file upload ────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'text/plain', 'text/markdown',
]
const ACCEPTED_ATTR = '.pdf,.docx,.png,.jpg,.jpeg,.webp,.gif,.txt,.md'
const MAX_FILE_MB = 10

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileImage className="w-4 h-4 text-sky-400" />
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />
  return <File className="w-4 h-4 text-surface-400" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileEntry { file: BrandFile; status: 'done' | 'analyzing' | 'error'; error?: string }

function BrandFilesSection({ files, onChange }: { files: BrandFile[]; onChange: (files: BrandFile[]) => void }) {
  const [entries, setEntries] = useState<FileEntry[]>(() => files.map(f => ({ file: f, status: 'done' as const })))
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onChange(entries.filter(e => e.status === 'done').map(e => e.file))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const processFile = useCallback(async (raw: File) => {
    if (raw.size > MAX_FILE_MB * 1024 * 1024) { alert(`"${raw.name}" excede ${MAX_FILE_MB} MB.`); return }
    if (!ACCEPTED_TYPES.includes(raw.type)) { alert(`Tipo não suportado: ${raw.type || raw.name}`); return }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setEntries(prev => [{ file: { id, name: raw.name, size: raw.size, mimeType: raw.type, extractedText: '', addedAt: new Date().toISOString() }, status: 'analyzing' }, ...prev])

    try {
      const isText = raw.type.startsWith('text/')
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        if (isText) reader.readAsText(raw); else reader.readAsDataURL(raw)
      })
      const extractedText = await extractBrandFile(raw.name, raw.type, isText ? content : (content.split(',')[1] ?? content), isText ? 'text' : 'base64')
      setEntries(prev => prev.map(e => e.file.id === id ? { ...e, status: 'done', file: { ...e.file, extractedText } } : e))
    } catch (err) {
      setEntries(prev => prev.map(e => e.file.id === id ? { ...e, status: 'error', error: err instanceof Error ? err.message : 'Erro ao analisar' } : e))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(f => void processFile(f))
  }, [processFile])

  return (
    <div className="flex flex-col gap-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all ${
          dragOver ? 'border-brand-500 bg-brand-500/8' : 'border-surface-700 bg-surface-800/40 hover:border-surface-600 hover:bg-surface-800/70'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_ATTR} className="sr-only"
          onChange={e => { Array.from(e.target.files ?? []).forEach(f => void processFile(f)); e.target.value = '' }} />
        <div className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
          <UploadCloud className="w-4 h-4 text-surface-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-surface-200">Arraste ou <span className="text-brand-400">clique para selecionar</span></p>
          <p className="text-[11px] text-surface-500 mt-0.5">PDF · DOCX · PNG · JPG · TXT — até {MAX_FILE_MB} MB</p>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(({ file, status, error }) => (
            <div key={file.id} className="flex items-start gap-3 rounded-xl bg-surface-800/60 border border-surface-700/60 px-3 py-2.5">
              <div className="flex-shrink-0 mt-0.5">{fileIcon(file.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-surface-200 truncate">{file.name}</p>
                  <span className="text-[10px] text-surface-600 flex-shrink-0">{formatBytes(file.size)}</span>
                </div>
                {status === 'analyzing' && <p className="text-[11px] text-brand-400 mt-0.5 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Analisando com IA...</p>}
                {status === 'done' && file.extractedText && <p className="text-[11px] text-status-active mt-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Contexto extraído · {file.extractedText.length} chars</p>}
                {status === 'error' && <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error ?? 'Erro ao analisar'}</p>}
              </div>
              {status !== 'analyzing' && (
                <button type="button" onClick={() => setEntries(prev => prev.filter(e => e.file.id !== file.id))}
                  className="flex-shrink-0 p-1 rounded-lg text-surface-600 hover:text-surface-300 hover:bg-surface-700 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'SaaS / Software', 'E-commerce / Varejo', 'Saúde e Bem-estar', 'Educação',
  'Imobiliário', 'Serviços Financeiros', 'Consultoria', 'Agência de Marketing',
  'Indústria / Manufatura', 'Alimentação e Bebidas', 'Construção e Reforma',
  'Logística e Transporte', 'Turismo e Hospitalidade', 'Jurídico', 'Outro',
]

const BUSINESS_TYPES = [
  'B2B — Vendo para empresas',
  'B2C — Vendo para pessoas',
  'B2B2C — Ambos',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function PillToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? 'bg-brand-600 border-brand-500 text-surface-950'
          : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-500 hover:text-surface-100'
      }`}
    >
      {label}
    </button>
  )
}

const INPUT = 'w-full px-3 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors'
const SELECT = `${INPUT} cursor-pointer`

// ─── Step: Hub ────────────────────────────────────────────────────────────────

function HubStep({
  form,
  onChange,
  onContinue,
  onSkip,
}: {
  form: CompanyHubData
  onChange: (p: Partial<CompanyHubData>) => void
  onContinue: () => void
  onSkip: () => void
}) {
  const canContinue = form.companyName.trim().length > 0

  const toggleBusinessType = (v: string) => {
    onChange({
      businessType: form.businessType.includes(v)
        ? form.businessType.filter(t => t !== v)
        : [...form.businessType, v],
    })
  }

  // "Outro" custom sector: industry is either a known value, 'Outro' (selected but not typed yet),
  // or a free-text custom value (not in the list)
  const selectIndustryValue = INDUSTRIES.includes(form.industry) ? form.industry : form.industry ? 'Outro' : ''
  const showCustomIndustry = selectIndustryValue === 'Outro'
  const customIndustryValue = form.industry === 'Outro' ? '' : (showCustomIndustry ? form.industry : '')

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-surface-800/60 bg-surface-950/80 backdrop-blur-sm flex flex-col px-8 py-8">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50 flex-shrink-0"
          >
            <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
          </motion.div>
          <span className="text-sm font-bold text-surface-50">Oryon</span>
        </div>

        {/* Step info */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-brand-400" />
          </div>
          <h2 className="text-sm font-bold text-surface-100">Contexto da IA</h2>
        </div>

        <p className="text-xs text-surface-400 leading-relaxed mb-6">
          Preencha uma vez e toda a plataforma usa automaticamente — Copilot, agentes de IA e o setup do CRM.
        </p>

        {/* Benefits */}
        <div className="space-y-3">
          {[
            { icon: Sparkles, label: 'Copilot', desc: 'Responde com contexto da sua empresa' },
            { icon: Bot,       label: 'Agentes',  desc: 'Prompts pré-preenchidos automaticamente' },
            { icon: BarChart2, label: 'CRM',      desc: 'Pipeline gerado para o seu negócio' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-2.5 h-2.5 text-brand-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-surface-200">{label}</p>
                <p className="text-[11px] text-surface-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <p className="text-[11px] text-surface-600 leading-relaxed">
            Você pode editar essas informações a qualquer momento em{' '}
            <span className="text-surface-500">Configurações → Contexto da IA</span>
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-10 py-8">
          <h1 className="text-xl font-bold text-surface-50 mb-1">Conte sobre sua empresa</h1>
          <p className="text-sm text-surface-400 mb-8">
            Essas informações alimentam toda a inteligência da plataforma.
          </p>

          <div className="flex gap-8">
            {/* Left col — company fields */}
            <div className="flex-1 space-y-5">
              {/* Name + sector */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                    Nome da empresa <span className="text-brand-400">*</span>
                  </label>
                  <input
                    autoFocus
                    value={form.companyName}
                    onChange={e => onChange({ companyName: e.target.value })}
                    placeholder="Ex: Oryon Tech"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                    Setor
                  </label>
                  <select
                    value={selectIndustryValue}
                    onChange={e => onChange({ industry: e.target.value })}
                    className={SELECT}
                  >
                    <option value="">Selecione...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  {showCustomIndustry && (
                    <input
                      autoFocus
                      value={customIndustryValue}
                      onChange={e => onChange({ industry: e.target.value })}
                      placeholder="Digite o setor da sua empresa..."
                      className={`${INPUT} mt-2`}
                    />
                  )}
                </div>
              </div>

              {/* Business type */}
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  Modelo de negócio
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map(t => (
                    <PillToggle
                      key={t} label={t}
                      selected={form.businessType.includes(t)}
                      onClick={() => toggleBusinessType(t)}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  O que você faz?
                </label>
                <textarea
                  value={form.description}
                  onChange={e => onChange({ description: e.target.value })}
                  placeholder="Descreva sua empresa, público-alvo e principais diferenciais. A IA usará isso para representar bem sua marca..."
                  rows={3}
                  className={`${INPUT} resize-none`}
                />
              </div>

              {/* Key social links */}
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  Presença online <span className="normal-case text-surface-600 font-normal">(opcional)</span>
                </label>
                <div className="space-y-2">
                  {([
                    { key: 'website',   Icon: Globe,      placeholder: 'https://seusite.com.br' },
                    { key: 'instagram', Icon: Instagram,  placeholder: '@handle ou link do Instagram' },
                    { key: 'linkedin',  Icon: Linkedin,   placeholder: 'linkedin.com/company/sua-empresa' },
                    { key: 'whatsapp',  Icon: Phone,      placeholder: 'WhatsApp comercial ou link' },
                  ] as const).map(({ key, Icon, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-surface-500" />
                      </div>
                      <input
                        value={form[key]}
                        onChange={e => onChange({ [key]: e.target.value })}
                        placeholder={placeholder}
                        className={INPUT}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col — brand files */}
            <div className="w-72 flex-shrink-0 border-l border-surface-800/60 pl-8 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  Arquivos da marca <span className="normal-case text-surface-600 font-normal">(opcional)</span>
                </label>
                <p className="text-[11px] text-surface-500 mb-3 leading-relaxed">
                  PDFs, catálogos, scripts de venda ou imagens. A IA extrai o contexto e usa em todo o sistema.
                </p>
                <BrandFilesSection
                  files={form.brandFiles ?? []}
                  onChange={brandFiles => onChange({ brandFiles })}
                />
              </div>

              {/* Tips card */}
              <div className="rounded-xl bg-surface-800/50 border border-surface-700/60 p-4">
                <p className="text-xs font-semibold text-surface-300 mb-3">Bons arquivos para começar</p>
                <div className="space-y-2.5">
                  {[
                    { icon: FileText,  color: 'text-red-400',     label: 'Catálogo de produtos',    desc: 'Preços, especificações e detalhes' },
                    { icon: FileText,  color: 'text-blue-400',    label: 'Script de atendimento',   desc: 'Respostas padrão e FAQs' },
                    { icon: FileImage, color: 'text-emerald-400', label: 'Apresentação da empresa',  desc: 'Missão, valores e diferenciais' },
                  ].map(({ icon: Icon, color, label, desc }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className="text-[11px] font-medium text-surface-300 leading-tight">{label}</p>
                        <p className="text-[10px] text-surface-600 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-surface-600 mt-3 pt-3 border-t border-surface-700/60 leading-relaxed">
                  Você pode adicionar mais arquivos a qualquer momento em <span className="text-surface-500">Configurações → Contexto da IA</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-10 py-5 border-t border-surface-800/60">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-surface-600 hover:text-surface-400 transition-colors"
          >
            Pular por enquanto
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-all shadow-lg shadow-brand-900/40"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

function DoneStep({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate()

  const goTo = (path: string) => {
    onComplete()
    navigate(path)
  }

  return (
    <div className="h-full flex items-center justify-center bg-surface-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 text-center max-w-md px-8"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          className="w-20 h-20 rounded-3xl bg-status-active-bg ring-1 ring-status-active-border flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-status-active" />
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold text-surface-50 mb-2">Plataforma pronta!</h1>
          <p className="text-sm text-surface-400 leading-relaxed">
            Copilot, agentes e CRM já conhecem sua empresa. Você pode atualizar o contexto a qualquer momento em Configurações.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => goTo('/agents')}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold transition-all shadow-lg shadow-brand-900/40"
          >
            <Bot className="w-4 h-4" />
            Criar meu primeiro agente de IA
          </button>
          <button
            onClick={() => goTo('/home')}
            className="w-full px-6 py-2.5 rounded-xl border border-surface-700 text-sm text-surface-300 hover:text-surface-100 hover:border-surface-600 transition-all"
          >
            Explorar a plataforma
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Wizard root ──────────────────────────────────────────────────────────────

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const { user, completeOnboarding } = useAuth()
  const [step, setStep] = useState<WizardStep>('hub')
  const [hubForm, setHubForm] = useState<CompanyHubData>(() =>
    user?.tenantId ? loadHub(user.tenantId) : { ...DEFAULT_HUB }
  )

  const patchHub = (partial: Partial<CompanyHubData>) =>
    setHubForm(prev => ({ ...prev, ...partial }))

  const handleHubContinue = () => {
    saveHub(user?.tenantId, hubForm)
    setStep('crm')
  }

  const handleHubSkip = () => {
    setStep('crm')
  }

  const handleCRMDone = () => {
    completeOnboarding()
    setStep('done')
  }

  return (
    <motion.div
      key="setup-wizard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-surface-950"
    >
      <AnimatePresence mode="wait">
        {step === 'hub' && (
          <motion.div
            key="hub"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <HubStep
              form={hubForm}
              onChange={patchHub}
              onContinue={handleHubContinue}
              onSkip={handleHubSkip}
            />
          </motion.div>
        )}

        {step === 'crm' && (
          <motion.div
            key="crm"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            <CRMOnboarding onDone={handleCRMDone} />
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <DoneStep onComplete={onComplete} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
