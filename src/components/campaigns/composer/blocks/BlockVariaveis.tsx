// ─── BlockVariaveis ────────────────────────────────────────────────────────
// Conteúdo do bloco "Variáveis" — mockup `p3-disparos.html` §D2.
//
// É o `steps/Step3Variaveis.tsx` sem a casca de step, com duas mudanças que
// vêm do modelo de página (coord/D2-plano.md §3):
//
// 1. **Sai a coluna de preview de 220px.** No modal ela existia porque cada
//    step era uma tela isolada; no Composer o telefone fica à esquerda, fixo,
//    renderizando o template com dados reais o tempo todo. Manter uma segunda
//    prévia dentro do bloco mostraria a mesma coisa duas vezes, e a de dentro
//    seria a pior das duas (menor e sem o contato real).
// 2. **Sai o "Clique em Próximo para continuar"** do caso sem variáveis — não
//    há "próximo" num acordeão.
import { Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTACT_FIELDS } from '../constants'
import type { CampaignVariableMapping, ContactCustomFieldDef } from '@/types'

interface BlockVariaveisProps {
  mappings: CampaignVariableMapping[]
  onUpdate: (position: number, patch: Partial<CampaignVariableMapping>) => void
  fieldDefs: ContactCustomFieldDef[]
}

const SOURCE_LABEL = {
  contact_field: 'Campo do contato',
  custom_field:  'Campo personalizado',
  literal:       'Valor fixo',
} as const

export function BlockVariaveis({ mappings, onUpdate, fieldDefs }: BlockVariaveisProps) {
  if (mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-24 gap-2">
        <Check className="w-8 h-8 text-status-active" aria-hidden />
        <p className="text-sm text-surface-300">Este template não possui variáveis</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
        <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden />
        <div className="text-[11px] text-surface-400 space-y-1 leading-relaxed">
          <p>
            Configure como cada <strong className="text-brand-300">variável numérica</strong> do
            template será preenchida para cada destinatário no momento do envio.
          </p>
          <p><strong className="text-surface-300">Campo do contato</strong> — usa dados do CRM (nome, empresa, cidade…).</p>
          <p><strong className="text-surface-300">Campo personalizado</strong> — usa um campo extra criado em Configurações → CRM.</p>
          <p><strong className="text-surface-300">Valor fixo</strong> — mesmo texto para todos os destinatários.</p>
        </div>
      </div>

      {mappings.map((m) => {
        const sources = (['contact_field', 'custom_field', 'literal'] as const)
          .filter((src) => src !== 'custom_field' || fieldDefs.length > 0)

        return (
          <div key={m.position} className="bg-surface-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">
                {`{{${m.position}}}`}
              </span>
              <span className="text-[13.2px] font-medium text-surface-200">{m.variableName}</span>
            </div>

            {/* `radiogroup` porque é uma escolha entre três, não três ações
                soltas — o leitor de tela anuncia "1 de 3" e as setas navegam. */}
            <div className="flex items-center gap-2" role="radiogroup" aria-label={`Origem da variável ${m.position}`}>
              {sources.map((src) => (
                <button
                  key={src}
                  type="button"
                  role="radio"
                  aria-checked={m.source === src}
                  onClick={() => onUpdate(m.position, { source: src })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    m.source === src
                      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                      : 'border-surface-700 text-surface-500 hover:border-surface-600',
                  )}
                >
                  {SOURCE_LABEL[src]}
                </button>
              ))}
            </div>

            {m.source === 'contact_field' && (
              <select
                value={m.contactField ?? 'displayName'}
                onChange={(e) => onUpdate(m.position, { contactField: e.target.value })}
                aria-label={`Campo do contato para a variável ${m.position}`}
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
                  aria-label={`Campo personalizado para a variável ${m.position}`}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
                >
                  <option value="" disabled>Selecione um campo…</option>
                  {fieldDefs.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-accent-amber/10 border border-accent-amber/25 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0" aria-hidden />
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
                aria-label={`Valor fixo da variável ${m.position}`}
                placeholder="Digite o valor fixo para todos os destinatários..."
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

