import { HandoffRulesPanel } from '@/components/agents/HandoffRuleBuilder'
import type { HandoffBusinessContext } from '@/services/agentsApi'
import type { WizardData } from '../types'

export function Step5PassarParaHumano({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
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
