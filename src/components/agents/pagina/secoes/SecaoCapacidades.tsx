import type { AgentConfig, AgentConfigWithTools, AgentTool } from '@/services/agentsApi'
import { CapabilitiesTab } from '@/components/agents/CapabilitiesTab'
import { SkillsTab } from '@/components/agents/SkillsTab'
import { useAdvancedMode } from '@/hooks/useAdvancedMode'
import { isFeatureVisible } from '@/config/featureFlags'
import { useSalvamento } from '../salvamentoContexto'
import { Bloco, CabecalhoDaSecao } from './Estrutura'
import { IntegracoesHttp } from './IntegracoesHttp'

/**
 * Capacidades — tudo o que a IA pode FAZER, num lugar só: mudar o CRM,
 * usar skills (quando liberadas) e chamar APIs (modo avançado). Antes eram
 * três abas, duas delas chamadas "Capacidades".
 */
export function SecaoCapacidades({ agent, onAtualizar, onFerramentas }: {
  agent: AgentConfigWithTools
  onAtualizar: (a: AgentConfig) => void
  onFerramentas: (t: AgentTool[]) => void
}) {
  const { salvar } = useSalvamento()
  const [modoAvancado] = useAdvancedMode()
  const skills = isFeatureVisible('agentSkills')

  return (
    <div>
      <CabecalhoDaSecao id="capacidades" />
      <div className="space-y-8">
        <Bloco
          titulo="No CRM"
          descricao="Cada ação aparece no histórico do contato com o nome do agente. Marcar uma venda como ganha ou perdida continua sendo de uma pessoa."
        >
          <CapabilitiesTab agent={agent} onUpdate={onAtualizar} salvar={salvar} />
        </Bloco>
        {skills && (
          <Bloco titulo="Skills" descricao="Habilidades ligadas pela equipe Oryon para o seu negócio (marcar consulta, consultar pedido…). Você pode pausar qualquer uma.">
            <SkillsTab agentId={agent.id} semCabecalho />
          </Bloco>
        )}
        {modoAvancado && (
          <Bloco titulo="Integrações HTTP" descricao="APIs do seu sistema que o agente pode chamar durante a conversa.">
            <IntegracoesHttp agent={agent} onFerramentas={onFerramentas} />
          </Bloco>
        )}
      </div>
    </div>
  )
}
