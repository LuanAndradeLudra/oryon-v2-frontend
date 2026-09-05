// Seção "Regras" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o RulesTab existente (Roteamento + Respostas rápidas).
// O RulesTab é controlado — a sub-aba é estado do chamador, então o Workspace
// a mantém aqui, local à seção. Não vai para a URL: `/agents/:id/:section` tem
// 10 valores fixos (sectionNavCore) e uma sub-aba na rota criaria um 11º
// estado navegável que o mockup não prevê.
//
// No restyle: linhas `.rule` compactas (`Se [kw] → destino`) e o card
// "Comportamento da IA" (AiBehaviorCard) no rodapé desta seção — decisão 1 do
// Maestro. O card só sai do OverviewTab naquele momento, para não mudar o
// AgentDetail legado que a /agents ainda renderiza.

import { useState } from 'react'
import { RulesTab } from '@/components/agents/detail/tabs/RulesTab'
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
    <RulesTab agent={agent} onUpdate={onUpdate} subTab={subTab} onSubTabChange={setSubTab} />
  )
}
