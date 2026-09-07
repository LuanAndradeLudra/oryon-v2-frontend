// Seção "Regras" do Workspace (A2 / SCRUM-1013).
// Delega para o RulesTab existente (Roteamento + Respostas rápidas) e fecha com
// o card "Comportamento da IA" no rodapé — decisão 1 do Maestro.
//
// O RulesTab é controlado — a sub-aba é estado do chamador, então o Workspace
// a mantém aqui, local à seção. Não vai para a URL: `/agents/:id/:section` tem
// 10 valores fixos (sectionNavCore) e uma sub-aba na rota criaria um 11º
// estado navegável que o mockup não prevê.
//
// Por que o card vem para cá: pausa de handoff e debounce de mensagens
// fragmentadas são LIMITES DE COMPORTAMENTO. Na visão geral eles eram um bloco
// de configuração perdido no meio de números; aqui ficam ao lado das regras que
// governam a mesma coisa — quando o agente para de responder e quem assume.
//
// O mockup não desenha este card (é conteúdo real do produto que o retrato não
// cobriu), então ele mantém o visual que já tem. Retrato serve o que só existe
// nele; o que tem fonte viva vem da fonte viva.

import { useState } from 'react'
import { RulesTab } from '@/components/agents/detail/tabs/RulesTab'
import { AiBehaviorCard } from '@/components/agents/detail/tabs/OverviewTab'
import type { RulesSubTab } from '@/components/agents/detail/types'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

export function RulesSection({
  agent,
  onUpdate,
}: {
  agent: AgentConfigWithTools
  onUpdate: (a: AgentConfig) => void
}) {
  // "Roteamento" primeiro, mesmo default do AgentDetail de hoje.
  const [subTab, setSubTab] = useState<RulesSubTab>('handoff')

  return (
    <div className="space-y-6">
      <RulesTab agent={agent} onUpdate={onUpdate} subTab={subTab} onSubTabChange={setSubTab} />
      <AiBehaviorCard agent={agent} onUpdate={onUpdate} />
    </div>
  )
}
