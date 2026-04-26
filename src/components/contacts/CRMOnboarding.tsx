import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, ArrowRight, ArrowLeft, RotateCcw,
  AlertCircle, CheckCircle2, Loader2, Check,
  BookOpen, TrendingUp, Award, Briefcase,
  Database, BarChart2, Target, Brain,
  Lightbulb, GitBranch, Layers, Flag,
  Upload, FileText, FileType2, Globe, Instagram,
  Facebook, Linkedin, Twitter, Phone, X as XIcon,
} from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useAuth } from '@/contexts/AuthContext'
import { useKnowledgeBase, fileToKBDocument, loadKB, KB_MAX_DOCS } from '@/hooks/useKnowledgeBase'
import { loadHub, loadHubAsync, bootstrapFromBusinessContext, hubHasContent } from '@/services/companyContextService'
import { ConfirmModal } from '@/components/ui/Modal'
import type { BusinessContext, ExperienceLevel, CRMExperience } from '@/services/anthropicService'
import type { AIOnboardingConfig } from '@/types'

// ─── Componentes de UI ────────────────────────────────────────────────────────

function PillOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? 'bg-brand-600 border-brand-500 text-surface-950 shadow-sm shadow-brand-900/40'
          : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600 hover:text-surface-100'
      }`}
    >
      {selected && <Check className="w-3 h-3" />}
      {label}
    </button>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
      {children}{required && <span className="text-brand-400 ml-1">*</span>}
    </label>
  )
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
const selectCls = `${inputCls} cursor-pointer`

function toggleArray(data: BusinessContext, key: keyof BusinessContext, value: string): Partial<BusinessContext> {
  const arr = (data[key] as string[]) ?? []
  return { [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] }
}

// ─── Dados ─────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'SaaS / Software', 'E-commerce / Varejo', 'Saúde e Bem-estar', 'Educação',
  'Imobiliário', 'Serviços Financeiros', 'Consultoria', 'Agência de Marketing',
  'Indústria / Manufatura', 'Alimentação e Bebidas', 'Construção e Reforma',
  'Logística e Transporte', 'Turismo e Hospitalidade', 'Jurídico', 'Outro',
]
const BUSINESS_TYPES = ['B2B — Vendo para empresas', 'B2C — Vendo para pessoas', 'B2B2C — Ambos']
const TEAM_SIZES = ['Só eu (1 pessoa)', '2 a 10 pessoas', '11 a 50 pessoas', '51 a 200 pessoas', 'Mais de 200 pessoas']
const REVENUE_RANGES = [
  'Até R$ 50 mil/mês', 'R$ 50 mil a R$ 200 mil/mês',
  'R$ 200 mil a R$ 1 milhão/mês', 'Mais de R$ 1 milhão/mês', 'Prefiro não informar',
]
const ACQUISITION_CHANNELS = [
  'WhatsApp', 'Instagram', 'Facebook', 'LinkedIn', 'Google / SEO',
  'Indicações / Referral', 'Cold Call / E-mail frio', 'Eventos e Feiras',
  'Site / Landing Page', 'Marketplace', 'Parcerias', 'Anúncios pagos',
]
const SALES_CYCLES = [
  'Menos de 1 dia (compra por impulso)', '1 a 7 dias', '1 a 4 semanas',
  '1 a 3 meses', 'Mais de 3 meses',
]
const AVERAGE_TICKETS = [
  'Até R$ 500', 'R$ 500 a R$ 2.000', 'R$ 2.000 a R$ 10.000',
  'R$ 10.000 a R$ 50.000', 'Acima de R$ 50.000',
]
const SALES_CHALLENGES = [
  'Perder o timing do follow-up', 'Falta de visibilidade do funil',
  'Leads sem qualificação', 'Equipe desorganizada',
  'Sem histórico dos clientes', 'Dificuldade em fechar negócios',
  'Alta taxa de churn', 'Processo manual e demorado',
  'Não saber a próxima ação', 'Dados espalhados em vários lugares',
]
const TRACKING_PRIORITIES = [
  'Origem dos leads', 'Jornada do cliente', 'Datas de follow-up',
  'Receita e ticket médio', 'Objeções e interesses do lead',
  'Documentos e contratos', 'Nível de interesse / Lead score',
  'Dados da empresa do contato', 'Histórico de interações', 'Metas da equipe',
]
const CRM_GOALS = [
  'Aumentar taxa de conversão', 'Melhorar follow-up com leads',
  'Reduzir tempo de fechamento', 'Visibilidade do funil para a equipe',
  'Relatórios e métricas de vendas', 'Reduzir churn / retenção',
  'Qualificar melhor os leads', 'Automatizar tarefas repetitivas',
  'Integrar com outros canais', 'Gerenciar pós-venda',
]
const LOADING_STEPS = [
  'Analisando o contexto do negócio...',
  'Mapeando o processo de vendas...',
  'Criando estágios do pipeline...',
  'Definindo campos personalizados...',
  'Finalizando sua configuração...',
]

// ─── Step 0 — Nível de experiência ────────────────────────────────────────────

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; icon: React.ComponentType<{ className?: string }>; label: string; desc: string }[] = [
  { value: 'beginner',     icon: BookOpen,   label: 'Estou começando',         desc: 'Pouco ou nenhum contato com vendas e marketing' },
  { value: 'intermediate', icon: TrendingUp, label: 'Tenho conhecimento básico', desc: 'Já ouvi falar de funil, leads e follow-up' },
  { value: 'advanced',     icon: Award,      label: 'Sou experiente',           desc: 'Uso processos de vendas e acompanho métricas' },
  { value: 'expert',       icon: Briefcase,  label: 'Profissional da área',      desc: 'Gerencio equipes, configuro CRMs, conheço KPIs avançados' },
]

const CRM_OPTIONS: { value: CRMExperience; label: string; desc: string }[] = [
  { value: 'never',   label: 'Nunca usei um CRM',          desc: 'Esse será meu primeiro' },
  { value: 'tried',   label: 'Já tentei, mas não adotei',   desc: 'Testei alguma ferramenta mas não virei rotina' },
  { value: 'active',  label: 'Uso ou usei ativamente',      desc: 'Tenho familiaridade com a dinâmica de um CRM' },
  { value: 'manager', label: 'Configuro CRMs para equipes', desc: 'Experiência com setup, pipelines e integrações' },
]

function Step0({ data, onChange }: { data: BusinessContext; onChange: (p: Partial<BusinessContext>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel required>Qual é o seu nível de conhecimento em Vendas e Marketing?</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {EXPERIENCE_OPTIONS.map(({ value, icon: Icon, label, desc }) => {
            const selected = data.experienceLevel === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ experienceLevel: value })}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  selected
                    ? 'bg-brand-900/30 border-brand-500/60 text-brand-300'
                    : 'bg-surface-800/50 border-surface-700 text-surface-300 hover:border-surface-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${selected ? 'bg-brand-600/30' : 'bg-surface-700'}`}>
                  <Icon className={`w-4 h-4 ${selected ? 'text-brand-400' : 'text-surface-500'}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold leading-tight ${selected ? 'text-brand-200' : 'text-surface-200'}`}>{label}</p>
                  <p className="text-xs text-surface-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <FieldLabel required>Você já usou algum CRM antes?</FieldLabel>
        <div className="flex flex-col gap-2">
          {CRM_OPTIONS.map(({ value, label, desc }) => {
            const selected = data.crmExperience === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ crmExperience: value })}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                  selected
                    ? 'bg-brand-900/30 border-brand-500/60'
                    : 'bg-surface-800/50 border-surface-700 hover:border-surface-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selected ? 'border-brand-500 bg-brand-600' : 'border-surface-600'}`}>
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={`text-sm font-medium ${selected ? 'text-brand-200' : 'text-surface-200'}`}>{label}</p>
                  <p className="text-xs text-surface-500">{desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Base de Conhecimento (Step 1) ────────────────────────────────────────────

const SOCIAL_LINKS: { label: string; placeholder: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Site',              placeholder: 'https://seusite.com.br',    icon: Globe },
  { label: 'Instagram',         placeholder: '@handle ou link completo',  icon: Instagram },
  { label: 'Facebook',          placeholder: 'facebook.com/sua-pagina',   icon: Facebook },
  { label: 'LinkedIn',          placeholder: 'linkedin.com/company/...',  icon: Linkedin },
  { label: 'Twitter / X',       placeholder: '@handle ou link',           icon: Twitter },
  { label: 'WhatsApp comercial',placeholder: '(11) 99999-9999 ou link',   icon: Phone },
]

function KBOnboardingSection({ tenantId }: { tenantId: string | undefined }) {
  const { kb, upsertCompanyField, deleteCompanyField, addDocument, deleteDocument, totalSize } = useKnowledgeBase(tenantId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState<string | null>(null)

  // Local state for link inputs — sync to KB on blur
  const [links, setLinks] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    SOCIAL_LINKS.forEach(({ label }) => {
      m[label] = ''
    })
    return m
  })

  // Sync KB → local on mount / kb change (only set once if already in KB)
  useEffect(() => {
    setLinks(prev => {
      const updated = { ...prev }
      SOCIAL_LINKS.forEach(({ label }) => {
        const kbVal = kb.companyFields.find(f => f.label === label)?.value ?? ''
        if (kbVal && !updated[label]) updated[label] = kbVal
      })
      return updated
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLinkBlur = (label: string) => {
    const value = links[label]?.trim() ?? ''
    const existing = kb.companyFields.find(f => f.label === label)
    if (value) {
      upsertCompanyField({ id: existing?.id ?? crypto.randomUUID(), label, value })
    } else if (existing) {
      deleteCompanyField(existing.id)
    }
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setUploadError(null)

    for (const file of files) {
      const { doc, error } = await fileToKBDocument(file)
      if (error) { setUploadError(error); continue }
      const ok = addDocument(doc!)
      if (!ok) setUploadError('Limite de armazenamento atingido.')
    }
  }, [addDocument])

  const usedPct = Math.min(100, (totalSize / 3_000_000) * 100)

  const getDocIcon = (kind: 'text' | 'pdf' | 'docx') => {
    if (kind === 'pdf')  return <FileType2 className="w-3.5 h-3.5 text-red-400" />
    if (kind === 'docx') return <FileText  className="w-3.5 h-3.5 text-blue-400" />
    return <FileText className="w-3.5 h-3.5 text-brand-400" />
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-surface-500 leading-relaxed">
        Adicione materiais do seu negócio. O Copilot e todos os agentes de IA compartilham essa base automaticamente — você também pode gerenciá-la a qualquer momento no Copilot.
      </p>

      {/* Links sociais */}
      <div>
        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide mb-2">Links e redes sociais</p>
        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_LINKS.map(({ label, placeholder, icon: Icon }) => (
            <div key={label}>
              <label className="flex items-center gap-1 text-[10px] text-surface-500 mb-1">
                <Icon className="w-2.5 h-2.5" />{label}
              </label>
              <input
                value={links[label] ?? ''}
                onChange={e => setLinks(prev => ({ ...prev, [label]: e.target.value }))}
                onBlur={() => handleLinkBlur(label)}
                placeholder={placeholder}
                className={`${inputCls} text-xs py-1.5`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Documentos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Documentos</p>
          <span className="text-[10px] text-surface-500">{kb.documents.length}/{KB_MAX_DOCS} · {usedPct.toFixed(0)}% de armazenamento</span>
        </div>

        {kb.documents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {kb.documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-1.5 bg-surface-800 border border-surface-700 rounded-lg px-2 py-1.5">
                {getDocIcon(doc.kind)}
                <span className="text-[11px] text-surface-200 max-w-[140px] truncate">{doc.name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteDocTarget(doc.id)}
                  className="text-surface-600 hover:text-red-400 transition-colors ml-0.5"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={kb.documents.length >= KB_MAX_DOCS}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-surface-700 hover:border-brand-500/50 hover:bg-brand-500/5 text-surface-400 hover:text-brand-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          Adicionar arquivo — PDF, Markdown, Word (.docx), TXT
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.md,.txt,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploadError && (
          <p className="flex items-center gap-1 text-[11px] text-status-pending mt-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" /> {uploadError}
          </p>
        )}
      </div>

      <ConfirmModal
        open={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={() => { if (deleteDocTarget) { deleteDocument(deleteDocTarget); setDeleteDocTarget(null) } }}
        title="Remover documento"
        description="O documento será removido da base de conhecimento. Esta ação não pode ser desfeita."
        confirmLabel="Remover documento"
        danger
      />
    </div>
  )
}

function Step1({ data, onChange }: { data: BusinessContext; onChange: (p: Partial<BusinessContext>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Nome da empresa</FieldLabel>
          <input value={data.companyName} onChange={(e) => onChange({ companyName: e.target.value })} placeholder="Ex: Oryon Tech" className={inputCls} />
        </div>
        <div>
          <FieldLabel required>Setor / Indústria</FieldLabel>
          <select value={data.industry} onChange={(e) => onChange({ industry: e.target.value })} className={selectCls}>
            <option value="">Selecione...</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Modelo de negócio</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((t) => (
              <PillOption key={t} label={t} selected={data.businessType.includes(t)} onClick={() => onChange(toggleArray(data, 'businessType', t))} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel required>Tamanho da equipe de vendas</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {TEAM_SIZES.map((s) => (
              <PillOption key={s} label={s} selected={data.teamSize === s} onClick={() => onChange({ teamSize: s })} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <FieldLabel>Faixa de receita mensal <span className="normal-case text-surface-600 font-normal">(opcional)</span></FieldLabel>
        <div className="flex flex-wrap gap-2">
          {REVENUE_RANGES.map((r) => (
            <PillOption key={r} label={r} selected={data.revenueRange === r} onClick={() => onChange({ revenueRange: data.revenueRange === r ? '' : r })} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel required>O que você vende?</FieldLabel>
        <textarea value={data.productDescription} onChange={(e) => onChange({ productDescription: e.target.value })} placeholder="Descreva seu produto ou serviço principal, para quem ele resolve um problema e qual problema resolve..." rows={2} className={`${inputCls} resize-none`} />
      </div>
    </div>
  )
}

function StepKB({ tenantId }: { tenantId: string | undefined }) {
  return (
    <div className="flex flex-col gap-4">
      <KBOnboardingSection tenantId={tenantId} />
    </div>
  )
}

function Step2({ data, onChange }: { data: BusinessContext; onChange: (p: Partial<BusinessContext>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel required>Como você atrai clientes?</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ACQUISITION_CHANNELS.map((c) => (
            <PillOption key={c} label={c} selected={data.acquisitionChannels.includes(c)} onClick={() => onChange(toggleArray(data, 'acquisitionChannels', c))} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>Duração do ciclo de vendas</FieldLabel>
          <select value={data.salesCycleDuration} onChange={(e) => onChange({ salesCycleDuration: e.target.value })} className={selectCls}>
            <option value="">Selecione...</option>
            {SALES_CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel required>Ticket médio</FieldLabel>
          <select value={data.averageTicket} onChange={(e) => onChange({ averageTicket: e.target.value })} className={selectCls}>
            <option value="">Selecione...</option>
            {AVERAGE_TICKETS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <FieldLabel required>Principais desafios no processo de vendas</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SALES_CHALLENGES.map((c) => (
            <PillOption key={c} label={c} selected={data.salesChallenges.includes(c)} onClick={() => onChange(toggleArray(data, 'salesChallenges', c))} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Descreva seu processo de vendas <span className="normal-case text-surface-600 font-normal">(opcional)</span></FieldLabel>
        <textarea value={data.salesProcessDescription} onChange={(e) => onChange({ salesProcessDescription: e.target.value })} placeholder="Ex: Recebo lead via Instagram, mando mensagem no WhatsApp, marco uma call, envio proposta..." rows={2} className={`${inputCls} resize-none`} />
      </div>
    </div>
  )
}

function Step3({ data, onChange }: { data: BusinessContext; onChange: (p: Partial<BusinessContext>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel required>O que rastrear em cada contato?</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {TRACKING_PRIORITIES.map((t) => (
              <PillOption key={t} label={t} selected={data.trackingPriorities.includes(t)} onClick={() => onChange(toggleArray(data, 'trackingPriorities', t))} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel required>Principais objetivos com o CRM</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {CRM_GOALS.map((g) => (
              <PillOption key={g} label={g} selected={data.crmGoals.includes(g)} onClick={() => onChange(toggleArray(data, 'crmGoals', g))} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <FieldLabel>Informações adicionais <span className="normal-case text-surface-600 font-normal">(opcional)</span></FieldLabel>
        <textarea value={data.additionalContext} onChange={(e) => onChange({ additionalContext: e.target.value })} placeholder="Qualquer contexto extra que ajude a IA a personalizar melhor seu CRM..." rows={2} className={`${inputCls} resize-none`} />
      </div>
    </div>
  )
}

// ─── Loading ───────────────────────────────────────────────────────────────────

function GeneratingView() {
  const [stepIndex, setStepIndex] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <motion.div key="generating" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center h-full text-center py-10">
      <div className="relative mb-8">
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.15, 0.4] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 rounded-full bg-brand-500 blur-2xl" />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="relative w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center shadow-xl">
          <Sparkles className="w-7 h-7 text-white" />
        </motion.div>
      </div>
      <h2 className="text-lg font-bold text-surface-50 mb-1">Configurando seu CRM...</h2>
      <p className="text-sm text-surface-400 mb-6">Nossa IA está analisando o contexto do seu negócio.</p>
      <div className="w-full max-w-xs flex flex-col gap-2">
        {LOADING_STEPS.map((s, i) => {
          const done = i < stepIndex
          const active = i === stepIndex
          return (
            <motion.div key={s} initial={{ opacity: 0, x: -12 }} animate={{ opacity: i <= stepIndex ? 1 : 0.25, x: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${active ? 'bg-brand-900/30 border-brand-700/50 text-brand-300' : done ? 'bg-surface-800/40 border-surface-800 text-surface-500' : 'border-transparent text-surface-700'}`}>
              <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${done ? 'bg-green-500/20' : active ? 'bg-brand-500/20' : 'bg-surface-800'}`}>
                {done ? <Check className="w-2.5 h-2.5 text-green-400" /> : active ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-2.5 h-2.5 text-brand-400" /></motion.div> : <div className="w-1 h-1 rounded-full bg-surface-700" />}
              </div>
              <span className="text-xs">{s}</span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Preview ───────────────────────────────────────────────────────────────────

function PreviewView({ config, onApply, onRetry, applying, error }: { config: AIOnboardingConfig; onApply: () => void; onRetry: () => void; applying: boolean; error: string | null }) {
  return (
    <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="w-full h-full flex flex-col justify-center">
      <div className="flex flex-col items-center mb-5">
        <div className="w-10 h-10 rounded-2xl bg-green-900/40 border border-green-700/40 flex items-center justify-center mb-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        </div>
        <h2 className="text-lg font-bold text-surface-50 text-center">CRM configurado com sucesso!</h2>
        <p className="text-xs text-surface-400 text-center mt-1">Revise o que foi criado e aplique para começar.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-surface-800/60 border border-surface-700 rounded-xl p-3">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide mb-2">Pipeline — {config.stages.length} estágios</p>
          <div className="flex flex-col gap-1.5">
            {config.stages.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-surface-200 flex-1 truncate">{s.label}</span>
                {s.isTerminal && <span className="text-[9px] text-surface-600 bg-surface-800 px-1 py-0.5 rounded flex-shrink-0">terminal</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface-800/60 border border-surface-700 rounded-xl p-3">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide mb-2">Campos — {config.customFields.length} personalizados</p>
          <div className="flex flex-col gap-1.5">
            {config.customFields.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-surface-200 flex-1 truncate">{f.label}</span>
                <span className="text-[9px] text-brand-400 bg-brand-900/30 border border-brand-800/40 px-1 py-0.5 rounded font-mono flex-shrink-0">{f.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 text-xs mb-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      <button onClick={onApply} disabled={applying} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white disabled:opacity-60 transition-all shadow-lg shadow-brand-900/40">
        {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando configuração...</> : <><ArrowRight className="w-4 h-4" /> Aplicar e começar</>}
      </button>
      {!applying && (
        <button onClick={onRetry} className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 text-xs text-surface-500 hover:text-surface-300 transition-colors">
          <RotateCcw className="w-3 h-3" /> Gerar novamente
        </button>
      )}
    </motion.div>
  )
}

// ─── Left panel — conteúdo por etapa ─────────────────────────────────────────

interface StepMeta {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  tips: { icon: React.ComponentType<{ className?: string }>; text: string }[]
}

const STEP_META: StepMeta[] = [
  {
    icon: Brain,
    title: 'Seu perfil de conhecimento',
    description: 'Antes de montar seu CRM, precisamos entender com quem estamos falando. Assim a IA escolhe a linguagem certa — sem jargões para quem está começando, e com toda a profundidade técnica para quem já domina o assunto.',
    tips: [
      { icon: Lightbulb, text: 'Não há resposta certa ou errada. Seja honesto para obter o melhor resultado.' },
      { icon: Sparkles,  text: 'A IA adapta estágios e campos ao seu vocabulário e contexto.' },
      { icon: Check,     text: 'Se você nunca ouviu falar em "lead" ou "churn", ótimo — vamos usar termos do seu dia a dia.' },
    ],
  },
  {
    icon: Briefcase,
    title: 'Conte sobre sua empresa',
    description: 'Mapeamos a identidade do negócio: o que você vende, para quem e como sua equipe está organizada. Essas informações definem a estrutura base do seu pipeline.',
    tips: [
      { icon: Target,    text: 'O setor e modelo de negócio (B2B/B2C) definem os estágios do funil.' },
      { icon: Lightbulb, text: 'Quanto mais detalhes na descrição do produto, mais preciso o CRM gerado.' },
      { icon: BarChart2, text: 'A faixa de receita ajuda a calibrar os campos financeiros sugeridos.' },
    ],
  },
  {
    icon: Database,
    title: 'Base de Conhecimento',
    description: 'Adicione materiais do seu negócio — PDFs, documentos, Markdown e links de redes sociais. O Copilot e todos os agentes de IA compartilham essa base automaticamente.',
    tips: [
      { icon: Database,  text: 'PDFs, catálogos, scripts de vendas e FAQs são ótimas opções para começar.' },
      { icon: Sparkles,  text: 'Quanto mais contexto, mais personalizadas serão as respostas da IA em todo o sistema.' },
      { icon: Lightbulb, text: 'Você pode adicionar mais materiais a qualquer momento pelo painel do Copilot.' },
    ],
  },
  {
    icon: GitBranch,
    title: 'Como você vende hoje',
    description: 'Mapeamos seu processo comercial atual — de onde vêm os clientes até o momento do fechamento. A IA usa isso para criar estágios que espelham exatamente o que você já faz, só que organizado.',
    tips: [
      { icon: Lightbulb, text: 'Selecione todos os canais onde você realmente recebe clientes, não onde gostaria.' },
      { icon: Flag,       text: 'Os desafios marcados viram campos e alertas automáticos no CRM.' },
      { icon: Target,     text: 'Ciclo de venda curto = menos estágios. Ciclo longo = pipeline mais granular.' },
    ],
  },
  {
    icon: Layers,
    title: 'Seus objetivos com o CRM',
    description: 'O que você quer enxergar, medir e melhorar? Esta etapa define os campos personalizados de cada contato e os relatórios que farão mais sentido para o seu negócio.',
    tips: [
      { icon: BarChart2, text: 'Selecione tudo que é relevante — a IA priorizará os campos mais impactantes.' },
      { icon: Database,  text: 'Prioridades de rastreamento viram campos visíveis em cada card de contato.' },
      { icon: Sparkles,  text: 'Após gerar, você poderá revisar tudo antes de aplicar.' },
    ],
  },
]

// ─── Step indicator (vertical) ───────────────────────────────────────────────

const FORM_STEPS = [
  { label: 'Seu perfil' },
  { label: 'Seu negócio' },
  { label: 'Base de Conhecimento' },
  { label: 'Processo de vendas' },
  { label: 'Objetivos' },
]

function StepIndicator({ current, steps }: { current: number; steps: typeof FORM_STEPS }) {
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 transition-all duration-300 ${done ? 'bg-brand-600 border-brand-600 text-surface-950' : active ? 'bg-surface-900 border-brand-500 text-brand-400' : 'bg-surface-900 border-surface-700 text-surface-600'}`}>
              {done ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-xs font-medium transition-colors duration-300 ${active ? 'text-surface-100' : done ? 'text-surface-500' : 'text-surface-700'}`}>{step.label}</span>
            {active && (
              <motion.div layoutId="active-step-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Animated background orbs ─────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-600/8 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -25, 0], scale: [1, 0.9, 1.05, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-700/8 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 30, -40, 0], y: [0, -20, 35, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-3xl"
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const EMPTY_CONTEXT: BusinessContext = {
  experienceLevel: '',
  crmExperience: '',
  companyName: '', industry: '', companyDescription: '', productsServices: '',
  businessType: [], teamSize: '',
  revenueRange: '', productDescription: '',
  acquisitionChannels: [], salesCycleDuration: '', averageTicket: '',
  salesChallenges: [], salesProcessDescription: '',
  trackingPriorities: [], crmGoals: [], additionalContext: '',
}

function isStep0Valid(d: BusinessContext) { return !!d.experienceLevel && !!d.crmExperience }
function isStep1Valid(d: BusinessContext) { return !!(d.companyName.trim() && d.industry && d.businessType.length > 0 && d.teamSize && d.productDescription.trim()) }
function isStepKBValid(_d: BusinessContext) { return true } // optional step — always valid
function isStep2Valid(d: BusinessContext) { return !!(d.acquisitionChannels.length > 0 && d.salesCycleDuration && d.averageTicket && d.salesChallenges.length > 0) }
function isStep3Valid(d: BusinessContext) { return !!(d.trackingPriorities.length > 0 && d.crmGoals.length > 0) }

// Steps: 0=perfil, 1=negócio, 2=KB, 3=processo, 4=objetivos
const STEP_VALIDATORS = [isStep0Valid, isStep1Valid, isStepKBValid, isStep2Valid, isStep3Valid]

// ─── KB summary builder ───────────────────────────────────────────────────────
// Builds a plain-text summary of the knowledge base to inject into the AI prompt.
// Text documents are included in full (truncated). PDF/DOCX are listed by name only.

function buildKBSummary(tenantId: string | undefined): string {
  if (!tenantId) return ''
  const kb = loadKB(tenantId)
  const parts: string[] = []

  if (kb.companyFields.length > 0) {
    parts.push('INFORMAÇÕES DA EMPRESA:')
    kb.companyFields.forEach(f => {
      if (f.value.trim()) parts.push(`  ${f.label}: ${f.value.trim()}`)
    })
  }

  const textDocs = kb.documents.filter(d => d.kind === 'text')
  const binaryDocs = kb.documents.filter(d => d.kind === 'pdf' || d.kind === 'docx')

  if (textDocs.length > 0) {
    parts.push('\nDOCUMENTOS DE TEXTO:')
    textDocs.forEach(d => {
      const excerpt = d.content.length > 2000 ? d.content.slice(0, 2000) + '\n[... conteúdo truncado]' : d.content
      parts.push(`\n--- ${d.name} ---\n${excerpt}`)
    })
  }

  if (binaryDocs.length > 0) {
    const names = binaryDocs.map(d => `"${d.name}"`).join(', ')
    parts.push(`\nARQUIVOS ANEXADOS (conteúdo processado separadamente): ${names}`)
  }

  return parts.join('\n')
}

export function CRMOnboarding({ onDone }: { onDone: () => void }) {
  const { step, config, error, submit, apply, retry, skip } = useOnboarding()
  const { user } = useAuth()
  const [formStep, setFormStep] = useState(0)
  const [formData, setFormData] = useState<BusinessContext>(EMPTY_CONTEXT)

  const patch = (p: Partial<BusinessContext>) => setFormData((d) => ({ ...d, ...p }))

  // Skip "Seu negócio" step when Hub already has company data
  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const skipBusinessStep = hub ? hubHasContent(hub) : false
  // When hub is filled, skip both "Seu negócio" (1) and "Base de Conhecimento" (2)
  // — company context is already set, KB can be added later from the Copilot panel
  const VISIBLE_STEP_INDICES = skipBusinessStep ? [0, 3, 4] : [0, 1, 2, 3, 4]
  const visibleFormSteps  = VISIBLE_STEP_INDICES.map(i => FORM_STEPS[i])
  const visibleStepMeta   = VISIBLE_STEP_INDICES.map(i => STEP_META[i])
  const visibleValidators = VISIBLE_STEP_INDICES.map(i => STEP_VALIDATORS[i])

  // Pre-fill Step 1 from Company Context Hub (if available)
  useEffect(() => {
    if (!user?.tenantId) return
    loadHubAsync(user.tenantId).then((hub) => {
      if (!hub.companyName && !hub.industry && !hub.description) return
      setFormData(prev => ({
        ...prev,
        companyName:        prev.companyName        || hub.companyName,
        industry:           prev.industry           || hub.industry,
        businessType:       prev.businessType.length ? prev.businessType : hub.businessType,
        teamSize:           prev.teamSize           || hub.teamSize,
        productDescription: prev.productDescription || hub.description,
      }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenantId])

  useEffect(() => {
    if (step === 'done') onDone()
  }, [step, onDone])

  const handleSkip = async () => { await skip(); onDone() }

  const canAdvance = visibleValidators[formStep]?.(formData) ?? false
  const isLastFormStep = formStep === visibleFormSteps.length - 1
  const isFormStep = step === 'form'

  const handleNext = () => {
    if (!isLastFormStep) { setFormStep(formStep + 1); return }
    const kb = user?.tenantId ? loadKB(user.tenantId) : null
    const pdfDocs = kb?.documents.filter(d => d.kind === 'pdf') ?? []
    // Seed Company Context Hub with business context before generating
    bootstrapFromBusinessContext(user?.tenantId, formData)
    submit({ ...formData, kbSummary: buildKBSummary(user?.tenantId) }, pdfDocs)
  }

  const meta = visibleStepMeta[formStep]

  return (
    <div className="h-full flex overflow-hidden relative">
      <BackgroundOrbs />

      {/* ── Left Panel ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-80 flex-shrink-0 flex flex-col border-r border-surface-800/60 bg-surface-950/80 backdrop-blur-sm">

        {/* Brand header */}
        <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-surface-800/60">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50 flex-shrink-0"
          >
            <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
          </motion.div>
          <span className="text-sm font-bold text-surface-50">Oryon</span>
        </div>

        {/* Step metadata — animated */}
        <div className="flex-1 overflow-hidden px-8 py-6">
          <AnimatePresence mode="wait">
            {isFormStep && (
              <motion.div
                key={`meta-${formStep}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col h-full"
              >
                {/* Step icon + title */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                    <meta.icon className="w-4 h-4 text-brand-400" />
                  </div>
                  <h2 className="text-sm font-bold text-surface-100 leading-tight">{meta.title}</h2>
                </div>

                {/* Description */}
                <p className="text-xs text-surface-400 leading-relaxed mb-5">
                  {meta.description}
                </p>

                {/* Tips */}
                <div className="flex flex-col gap-2.5">
                  {meta.tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.1 + i * 0.07 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-md bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <tip.icon className="w-2.5 h-2.5 text-brand-400" />
                      </div>
                      <p className="text-xs text-surface-500 leading-relaxed">{tip.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {(step === 'generating' || step === 'preview' || step === 'applying') && (
              <motion.div
                key="meta-generating"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-brand-400" />
                  </div>
                  <h2 className="text-sm font-bold text-surface-100 leading-tight">
                    {step === 'preview' || step === 'applying' ? 'Seu CRM está pronto' : 'IA trabalhando...'}
                  </h2>
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">
                  {step === 'preview' || step === 'applying'
                    ? 'Revise os estágios e campos gerados. Você pode aplicar direto ou gerar novamente com ajustes.'
                    : 'Estamos combinando todas as informações que você forneceu para criar um CRM único para o seu negócio.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step indicator */}
        {isFormStep && (
          <div className="px-8 py-5 border-t border-surface-800/60">
            <StepIndicator current={formStep} steps={visibleFormSteps} />
          </div>
        )}

        {/* Navigation */}
        {isFormStep && (
          <div className="px-8 pb-8 flex flex-col gap-2">
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-900/40"
            >
              {isLastFormStep
                ? <><Sparkles className="w-4 h-4" /> Gerar meu CRM</>
                : <>Próxima etapa <ArrowRight className="w-4 h-4" /></>}
            </button>
            {formStep > 0 && (
              <button
                onClick={() => setFormStep(formStep - 1)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 border border-surface-800 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button
              onClick={handleSkip}
              className="w-full text-center py-1.5 text-xs text-surface-600 hover:text-surface-400 transition-colors"
            >
              Pular — configurar manualmente depois
            </button>
          </div>
        )}
      </div>

      {/* ── Right Panel (form content) ───────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-10 py-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">

          {isFormStep && (
            <motion.div
              key={`form-${formStep}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="bg-surface-900/70 backdrop-blur-sm border border-surface-800 rounded-2xl p-6 shadow-xl">
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-5">
                  Etapa {formStep + 1} de {visibleFormSteps.length} — {visibleFormSteps[formStep].label}
                </p>
                {VISIBLE_STEP_INDICES[formStep] === 0 && <Step0 data={formData} onChange={patch} />}
                {VISIBLE_STEP_INDICES[formStep] === 1 && <Step1 data={formData} onChange={patch} />}
                {VISIBLE_STEP_INDICES[formStep] === 2 && <StepKB tenantId={user?.tenantId} />}
                {VISIBLE_STEP_INDICES[formStep] === 3 && <Step2 data={formData} onChange={patch} />}
                {VISIBLE_STEP_INDICES[formStep] === 4 && <Step3 data={formData} onChange={patch} />}
              </div>
            </motion.div>
          )}

          {step === 'generating' && <GeneratingView key="generating" />}

          {(step === 'preview' || step === 'applying') && config && (
            <PreviewView
              key="preview"
              config={config}
              onApply={() => apply(config)}
              onRetry={retry}
              applying={step === 'applying'}
              error={error}
            />
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
