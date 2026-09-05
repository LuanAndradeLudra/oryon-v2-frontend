import { useState, useEffect, useCallback } from 'react'
import {
  Bot, Plus, ChevronRight, Sparkles,
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
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SkeletonList, SkeletonCard, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; chip: string }> = {
  active:  { label: 'Ativo',     chip: 'var(--color-status-active)'  },
  draft:   { label: 'Rascunho',  chip: 'var(--color-status-pending)' },
  paused:  { label: 'Pausado',   chip: 'var(--color-status-muted)'   },
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

  const statusCfg = STATUS_CONFIG[agent.status]

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative w-full text-left pl-4 pr-3 py-3 rounded-2xl border transition-colors duration-150 group cursor-pointer',
        selected
          ? 'bg-brand-600/10 border-brand-500/30'
          : 'bg-surface-900/50 border-surface-800/60 hover:bg-surface-800/60 hover:border-surface-700',
      )}
    >
      {/* Accent bar de seleção — sinal periférico que não depende de cor de fundo */}
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-colors',
          selected ? 'bg-brand-500' : 'bg-transparent',
        )}
      />
      <div className="flex items-center gap-3">
        <AgentIcon iconId={agent.icon} className="w-9 h-9" />
        <div className="flex-1 min-w-0">
          {/* Nome em linha própria — status desceu p/ a meta row, então o
              nome não trunca mais por competir com o badge */}
          <span className="block text-sm font-semibold text-surface-100 truncate">{agent.name}</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-surface-500">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusCfg.chip }}
            />
            <span>{statusCfg.label}</span>
            <span className="text-surface-700">·</span>
            <span className="truncate">{relativeTime(agent.updated_at)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {stale && (
            <span
              title="Contexto da IA foi atualizado — sincronize o prompt"
              className="w-2 h-2 rounded-full bg-status-pending ring-2 ring-status-pending-border"
            />
          )}
          <ChevronRight className={cn(
            'w-4 h-4 transition-all',
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
  const isMobile = useIsMobile()
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
            {/* Cabeçalho da coluna — identifica a lista e o total sem depender do TopBar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
              <h2 className="text-sm font-display font-bold text-surface-100">Agentes</h2>
              <span className="text-xs font-medium text-surface-500 bg-surface-800 px-2 py-0.5 rounded-full tabular-nums">
                {counts.all}
              </span>
            </div>

            {/* Status filter */}
            <div className="px-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-surface-900 border border-surface-800 rounded-xl p-1">
                {([['all', 'Todos'], ['active', 'Ativos'], ['draft', 'Rascunhos'], ['paused', 'Pausados']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatusFilter(val)}
                    className={cn(
                      'flex-1 text-center text-xs py-1.5 rounded-lg transition-colors cursor-pointer',
                      statusFilter === val
                        ? 'bg-surface-700 text-surface-100 font-medium shadow-sm'
                        : 'text-surface-500 hover:text-surface-300',
                    )}
                  >
                    {label}
                    {counts[val] > 0 && (
                      <span className={cn('ml-1 tabular-nums', statusFilter === val ? 'text-surface-400' : 'text-surface-600')}>
                        {counts[val]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {loadingList ? (
                <SkeletonList items={5} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title={statusFilter === 'all' ? 'Nenhum agente ainda' : 'Nenhum agente neste status'}
                  className="py-10"
                  iconStyle={{ color: 'color-mix(in srgb, var(--color-accent-violet) 55%, transparent)' }}
                />
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
            <div className="px-6 pt-6 space-y-4">
              {/* Skeleton espelha o header + tabs do detail — sem "flash" de spinner */}
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32 bg-surface-800/70" />
                </div>
              </div>
              <Skeleton className="h-9 w-full max-w-lg bg-surface-800/60" />
              <SkeletonCard lines={4} />
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
