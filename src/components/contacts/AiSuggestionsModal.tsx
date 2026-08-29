import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Sparkles, Loader2, BarChart3, User, Settings2 } from 'lucide-react'
import { contactsApi } from '@/services/api'

type Suggestions = {
  qualification: Record<string, unknown>
  info: Record<string, string>
  customFields: Record<string, string>
}

type Meta = {
  stages: Array<{ key: string; label: string }>
  customFieldDefs: Array<{ key: string; label: string; type: string; options?: string[] }>
} | null

const INTENT_OPTIONS = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
  { value: 'unknown', label: 'Indefinida' },
]

const INFO_LABELS: Record<string, string> = {
  email: 'E-mail', company: 'Empresa', jobTitle: 'Cargo', industry: 'Setor',
  city: 'Cidade', state: 'Estado', country: 'País',
}

interface Props {
  contactId: string
  suggestions: Suggestions
  meta: Meta
  onClose: () => void
  onApplied: () => void
}

export function AiSuggestionsModal({ contactId, suggestions, meta, onClose, onApplied }: Props) {
  const [applying, setApplying] = useState(false)

  // Editable values — initialized from AI suggestions
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [key, val] of Object.entries(suggestions.qualification)) init[`q.${key}`] = String(val)
    for (const [key, val] of Object.entries(suggestions.info)) init[`i.${key}`] = val
    for (const [key, val] of Object.entries(suggestions.customFields)) init[`cf.${key}`] = val
    return init
  })

  // Track which suggestions are toggled on
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const k of Object.keys(values)) init[k] = true
    return init
  })

  const toggle = (key: string) => setEnabled((prev) => ({ ...prev, [key]: !prev[key] }))
  const updateValue = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }))

  const totalSuggestions = Object.keys(values).length
  const enabledCount = Object.values(enabled).filter(Boolean).length

  const handleApply = async () => {
    setApplying(true)
    try {
      const approved: { qualification?: Record<string, unknown>; info?: Record<string, string>; customFields?: Record<string, string> } = {}

      const q: Record<string, unknown> = {}
      for (const key of Object.keys(suggestions.qualification)) {
        if (enabled[`q.${key}`] && values[`q.${key}`]) {
          q[key] = key === 'leadScore' ? Number(values[`q.${key}`]) : values[`q.${key}`]
        }
      }
      if (Object.keys(q).length) approved.qualification = q

      const i: Record<string, string> = {}
      for (const key of Object.keys(suggestions.info)) {
        if (enabled[`i.${key}`] && values[`i.${key}`]) i[key] = values[`i.${key}`]
      }
      if (Object.keys(i).length) approved.info = i

      const cf: Record<string, string> = {}
      for (const key of Object.keys(suggestions.customFields)) {
        if (enabled[`cf.${key}`] && values[`cf.${key}`]) cf[key] = values[`cf.${key}`]
      }
      if (Object.keys(cf).length) approved.customFields = cf

      if (Object.keys(approved).length > 0) {
        await contactsApi.applyAiSuggestions(contactId, approved)
      }
      onApplied()
    } catch {
      // error
    } finally {
      setApplying(false)
    }
  }

  const stages = meta?.stages ?? []
  const cfDefs = meta?.customFieldDefs ?? []

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-surface-900 overlay-frame border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-100">Sugestões da IA</h3>
                <p className="text-[11px] text-surface-500">{totalSuggestions} sugestões · Edite e revise antes de aplicar</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
            {/* Qualification */}
            {Object.keys(suggestions.qualification).length > 0 && (
              <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} title="Qualificação">
                {suggestions.qualification.stage != null && (
                  <EditableRow
                    id="q.stage"
                    label="Situação"
                    enabled={!!enabled['q.stage']}
                    onToggle={() => toggle('q.stage')}
                    editor={
                      <select
                        value={values['q.stage'] ?? ''}
                        onChange={(e) => updateValue('q.stage', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        {stages.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                    }
                  />
                )}
                {suggestions.qualification.leadScore != null && (
                  <EditableRow
                    id="q.leadScore"
                    label="Lead Score"
                    enabled={!!enabled['q.leadScore']}
                    onToggle={() => toggle('q.leadScore')}
                    editor={
                      <input
                        type="number" min={0} max={100}
                        value={values['q.leadScore'] ?? ''}
                        onChange={(e) => updateValue('q.leadScore', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    }
                  />
                )}
                {suggestions.qualification.intent != null && (
                  <EditableRow
                    id="q.intent"
                    label="Intenção de compra"
                    enabled={!!enabled['q.intent']}
                    onToggle={() => toggle('q.intent')}
                    editor={
                      <select
                        value={values['q.intent'] ?? ''}
                        onChange={(e) => updateValue('q.intent', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        {INTENT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    }
                  />
                )}
              </SectionHeader>
            )}

            {/* Info */}
            {Object.keys(suggestions.info).length > 0 && (
              <SectionHeader icon={<User className="w-3.5 h-3.5" />} title="Informações">
                {Object.entries(suggestions.info).map(([key]) => (
                  <EditableRow
                    key={key}
                    id={`i.${key}`}
                    label={INFO_LABELS[key] ?? key}
                    enabled={!!enabled[`i.${key}`]}
                    onToggle={() => toggle(`i.${key}`)}
                    editor={
                      <input
                        type={key === 'email' ? 'email' : 'text'}
                        value={values[`i.${key}`] ?? ''}
                        onChange={(e) => updateValue(`i.${key}`, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    }
                  />
                ))}
              </SectionHeader>
            )}

            {/* Custom Fields */}
            {Object.keys(suggestions.customFields).length > 0 && (
              <SectionHeader icon={<Settings2 className="w-3.5 h-3.5" />} title="Campos Personalizados">
                {Object.entries(suggestions.customFields).map(([key]) => {
                  const def = cfDefs.find((d) => d.key === key)
                  const fieldLabel = def?.label ?? key

                  let editor: React.ReactNode
                  if (def?.type === 'select' && def.options?.length) {
                    editor = (
                      <select
                        value={values[`cf.${key}`] ?? ''}
                        onChange={(e) => updateValue(`cf.${key}`, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="">— Selecione —</option>
                        {def.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    )
                  } else if (def?.type === 'multiselect' && def.options?.length) {
                    const selected = (values[`cf.${key}`] ?? '').split('|').filter(Boolean)
                    editor = (
                      <div className="flex flex-wrap gap-1.5">
                        {def.options.map((opt) => {
                          const active = selected.includes(opt)
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const next = active ? selected.filter((s) => s !== opt) : [...selected, opt]
                                updateValue(`cf.${key}`, next.join('|'))
                              }}
                              className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                                active
                                  ? 'bg-brand-600 border-brand-500 text-surface-950'
                                  : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-brand-500/40'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    )
                  } else if (def?.type === 'number') {
                    editor = (
                      <input
                        type="number"
                        value={values[`cf.${key}`] ?? ''}
                        onChange={(e) => updateValue(`cf.${key}`, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    )
                  } else if (def?.type === 'textarea') {
                    editor = (
                      <textarea
                        rows={2}
                        value={values[`cf.${key}`] ?? ''}
                        onChange={(e) => updateValue(`cf.${key}`, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 resize-none transition-colors"
                      />
                    )
                  } else {
                    editor = (
                      <input
                        type="text"
                        value={values[`cf.${key}`] ?? ''}
                        onChange={(e) => updateValue(`cf.${key}`, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    )
                  }

                  return (
                    <EditableRow
                      key={key}
                      id={`cf.${key}`}
                      label={fieldLabel}
                      enabled={!!enabled[`cf.${key}`]}
                      onToggle={() => toggle(`cf.${key}`)}
                      editor={editor}
                    />
                  )
                })}
              </SectionHeader>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-800 bg-surface-900/80">
            <button
              onClick={() => onApplied()}
              className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
            >
              Ignorar sugestões
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-surface-500">{enabledCount} de {totalSuggestions}</span>
              <button
                onClick={handleApply}
                disabled={applying || enabledCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 text-surface-950 hover:bg-brand-500 disabled:opacity-50 transition-colors"
              >
                {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {applying ? 'Aplicando...' : 'Aplicar selecionadas'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SectionHeader({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-surface-500">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">{title}</p>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function EditableRow({ id, label, enabled, onToggle, editor }: {
  id: string; label: string; enabled: boolean; onToggle: () => void; editor: React.ReactNode
}) {
  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${
      enabled ? 'border-brand-500/30 bg-brand-600/5' : 'border-surface-800 bg-surface-800/30 opacity-50'
    }`}>
      <button
        onClick={onToggle}
        className={`w-4 h-4 mt-1.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
          enabled ? 'bg-brand-600 border-brand-500' : 'bg-surface-800 border-surface-600'
        }`}
      >
        {enabled && <Check className="w-3 h-3 text-surface-950" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-surface-500 mb-1">{label}</p>
        {enabled ? editor : (
          <p className="text-sm text-surface-500 truncate italic">Desativado</p>
        )}
      </div>
    </div>
  )
}
