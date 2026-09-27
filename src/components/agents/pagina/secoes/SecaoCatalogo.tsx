import type { AgentConfigWithTools } from '@/services/agentsApi'
import { AgentCatalogTab } from '@/components/agents/AgentCatalogTab'
import { useSalvamento } from '../salvamentoContexto'
import { CabecalhoDaSecao } from './Estrutura'

/** Catálogo — só os itens ligados entram no que a IA pode oferecer e citar preço. */
export function SecaoCatalogo({ agent, onMudou }: { agent: AgentConfigWithTools; onMudou: () => void }) {
  const { salvar } = useSalvamento()
  return (
    <div>
      <CabecalhoDaSecao id="catalogo" />
      <AgentCatalogTab agentId={agent.id} salvar={salvar} onMudou={onMudou} />
    </div>
  )
}
