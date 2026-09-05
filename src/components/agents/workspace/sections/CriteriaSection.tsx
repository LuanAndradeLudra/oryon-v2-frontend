// Seção "Critérios" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o DecisionCriteriaTab existente (barra de % no restyle).
import { DecisionCriteriaTab } from '@/components/agents/DecisionCriteriaTab'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

export function CriteriaSection({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  return <DecisionCriteriaTab agent={agent} onUpdate={onUpdate} />
}
