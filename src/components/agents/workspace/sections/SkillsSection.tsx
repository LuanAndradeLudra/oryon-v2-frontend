// Seção "Habilidades" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o SkillsTab existente.
// `tenantId` fica de fora de propósito: é um override só para staff da Oryon
// abrindo cross-tenant por /admin/agents. No workspace do cliente o backend
// usa o tenant do JWT — passar o id daqui não mudaria nada e mascararia isso.
import { SkillsTab } from '@/components/agents/SkillsTab'
import type { AgentConfigWithTools } from '@/services/agentsApi'

export function SkillsSection({ agent }: { agent: AgentConfigWithTools }) {
  return <SkillsTab agentId={agent.id} />
}
