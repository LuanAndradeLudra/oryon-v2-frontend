import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { VERTICAL_TEMPLATES } from '@/lib/verticalTemplates'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import type { TenantVocabulary } from '@/types'

// ─── Vocabulary keys and labels ───────────────────────────────────────────────

const VOCAB_FIELDS: Array<{ key: keyof TenantVocabulary; label: string; hint: string }> = [
  { key: 'contact',   label: 'Contato (singular)', hint: 'ex: Lead, Paciente, Cliente, Aluno' },
  { key: 'contacts',  label: 'Contatos (plural)',  hint: 'ex: Leads, Pacientes, Clientes' },
  { key: 'deal',      label: 'Negócio (singular)', hint: 'ex: Negócio, Consulta, Imóvel, Processo' },
  { key: 'deals',     label: 'Negócios (plural)',  hint: 'ex: Negócios, Consultas, Imóveis' },
  { key: 'agent',     label: 'Agente (singular)',  hint: 'ex: Agente, Recepcionista, Corretor' },
  { key: 'agents',    label: 'Agentes (plural)',   hint: 'ex: Agentes, Recepcionistas, Corretores' },
  { key: 'leadScore', label: 'Lead Score',         hint: 'ex: Lead Score, Prioridade, Temperatura' },
  { key: 'intent',    label: 'Intenção',           hint: 'ex: Intenção de compra, Urgência, Interesse' },
  { key: 'pipeline',  label: 'Pipeline / Funil',   hint: 'ex: Funil, Agenda, Pipeline, Fila' },
  { key: 'company',   label: 'Empresa',            hint: 'ex: Empresa, Clínica, Escritório, Escola' },
  { key: 'jobTitle',  label: 'Cargo',              hint: 'ex: Cargo, Especialidade, Área' },
]

// ─── Template Card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  id: string
  emoji: string
  label: string
  description: string
  color: string
  isActive: boolean
  onClick: () => void
}

