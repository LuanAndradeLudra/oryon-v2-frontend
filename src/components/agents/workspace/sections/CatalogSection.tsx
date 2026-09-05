// Seção "Catálogo" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o AgentCatalogTab existente sem mudar o conteúdo.
// A coluna Recomendado·7d (`—` + tooltip, decisão 4) entra no restyle.
import { AgentCatalogTab } from '@/components/agents/AgentCatalogTab'
import type { AgentConfigWithTools } from '@/services/agentsApi'

export function CatalogSection({ agent }: { agent: AgentConfigWithTools }) {
  return <AgentCatalogTab agentId={agent.id} />
}
