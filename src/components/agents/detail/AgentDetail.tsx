import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Wrench, MoreHorizontal, Power, PauseCircle,
  FileText, Archive, Copy,
  Sparkles, BookOpen, RefreshCw,
  Workflow, Info, ShieldCheck, Package, BarChart3,
} from 'lucide-react'
import { CapabilitiesTab } from '../CapabilitiesTab'
import { DecisionCriteriaTab } from '../DecisionCriteriaTab'
import { motion, AnimatePresence } from 'framer-motion'

import { cn } from '@/lib/utils'
import { Tabs, type TabAccent } from '@/components/ui/Tabs'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools, AgentTool } from '@/services/agentsApi'
import { ConfirmModal } from '@/components/ui/Modal'
import { Banner } from '@/components/ui/Banner'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { AgentTestModal } from '@/components/agents/AgentTestModal'
import { SkillsTab } from '@/components/agents/SkillsTab'
import { AgentCatalogTab } from '@/components/agents/AgentCatalogTab'
import { useAdvancedMode } from '@/hooks/useAdvancedMode'
import { isFeatureVisible } from '@/config/featureFlags'

import type { Tab, RulesSubTab } from './types'
import { StatusBadge, InlineEdit } from './shared'
import { OverviewTab } from './tabs/OverviewTab'
import { SystemPromptTab } from './tabs/SystemPromptTab'
import { ToolsTab } from './tabs/ToolsTab'
import { RulesTab } from './tabs/RulesTab'
import { KnowledgeBaseTab } from './tabs/KnowledgeBaseTab'
import { MetricsTab } from './tabs/MetricsTab'

// ─── Agent Detail ─────────────────────────────────────────────────────────────

