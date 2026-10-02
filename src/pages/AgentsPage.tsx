import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { getAgentRuntimeFlags, listSpecDrafts, type AgentConfigWithTools, type SpecDraft } from '@/services/agentsApi'
import { AgentBuilderWizard } from '@/components/agents/AgentBuilderWizard'
import { AssistenteDeAgente } from '@/components/agents/assistente/AssistenteDeAgente'
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
  // Continuar um rascunho do assistente (de qualquer pessoa da empresa).
  const [continuando, setContinuando] = useState<{ draftId: string; agentId: string | null } | null>(null)
  const [rascunhos, setRascunhos] = useState<SpecDraft[]>([])
  const legado = searchParams.get('agent')
  // Onda 4 — assistente novo atrás de FF_AGENT_SPEC_WIZARD (agent-server).
  // `?assistente=novo` abre a pré-visualização mesmo com a flag desligada.
  const [assistenteNovo, setAssistenteNovo] = useState(searchParams.get('assistente') === 'novo')
  // Até as flags chegarem, "Novo agente" espera: antes, clicar cedo abria o
  // assistente antigo mesmo com o novo ligado. Falha ao ler = assistente antigo.
  const [flagsProntas, setFlagsProntas] = useState(assistenteNovo)
  useEffect(() => {
    let vivo = true
    getAgentRuntimeFlags()
      .then((f) => { if (vivo && f.specWizard) setAssistenteNovo(true) })
      .catch(() => {})
      .finally(() => { if (vivo) setFlagsProntas(true) })
    return () => { vivo = false }
  }, [])

  // Rascunhos esperando publicação: sem isto, o rascunho de quem não pode
  // publicar só existia no navegador dele. Só os que já têm nome.
  useEffect(() => {
    if (!assistenteNovo || agentId) return
    let vivo = true
    listSpecDrafts()
      .then((l) => {
        if (!vivo) return
        // Um por agente (o mais recente; a lista vem por atualização): revisões
        // antigas do mesmo agente não são outra coisa esperando publicação.
        const vistos = new Set<string>()
        setRascunhos(l.filter((d) => {
          if (!d.spec?.identity?.name?.trim()) return false
          if (!d.agent_id) return true
          if (vistos.has(d.agent_id)) return false
          vistos.add(d.agent_id)
          return true
        }))
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [assistenteNovo, agentId, criando, continuando])


  const aoCriar = (agent: AgentConfigWithTools) => {
    setCriando(false)
    setContinuando(null)
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
    // PO 01/10: a ação de criar sai da TopBar e mora no cabeçalho da lista
    // (só desktop — no celular a lista já traz o "+" no próprio cabeçalho).
    conteudo = (
      <div className="flex min-w-0 flex-1 min-h-0 flex-col">
        <div className="hidden md:flex items-center justify-end px-8 pt-5 -mb-2">
          <Button size="sm" onClick={() => setCriando(true)} leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}>
            Novo agente
          </Button>
        </div>
        <ListaDeAgentes
          onNovo={() => setCriando(true)}
          rascunhos={rascunhos}
          onContinuarRascunho={(d) => setContinuando({ draftId: d.id, agentId: d.agent_id })}
        />
      </div>
    )
  }

  return (
    <>
      {/* A lista e a página funcionam no celular (27/09): sem o aviso de
          "use o computador" que esta tela mostrava. */}
      <div className="flex min-w-0 flex-1 min-h-0 overflow-hidden">{conteudo}</div>

      {/* Criar agente — assistente em tela cheia, também no celular. */}
      <AnimatePresence>
        {continuando && (
          <AssistenteDeAgente
            key={`rascunho-${continuando.draftId}`}
            draftInicial={continuando.draftId}
            agentId={continuando.agentId ?? undefined}
            onClose={() => setContinuando(null)}
            onCreated={aoCriar}
          />
        )}
        {criando && flagsProntas && (assistenteNovo
          ? <AssistenteDeAgente key="assistente-de-agente" onClose={() => setCriando(false)} onCreated={aoCriar} />
          : <AgentBuilderWizard key="agent-builder-wizard" onClose={() => setCriando(false)} onCreated={aoCriar} />
        )}
      </AnimatePresence>
    </>
  )
}
