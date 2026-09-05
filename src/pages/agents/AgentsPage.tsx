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
import { Bot, Sparkles } from 'lucide-react'
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

// ─── Empty state ──────────────────────────────────────────────────────────────

// Acento violeta — mesmo tom já usado em todo o produto pra sinalizar "isto é
// IA" (ex.: CHIP.violet em ConversationActivitySection/timelineSources pros
// eventos do agente), em vez do brand-600 genérico que qualquer CTA usa.
function NoAgentsState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-violet) 10%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-accent-violet) 20%, transparent)' }}
      >
        <Bot className="w-10 h-10" style={{ color: 'color-mix(in srgb, var(--color-accent-violet) 65%, transparent)' }} />
      </div>
      <div>
        <p className="text-base font-semibold text-surface-200">Nenhum agente ainda</p>
        <p className="text-sm text-surface-500 mt-1">crie o primeiro pra começar a atender no WhatsApp</p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-medium transition-colors shadow-lg shadow-brand-900/30"
      >
        <Sparkles className="w-4 h-4" />
        Criar primeiro agente
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const { user } = useAuth()
  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [view, setView] = useState<AgentsView>('deck')
  const banner = useDesktopRecommendedBanner('agents')
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useRegisterTopBarActions(
    <DeckToolbar view={view} onViewChange={setView} onNewAgent={() => setShowWizard(true)} />,
    [view],
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

  // Fim do fluxo de criação: as duas views levam ao Workspace do agente novo.
  //
  // Na A1 as duas terminavam em lugares diferentes — o Deck navegava e a Lista
  // selecionava o agente no painel de detalhe ao lado (a regressão que o Lince
  // achou no #129 foi justamente essa seleção ter sumido no recorte). A A4
  // eliminou esse painel: a Lista virou triagem e a configuração passou a viver
  // no Workspace, atrás de "Abrir workspace". Sem painel não há seleção a
  // repor, e o destino que sobra é o mesmo do Deck — que é também o mesmo lugar
  // onde a linha da Lista já leva ao ser aberta.
  const handleWizardComplete = (agent: AgentConfigWithTools) => {
    setAgents(prev => [agent, ...prev])
    setShowWizard(false)
    navigate(`/agents/${agent.id}/overview`)
  }

  // Ponto ÚNICO do estado vazio da rota: vale para as duas views, porque
  // "nenhum agente no tenant" é condição da tela, não de uma delas. É aqui que
  // a A5 (SCRUM-1016) troca o `NoAgentsState` pela galeria de arquétipos —
  // uma linha, sem mexer em nenhum outro arquivo.
  const semAgentes = !loadingList && agents.length === 0

  return (
    <>
      <DesktopRecommendedBanner
        visible={banner.visible}
        onDismiss={banner.dismiss}
        message="Configurar e testar agentes IA tem wizard com varios passos, prompts longos e ferramentas. No celular fica apertado — use o desktop para uma experiencia tranquila."
      />

      {semAgentes ? (
        <NoAgentsState onNew={() => setShowWizard(true)} />
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
              onClose={() => setShowWizard(false)}
              onCreated={handleWizardComplete}
            />
          )}
        </AnimatePresence>
      )}
    </>
  )
}