export function AgentDetail({
  agent: initialAgent,
  onDeleted,
  tested,
  onTested,
}: {
  agent: AgentConfigWithTools
  onDeleted: () => void
  tested: boolean
  onTested: () => void
}) {
  const [agent, setAgent] = useState<AgentConfigWithTools>(initialAgent)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  // Skills tab is the customer-facing surface for n8n-routed capabilities;
  // it replaces the legacy "Ferramentas" tab in the default view. The
  // legacy tab stays available behind Advanced Mode for power users that
  // already configured raw HTTP tools.
  const skillsVisible = isFeatureVisible('agentSkills')
  const [advancedMode] = useAdvancedMode()
  // Sub-tab state for the unified "Regras" tab — lifted here because the
  // outer scroll/flex layout depends on which sub-panel is active.
  const [rulesSubTab, setRulesSubTab] = useState<RulesSubTab>('handoff')
  const [deletingAgent, setDeletingAgent] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const toggleStatus = async () => {
    const next = agent.status === 'active' ? 'paused' : 'active'
    setTogglingStatus(true)
    try {
      const updated = await updateAgent(agent.id, { status: next })
      handleAgentUpdate(updated)
    } finally {
      setTogglingStatus(false)
    }
  }

  useEffect(() => { setAgent(initialAgent) }, [initialAgent])

  const handleAgentUpdate = useCallback((updated: AgentConfig) => {
    setAgent(prev => ({ ...prev, ...updated }))
  }, [])

  const handleToolsChange = useCallback((tools: AgentTool[]) => {
    setAgent(prev => ({ ...prev, tools }))
  }, [])

  // Fase 5a: `accent` dá identidade categórica pra cada seção (só a aba
  // ATIVA fica colorida — inativas continuam neutras, então nunca aparecem
  // duas cores ao mesmo tempo). Escolhas por afinidade semântica, não por
  // ordem mecânica: "Visão geral" fica sem accent (cor da marca, é a aba-
  // -padrão/casa); Skills/Ferramentas usam os mesmos tons já convencionados
  // pra essas categorias em outras telas deste arquivo (âmbar = destaque/
  // integração, azul = técnico/bruto, ver `METHOD_COLOR` em detail/tabs/ToolsTab.tsx).
  const tabs: { id: Tab; label: string; icon: React.ReactNode; accent?: TabAccent }[] = [
    { id: 'overview', label: 'Visão geral', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'prompt',   label: 'System Prompt', icon: <FileText className="w-3.5 h-3.5" />, accent: 'violet' },
    { id: 'capabilities', label: 'Capacidades', icon: <ShieldCheck className="w-3.5 h-3.5" />, accent: 'green' },
    { id: 'criteria', label: 'Critérios', icon: <Info className="w-3.5 h-3.5" />, accent: 'cyan' },
    ...(skillsVisible
      ? [{ id: 'skills' as Tab, label: 'Skills', icon: <Sparkles className="w-3.5 h-3.5" />, accent: 'amber' as TabAccent }]
      : []),
    // Legacy raw-HTTP tools — only visible to users that flipped Advanced Mode.
    ...(advancedMode
      ? [{ id: 'tools' as Tab, label: `Ferramentas${agent.tools.length > 0 ? ` (${agent.tools.length})` : ''}`, icon: <Wrench className="w-3.5 h-3.5" />, accent: 'blue' as TabAccent }]
      : []),
    { id: 'rules',    label: 'Regras', icon: <Workflow className="w-3.5 h-3.5" />, accent: 'rose' },
    { id: 'knowledge', label: 'Conhecimento', icon: <BookOpen className="w-3.5 h-3.5" />, accent: 'cyan' },
    { id: 'catalog',  label: 'Catálogo', icon: <Package className="w-3.5 h-3.5" />, accent: 'green' },
    { id: 'metrics',  label: 'Métricas', icon: <BarChart3 className="w-3.5 h-3.5" />, accent: 'blue' },
  ]

  // If the user lands on `tools` while Advanced Mode is off, bounce them to
  // the new Skills tab so the panel stays in a consistent state.
  useEffect(() => {
    if (activeTab === 'tools' && !advancedMode) {
      setActiveTab(skillsVisible ? 'skills' : 'overview')
    }
  }, [activeTab, advancedMode, skillsVisible])

  return (
    <div className="flex flex-col h-full">
      {/* Header de identidade — ícone maior ancora o agente; ações
          hierarquizadas: Testar (primária), Ativar/Pausar (estado) e o
          destrutivo escondido no menu "..." (padrão enterprise: excluir
          nunca fica a 1 clique na superfície). */}
      <div className="flex items-center gap-4 px-6 pt-5 pb-4 flex-shrink-0">
        <AgentIcon iconId={agent.icon} className="w-12 h-12" />
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={agent.name}
            onSave={async (name) => {
              const updated = await updateAgent(agent.id, { name })
              handleAgentUpdate(updated)
            }}
            className="text-lg font-display font-bold text-surface-50"
          />
          <div className="flex items-center gap-2.5 mt-1">
            <StatusBadge status={agent.status} />
            <span className="text-xs text-surface-600">·</span>
            <span className="text-xs text-surface-500">
              Atualizado {new Date(agent.updated_at).toLocaleDateString('pt-BR')}
            </span>
            {advancedMode && agent.tools.length > 0 && (
              <>
                <span className="text-xs text-surface-600">·</span>
                <span className="text-xs text-surface-500">{agent.tools.length} ferramenta(s)</span>
              </>
            )}
          </div>
        </div>
        {/* Testar Agente */}
        <button
          onClick={() => setShowTest(true)}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-brand-600/15 hover:bg-brand-600/25 text-brand-400 text-xs font-semibold ring-1 ring-brand-500/30 transition-colors hover:ring-brand-500/50 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Testar
        </button>
        {/* Ativar / Pausar */}
        <button
          onClick={toggleStatus}
          disabled={togglingStatus}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold ring-1 transition-colors disabled:opacity-50 cursor-pointer',
            agent.status === 'active'
              ? 'bg-surface-800 text-surface-400 ring-surface-700 hover:bg-danger/10 hover:text-danger hover:ring-danger/30'
              : 'bg-status-active-bg text-status-active ring-status-active-border hover:bg-status-active-bg/80',
          )}
        >
          {togglingStatus
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : agent.status === 'active'
              ? <><PauseCircle className="w-3.5 h-3.5" /> Pausar</>
              : <><Power className="w-3.5 h-3.5" /> Ativar</>}
        </button>
        {/* Overflow — ações raras/destrutivas */}
        <div className="relative">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="Mais ações"
            className={cn(
              'w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer',
              moreOpen
                ? 'border-surface-600 bg-surface-800 text-surface-200'
                : 'border-surface-800 text-surface-500 hover:border-surface-700 hover:text-surface-300',
            )}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {moreOpen && (
            <>
              <div className="overlay-scrim z-40" aria-hidden onClick={() => setMoreOpen(false)} />
              <div className="absolute right-0 top-full mt-1 min-w-[13rem] py-1 overlay-surface border rounded-xl z-50">
                <button
                  onClick={() => {
                    setMoreOpen(false)
                    navigator.clipboard.writeText(agent.name).catch(() => {})
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-surface-300 hover:bg-surface-700 transition-colors text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar nome
                </button>
                <div className="my-1 border-t border-surface-700/60" />
                <button
                  onClick={() => { setMoreOpen(false); setConfirmDeleteOpen(true) }}
                  disabled={deletingAgent}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition-colors text-left cursor-pointer"
                >
                  {/* QW-18 (F-AGENT-11): rótulo/ícone diziam "excluir" — a
                      ação de verdade move pra rascunho, não apaga nada
                      (updateAgent(id, {status:'draft'}) abaixo). Archive em
                      vez de Trash2 pela mesma razão: a lixeira promete
                      destruição, isto é reversível. */}
                  <Archive className="w-3.5 h-3.5" />
                  Desativar (vira rascunho)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          setDeletingAgent(true)
          updateAgent(agent.id, { status: 'draft' })
            .then(() => onDeleted())
            .catch(() => setDeletingAgent(false))
        }}
        title="Desativar agente"
        description={`Desativar o agente "${agent.name}"? Ele vira rascunho e deixa de responder conversas — pode reativar quando quiser.`}
        confirmLabel="Desativar"
        danger
        loading={deletingAgent}
      />

      {/* Setup notification — show when agent not yet tested */}
      <AnimatePresence>
        {!tested && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <Banner
              variant="warning"
              className="mx-6 my-3"
              action={
                <button
                  onClick={() => setShowTest(true)}
                  className="text-xs font-medium text-white hover:text-white/80 underline underline-offset-2 transition flex-shrink-0"
                >
                  Testar agora
                </button>
              }
            >
              Agente ainda não testado — recomendamos testar antes de ativar para garantir o comportamento correto.
            </Banner>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs — underline (mais leve que pílulas com 9 opções; o indicador
          de 2px comunica seleção sem competir com o conteúdo). Extraído pra
          `ui/Tabs.tsx` (Fase 3 do plano de reestilização) — mesma marcação,
          mesmas classes, só reaproveitável agora. */}
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        label="Seções do agente"
        className="px-6"
      />

      {/* Tab content — "Regras" with Roteamento sub-tab needs flex-contained
          layout for the sticky save bar; everything else scrolls normally. */}
      {(() => {
        const needsFlex = activeTab === 'rules' && rulesSubTab === 'handoff'
        return (
          <div className={cn(
            'flex-1 min-h-0 px-6 py-5',
            needsFlex ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          )}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className={needsFlex ? 'flex flex-col flex-1 min-h-0' : undefined}
              >
                {activeTab === 'overview' && <OverviewTab  agent={agent} onUpdate={handleAgentUpdate} />}
                {activeTab === 'prompt'   && <SystemPromptTab agent={agent} onUpdate={handleAgentUpdate} />}
                {activeTab === 'capabilities' && <CapabilitiesTab agent={agent} onUpdate={handleAgentUpdate} />}
                {activeTab === 'criteria' && <DecisionCriteriaTab agent={agent} onUpdate={handleAgentUpdate} />}
                {activeTab === 'skills'   && <SkillsTab agentId={agent.id} />}
                {activeTab === 'tools'    && <ToolsTab agent={agent} onToolsChange={handleToolsChange} />}
                {activeTab === 'rules'    && (
                  <RulesTab
                    agent={agent}
                    onUpdate={handleAgentUpdate}
                    subTab={rulesSubTab}
                    onSubTabChange={setRulesSubTab}
                  />
                )}
                {activeTab === 'knowledge' && <KnowledgeBaseTab agent={agent} />}
                {activeTab === 'catalog'  && <AgentCatalogTab agentId={agent.id} />}
                {activeTab === 'metrics'  && <MetricsTab agent={agent} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )
      })()}

      {/* Test chat modal */}
      <AnimatePresence>
        {showTest && (
          <AgentTestModal
            agent={agent}
            onClose={() => setShowTest(false)}
            onTested={onTested}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
