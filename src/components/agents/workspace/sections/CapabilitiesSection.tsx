// Seção "Capacidades" do Workspace (A2 / SCRUM-1013).
// Fatia 2: delega para o CapabilitiesTab existente (cards com switch no restyle).
import { CapabilitiesTab } from '@/components/agents/CapabilitiesTab'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'

export function CapabilitiesSection({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  return <CapabilitiesTab agent={agent} onUpdate={onUpdate} />
}
