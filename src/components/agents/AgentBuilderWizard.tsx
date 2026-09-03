import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2, Sparkles,
  Loader2, MessageSquare, Globe, Instagram, AlertCircle, Zap,
  BookOpen, FileUp, FileText, Upload,
  Briefcase, SmilePlus, GraduationCap, Heart, Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAgent, updateAgent, getAgent, generateAgentPrompt, addAgentKnowledge, extractBrandFile } from '@/services/agentsApi'
import {
  loadHub, loadHubAsync, saveHub, hubToBrandLinks, hubHasContent,
  DEFAULT_HUB, type CompanyHubData,
} from '@/services/companyContextService'
import { appLogger } from '@/services/appLogger'

function readSession() {
  try {
    const raw = localStorage.getItem('oryon:session')
    if (!raw) return { userId: null, tenantId: null, actorName: null }
    const s = JSON.parse(raw) as { user?: { id?: string; tenantId?: string; firstName?: string; lastName?: string } }
    return {
      userId: s.user?.id ?? null, tenantId: s.user?.tenantId ?? null,
      actorName: s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || null : null,
    }
  } catch { return { userId: null, tenantId: null, actorName: null } }
}
import type { AgentConfigWithTools, HandoffRule, HandoffBusinessContext, AgentCrmCapabilities, AgentCrmCapabilityConfig, CrmCapabilityId } from '@/services/agentsApi'
import { CRM_CAPABILITIES_CATALOG } from './crmCapabilitiesCatalog'
import { Switch } from '@/components/ui/Switch'
import { HandoffRulesPanel } from '@/components/agents/HandoffRuleBuilder'
import { PromptArtifact } from '@/components/agents/PromptArtifact'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { WizardProgress } from '@/components/ui/WizardProgress'
import { Banner } from '@/components/ui/Banner'
import { AGENT_ICONS, AgentIcon } from '@/components/agents/AgentIcons'
import { STEP_TEACHINGS } from './agentBuilderTeachings'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  name: string
  icon: string
  sector: string
  objective: string
  persona_name: string
  tone: string
  language: string
  response_style: string[]
  can_do: string[]
  cannot_do: string[]
  company_name: string
  company_description: string
  products_services: string
  faqs: Array<{ question: string; answer: string }>
  extra_context: string
  brand_links: string[]
  brand_links_context: string
  handoff_rules: HandoffRule[]
  knowledge_docs: Array<{ id: string; name: string; content: string; source_type: string }>
  channels_whatsapp: boolean
  channels_messenger: boolean
  channels_instagram: boolean
  /**
   * Phase 25 — opt-in CRM operations. Configured in the Revisão step as a
   * simple toggle list (no constraint pickers — those live in the post-
   * creation "Capacidades" tab where the user has more context about
   * existing tags / stages / atendentes). When a capability is toggled on
   * here, its catalog `defaultConstraints` are applied automatically.
   */
  crm_capabilities: AgentCrmCapabilities
  generated_prompt: string
}

const DEFAULT_DATA: WizardData = {
  name: '', icon: 'bot', sector: '', objective: '',
  persona_name: '', tone: '', language: 'pt-BR', response_style: [],
  can_do: [], cannot_do: [],
  company_name: '', company_description: '', products_services: '',
  faqs: [], extra_context: '',
  brand_links: [], brand_links_context: '',
  handoff_rules: [],
  knowledge_docs: [],
  channels_whatsapp: true, channels_messenger: false, channels_instagram: false,
  crm_capabilities: { capabilities: [] },
  generated_prompt: '',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Identidade', 'Personalidade', 'Escopo', 'Negócio', 'Passar para humano', 'Base de Conhecimento', 'Gerar Prompt', 'Revisão']


const SECTORS = [
  { value: 'ecommerce', label: 'E-commerce / Varejo' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'financeiro', label: 'Financeiro / Investimentos' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'restaurante', label: 'Restaurante / Delivery' },
  { value: 'beleza', label: 'Beleza / Estética' },
  { value: 'tecnologia', label: 'Tecnologia / SaaS' },
  { value: 'servicos', label: 'Serviços Gerais' },
  { value: 'turismo', label: 'Turismo / Viagens' },
  { value: 'automotivo', label: 'Automotivo' },
  { value: 'academias', label: 'Academia / Fitness' },
  { value: 'outro', label: 'Outro' },
]

const TONES: { value: string; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'formal',       label: 'Formal',        desc: 'Profissional e objetivo',  icon: <Briefcase className="w-5 h-5" /> },
  { value: 'casual',       label: 'Casual',         desc: 'Amigável e próximo',       icon: <SmilePlus className="w-5 h-5" /> },
  { value: 'tecnico',      label: 'Técnico',        desc: 'Preciso e especializado',  icon: <GraduationCap className="w-5 h-5" /> },
  { value: 'empatico',     label: 'Empático',       desc: 'Acolhedor e paciente',     icon: <Heart className="w-5 h-5" /> },
  { value: 'entusiasmado', label: 'Entusiasmado',   desc: 'Energético e positivo',    icon: <Flame className="w-5 h-5" /> },
]

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português' },
  { value: 'en',    label: 'English'   },
  { value: 'es',    label: 'Español'   },
]

const RESPONSE_STYLES = [
  'Respostas concisas',
  'Respostas detalhadas',
  'Usa emojis',
  'Usa exemplos práticos',
  'Faz perguntas de acompanhamento',
  'Usa listas e estrutura',
  'Linguagem simples e acessível',
  'Vocabulário técnico do setor',
]

const CAN_DO_PRESETS = [
  'Responder perguntas sobre produtos/serviços',
  'Qualificar leads e coletar informações',
  'Agendar reuniões ou consultas',
  'Verificar status de pedidos',
  'Enviar links, catálogos e materiais',
  'Coletar dados de contato',
  'Responder perguntas frequentes (FAQ)',
  'Fazer follow-up de conversas',
  'Gerar orçamentos simples',
  'Registrar reclamações e sugestões',
  'Apresentar promoções e ofertas',
  'Auxiliar no rastreamento de entregas',
]

const CANNOT_DO_PRESETS = [
  'Processar pagamentos diretamente',
  'Acessar dados bancários ou senhas',
  'Tomar decisões jurídicas ou médicas',
  'Garantir resultados específicos',
  'Compartilhar informações confidenciais',
  'Fazer promessas não autorizadas pela empresa',
  'Finalizar contratos ou acordos',
  'Substituir atendimento humano em emergências',
]

// ─── Hub option lists (Step 4 — Contexto da IA editor) ──────────────────────
// Mirrors the lists in Settings → Contexto da IA. Kept here to avoid coupling
// the wizard to the settings module; should be lifted to a shared module if
// they diverge.

const HUB_INDUSTRIES = [
  'SaaS / Software', 'E-commerce / Varejo', 'Saúde e Bem-estar', 'Educação',
  'Imobiliário', 'Serviços Financeiros', 'Consultoria', 'Agência de Marketing',
  'Indústria / Manufatura', 'Alimentação e Bebidas', 'Construção e Reforma',
  'Logística e Transporte', 'Turismo e Hospitalidade', 'Jurídico', 'Outro',
]

const HUB_BUSINESS_TYPES = ['B2B — Vendo para empresas', 'B2C — Vendo para pessoas', 'B2B2C — Ambos']

const HUB_TEAM_SIZES = [
  'Só eu (1 pessoa)', '2 a 10 pessoas', '11 a 50 pessoas',
  '51 a 200 pessoas', 'Mais de 200 pessoas',
]

// ─── Shared input styles ───────────────────────────────────────────────────────

