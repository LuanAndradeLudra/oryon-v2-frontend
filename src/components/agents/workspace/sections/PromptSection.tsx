// Seção "Prompt" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o SystemPromptTab existente.
// O doc com gutter de linha (§5.11 do A2-plano, decisão 7 do Maestro) é a
// fatia de restyle — inclui um renderer de linha próprio, porque
// `renderPromptSections` do PromptArtifact devolve cards com markup cravado
// (não é parser) e `renderPromptLine` emite <li>, que dentro das linhas de
// gutter viraria <li> órfão. PromptArtifact.tsx segue com zero mudanças.
import { SystemPromptTab } from '@/components/agents/detail/tabs/SystemPromptTab'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

export function PromptSection({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  return <SystemPromptTab agent={agent} onUpdate={onUpdate} />
}
