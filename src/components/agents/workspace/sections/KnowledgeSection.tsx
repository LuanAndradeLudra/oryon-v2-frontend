// Seção "Conhecimento" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o KnowledgeBaseTab existente sem mudar o conteúdo.
// A tabela Fonte/Tipo/Trechos/Usada·7d do mockup (com `—` + tooltip "em breve"
// nas duas últimas, decisão 4) entra na fatia de restyle.
import { KnowledgeBaseTab } from '@/components/agents/detail/tabs/KnowledgeBaseTab'
import type { AgentConfigWithTools } from '@/services/agentsApi'

export function KnowledgeSection({ agent }: { agent: AgentConfigWithTools }) {
  return <KnowledgeBaseTab agent={agent} />
}
