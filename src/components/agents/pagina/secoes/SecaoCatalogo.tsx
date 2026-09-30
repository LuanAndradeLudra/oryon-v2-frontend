import type { AgentConfigWithTools } from '@/services/agentsApi'
import { AgentCatalogTab } from '@/components/agents/AgentCatalogTab'
import { AgentPractitionerTab } from '@/components/agents/AgentPractitionerTab'
import { useSalvamento } from '../salvamentoContexto'
import { Bloco, CabecalhoDaSecao } from './Estrutura'

/**
 * Catálogo — só os itens ligados entram no que a IA pode oferecer e citar.
 * Produtos e profissionais passam pela mesma porta ("o que ele pode oferecer
 * ou citar"), então são dois blocos da mesma seção. Os profissionais vieram do
 * developer (27/09), onde eram uma sub-aba do AgentDetail antigo.
 */
export function SecaoCatalogo({ agent, onMudou }: { agent: AgentConfigWithTools; onMudou: () => void }) {
  const { salvar } = useSalvamento()
  return (
    <div>
      <CabecalhoDaSecao id="catalogo" />
      <div className="space-y-8">
        <Bloco titulo="Produtos" descricao="O que este agente pode oferecer, com os preços do catálogo da empresa.">
          <AgentCatalogTab agentId={agent.id} salvar={salvar} onMudou={onMudou} />
        </Bloco>
        <Bloco titulo="Profissionais" descricao="Quem este agente pode citar. Só os ativos entram no que ele sabe.">
          <AgentPractitionerTab agentId={agent.id} salvar={salvar} onMudou={onMudou} />
        </Bloco>
      </div>
    </div>
  )
}
