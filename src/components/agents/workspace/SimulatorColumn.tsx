// ─── Coluna do simulador (A2 / SCRUM-1013) ───────────────────────────────────
// `.sim` do mockup: 372px sempre visível à direita. É a promessa central da
// tela — mexe no agente e vê o efeito na conversa ao lado.
//
// O hook é chamado AQUI (nível da coluna, não dentro do painel) porque o
// `SimulatorPanel` da W0.3 recebe o retorno por props e não chama o hook ele
// mesmo — exatamente para permitir este uso sem duplicar sessão.

import { RotateCcw } from 'lucide-react'
import { useAgentSimulator } from '@/components/agents/simulator/useAgentSimulator'
import { SimulatorPanel } from '@/components/agents/simulator/SimulatorPanel'
import type { AgentConfigWithTools, HandoffRule } from '@/services/agentsApi'
import { accentColor } from '@/components/ui/accentColor'

interface SimulatorColumnProps {
  agent: AgentConfigWithTools
  /** Prompt do rascunho — cai no publicado quando não há rascunho. */
  systemPrompt?: string
  /** Regras do rascunho: o simulador avalia regra ainda NÃO publicada
   *  (decisão 6 do Maestro). */
  handoffRules?: HandoffRule[]
  /** Há alterações não publicadas — liga o chip "rascunho" do `simh`. */
  isDirty?: boolean
}

export function SimulatorColumn({ agent, systemPrompt, handoffRules, isDirty }: SimulatorColumnProps) {
  const sim = useAgentSimulator(agent, { systemPrompt, handoffRules })

  return (
    <aside
      aria-label="Simulador de conversa"
      className="border-l border-surface-800 bg-surface-900 flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between gap-2.5 px-4 py-3.5 border-b border-surface-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-surface-200 truncate">Conversa de teste</span>
          {isDirty && (
            <span
              className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                color: accentColor('brand'),
                borderColor: `color-mix(in srgb, ${accentColor('brand')} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${accentColor('brand')} 14%, transparent)`,
              }}
            >
              rascunho
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={sim.restart}
          aria-label="Reiniciar a conversa de teste"
          title="Reiniciar conversa"
          className="shrink-0 rounded-lg p-1.5 text-surface-500 hover:text-surface-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

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
    </aside>
  )
}