function TemplateCard({ id, emoji, label, description, color, isActive, onClick }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left p-4 rounded-xl border transition-all group ${
        isActive
          ? 'border-current bg-surface-800'
          : 'border-surface-700 bg-surface-900 hover:border-surface-600 hover:bg-surface-800/60'
      }`}
      style={isActive ? { borderColor: color, boxShadow: `0 0 0 1px ${color}30` } : {}}
    >
      {isActive && (
        <span
          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
      <span className="text-2xl mb-2 block">{emoji}</span>
      <p className="text-sm font-semibold text-surface-100 mb-0.5">{label}</p>
      <p className="text-[11px] text-surface-500 leading-relaxed">{description}</p>
    </button>
  )
}

// ─── Vocabulary Preview diff ──────────────────────────────────────────────────

function VocabDiff({ current, next }: { current: TenantVocabulary; next: TenantVocabulary }) {
  const changed = VOCAB_FIELDS.filter((f) => current[f.key] !== next[f.key])
  if (changed.length === 0) return null

  return (
    <div className="mt-4 rounded-lg border border-status-pending-border bg-status-pending-bg p-3">
      <p className="text-[11px] font-semibold text-status-pending uppercase tracking-wide mb-2">
        Termos que serão alterados
      </p>
      <div className="flex flex-col gap-1.5">
        {changed.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-xs">
            <span className="text-surface-500 w-28 flex-shrink-0">{f.label}:</span>
            <span className="text-red-400 line-through">{current[f.key]}</span>
            <span className="text-surface-500">→</span>
            <span className="text-status-active font-medium">{next[f.key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Custom vocabulary editor ─────────────────────────────────────────────────

function VocabEditor({ vocab, onChange }: { vocab: TenantVocabulary; onChange: (v: TenantVocabulary) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {VOCAB_FIELDS.map((f) => (
        <div key={f.key}>
          <label className="block text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-1">
            {f.label}
          </label>
          <input
            type="text"
            value={vocab[f.key]}
            placeholder={f.hint}
            onChange={(e) => onChange({ ...vocab, [f.key]: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-[10px] text-surface-600 mt-0.5">{f.hint}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Stage preview ───────────────────────────────────────────────────────────

function StagePreview({ templateId }: { templateId: string }) {
  const template = VERTICAL_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return null

  return (
    <div>
      <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-2">
        Estágios sugeridos para este setor
      </p>
      <div className="flex flex-wrap gap-2">
        {template.suggestedStages.map((s) => (
          <span
            key={s.label}
            className="color-chip flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
            style={{ ['--chip']: s.color } as React.CSSProperties}
          >
            {s.isTerminal && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
            {s.label}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-surface-600 mt-2">
        * Os estágios são apenas sugestões. Configure em Configurações → CRM → Estágios.
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VerticalSettings() {
  const { vocab, activeTemplateId, setVocab, applyTemplate, resetToDefault } = useTenantVocab()

  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [customVocab, setCustomVocab] = useState<TenantVocabulary>(vocab)
  const [showCustomEditor, setShowCustomEditor] = useState(false)
  const [saved, setSaved] = useState(false)

  const pendingTemplate = pendingTemplateId ? VERTICAL_TEMPLATES.find((t) => t.id === pendingTemplateId) : null
  const hasCustomChanges = JSON.stringify(customVocab) !== JSON.stringify(vocab)

  function handleSelectTemplate(id: string) {
    if (id === pendingTemplateId) {
      setPendingTemplateId(null)
    } else {
      setPendingTemplateId(id)
      const template = VERTICAL_TEMPLATES.find((t) => t.id === id)
      if (template) setCustomVocab(template.vocabulary)
    }
  }

  function handleApplyTemplate() {
    if (!pendingTemplateId) return
    applyTemplate(pendingTemplateId)
    const tpl = VERTICAL_TEMPLATES.find((t) => t.id === pendingTemplateId)
    if (tpl) setCustomVocab(tpl.vocabulary)
    setPendingTemplateId(null)
    flashSaved()
  }

  function handleSaveCustom() {
    setVocab(customVocab)
    flashSaved()
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <SectionHeader
        title="Vertical & Vocabulário"
        description="Adapte a terminologia da plataforma ao seu setor. A IA, o CRM e as automações usarão esses termos automaticamente."
      />

      {/* Template selector */}
      <SettingsSection
        title="Templates por setor"
        description="Escolher um setor troca os termos em toda a interface e no contexto da IA de uma só vez."
      >
        <div className="flex justify-end mb-3">
          <span className="text-[11px] text-surface-500 bg-surface-800 border border-surface-700 px-2.5 py-1 rounded-full">
            Ativo: {VERTICAL_TEMPLATES.find((t) => t.id === activeTemplateId)?.emoji}{' '}
            {VERTICAL_TEMPLATES.find((t) => t.id === activeTemplateId)?.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VERTICAL_TEMPLATES.map((t) => (
            <TemplateCard
              key={t.id}
              {...t}
              isActive={pendingTemplateId ? pendingTemplateId === t.id : activeTemplateId === t.id}
              onClick={() => handleSelectTemplate(t.id)}
            />
          ))}
        </div>

        {/* Pending template confirmation */}
        <AnimatePresence>
          {pendingTemplate && pendingTemplateId !== activeTemplateId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mt-5 border-t border-surface-800/60 pt-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-surface-100 mb-1">
                    Aplicar template <span style={{ color: pendingTemplate.color }}>{pendingTemplate.emoji} {pendingTemplate.label}</span>?
                  </p>
                  <p className="text-xs text-surface-400">{pendingTemplate.description}</p>
                  <VocabDiff current={vocab} next={pendingTemplate.vocabulary} />
                </div>
              </div>

              <div className="mt-4 border-t border-surface-800 pt-4">
                <StagePreview templateId={pendingTemplateId!} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={handleApplyTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aplicar template
                </button>
                <button
                  onClick={() => setPendingTemplateId(null)}
                  className="px-3 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsSection>

      {/* Custom vocabulary editor */}
      <SettingsSection
        title="Vocabulário personalizado"
        description="Ajuste fino de cada termo, um a um. Sobrescreve o template ativo."
      >
        <button
          type="button"
          onClick={() => setShowCustomEditor((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-surface-200 hover:text-surface-50 transition-colors"
        >
          {showCustomEditor
            ? <ChevronUp className="w-4 h-4 text-surface-400" />
            : <ChevronDown className="w-4 h-4 text-surface-400" />
          }
          {showCustomEditor ? 'Ocultar editor' : 'Personalizar vocabulário manualmente'}
        </button>

        <AnimatePresence initial={false}>
          {showCustomEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div>
                <div className="pt-4">
                  <VocabEditor vocab={customVocab} onChange={setCustomVocab} />
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={handleSaveCustom}
                    disabled={!hasCustomChanges}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {saved ? <Check className="w-3.5 h-3.5" /> : null}
                    {saved ? 'Salvo!' : 'Salvar alterações'}
                  </button>
                  <button
                    onClick={() => {
                      resetToDefault()
                      setCustomVocab(VERTICAL_TEMPLATES[0].vocabulary)
                      setPendingTemplateId(null)
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restaurar padrão
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsSection>

      {/* How it works note */}
      <div className="mt-6 rounded-xl border border-brand-500/20 bg-brand-500/5 px-5 py-4">
        <p className="text-sm font-semibold text-brand-300 mb-1">Como funciona</p>
        <ul className="text-xs text-surface-400 space-y-1 list-disc list-inside">
          <li>O vocabulário é aplicado em <strong className="text-surface-300">toda a interface</strong> — labels, formulários e textos de ajuda.</li>
          <li>A <strong className="text-surface-300">IA (Copilot)</strong> usa o vocabulário do setor para contextualizar respostas e análises.</li>
          <li>As <strong className="text-surface-300">situações</strong> sugeridas pelo template são apenas referência — configure-as em <em>Configurações → CRM → Situação do contato</em>.</li>
          <li>O vocabulário é salvo localmente até que o backend multi-tenant esteja disponível.</li>
        </ul>
      </div>
    </div>
  )
}
