// Seção "Métricas" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o MetricsTab existente (execução de ferramentas).
// ATENÇÃO — isto é TEMPORÁRIO e troca de dono no restyle: por decisão 3 do
// Maestro, esta seção passa a ser o BE.7 (conversas/intenções), e o MetricsTab
// de ferramentas vai para dentro do "Avançado" da ToolsSection, admin-only
// como já é hoje. Mantido aqui só para a seção não nascer vazia.
import { MetricsTab } from '@/components/agents/detail/tabs/MetricsTab'
import type { AgentConfigWithTools } from '@/services/agentsApi'

export function MetricsSection({ agent }: { agent: AgentConfigWithTools }) {
  return <MetricsTab agent={agent} />
}
