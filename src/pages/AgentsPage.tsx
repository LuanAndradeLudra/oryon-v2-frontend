import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Plus, ChevronRight, RefreshCw, Sparkles,
  ExternalLink, Copy, ToggleRight, Pause, FileText,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { loadHub, isAgentStale } from '@/services/companyContextService'
import { cn } from '@/lib/utils'
import { listAgents, getAgent, updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { AgentBuilderWizard } from '@/components/agents/AgentBuilderWizard'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { AgentDetail } from '@/components/agents/AgentDetail'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:  { label: 'Ativo',     color: 'bg-status-active-bg text-status-active ring-status-active-border', dot: 'bg-status-active' },
  draft:   { label: 'Rascunho',  color: 'bg-status-pending-bg   text-status-pending   ring-status-pending-border',   dot: 'bg-status-pending'   },
  paused:  { label: 'Pausado',   color: 'bg-surface-700/40 text-surface-400 ring-surface-600/30', dot: 'bg-surface-400' },
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentConfig['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1', cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)  return 'agora mesmo'
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 30)   return `${d}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoAgentsState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
      <div className="w-20 h-20 rounded-3xl bg-brand-600/8 ring-1 ring-brand-500/15 flex items-center justify-center">
        <Bot className="w-10 h-10 text-brand-500/60" />
      </div>
      <div>
        <p className="text-base font-semibold text-surface-200">Selecione um agente</p>
        <p className="text-sm text-surface-500 mt-1">ou crie um novo para começar</p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-medium transition-colors shadow-lg shadow-brand-900/30"
      >
        <Sparkles className="w-4 h-4" />
        Criar primeiro agente
      </button>
    </div>
  )
}

// ─── Agent card (left list) ───────────────────────────────────────────────────

function AgentCard({
  agent,
  selected,
  onClick,
  stale,
  onStatusChange,
}: {
  agent: AgentConfig
  selected: boolean
  onClick: () => void
  stale?: boolean
  onStatusChange?: (id: string, status: AgentConfig['status']) => void
}) {
  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = [
      { label: 'Abrir', icon: ExternalLink, onClick },
      {
        label: 'Copiar nome',
        icon: Copy,
        onClick: () => navigator.clipboard.writeText(agent.name).catch(() => {}),
      },
    ]
    if (onStatusChange) {
      items.push({ separator: true })
      if (agent.status !== 'active') {
        items.push({ label: 'Ativar', icon: ToggleRight, onClick: () => onStatusChange(agent.id, 'active') })
      }
      if (agent.status !== 'paused') {
        items.push({ label: 'Pausar', icon: Pause, onClick: () => onStatusChange(agent.id, 'paused') })
      }
      if (agent.status !== 'draft') {
        items.push({ label: 'Mover para rascunho', icon: FileText, onClick: () => onStatusChange(agent.id, 'draft') })
      }
    }
    return items
  }, [agent, onClick, onStatusChange])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'w-full text-left px-3 py-3 rounded-xl border transition-colors duration-150 group',
        selected
          ? 'bg-brand-600/10 border-brand-500/30 shadow-sm shadow-brand-900/30'
          : 'bg-surface-900/50 border-surface-800/60 hover:bg-surface-800/60 hover:border-surface-700',
      )}
    >
      <div className="flex items-start gap-3">
        <AgentIcon iconId={agent.icon} className="w-9 h-9" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-surface-100 truncate">{agent.name}</span>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-xs text-surface-500 truncate">
            Atualizado {relativeTime(agent.updated_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {stale && (
            <span
              title="Contexto da IA foi atualizado — sincronize o prompt"
              className="w-2 h-2 rounded-full bg-status-pending ring-2 ring-status-pending-border"
            />
          )}
          <ChevronRight className={cn(
            'w-4 h-4 transition-colors',
            selected ? 'text-brand-400 translate-x-0.5' : 'text-surface-700 group-hover:text-surface-500',
          )} />
        </div>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AgentsPage() {
  const { user } = useAuth()
  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigWithTools | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const banner = useDesktopRecommendedBanner('agents')
  const [statusFilter, setStatusFilter] = useState<'all' | AgentConfig['status']>('all')
  const [testedAgentIds, setTestedAgentIds] = useState<Set<string>>(new Set())

  useRegisterTopBarActions(
    <button
      onClick={() => setShowWizard(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-xs font-medium transition"
    >
      <Plus className="w-3.5 h-3.5" />
      Novo agente
    </button>,
    [],
  )

  const handleStatusChange = useCallback(async (id: string, status: AgentConfig['status']) => {
    try {
      const updated = await updateAgent(id, { status })
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)))
      setSelectedAgent((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev))
    } catch {
      // swallow — AgentCard has no toast; a page-level toast can be added later.
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

  const selectAgent = async (id: string) => {
    setLoadingDetail(true)
    try {
      const agent = await getAgent(id)
      setSelectedAgent(agent)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleWizardComplete = (agent: AgentConfigWithTools) => {
    setAgents(prev => [agent, ...prev])
    setSelectedAgent(agent)
    setShowWizard(false)
  }

  const filtered = statusFilter === 'all' ? agents : agents.filter(a => a.status === statusFilter)

  const counts = {
    all:    agents.length,
    active:  agents.filter(a => a.status === 'active').length,
    draft:   agents.filter(a => a.status === 'draft').length,
    paused:  agents.filter(a => a.status === 'paused').length,
  }

  const hasAgents = loadingList || agents.length > 0

  return (
    <>
      <DesktopRecommendedBanner
        visible={banner.visible}
        onDismiss={banner.dismiss}
        message="Configurar e testar agentes IA tem wizard com varios passos, prompts longos e ferramentas. No celular fica apertado — use o desktop para uma experiencia tranquila."
      />
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Agent list — hidden when no agents ── */}
        {hasAgents && (
          <div className="w-80 flex-shrink-0 flex flex-col border-r border-surface-800/60">
            {/* Status filter */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-800/40 flex-shrink-0">
              {([['all', 'Todos'], ['active', 'Ativos'], ['draft', 'Rascunho'], ['paused', 'Pausados']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={cn(
                    'flex-1 text-center text-xs py-1 rounded-lg transition',
                    statusFilter === val
                      ? 'bg-surface-800 text-surface-200 font-medium'
                      : 'text-surface-600 hover:text-surface-400',
                  )}
                >
                  {label}
                  {counts[val] > 0 && (
                    <span className={cn('ml-1', statusFilter === val ? 'text-surface-400' : 'text-surface-700')}>
                      {counts[val]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingList ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-5 h-5 text-surface-700 animate-spin" />
                </div>
              ) : (
                filtered.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    selected={selectedAgent?.id === agent.id}
                    onClick={() => selectAgent(agent.id)}
                    stale={hub ? isAgentStale(agent.updated_at, hub) : false}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Right: Detail panel ── */}
        <div className="flex-1 overflow-hidden">
          {loadingDetail ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-5 h-5 text-surface-700 animate-spin" />
            </div>
          ) : selectedAgent ? (
            <AgentDetail
              key={selectedAgent.id}
              agent={selectedAgent}
              tested={testedAgentIds.has(selectedAgent.id)}
              onTested={() => setTestedAgentIds(prev => new Set([...prev, selectedAgent.id]))}
              onDeleted={() => {
                setSelectedAgent(null)
                void load()
              }}
            />
          ) : agents.length > 0 ? (
            /* Has agents but none selected */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-surface-900 ring-1 ring-surface-800 flex items-center justify-center">
                <Bot className="w-8 h-8 text-surface-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">Selecione um agente</p>
                <p className="text-xs text-surface-600 mt-1">ou crie um novo para começar</p>
              </div>
            </div>
          ) : !loadingList ? (
            /* No agents at all */
            <NoAgentsState onNew={() => setShowWizard(true)} />
          ) : null}
        </div>
      </div>

      {/* Agent Builder Wizard */}
      <AnimatePresence>
        {showWizard && (
          <AgentBuilderWizard
            key="agent-builder-wizard"
            onClose={() => setShowWizard(false)}
            onCreated={handleWizardComplete}
          />
        )}
      </AnimatePresence>
    </>
  )
}
