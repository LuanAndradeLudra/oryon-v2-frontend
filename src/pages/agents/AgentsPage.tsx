// ─── Agentes ──────────────────────────────────────────────────────────────
// Roteador fino entre as duas superfícies da tela (A1/SCRUM-1012): o Command
// Deck (novo) e a Lista (o list+detail de sempre, movido sem mudança de
// comportamento para `components/agents/list/AgentsListView`).
//
// A página guarda só o que as duas views compartilham: a lista de agentes, o
// wizard de criação e a escolha da view. Tudo que é específico de uma delas
// vive no componente da view — assim a A4 reescreve a Lista sem tocar aqui, e
// a A1 entregou o Deck sem tocar na Lista.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { loadHub } from '@/services/companyContextService'
import { listAgents, updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { AgentBuilderWizard } from '@/components/agents/studio/AgentBuilderWizard'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CommandDeck } from '@/components/agents/deck/CommandDeck'
import { DeckToolbar, type AgentsView } from '@/components/agents/deck/DeckToolbar'
import { AgentsListView } from '@/components/agents/list/AgentsListView'
import { ArchetypeGallery } from '@/components/agents/archetypes/ArchetypeGallery'
import { applyArchetype } from '@/components/agents/archetypes/applyArchetype'
import type { Archetype } from '@/components/agents/archetypes/archetypes'

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const { user } = useAuth()
  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  // Arquétipo escolhido na galeria do estado vazio (A5/SCRUM-1016). É o
  // rascunho de partida do Studio, e não um modo da página: some assim que o
  // wizard fecha, para que o próximo "Novo agente" da barra abra em branco.
  const [arquetipo, setArquetipo] = useState<Archetype | null>(null)
  const [createdAgent, setCreatedAgent] = useState<AgentConfigWithTools | null>(null)
  const [view, setView] = useState<AgentsView>('deck')
  const banner = useDesktopRecommendedBanner('agents')
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  // Entrada ÚNICA do Studio, com ou sem arquétipo. O `?? null` não é defensivo:
  // é ele que impede o arquétipo de grudar. Abrir sem argumento — o "Novo
  // agente" da barra — precisa APAGAR a escolha anterior, senão a segunda
  // criação nasce com o rascunho da primeira. Zerar no fechamento em vez de na
  // abertura não protegeria: quem decide o rascunho é quem abre.
  const abrirStudio = useCallback((escolhido?: Archetype) => {
    setArquetipo(escolhido ?? null)
    setShowWizard(true)
  }, [])

  // "Novo agente" na barra abre em branco de propósito (decisão 5 do
  // `coord/A5-plano.md`): a galeria é o começo guiado de quem ainda não tem
  // agente nenhum; quem já tem sabe o que quer.
  useRegisterTopBarActions(
    <DeckToolbar view={view} onViewChange={setView} onNewAgent={() => abrirStudio()} />,
    [view, abrirStudio],
  )

  const handleStatusChange = useCallback(async (id: string, status: AgentConfig['status']) => {
    try {
      const updated = await updateAgent(id, { status })
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)))
      return updated
    } catch {
      // swallow — a lista não tem toast; um toast de página pode vir depois.
      return null
    }
  }, [])

  const load = useCallback(async () => {
    setLoadingList(true)
    try {
      const list = await listAgents()
      setAgents(list)
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Fim do fluxo de criação. Cada view tem o seu, e as duas precisam levar a
  // algum lugar: terminar uma criação parado na tela onde se começou é beco
  // sem saída.
  //
  // Lista — regressão do recorte (achado do Lince no #129): a AgentsPage antiga
  // fazia `setSelectedAgent(agent)` aqui, e o estado mudou de casa para dentro
  // da AgentsListView sem que nada repusesse a seleção. O agente entrava na
  // lista e o detalhe ficava em "Selecione um agente". O que se perde numa
  // extração mecânica não é JSX — é o que não tem representação visual.
  //
  // Deck — decisão de produto do Maestro: navega para o workspace do agente
  // novo. A rota existe desde que a A2 mesclou, e é o mesmo destino que a
  // Lista alcança ao abrir o detalhe.
  const handleWizardComplete = (agent: AgentConfigWithTools) => {
    setAgents(prev => [agent, ...prev])
    setShowWizard(false)
    if (view === 'deck') navigate(`/agents/${agent.id}/overview`)
    else setCreatedAgent(agent)
  }

  // Ponto ÚNICO do estado vazio da rota: vale para as duas views, porque
  // "nenhum agente no tenant" é condição da tela, não de uma delas. Desde a A5
  // (SCRUM-1016) ele é a galeria de arquétipos, e não mais um vazio com botão.
  const semAgentes = !loadingList && agents.length === 0

  return (
    <>
      <DesktopRecommendedBanner
        visible={banner.visible}
        onDismiss={banner.dismiss}
        message="Configurar e testar agentes IA tem wizard com varios passos, prompts longos e ferramentas. No celular fica apertado — use o desktop para uma experiencia tranquila."
      />

      {semAgentes ? (
        <ArchetypeGallery onEscolher={abrirStudio} />
      ) : view === 'deck' ? (
        <CommandDeck
          agents={agents}
          loading={loadingList}
          onOpenAgent={(id) => navigate(`/agents/${id}/overview`)}
          onResumeAgent={(id) => { void handleStatusChange(id, 'active') }}
        />
      ) : (
        <AgentsListView
          agents={agents}
          loading={loadingList}
          hub={hub}
          createdAgent={createdAgent}
          onStatusChange={handleStatusChange}
          onAgentsChanged={() => { void load() }}
        />
      )}

      {/* Agent Builder Wizard — desktop only; mobile mostra gate */}
      {isMobile ? (
        <MobileFeatureGate
          open={showWizard}
          onClose={() => setShowWizard(false)}
          featureName="Criar agente IA"
          description="O wizard de criação de agentes tem prompts longos, configuração de ferramentas e prévia em tempo real. No celular fica apertado — abra no desktop para configurar com tranquilidade."
        />
      ) : (
        <AnimatePresence>
          {showWizard && (
            <AgentBuilderWizard
              key="agent-builder-wizard"
              inicial={arquetipo ? applyArchetype(arquetipo) : undefined}
              onClose={() => setShowWizard(false)}
              onCreated={handleWizardComplete}
            />
          )}
        </AnimatePresence>
      )}
    </>
  )
}
