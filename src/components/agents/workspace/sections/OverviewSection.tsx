// Seção "Visão geral" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o OverviewTab existente.
// No restyle vira conteúdo NOVO (3 KPIs do BE.7 com `deltas` + card teal de
// alterações não publicadas). O AiBehaviorCard que hoje vive dentro do
// OverviewTab só migra para o rodapé da RulesSection (decisão 1) NAQUELE
// momento — mexer nele agora mudaria o AgentDetail legado, que ainda é
// renderizado pela /agents (AgentsPage, do Buril).
import { OverviewTab } from '@/components/agents/detail/tabs/OverviewTab'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

export function OverviewSection({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  return <OverviewTab agent={agent} onUpdate={onUpdate} />
}
