// Seção "Ferramentas" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o ToolsTab existente (editor HTTP cru).
// No restyle (decisão 2) a visão principal vira cards de integração e ESTE
// editor desce para o bloco "Avançado" recolhido, junto das "Métricas de
// ferramentas" (o MetricsTab), sem virar seção própria na nav.
import { ToolsTab } from '@/components/agents/detail/tabs/ToolsTab'
import type { AgentConfigWithTools, AgentTool } from '@/services/agentsApi'

export function ToolsSection({ agent, onToolsChange }: { agent: AgentConfigWithTools; onToolsChange: (tools: AgentTool[]) => void }) {
  return <ToolsTab agent={agent} onToolsChange={onToolsChange} />
}
