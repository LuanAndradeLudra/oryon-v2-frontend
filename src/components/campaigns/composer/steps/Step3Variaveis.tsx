import { Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemplatePreview } from '../../TemplatePreview'
import { CONTACT_FIELDS } from '../constants'
import type { WhatsAppTemplate, CampaignVariableMapping, ContactCustomFieldDef } from '@/types'

export function Step3Variaveis({
  template, mappings, onUpdate, fieldDefs,
}: {
  template: WhatsAppTemplate
  mappings: CampaignVariableMapping[]
  onUpdate: (position: number, patch: Partial<CampaignVariableMapping>) => void
  fieldDefs: ContactCustomFieldDef[]
}) {
  if (mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <Check className="w-8 h-8 text-emerald-400" />
        <p className="text-sm text-surface-300">Este template não possui variáveis</p>
        <p className="text-xs text-surface-500">Clique em Próximo para continuar</p>
      </div>
    )
  }

  const previewVars: Record<string, string> = {}
  mappings.forEach((m) => {
    const val = m.source === 'literal'       ? (m.literal ?? '') :
                m.source === 'contact_field' ? (CONTACT_FIELDS.find((f) => f.value === m.contactField)?.label ?? m.contactField ?? '') :
                fieldDefs.find((f) => f.key === m.customFieldKey)?.label ?? m.customFieldKey ?? ''
    previewVars[String(m.position)] = val || `{{${m.position}}}`
  })

  return (
    <div className="flex gap-5">
      <div className="flex-1 space-y-4">
        {/* Explanation */}
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
          <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-surface-400 space-y-1 leading-relaxed">
            <p>Configure como cada <strong className="text-brand-300">variável numérica</strong> do template será preenchida para cada destinatário no momento do envio.</p>
            <p><strong className="text-surface-300">Campo do contato</strong> — usa dados do CRM (nome, empresa, cidade…).</p>
            <p><strong className="text-surface-300">Campo personalizado</strong> — usa um campo extra criado em Configurações → CRM.</p>
            <p><strong className="text-surface-300">Valor fixo</strong> — mesmo texto para todos os destinatários.</p>
          </div>
        </div>

        {mappings.map((m) => (
          <div key={m.position} className="bg-surface-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">{`{{${m.position}}}`}</span>
              <span className="text-sm font-medium text-surface-200">{m.variableName}</span>
            </div>

            <div className="flex items-center gap-2">
              {(['contact_field', 'custom_field', 'literal'] as const)
                .filter((src) => src !== 'custom_field' || fieldDefs.length > 0)
                .map((src) => (
                <button
                  key={src}
                  onClick={() => onUpdate(m.position, { source: src })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    m.source === src
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-surface-700 text-surface-500 hover:border-surface-600'
                  )}
                >
                  {src === 'contact_field' ? 'Campo do contato' :
                   src === 'custom_field'  ? 'Campo personalizado' : 'Valor fixo'}
                </button>
              ))}
            </div>

            {m.source === 'contact_field' && (
              <select
                value={m.contactField ?? 'displayName'}
                onChange={(e) => onUpdate(m.position, { contactField: e.target.value })}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
              >
                {CONTACT_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            )}

            {m.source === 'custom_field' && (
              fieldDefs.length > 0 ? (
                <select
                  value={m.customFieldKey ?? ''}
                  onChange={(e) => onUpdate(m.position, { customFieldKey: e.target.value })}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="" disabled>Selecione um campo…</option>
                  {fieldDefs.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-accent-amber/10 border border-accent-amber/25 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-surface-300 leading-relaxed">
                    Nenhum campo personalizado cadastrado. Crie um em Configurações → CRM.
                  </p>
                </div>
              )
            )}

            {m.source === 'literal' && (
              <input
                value={m.literal ?? ''}
                onChange={(e) => onUpdate(m.position, { literal: e.target.value })}
                placeholder="Digite o valor fixo para todos os destinatários..."
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-[220px] flex-shrink-0">
        <p className="text-xs text-surface-500 mb-3 text-center">Preview com mapeamento</p>
        <TemplatePreview template={template} variables={previewVars} compact />
      </div>
    </div>
  )
}
