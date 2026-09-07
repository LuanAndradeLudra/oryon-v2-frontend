// ─── Coluna do simulador (A2 / SCRUM-1013) ───────────────────────────────────
// `.sim` do mockup: 372px sempre visível à direita. É a promessa central da
// tela — mexe no agente e vê o efeito na conversa ao lado.
//
// O hook é chamado AQUI (nível da coluna, não dentro do painel) porque o
// `SimulatorPanel` da W0.3 recebe o retorno por props e não chama o hook ele
// mesmo — exatamente para permitir este uso sem duplicar sessão.

import { FlaskConical, RotateCcw } from 'lucide-react'
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
      {/* `.simh` do mockup (`p2a-agentes.html:192`), enumerado seletor por
          seletor. O que estava aqui antes divergia em seis pontos, e o mais
          caro não era pixel: faltava o subtítulo. */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-3.5 border-b border-surface-800">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* `.kb` com os overrides do mockup: 30px e raio 9. O 9 não tem
              token (`--radius-xs` é 4, `--radius-sm` é 10), então é literal
              legítimo — literal só quando o mockup escreve um valor que
              token nenhum calcula. */}
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[9px] border border-surface-700 bg-surface-800 text-brand-400">
            <FlaskConical className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            {/* `.fw6 .t-xs` = 13,2px, que é o que `text-xs` EMITE no desktop.
                Estava `text-[13px]`: literal e, além disso, o valor errado —
                o mesmo defeito que o `.sd` do #133 já tinha tido. */}
            <div className="truncate text-xs font-semibold text-surface-200">Simulador</div>
            {/* `.t-3xs muted`. Esta linha é a única da tela que diz O QUE o
                simulador está testando; sem ela o chip "rascunho" fica sendo
                um selo teal sem legenda, e a promessa central do Workspace
                deixa de estar escrita em lugar nenhum. */}
            <div className="truncate text-3xs text-surface-400">Usa as alterações não publicadas</div>
          </div>
        </div>

        {/* `row gap:4px`: o chip e o botão andam JUNTOS à direita. O chip
            colado no título fazia parecer que ele qualificava o nome do
            painel, e não o estado do agente. */}
        <div className="flex shrink-0 items-center gap-1">
          {isDirty && (
            <span
              // `.chip.acc`: 11px, que `--text-2xs` crava — não escala com a
              // manopla de 110%, e é de propósito.
              className="rounded-full border px-2 py-0.5 text-2xs font-semibold"
              style={{
                color: accentColor('brand'),
                borderColor: `color-mix(in srgb, ${accentColor('brand')} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${accentColor('brand')} 14%, transparent)`,
              }}
            >
              rascunho
            </span>
          )}
          {/* `.btn.icon` (`p1-head.html:121`): 32×32, padding 0, raio 8, cor
              `--s400`. Estava 28×28 com `rounded-lg`, que nesta escala é 16 —
              o dobro do pedido. O 8 também não tem token, então é literal
              legítimo. Botão local em vez de `ui/Button` porque `ui/**` está
              congelado e não existe variante `icon`. */}
          <button
            type="button"
            onClick={sim.restart}
            aria-label="Reiniciar a conversa de teste"
            title="Reiniciar conversa"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] p-0 text-surface-400 hover:text-surface-200 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
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
