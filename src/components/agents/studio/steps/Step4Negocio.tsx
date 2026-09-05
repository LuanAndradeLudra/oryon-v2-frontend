import { useState, useEffect } from 'react'
import { Sparkles, Loader2, Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  loadHubAsync, saveHub, hubToBrandLinks,
  DEFAULT_HUB, type CompanyHubData,
} from '@/services/companyContextService'
import type { WizardData } from '../types'
import { readSession } from '../useStudioDraft'
import { INPUT, TEXTAREA } from './constants'

// Step 4 surfaces the global "Contexto da IA" hub inline so the user can edit
// company info without leaving the wizard. Saving here writes to the same
// shared hub Settings → Contexto da IA reads, and mirrors canonical fields
// onto wizard data so downstream prompt generation/review see the latest values.
//
// FAQ and brand-link pickers were removed from this step:
//   - FAQ now lives only in AgentDetail (post-creation editor)
//   - Brand links are derived from the hub's social URL fields

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

const HUB_PRESENCE_FIELDS: { key: 'website' | 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'whatsapp'; label: string; placeholder: string }[] = [
  { key: 'website',   label: 'Site',       placeholder: 'https://suaempresa.com.br' },
  { key: 'instagram', label: 'Instagram',  placeholder: 'https://instagram.com/...' },
  { key: 'facebook',  label: 'Facebook',   placeholder: 'https://facebook.com/...' },
  { key: 'linkedin',  label: 'LinkedIn',   placeholder: 'https://linkedin.com/company/...' },
  { key: 'twitter',   label: 'Twitter/X',  placeholder: 'https://x.com/...' },
  { key: 'whatsapp',  label: 'WhatsApp',   placeholder: '+55 11 9...' },
]

export function Step4Negocio({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const { tenantId } = readSession()
  const [hub, setHub] = useState<CompanyHubData>(DEFAULT_HUB)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // NOTA (extração W0.3): já violava react-hooks/set-state-in-effect no
  // arquivo original (AgentBuilderWizard.tsx) antes da extração — confirmado
  // via lint no commit-base do épico. Preservado como estava (Onda 0 não
  // corrige bugs/lint achados no caminho).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
