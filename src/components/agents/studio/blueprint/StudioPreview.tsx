import { useMemo } from 'react'
import { accentColor } from '@/components/ui/accentColor'
import { SimulatorPanel } from '@/components/agents/simulator/SimulatorPanel'
import { useAgentSimulator } from '@/components/agents/simulator/useAgentSimulator'
import type { WizardData } from '../types'
import { draftAgent } from './draftAgent'

/**
 * Coluna direita do Studio (A3): a prévia ao vivo, que responde com o que já
 * foi definido — mesmo antes de a etapa 7 gerar o prompt definitivo.
 *
 * É o segundo consumidor do simulador que a W0.3 extraiu, e o motivo de o
 * `useAgentSimulator` ter ganhado `handoffRules?`: as regras da etapa 5 ainda
 * não foram publicadas, então precisam viajar no corpo do chat para a prévia
 * respeitá-las.
 *
 * A prévia responde SÓ quando a pessoa envia (decisão do Maestro,
 * `coord/A3-decisoes.md` §6) — nada de chamada por tecla digitada. Isso é
 * herdado do `SimulatorPanel`, que só dispara no Enter e no botão.
 *
 * Sem syslines nesta história (decisão §5): anotar "qual regra disparou"
 * exigiria o agent-server devolver isso junto da mensagem, e hoje ele devolve
 * só `{ message }`. É história do agent-server, irmã da que a A2 precisa.
 */
export function StudioPreview({ data }: { data: WizardData }) {
  // Recalcular a cada tecla criaria um `agent` novo por render, e o efeito de
  // sessão do hook depende de `agent.id`. Só o que a prévia usa entra nas deps.
  const agent = useMemo(
    () => draftAgent(data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data.name, data.persona_name, data.icon, data.sector, data.objective,
      data.tone, data.language, data.response_style,
      data.can_do, data.cannot_do,
      data.company_name, data.company_description, data.faqs,
      data.knowledge_docs.length, data.generated_prompt, data.handoff_rules,
      data.crm_capabilities,
    ],
  )

  const sim = useAgentSimulator(agent, { handoffRules: data.handoff_rules })
  const semPromptFinal = data.generated_prompt.trim().length === 0

  return (
    <div className="h-full flex flex-col border-l border-surface-800 bg-surface-900">
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-surface-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-surface-100">Prévia ao vivo</p>
          <p className="text-[11px] text-surface-500">Responde com o que já foi definido</p>
        </div>
        {semPromptFinal && (
          <span
            className="color-chip flex-shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap"
            style={{ ['--chip' as string]: accentColor('amber') }}
          >
            sem prompt final
          </span>
        )}
      </header>

      <SimulatorPanel
        agent={agent}
        messages={sim.messages}
        input={sim.input}
        setInput={sim.setInput}
        loading={sim.loading}
        error={sim.error}
        dismissError={sim.dismissError}
        send={sim.send}
      />
    </div>
  )
}
