import { useEffect, useState } from 'react'
import { getAgentRuntimeFlags, type AgentConfigWithTools } from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
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
  // null = ainda não sabemos (ou a leitura falhou): texto neutro, sem prometer
  // nem negar. A leitura do catálogo pela IA é desligada por padrão no motor.
  const [catalogoChegaNaIA, setCatalogoChegaNaIA] = useState<boolean | null>(null)
  useEffect(() => {
    let vivo = true
    getAgentRuntimeFlags()
      .then((f) => { if (vivo) setCatalogoChegaNaIA(f.catalogInjection) })
      .catch(() => { /* fica neutro */ })
    return () => { vivo = false }
  }, [])

  return (
    <div>
      <CabecalhoDaSecao id="catalogo" />
      <div className="space-y-8">
        <Bloco
          titulo="Produtos"
          descricao={catalogoChegaNaIA
            ? 'O que este agente pode oferecer, com os preços do catálogo da empresa.'
            : 'O que este agente pode oferecer.'}
        >
          {catalogoChegaNaIA === false && (
            <Banner variant="info" className="mb-3">
              Por enquanto a IA ainda não lê este catálogo durante a conversa. Os preços que ela informa
              vêm da base de conhecimento e das instruções do agente, então mantenha os valores atualizados lá também.
            </Banner>
          )}
          <AgentCatalogTab agentId={agent.id} salvar={salvar} onMudou={onMudou} />
        </Bloco>
        <Bloco titulo="Profissionais" descricao="Quem este agente pode citar. Só os ativos entram no que ele sabe.">
          <AgentPractitionerTab agentId={agent.id} salvar={salvar} onMudou={onMudou} />
        </Bloco>
      </div>
    </div>
  )
}
