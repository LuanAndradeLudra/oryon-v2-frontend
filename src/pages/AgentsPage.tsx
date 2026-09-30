import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { AgentBuilderWizard } from '@/components/agents/AgentBuilderWizard'
import { PaginaDoAgente } from '@/components/agents/pagina/PaginaDoAgente'
import { ListaDeAgentes } from '@/components/agents/pagina/ListaDeAgentes'
import { ehSecao, rotaDoAgente, secaoDaAbaAntiga, SECAO_PADRAO } from '@/components/agents/pagina/secoesDoAgente'
import { Button } from '@/components/ui/Button'

/**
 * Agentes IA (direção D, 27/09).
 *   /agents                     → lista (tabela de operação)
 *   /agents/:agentId/:secao     → página do agente (seção na URL, ?teste=1 abre a bancada)
 * O formato antigo `/agents?agent=X&tab=Y` — links salvos, notificações, o Hub
 * — redireciona para a seção equivalente.
 */
export function AgentsPage() {
  const { agentId, secao } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [criando, setCriando] = useState(false)
  const legado = searchParams.get('agent')

  useRegisterTopBarActions(
    <Button size="sm" onClick={() => setCriando(true)} leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}>
      Novo agente
    </Button>,
    [],
  )

  const aoCriar = (agent: AgentConfigWithTools) => {
    setCriando(false)
    navigate(rotaDoAgente(agent.id, SECAO_PADRAO, { teste: true }))
  }

  let conteudo
  if (!agentId && legado) {
    conteudo = <Navigate to={rotaDoAgente(legado, secaoDaAbaAntiga(searchParams.get('tab')))} replace />
  } else if (agentId && !ehSecao(secao)) {
    conteudo = <Navigate to={rotaDoAgente(agentId, SECAO_PADRAO)} replace />
  } else if (agentId && ehSecao(secao)) {
    conteudo = <PaginaDoAgente key={agentId} agentId={agentId} secao={secao} />
  } else {
    conteudo = <ListaDeAgentes onNovo={() => setCriando(true)} />
  }

  return (
    <>
      {/* A lista e a página funcionam no celular (27/09): sem o aviso de
          "use o computador" que esta tela mostrava. */}
      <div className="flex min-w-0 flex-1 min-h-0 overflow-hidden">{conteudo}</div>

      {/* Criar agente — assistente em tela cheia, também no celular. */}
      <AnimatePresence>
        {criando && (
          <AgentBuilderWizard key="agent-builder-wizard" onClose={() => setCriando(false)} onCreated={aoCriar} />
        )}
      </AnimatePresence>
    </>
  )
}