const INPUT = 'w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition'
const TEXTAREA = INPUT + ' resize-none'

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({
  tags, onChange, placeholder,
}: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder ?? 'Adicionar e pressionar Enter...'}
          className={INPUT}
        />
        <button
          type="button" onClick={add} disabled={!input.trim()}
          className="px-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-surface-600 hover:text-surface-300 transition">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CapabilityPicker ─────────────────────────────────────────────────────────

function CapabilityPicker({
  selected, onChange, presets, addPlaceholder, color,
}: {
  selected: string[]
  onChange: (items: string[]) => void
  presets: string[]
  addPlaceholder: string
  color: 'green' | 'red'
}) {
  const [custom, setCustom] = useState('')
  const activeCls = color === 'green'
    ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
    : 'bg-danger/15 border-danger/30 text-danger ring-1 ring-danger/20'
  const idleCls = 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600 hover:text-surface-300'

  const toggle = (item: string) =>
    onChange(selected.includes(item) ? selected.filter(i => i !== item) : [...selected, item])

  const addCustom = () => {
    const v = custom.trim()
    if (v && !selected.includes(v)) onChange([...selected, v])
    setCustom('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map(preset => (
          <button
            key={preset} type="button" onClick={() => toggle(preset)}
            className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', selected.includes(preset) ? activeCls : idleCls)}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder={addPlaceholder}
          className={INPUT}
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()}
          className="px-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {selected.filter(i => !presets.includes(i)).map(item => (
        <span key={item} className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs', activeCls)}>
          {item}
          <button type="button" onClick={() => onChange(selected.filter(i => i !== item))} className="opacity-60 hover:opacity-100 transition">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Step 1: Identidade ────────────────────────────────────────────────────────

function Step1({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Quem é o seu agente?</h2>
        <p className="text-sm text-surface-500 mt-0.5">Defina a identidade do agente que irá atender seus clientes.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-3">Ícone do agente</label>
        <div className="flex flex-wrap gap-3">
          {AGENT_ICONS.map(({ id, Icon, hoverBg, shadow, stroke, hoverStroke }) => {
            const selected = data.icon === id
            return (
              <button
                key={id} type="button" onClick={() => setData(d => ({ ...d, icon: id }))}
                className={cn(
                  'group w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 border',
                  selected
                    ? ['bg-white', shadow, 'border-transparent ring-2 ring-offset-2 ring-offset-surface-950 ring-surface-100/40 scale-110 shadow-lg']
                    : ['bg-surface-800 border-surface-700 hover:border-transparent hover:scale-105 hover:shadow-lg', hoverBg, `hover:${shadow}`],
                )}
              >
                <Icon className={cn(
                  'w-6 h-6 transition-colors duration-200',
                  selected ? stroke : ['text-surface-400', hoverStroke],
                )} />
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Nome do agente <span className="text-danger">*</span>
        </label>
        <input
          value={data.name}
          onChange={e => setData(d => ({ ...d, name: e.target.value }))}
          placeholder='Ex: "Sofia", "Max", "Aria"'
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Setor / Indústria <span className="text-danger">*</span>
        </label>
        <select
          value={data.sector}
          onChange={e => setData(d => ({ ...d, sector: e.target.value }))}
          className={INPUT}
        >
          <option value="">Selecione o setor...</option>
          {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Objetivo principal <span className="text-danger">*</span>
        </label>
        <textarea
          value={data.objective}
          onChange={e => setData(d => ({ ...d, objective: e.target.value }))}
          placeholder='Ex: "Qualificar leads, apresentar planos e agendar reuniões com a equipe de vendas"'
          rows={3} maxLength={300}
          className={TEXTAREA}
        />
        <p className="text-right text-xs text-surface-700 mt-1">{data.objective.length}/300</p>
      </div>
    </div>
  )
}

// ─── Step 2: Personalidade ────────────────────────────────────────────────────

function Step2({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Como o agente se comunica?</h2>
        <p className="text-sm text-surface-500 mt-0.5">Defina a voz e o estilo de comunicação do seu agente.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Nome da persona <span className="text-surface-600 font-normal">(opcional)</span>
        </label>
        <input
          value={data.persona_name}
          onChange={e => setData(d => ({ ...d, persona_name: e.target.value }))}
          placeholder={data.name || 'Mesmo nome do agente'}
          className={INPUT}
        />
        <p className="text-xs text-surface-600 mt-1">O nome que o agente usa ao se apresentar ao cliente.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">
          Tom de comunicação <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {TONES.map(t => {
            const selected = data.tone === t.value
            return (
              <button
                key={t.value} type="button" onClick={() => setData(d => ({ ...d, tone: t.value }))}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                  selected
                    ? 'bg-status-active-bg border-status-active-border ring-1 ring-status-active-border'
                    : 'bg-surface-800 border-surface-700 hover:border-surface-600',
                )}
              >
                <span className={cn('transition-colors', selected ? 'text-status-active' : 'text-surface-400')}>{t.icon}</span>
                <span className="text-xs font-medium text-surface-200">{t.label}</span>
                <span className="text-[10px] text-surface-500 leading-tight">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">Idioma principal</label>
        <div className="flex gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.value} type="button" onClick={() => setData(d => ({ ...d, language: l.value }))}
              className={cn(
                'flex-1 py-2 rounded-xl border text-sm font-medium transition-all',
                data.language === l.value
                  ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
                  : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">
          Estilo de resposta <span className="text-surface-600 font-normal">(selecione os que se aplicam)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RESPONSE_STYLES.map(style => {
            const on = data.response_style.includes(style)
            return (
              <button
                key={style} type="button"
                onClick={() => setData(d => ({
                  ...d,
                  response_style: on
                    ? d.response_style.filter(s => s !== style)
                    : [...d.response_style, style],
                }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  on
                    ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
                    : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600',
                )}
              >
                {style}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Escopo ───────────────────────────────────────────────────────────

function Step3({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">O que o agente faz — e o que não faz?</h2>
        <p className="text-sm text-surface-500 mt-0.5">Limites claros garantem um atendimento preciso e confiável.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-status-active-bg ring-1 ring-status-active-border flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-status-active" />
          </div>
          <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">Pode fazer</span>
          {data.can_do.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-status-active-bg text-status-active">{data.can_do.length}</span>
          )}
        </div>
        <CapabilityPicker
          selected={data.can_do}
          onChange={items => setData(d => ({ ...d, can_do: items }))}
          presets={CAN_DO_PRESETS}
          addPlaceholder="Adicionar capacidade personalizada..."
          color="green"
        />
        {data.can_do.length === 0 && (
          <p className="text-xs text-amber-500/80 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Selecione pelo menos uma capacidade
          </p>
        )}
      </div>

      <div className="border-t border-surface-800" />

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-5 h-5 rounded-full color-chip flex items-center justify-center flex-shrink-0"
            style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
          >
            <X className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">Não deve fazer</span>
          {data.cannot_do.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md color-chip"
              style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
            >
              {data.cannot_do.length}
            </span>
          )}
        </div>
        <CapabilityPicker
          selected={data.cannot_do}
          onChange={items => setData(d => ({ ...d, cannot_do: items }))}
          presets={CANNOT_DO_PRESETS}
          addPlaceholder="Adicionar restrição personalizada..."
          color="red"
        />
      </div>
    </div>
  )
}

// ─── Step 4: Negócio ──────────────────────────────────────────────────────────

// Step 4 surfaces the global "Contexto da IA" hub inline so the user can edit
// company info without leaving the wizard. Saving here writes to the same
// shared hub Settings → Contexto da IA reads, and mirrors canonical fields
// onto wizard data so downstream prompt generation/review see the latest values.
//
// FAQ and brand-link pickers were removed from this step:
//   - FAQ now lives only in AgentDetail (post-creation editor)
//   - Brand links are derived from the hub's social URL fields

const HUB_PRESENCE_FIELDS: { key: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'whatsapp'; label: string; placeholder: string }[] = [
  { key: 'website',   label: 'Site',       placeholder: 'https://suaempresa.com.br' },
  { key: 'instagram', label: 'Instagram',  placeholder: 'https://instagram.com/...' },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'https://facebook.com/...' },
  { key: 'linkedin',  label: 'LinkedIn',   placeholder: 'https://linkedin.com/company/...' },
  { key: 'twitter',   label: 'Twitter/X',  placeholder: 'https://x.com/...' },
  { key: 'whatsapp',  label: 'WhatsApp',   placeholder: '+55 11 9...' },
]

function Step4({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const { tenantId } = readSession()
  const [hub, setHub] = useState<CompanyHubData>(DEFAULT_HUB)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!tenantId) { setLoading(false); return }
    let cancelled = false
    loadHubAsync(tenantId).then(h => {
      if (cancelled) return
      setHub(h)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [tenantId])

  // Live-mirror hub → wizard data so downstream steps always see the latest
  // values, even if the user advances without clicking Salvar (which persists
  // to the backend separately).
  useEffect(() => {
    if (loading) return
    setData(d => ({
      ...d,
      company_name: hub.companyName,
      company_description: hub.description,
      products_services: hub.productsServices,
      brand_links: hubToBrandLinks(hub),
    }))
  }, [hub, loading, setData])

  const updateHub = <K extends keyof CompanyHubData>(field: K, value: CompanyHubData[K]) => {
    setHub(prev => ({ ...prev, [field]: value }))
    setDirty(true)
    setSavedAt(null)
  }

  const toggleBusinessType = (type: string) => {
    setHub(prev => ({
      ...prev,
      businessType: prev.businessType.includes(type)
        ? prev.businessType.filter(t => t !== type)
        : [...prev.businessType, type],
    }))
    setDirty(true)
    setSavedAt(null)
  }

  const handleSave = () => {
    if (!tenantId || saving) return
    setSaving(true)
    // Persist hub to backend; the live-mirror useEffect already keeps wizard
    // data in sync, so downstream steps see the values immediately.
    saveHub(tenantId, hub)
    // Brief async tick so the saving spinner is perceivable.
    setTimeout(() => {
      setSaving(false)
      setDirty(false)
      setSavedAt(Date.now())
    }, 250)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Sobre o negócio</h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Edite o <span className="text-surface-300">Contexto da IA</span> da sua empresa diretamente aqui.
          Os dados ficam disponíveis para todos os agentes e podem ser ajustados depois em Configurações.
        </p>
      </div>

      <div className="rounded-xl bg-brand-900/15 border border-brand-500/25 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-500/20">
          <Sparkles className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-surface-100">Contexto da IA</p>
            <p className="text-[11px] text-surface-500">
              Sincronizado com Configurações → Contexto da IA
            </p>
          </div>
          {dirty && (
            <span
              className="color-chip text-[10px] px-2 py-0.5 rounded-full border"
              style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}
            >
              Não salvo
            </span>
          )}
          {!dirty && savedAt && (
            <span
              className="color-chip text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
              style={{ ['--chip']: 'var(--color-status-active)' } as React.CSSProperties}
            >
              <Check className="w-3 h-3" /> Salvo
            </span>
          )}
          <button
            type="button" onClick={handleSave} disabled={!dirty || saving || loading}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition',
              !dirty || saving || loading
                ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
                : 'bg-brand-600 text-surface-950 hover:bg-brand-500',
            )}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Salvar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-surface-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando contexto…
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {/* Identidade */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Identidade</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-surface-400 mb-1">Nome da empresa</label>
                  <input
                    value={hub.companyName}
                    onChange={e => updateHub('companyName', e.target.value)}
                    placeholder="Ex: Oryon Hub"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-surface-400 mb-1">Setor / Indústria</label>
                  <select
                    value={hub.industry}
                    onChange={e => updateHub('industry', e.target.value)}
                    className={INPUT}
                  >
                    <option value="">Selecione…</option>
                    {HUB_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-surface-400 mb-1.5">Modelo de negócio</label>
                <div className="flex flex-wrap gap-2">
                  {HUB_BUSINESS_TYPES.map(t => {
                    const on = hub.businessType.includes(t)
                    return (
                      <button
                        key={t} type="button" onClick={() => toggleBusinessType(t)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          on
                            ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
                            : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600',
                        )}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-surface-400 mb-1">Tamanho da equipe</label>
                <select
                  value={hub.teamSize}
                  onChange={e => updateHub('teamSize', e.target.value)}
                  className={INPUT}
                >
                  <option value="">Selecione…</option>
                  {HUB_TEAM_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="border-t border-surface-800/60" />

            {/* Sobre */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Sobre o negócio</p>
              <div>
                <label className="block text-[11px] text-surface-400 mb-1">Descrição</label>
                <textarea
                  value={hub.description}
                  onChange={e => updateHub('description', e.target.value)}
                  rows={3} maxLength={2000}
                  placeholder="O que a empresa faz, missão, público-alvo, diferenciais…"
                  className={TEXTAREA}
                />
              </div>
              <div>
                <label className="block text-[11px] text-surface-400 mb-1">Principais produtos ou serviços</label>
                <textarea
                  value={hub.productsServices}
                  onChange={e => updateHub('productsServices', e.target.value)}
                  rows={3} maxLength={3000}
                  placeholder="Liste produtos/serviços, preços, informações relevantes…"
                  className={TEXTAREA}
                />
              </div>
            </div>

            <div className="border-t border-surface-800/60" />

            {/* Presença online */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Presença online</p>
              <div className="grid grid-cols-2 gap-3">
                {HUB_PRESENCE_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[11px] text-surface-400 mb-1">{label}</label>
                    <input
                      value={hub[key]}
                      onChange={e => updateHub(key, e.target.value)}
                      placeholder={placeholder}
                      className={INPUT}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Materiais (read-only) */}
            {hub.brandFiles?.length > 0 && (
              <>
                <div className="border-t border-surface-800/60" />
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Materiais da marca</p>
                  <div className="space-y-1.5">
                    {hub.brandFiles.map(f => (
                      <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-surface-900/60 border border-surface-800 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                        <span className="text-xs text-surface-300 flex-1 truncate">{f.name}</span>
                        <span className="text-[10px] text-surface-600 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-surface-600">
                    Para adicionar ou remover materiais, acesse Configurações → Contexto da IA.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Per-agent extra context */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Contexto adicional do agente <span className="text-surface-600 font-normal">(opcional)</span>
        </label>
        <textarea
          value={data.extra_context}
          onChange={e => setData(d => ({ ...d, extra_context: e.target.value }))}
          placeholder="Horários de atendimento, políticas de retorno, instruções específicas para este agente…"
          rows={3} maxLength={3000}
          className={TEXTAREA}
        />
        <p className="text-[11px] text-surface-600 mt-1">
          Específico deste agente. Não afeta o Contexto da IA global.
        </p>
      </div>
    </div>
  )
}

// ─── Step 5: Passar para humano ───────────────────────────────────────────────

function Step5({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const businessContext: HandoffBusinessContext = {
    company_name:          data.company_name      || undefined,
    persona_name:          data.persona_name      || undefined,
    sector:                data.sector            || undefined,
    tone:                  data.tone              || undefined,
    products_services:     data.products_services || undefined,
    faqs:                  data.faqs.filter(f => f.question.trim()).length > 0 ? data.faqs : undefined,
    escalation_department: data.handoff_rules.find(r => r.department)?.department || undefined,
    extra_context:         data.extra_context     || undefined,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Regras de encaminhamento</h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Configure regras de encaminhamento por palavras-chave. O agente atende via WhatsApp;
          outros canais serão habilitados em versões futuras. Você pode editar as regras a qualquer momento.
        </p>
      </div>

      {/* Handoff rules panel */}
      <div className="min-h-[300px] flex flex-col">
        <HandoffRulesPanel
          rules={data.handoff_rules}
          businessContext={businessContext}
          onChange={rules => setData(d => ({ ...d, handoff_rules: rules }))}
        />
      </div>
    </div>
  )
}

// ─── Prompt Generating Animation ─────────────────────────────────────────────

const PROMPT_PHASES = [
  'Analisando identidade e setor do agente',
  'Definindo tom e estilo de comunicação',
  'Estruturando capacidades e restrições',
  'Incorporando dados do negócio e FAQs',
  'Mapeando regras de escalada e handoffs',
  'Redigindo seções do system prompt',
  'Refinando linguagem e coesão do texto',
]

const GENERATION_STEPS = [
  {
    id: 'identity',
    label: 'Analisando identidade e setor do agente',
    details: ['Lendo nome, setor e objetivo configurados…', 'Mapeando perfil do público-alvo…', 'Identificando nicho de mercado…', 'Estabelecendo contexto da empresa…'],
  },
  {
    id: 'tone',
    label: 'Definindo tom e estilo de comunicação',
    details: ['Calibrando nível de formalidade…', 'Selecionando vocabulário por setor…', 'Ajustando ritmo e tamanho das respostas…', 'Definindo padrões de abertura e encerramento…'],
  },
  {
    id: 'structure',
    label: 'Estruturando seções do system prompt',
    details: ['Organizando hierarquia de instruções…', 'Definindo seções obrigatórias…', 'Montando fluxo lógico de atendimento…', 'Planejando exemplos de diálogo…'],
  },
  {
    id: 'scope',
    label: 'Incorporando capacidades e restrições',
    details: ['Listando o que o agente pode fazer…', 'Definindo limites e comportamentos proibidos…', 'Integrando FAQs configuradas…', 'Incluindo contexto adicional do negócio…'],
  },
  {
    id: 'handoff',
    label: 'Mapeando regras de escalada e handoffs',
    details: ['Processando palavras-chave de transferência…', 'Configurando condições de escalada…', 'Definindo departamentos de destino…', 'Ajustando respostas de handoff…'],
  },
  {
    id: 'draft',
    label: 'Redigindo o prompt em linguagem natural',
    details: ['Escrevendo instruções em segunda pessoa…', 'Adicionando exemplos concretos de diálogo…', 'Refinando clareza e objetividade…', 'Expandindo edge cases e situações difíceis…'],
  },
  {
    id: 'review',
    label: 'Validando coerência e qualidade final',
    details: ['Verificando consistência das instruções…', 'Revisando tom em todas as seções…', 'Contando palavras e completude…', 'Finalizando e enviando o prompt…'],
  },
]

// Step duration: ~10s each × 7 steps = ~70s, matching the API response time
const STEP_DURATION_MS = 10_000
const DETAIL_CYCLE_MS  = 2_400

function PromptGeneratingAnimation() {
  const [completedSteps, setCompletedSteps] = useState(0)
  const [detailIdx, setDetailIdx]           = useState(0)
  const [elapsed, setElapsed]               = useState(0)

  // Advance steps at STEP_DURATION_MS intervals; last step stays active until API responds
  useEffect(() => {
    if (completedSteps >= GENERATION_STEPS.length - 1) return
    const t = setTimeout(() => {
      setCompletedSteps(s => s + 1)
      setDetailIdx(0)
    }, STEP_DURATION_MS)
    return () => clearTimeout(t)
  }, [completedSteps])

  // Cycle detail text within the active step
  useEffect(() => {
    const step = GENERATION_STEPS[completedSteps]
    if (!step) return
    const t = setInterval(() => setDetailIdx(d => (d + 1) % step.details.length), DETAIL_CYCLE_MS)
    return () => clearInterval(t)
  }, [completedSteps])

  // Elapsed-time counter
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const progressPct = Math.round((completedSteps / GENERATION_STEPS.length) * 100)
  const elapsedLabel = elapsed < 60
    ? `${elapsed}s`
    : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-brand-500/25 bg-surface-900/80 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-800 bg-surface-900">
        {/* Pulsing orb */}
        <div className="relative flex-shrink-0">
          {[0, 1].map(ring => (
            <motion.div
              key={ring}
              className="absolute inset-0 rounded-full border border-brand-400/30"
              animate={{ scale: [1, 1.7 + ring * 0.4], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: ring * 0.6, ease: 'easeOut' }}
            />
          ))}
          <div className="w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            >
              <Sparkles className="w-3 h-3 text-brand-400" />
            </motion.div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-surface-200">Gerando System Prompt</span>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${completedSteps}-${detailIdx}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
              className="text-[11px] text-brand-400/80 truncate"
            >
              {GENERATION_STEPS[completedSteps]?.details[detailIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[11px] text-brand-400 font-mono font-semibold">{progressPct}%</span>
          <span className="text-[10px] text-surface-600 font-mono">{elapsedLabel}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-800">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-300"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      {/* Steps list */}
      <div className="px-4 py-3 space-y-1.5">
        {GENERATION_STEPS.map((step, i) => {
          const done    = i < completedSteps
          const active  = i === completedSteps
          const pending = i > completedSteps
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: pending ? 0.28 : 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors',
                active && 'bg-brand-600/6 ring-1 ring-brand-500/15',
              )}
            >
              {/* Status icon */}
              <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {done ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 350 }}
                    className="w-4 h-4 rounded-full bg-brand-600/25 border border-brand-500/50 flex items-center justify-center"
                  >
                    <Check className="w-2 h-2 text-brand-400" />
                  </motion.div>
                ) : active ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-3.5 h-3.5 rounded-full border-2 border-brand-500/25 border-t-brand-400"
                  />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-surface-700" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'text-xs flex-1 transition-colors',
                done    && 'text-surface-500 line-through decoration-surface-700',
                active  && 'text-surface-100 font-medium',
                pending && 'text-surface-600',
              )}>
                {step.label}
              </span>

              {/* Active step: time indicator */}
              {active && (
                <div className="flex gap-0.5 items-center">
                  {[0, 1, 2].map(d => (
                    <motion.span
                      key={d}
                      animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.4, delay: d * 0.22 }}
                      className="w-0.5 h-2.5 rounded-full bg-brand-400 origin-bottom"
                    />
                  ))}
                </div>
              )}

              {/* Done step: subtle timestamp */}
              {done && (
                <Check className="w-3 h-3 text-brand-600/60 flex-shrink-0" />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-surface-800/60 bg-surface-900/40">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-1.5 h-1.5 rounded-full bg-brand-400"
        />
        <p className="text-[11px] text-surface-500">
          Prompts completos levam entre 60 e 90 segundos — o resultado aparecerá aqui
        </p>
      </div>
    </motion.div>
  )
}


// ─── Step 6: Base de Conhecimento ─────────────────────────────────────────────

const WIZARD_KB_STEPS = [
  'Lendo arquivo...',
  'Extraindo conteúdo com IA...',
  'Analisando estrutura do documento...',
  'Processando texto extraído...',
  'Finalizando extração...',
]

function WizardKBProgress({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => setStep(s => (s + 1) % WIZARD_KB_STEPS.length), 6000)
    const tick = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(stepTimer); clearInterval(tick) }
  }, [])

  const progress = Math.min(95, elapsed * 1.2)

  return (
    <div className="p-3 bg-surface-900/60 border border-surface-800 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
        <p className="text-xs text-surface-200 font-medium truncate">{fileName}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative w-3.5 h-3.5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-[11px] text-brand-400 transition-all duration-500">{WIZARD_KB_STEPS[step]}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-surface-600 tabular-nums w-8 text-right">{elapsed}s</span>
      </div>
    </div>
  )
}

function Step6KB({
  data, setData,
}: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const [textInput, setTextInput] = useState('')
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addTextDoc = () => {
    const trimmed = textInput.trim()
    if (!trimmed) return
    const id = `kb-${Date.now()}`
    setData(d => ({
      ...d,
      knowledge_docs: [...d.knowledge_docs, { id, name: `Texto-${d.knowledge_docs.length + 1}`, content: trimmed, source_type: 'text' }],
    }))
    setTextInput('')
    setViewingDocId(id)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    // Sequential processing so the "X of Y" progress label below makes sense
    // and the backend isn't hit with concurrent extraction jobs (PDF parsing
    // is CPU-heavy on the agent-server side). Each file gets its own doc
    // entry in knowledge_docs; failures are logged but don't abort the batch.
    const failed: string[] = []
    const total = files.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadingFile(total > 1 ? `${file.name} (${i + 1}/${total})` : file.name)
      try {
        const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')
        let content: string
        let contentType: 'base64' | 'text'

        if (isText) {
          content = await file.text()
          contentType = 'text'
        } else {
          const buffer = await file.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
          content = btoa(binary)
          contentType = 'base64'
        }

        const extracted = await extractBrandFile(file.name, file.type || 'text/plain', content, contentType)
        // Suffix the id with the index so a fast batch (sub-ms apart) doesn't
        // collide on Date.now() and produce duplicate doc ids.
        const id = `kb-${Date.now()}-${i}`
        setData(d => ({
          ...d,
          knowledge_docs: [...d.knowledge_docs, { id, name: file.name, content: extracted, source_type: 'file' }],
        }))
        // Only auto-focus the LAST successful upload — focusing each one
        // mid-batch is jarring when the user picked 10 files at once.
        if (i === files.length - 1) setViewingDocId(id)
      } catch (err) {
        console.error('[KB upload]', file.name, err)
        failed.push(file.name)
      }
    }
    if (failed.length > 0) {
      alert(
        `Falha ao processar ${failed.length} arquivo${failed.length > 1 ? 's' : ''}:\n` +
        failed.map((n) => `• ${n}`).join('\n'),
      )
    }
    setUploadingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const [removeDocTarget, setRemoveDocTarget] = useState<string | null>(null)
  const removeDoc = () => {
    if (!removeDocTarget) return
    setData(d => ({ ...d, knowledge_docs: d.knowledge_docs.filter(doc => doc.id !== removeDocTarget) }))
    if (viewingDocId === removeDocTarget) setViewingDocId(null)
    setRemoveDocTarget(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-400" />
          Base de Conhecimento
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Adicione documentos, textos ou arquivos que o agente usará como referência para responder.
        </p>
      </div>

      {/* Upload file */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400">Enviar arquivos (PDF, DOCX, TXT, imagem)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadingFile}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 transition disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {uploadingFile ? `Enviando ${uploadingFile}…` : 'Selecionar arquivos'}
        </button>
      </div>

      {/* Text input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400">Ou cole um texto diretamente</label>
        <textarea
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          rows={4}
          placeholder="Cole aqui informações que o agente deve conhecer..."
          className={TEXTAREA}
        />
        <button
          type="button" onClick={addTextDoc} disabled={!textInput.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar texto
        </button>
      </div>

      {/* Upload progress */}
      {uploadingFile && <WizardKBProgress fileName={uploadingFile} />}

      {/* Document list */}
      {data.knowledge_docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400">{data.knowledge_docs.length} documento(s) adicionado(s)</p>
          {data.knowledge_docs.map(doc => (
            <div key={doc.id} className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-surface-900/60 border border-surface-800 rounded-xl">
                <FileText className="w-4 h-4 text-surface-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-200 truncate">{doc.name}</p>
                  <p className="text-[10px] text-surface-600">
                    {doc.content.length.toLocaleString()} caracteres · {doc.source_type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDocId(viewingDocId === doc.id ? null : doc.id)}
                  className={cn(
                    'p-1 rounded transition',
                    viewingDocId === doc.id ? 'text-brand-400' : 'text-surface-600 hover:text-brand-400',
                  )}
                  title="Ver/Editar conteúdo"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button" onClick={() => setRemoveDocTarget(doc.id)}
                  className="p-1 rounded text-surface-600 hover:text-danger transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {viewingDocId === doc.id && (
                <KnowledgeDocArtifact
                  title={doc.name}
                  content={doc.content}
                  onChange={newContent => {
                    setData(d => ({
                      ...d,
                      knowledge_docs: d.knowledge_docs.map(dd =>
                        dd.id === doc.id ? { ...dd, content: newContent } : dd,
                      ),
                    }))
                  }}
                  onCancel={() => setViewingDocId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {data.knowledge_docs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <FileUp className="w-8 h-8 text-surface-700" />
          <p className="text-xs text-surface-600">Nenhum documento adicionado ainda. Este passo é opcional.</p>
        </div>
      )}

      <ConfirmModal
        open={!!removeDocTarget}
        onClose={() => setRemoveDocTarget(null)}
        onConfirm={removeDoc}
        title="Remover documento"
        description="O documento será removido da base de conhecimento do agente. Esta ação não pode ser desfeita."
        confirmLabel="Remover documento"
        danger
      />
    </div>
  )
}

// ─── Step 7: Gerar Prompt ─────────────────────────────────────────────────────

/**
 * Centered modal that opens automatically after the system prompt is generated
 * (and on demand from the inline summary card). Hosts a draft copy of the
 * prompt so cancelling discards edits without touching the wizard data.
 */
function PromptReviewModal({
  open, initialPrompt, onConfirm, onClose, onRegenerate, regenerating,
}: {
  open: boolean
  initialPrompt: string
  onConfirm: (prompt: string) => void
  onClose: () => void
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  const [draft, setDraft] = useState(initialPrompt)

  // Reset the draft whenever the modal opens or the underlying prompt changes
  // (e.g., after a regenerate triggered from inside the modal).
  useEffect(() => {
    if (open) setDraft(initialPrompt)
  }, [open, initialPrompt])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revisar System Prompt"
      // Fixed-height panel so the modal doesn't grow/shrink with prompt
      // length. fillHeight delegates scroll to PromptArtifact (in fillHeight
      // mode), avoiding the double scrollbar.
      className="max-w-3xl h-[88vh]"
      fillHeight
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={() => onConfirm(draft)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-surface-950 hover:bg-brand-500 transition"
          >
            <Check className="w-3.5 h-3.5" /> Confirmar e continuar
          </button>
        </div>
      }
    >
      <p className="text-xs text-surface-500 mb-4 flex-shrink-0">
        Revise o prompt gerado e edite se necessário. Após confirmar, você volta ao builder
        e segue para a revisão final do agente.
      </p>
      <PromptArtifact
        content={draft}
        onChange={setDraft}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        fillHeight
      />
    </Modal>
  )
}

function Step6({
  data, setData,
}: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const prompt = await generateAgentPrompt({
        identity: { name: data.name, emoji: '', sector: data.sector, objective: data.objective },
        personality: {
          persona_name: data.persona_name || data.name,
          tone: data.tone, language: data.language, response_style: data.response_style,
        },
        scope: { can_do: data.can_do, cannot_do: data.cannot_do },
        business: {
          company_name: data.company_name, company_description: data.company_description,
          products_services: data.products_services, faqs: data.faqs,
          extra_context: [data.extra_context, data.brand_links_context].filter(Boolean).join('\n\n'),
        },
        deployment: {
          escalation_keywords: data.handoff_rules.flatMap(r => r.keywords).slice(0, 20),
          escalation_conditions: data.handoff_rules.map(r => r.description ?? r.name).filter(Boolean),
          escalation_department: data.handoff_rules.find(r => r.department)?.department ?? '',
          channels: [
            data.channels_whatsapp && 'WhatsApp',
            data.channels_messenger && 'Messenger',
            data.channels_instagram && 'Instagram',
          ].filter(Boolean) as string[],
        },
      })
      setData(d => ({ ...d, generated_prompt: prompt }))
      // Open the review modal right after a successful generation so the user
      // can read the full prompt comfortably and edit before confirming.
      setReviewOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor')
    } finally {
      setGenerating(false)
    }
  }, [data, setData])

  const summaryItems = [
    { label: 'Agente',       value: data.name },
    { label: 'Tom',          value: TONES.find(t => t.value === data.tone)?.label ?? '—' },
    { label: 'Empresa',      value: data.company_name || '—' },
    { label: 'Capacidades',  value: `${data.can_do.length} configuradas` },
    { label: 'Restrições',   value: `${data.cannot_do.length} configuradas` },
    { label: 'FAQs',         value: `${data.faqs.filter(f => f.question).length} perguntas` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Gerar System Prompt com IA</h2>
        <p className="text-sm text-surface-500 mt-0.5">
          A IA irá criar um prompt completo e robusto com base em tudo que você configurou.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {summaryItems.map(({ label, value }) => (
          <div key={label} className="bg-surface-900/60 border border-surface-800 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-surface-600 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-surface-200 font-medium truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Idle state — ready to generate */}
      {!data.generated_prompt && !manualMode && !generating && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/10 ring-1 ring-brand-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-brand-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-surface-200">Pronto para gerar</p>
            <p className="text-xs text-surface-500 mt-1">O prompt terá entre 1.200 e 2.500 palavras, estruturado em seções claras</p>
          </div>
          <button
            type="button" onClick={generate}
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-medium transition-all shadow-lg shadow-brand-900/40"
          >
            <Sparkles className="w-5 h-5" />
            Gerar System Prompt com IA
          </button>
          {error && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-danger flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
              <button
                type="button" onClick={() => setManualMode(true)}
                className="text-xs text-surface-500 hover:text-surface-300 underline transition"
              >
                Escrever o prompt manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generating animation */}
      {generating && <PromptGeneratingAnimation />}

      {/* Completed — collapsed inline preview (first 10 lines).
          Editing happens only in the modal; both views share data.generated_prompt. */}
      {data.generated_prompt && !generating && !manualMode && (
        <PromptArtifact
          content={data.generated_prompt}
          previewLines={8}
          onExpand={() => setReviewOpen(true)}
          onRegenerate={generate}
          regenerating={generating}
        />
      )}

      {/* Manual mode — plain textarea */}
      {manualMode && (
        <div className="space-y-2">
          <p className="text-xs text-surface-500">System prompt — modo manual</p>
          <textarea
            value={data.generated_prompt}
            onChange={e => setData(d => ({ ...d, generated_prompt: e.target.value }))}
            rows={18} maxLength={10000}
            placeholder="Escreva o system prompt do agente aqui..."
            className="w-full bg-surface-900/80 border border-surface-800 rounded-xl px-4 py-3 text-xs text-surface-300 font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition"
          />
          <p className="text-right text-xs text-surface-700">{data.generated_prompt.length.toLocaleString()} caracteres</p>
        </div>
      )}

      {/* Review modal — opens automatically after generation, reopenable from card */}
      <PromptReviewModal
        open={reviewOpen}
        initialPrompt={data.generated_prompt}
        onClose={() => setReviewOpen(false)}
        onConfirm={(prompt) => {
          setData(d => ({ ...d, generated_prompt: prompt }))
          setReviewOpen(false)
        }}
        onRegenerate={generate}
        regenerating={generating}
      />
    </div>
  )
}

// ─── CRM Capabilities Review (inline in Step 8) ──────────────────────────────
// Lightweight on/off toggles for the CRM capability groups. Constraints
// (allowlists) are deliberately NOT exposed here — those need real tag/user/
// stage data the user typically only finalises after the agent is created.
// The post-creation "Capacidades" tab is where fine-tuning happens.

function CapabilitiesReview({
  data, setData,
}: {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
}) {
  const map = new Map<CrmCapabilityId, AgentCrmCapabilityConfig>(
    data.crm_capabilities.capabilities.map((c) => [c.id, c]),
  )

  const toggle = (id: CrmCapabilityId, enable: boolean) => {
    const entry = CRM_CAPABILITIES_CATALOG.find((c) => c.id === id)
    setData((d) => {
      const without = d.crm_capabilities.capabilities.filter((c) => c.id !== id)
      const nextCaps: AgentCrmCapabilityConfig[] = enable
        ? [
            ...without,
            {
              id,
              enabled: true,
              // Apply the catalog's conservative defaults (e.g. block 'resolved'
              // status). User can refine later in the "Capacidades" tab.
              ...(entry?.defaultConstraints ? { constraints: entry.defaultConstraints } : {}),
            },
          ]
        : without
      const updated: AgentCrmCapabilities = { capabilities: nextCaps }
      return { ...d, crm_capabilities: updated }
    })
  }

  const enabledCount = data.crm_capabilities.capabilities.filter((c) => c.enabled).length

  return (
    <div className="bg-surface-900/60 border border-surface-800 rounded-xl px-4 py-3 flex-shrink-0">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] text-surface-300 font-semibold uppercase tracking-wide">
          Capacidades de CRM <span className="text-surface-600 font-normal normal-case">(opcional)</span>
        </p>
        {enabledCount > 0 && (
          <span className="text-[10px] text-brand-400">{enabledCount} habilitada(s)</span>
        )}
      </div>
      <p className="text-[11px] text-surface-500 mb-3">
        Quais ações o agente pode executar dentro do CRM ao atender no WhatsApp. Você pode ajustar limites depois na aba <strong>Capacidades</strong>.
      </p>
      <div className="space-y-1">
        {CRM_CAPABILITIES_CATALOG.map((entry) => {
          const enabled = !!map.get(entry.id)?.enabled
          return (
            <label
              key={entry.id}
              className={cn(
                'flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                enabled ? 'bg-brand-950/30' : 'hover:bg-surface-800/40',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                  enabled ? 'bg-brand-700/30 text-brand-300' : 'bg-surface-900 text-surface-500',
                )}
              >
                {entry.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-200">{entry.label}</p>
                <p className="text-[11px] text-surface-500 truncate">{entry.description}</p>
              </div>
              <Switch checked={enabled} onChange={(v) => toggle(entry.id, v)} />
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 7: Revisão & Publicar ───────────────────────────────────────────────

function Step7({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const [reviewOpen, setReviewOpen] = useState(false)

  const activeChannels = [
    data.channels_whatsapp && 'WhatsApp',
    data.channels_messenger && 'Messenger',
    data.channels_instagram && 'Instagram',
  ].filter(Boolean) as string[]

  const sectorLabel = SECTORS.find(s => s.value === data.sector)?.label ?? data.sector
  const toneLabel   = TONES.find(t => t.value === data.tone)?.label ?? data.tone

  return (
    <div className="flex flex-col min-h-0 h-full gap-4">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Tudo pronto para publicar</h2>
        <p className="text-sm text-surface-500 mt-0.5">Revise as configurações antes de ativar o agente.</p>
      </div>

      <div className="bg-surface-900/60 border border-surface-800 rounded-xl p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <AgentIcon iconId={data.icon} className="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-100">{data.name}</p>
            <p className="text-xs text-surface-500">{sectorLabel} · Tom: {toneLabel}</p>
          </div>
          {data.persona_name && data.persona_name !== data.name && (
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-surface-600">Persona</p>
              <p className="text-xs text-surface-300">{data.persona_name}</p>
            </div>
          )}
        </div>
        {data.objective && (
          <p className="text-xs text-surface-500 mt-2 p-2 border-t border-surface-800 rounded-lg">{data.objective}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        {[
          { label: 'Empresa',        value: data.company_name || '—' },
          { label: 'Canais',         value: activeChannels.length > 0 ? activeChannels.join(', ') : 'Nenhum' },
          { label: 'Capacidades',    value: `${data.can_do.length} itens` },
          { label: 'Restrições',     value: `${data.cannot_do.length} itens` },
          { label: 'FAQs',           value: `${data.faqs.filter(f => f.question).length} perguntas` },
          { label: 'Encaminhamentos', value: data.handoff_rules.length > 0 ? `${data.handoff_rules.length} regra(s)` : 'Nenhuma' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-900/60 border border-surface-800 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-surface-600 uppercase tracking-wide">{label}</p>
            <p className="text-xs font-medium text-surface-200 truncate">{value}</p>
          </div>
        ))}
      </div>

      <CapabilitiesReview data={data} setData={setData} />


      {/* Prompt artifact — fills remaining vertical space */}
      <div className="flex flex-col flex-1 min-h-0">
        {data.generated_prompt ? (
          <PromptArtifact
            content={data.generated_prompt}
            readOnly
            fillHeight
            onExpand={() => setReviewOpen(true)}
          />
        ) : (
          <Banner variant="warning">Volte ao passo anterior e gere o system prompt antes de publicar.</Banner>
        )}
      </div>

      {/* Full-screen review modal — same component used in Step 7 (Gerar Prompt) */}
      <PromptReviewModal
        open={reviewOpen}
        initialPrompt={data.generated_prompt}
        onClose={() => setReviewOpen(false)}
        onConfirm={(prompt) => {
          setData(d => ({ ...d, generated_prompt: prompt }))
          setReviewOpen(false)
        }}
      />
    </div>
  )
}

// ─── Animated background orbs ────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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

// ─── Wizard root ──────────────────────────────────────────────────────────────

interface AgentBuilderWizardProps {
  onClose: () => void
  onCreated: (agent: AgentConfigWithTools) => void
}

export function AgentBuilderWizard({ onClose, onCreated }: AgentBuilderWizardProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(DEFAULT_DATA)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const sessionIdRef    = useRef(`wiz-agent-${Date.now()}`)
  const completedRef    = useRef(false)

  useEffect(() => {
    sessionIdRef.current = `wiz-agent-${Date.now()}`
    completedRef.current = false
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: 1, step_name: STEP_LABELS[0], action: 'started',
    })
    // Pre-fill Step 4 (Negócio) from Company Context Hub
    if (tenantId) {
      const hub = loadHub(tenantId)
      if (hub.companyName || hub.description || hub.productsServices) {
        setData(prev => ({
          ...DEFAULT_DATA,
          ...prev,
          company_name: prev.company_name || hub.companyName,
          company_description: prev.company_description || hub.description,
          products_services: prev.products_services || hub.productsServices,
          brand_links: prev.brand_links.length ? prev.brand_links : hubToBrandLinks(hub),
        }))
      }
    }
    return () => {
      // Fires when wizard closes (open → false or unmount)
      if (completedRef.current) return
      const { userId: uid, tenantId: tid } = readSession()
      appLogger.logWizardEvent({
        tenant_id: tid, user_id: uid,
        wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
        step_number: step, step_name: STEP_LABELS[step - 1], action: 'abandoned',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validate = useCallback((): string | null => {
    switch (step) {
      case 1:
        if (!data.name.trim()) return 'Informe o nome do agente'
        if (!data.sector) return 'Selecione o setor'
        if (!data.objective.trim()) return 'Descreva o objetivo do agente'
        return null
      case 2:
        if (!data.tone) return 'Selecione o tom de comunicação'
        return null
      case 3:
        if (data.can_do.length === 0) return 'Selecione pelo menos uma capacidade'
        return null
      case 4: {
        const { tenantId: tid } = readSession()
        const h = tid ? loadHub(tid) : null
        if (h && hubHasContent(h)) return null
        if (!data.company_name.trim()) return 'Informe o nome da empresa'
        if (!data.company_description.trim()) return 'Descreva o negócio'
        return null
      }
      case 7:
        if (!data.generated_prompt) return 'Gere o system prompt antes de revisar'
        return null
      default:
        return null
    }
  }, [step, data])

  const next = () => {
    const err = validate()
    if (err) { setValidationError(err); return }
    setValidationError(null)
    const { userId, tenantId, actorName } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: step, step_name: STEP_LABELS[step - 1], action: 'completed',
      data: { agent_name: data.name, sector: data.sector },
    })
    setStep(s => Math.min(s + 1, STEP_LABELS.length))
  }

  const back = () => {
    setValidationError(null)
    const { userId, tenantId } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: step, step_name: STEP_LABELS[step - 1], action: 'back',
    })
    setStep(s => Math.max(s - 1, 1))
  }

  // Any real user input (name/objective/sector) or advancement past step 1
  // counts as progress worth confirming before discarding.
  const isDirty = step > 1
    || data.name.trim() !== ''
    || data.objective.trim() !== ''
    || data.sector !== ''

  const handleCloseClick = () => {
    if (publishing) return
    if (isDirty) { setCloseConfirmOpen(true); return }
    onClose()
  }

  const handlePublish = async (status: 'active' | 'draft') => {
    setPublishing(true)
    setPublishError(null)
    const { userId, tenantId, actorName } = readSession()
    appLogger.logWizardEvent({
      tenant_id: tenantId, user_id: userId,
      wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
      step_number: 8, step_name: 'Revisão', action: 'started',
      data: { publish_mode: status, agent_name: data.name },
    })
    try {
      const raw = await createAgent(data.name, data.generated_prompt, {
        icon: data.icon,
        sector: data.sector ?? undefined,
        objective: data.objective ?? undefined,
      })
      await updateAgent(raw.id, {
        icon: data.icon,
        sector: data.sector ?? undefined,
        objective: data.objective ?? undefined,
        handoff_rules: { rules: data.handoff_rules },
        channels: {
          whatsapp:  { enabled: data.channels_whatsapp  },
          messenger: { enabled: data.channels_messenger },
          instagram: { enabled: data.channels_instagram },
        },
        // Phase 25 — persist CRM capabilities chosen in the wizard's review step.
        // Skip the field entirely when the user didn't enable anything so
        // existing tenants without capabilities aren't churned.
        ...(data.crm_capabilities.capabilities.length > 0
          ? { crm_capabilities: data.crm_capabilities }
          : {}),
        wizard_config: {
          identity: {
            name:      data.name,
            icon:      data.icon,
            sector:    data.sector,
            objective: data.objective,
          },
          personality: {
            persona_name:   data.persona_name,
            tone:           data.tone,
            language:       data.language,
            response_style: data.response_style,
          },
          scope: {
            can_do:    data.can_do,
            cannot_do: data.cannot_do,
            faqs:      data.faqs,
          },
          business: {
            company_name:        data.company_name,
            company_description: data.company_description,
            products_services:   data.products_services,
            extra_context:       data.extra_context,
            brand_links:         data.brand_links,
            brand_links_context: data.brand_links_context,
          },
          deployment: {
            channels_whatsapp:  data.channels_whatsapp,
            channels_messenger: data.channels_messenger,
            channels_instagram: data.channels_instagram,
            handoff_rules:      data.handoff_rules,
          },
        },
        status,
      })
      // Upload knowledge docs (best-effort)
      for (const doc of data.knowledge_docs) {
        try {
          await addAgentKnowledge(raw.id, {
            document_id: doc.id,
            document_name: doc.name,
            content: doc.content,
            source_type: doc.source_type,
          })
        } catch (err) {
          console.warn('[wizard] Failed to upload knowledge doc:', doc.name, err)
        }
      }
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
        step_number: 8, step_name: 'Revisão', action: 'completed',
        data: {
          agent_id: raw.id, agent_name: data.name, publish_mode: status,
          handoff_rules_count: data.handoff_rules.length,
          channels: { whatsapp: data.channels_whatsapp, messenger: data.channels_messenger, instagram: data.channels_instagram },
          prompt_length: data.generated_prompt.length,
        },
      })
      appLogger.logActivity({
        tenant_id: tenantId, actor_id: userId, actor_name: actorName,
        action: 'agent_builder_completed', entity_type: 'ai_agent',
        entity_id: raw.id, entity_name: data.name,
        description: `Agente "${data.name}" criado via wizard e ${status === 'active' ? 'publicado' : 'salvo como rascunho'}`,
        details: { sector: data.sector, publish_mode: status, handoff_rules: data.handoff_rules.length },
        source: 'ui',
      })
      completedRef.current = true
      // Re-fetch the full agent so the caller (AgentsPage → AgentDetail)
      // sees the authoritative post-PATCH state: handoff_rules, channels,
      // wizard_config, status, and any knowledge docs just uploaded. The
      // previous `...raw` path used the initial POST response, which was
      // taken BEFORE the PATCH that actually persisted handoff_rules —
      // so the Regras tab opened empty until the user clicked away and
      // back (triggering AgentsPage.selectAgent which re-fetches).
      let agent: AgentConfigWithTools
      try {
        agent = await getAgent(raw.id)
      } catch {
        // Fallback to the merged local state so publish never silently
        // fails just because the final GET had a transient hiccup.
        agent = {
          ...raw,
          tools: raw.tools ?? [],
          system_prompt: data.generated_prompt,
          icon: data.icon,
          sector: data.sector ?? null,
          objective: data.objective ?? null,
          handoff_rules: { rules: data.handoff_rules },
          status,
        }
      }
      onCreated(agent)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar agente'
      appLogger.logWizardEvent({
        tenant_id: tenantId, user_id: userId,
        wizard_type: 'agent_builder', wizard_session_id: sessionIdRef.current,
        step_number: 8, step_name: 'Revisão', action: 'error',
        error_message: msg,
      })
      setPublishError(msg)
    } finally {
      setPublishing(false)
    }
  }

  const teaching = STEP_TEACHINGS[step - 1]
  const TeachingIcon = teaching.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-surface-950"
    >
          <div className="h-full flex overflow-hidden relative">
            <BackgroundOrbs />

            {/* ── LEFT TUTOR PANEL ─────────────────────────────────────── */}
            <div className="relative z-10 w-80 flex-shrink-0 flex flex-col border-r border-surface-800/60 bg-surface-950/80 backdrop-blur-sm">
              {/* Brand header + close */}
              <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-surface-800/60 flex-shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50 flex-shrink-0"
                >
                  <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Studio</p>
                  <h1 className="text-sm font-bold text-surface-50 truncate">Criar Agente IA</h1>
                </div>
                <button
                  onClick={handleCloseClick}
                  disabled={publishing}
                  aria-label="Fechar"
                  className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Teaching content — fills remaining height, scrolls if needed */}
              <div className="flex-1 overflow-y-auto px-8 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`teach-${step}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
                        style={{
                          color: teaching.accent,
                          backgroundColor: `color-mix(in srgb, ${teaching.accent} 18%, transparent)`,
                          borderColor: `color-mix(in srgb, ${teaching.accent} 32%, transparent)`,
                        }}
                      >
                        <TeachingIcon className="w-4.5 h-4.5" />
                      </div>
                      <h2 className="text-base font-bold text-surface-100 leading-tight">{teaching.title}</h2>
                    </div>
                    <p className="text-sm text-surface-400 leading-relaxed mb-6">{teaching.description}</p>
                    <div className="flex flex-col gap-3">
                      {teaching.tips.map((tip, i) => {
                        const TipIcon = tip.icon
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: 0.1 + i * 0.07 }}
                            className="flex items-start gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-md bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <TipIcon className="w-3 h-3 text-brand-400" />
                            </div>
                            <p className="text-xs text-surface-500 leading-relaxed">{tip.text}</p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Nav buttons + errors */}
              <div className="px-8 pt-4 pb-8 border-t border-surface-800/60 flex flex-col gap-2 flex-shrink-0">
                {step < 8 && validationError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-1 text-xs text-danger flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>{validationError}</span>
                  </motion.p>
                )}
                {step === 8 && publishError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-1 text-xs text-danger flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>{publishError}</span>
                  </motion.p>
                )}
                {step === 8 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePublish('active')}
                      disabled={publishing || !data.generated_prompt}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-surface-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-900/40"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {publishing ? 'Publicando...' : 'Publicar agente'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublish('draft')}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 border border-surface-800 transition-all disabled:opacity-50"
                    >
                      Salvar como rascunho
                    </button>
                    <button
                      type="button"
                      onClick={back}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-surface-500 hover:text-surface-300 transition-all disabled:opacity-50"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={next}
                      disabled={step === 7 && !data.generated_prompt}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-surface-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-900/40"
                    >
                      {step === 7 ? <><Sparkles className="w-4 h-4" /> Revisar</> : <>Continuar <ChevronRight className="w-4 h-4" /></>}
                    </button>
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={back}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 border border-surface-800 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" /> Voltar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── RIGHT FORM PANEL ─────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col">
              {/* Sticky top: progress bar + horizontal stepper */}
              <WizardProgress
                steps={STEP_LABELS}
                currentStep={step}
                onStepClick={s => { setValidationError(null); setStep(s) }}
                className="flex-shrink-0 bg-surface-950/85 backdrop-blur-md border-b border-surface-800/40"
              />

              {/* Scrollable form content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-10 py-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`form-${step}`}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <div className="bg-surface-900/70 backdrop-blur-sm overlay-frame border rounded-2xl p-6">
                        {step === 1 && <Step1 data={data} setData={setData} />}
                        {step === 2 && <Step2 data={data} setData={setData} />}
                        {step === 3 && <Step3 data={data} setData={setData} />}
                        {step === 4 && <Step4 data={data} setData={setData} />}
                        {step === 5 && <Step5 data={data} setData={setData} />}
                        {step === 6 && <Step6KB data={data} setData={setData} />}
                        {step === 7 && <Step6 data={data} setData={setData} />}
                        {step === 8 && <Step7 data={data} setData={setData} />}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

      <ConfirmModal
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => { setCloseConfirmOpen(false); onClose() }}
        title="Descartar agente em criação?"
        description={`Você está na etapa ${step} de ${STEP_LABELS.length}. Ao fechar agora, todo o progresso feito neste agente será perdido.`}
        confirmLabel="Descartar"
        danger
      />
    </motion.div>
  )
}
