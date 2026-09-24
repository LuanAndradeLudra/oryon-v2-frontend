import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bot, Plus,
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
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'

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

// R2-AGT-06: empty state legado (tile 80px rounded-3xl + botão grande) → primitivo
// EmptyState (caixa tracejada, ícone 20, título 13/600) + Button sm.
function NoAgentsState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex items-start justify-center h-full px-6 pt-10">
      <EmptyState
        icon={Bot}
        title="Nenhum agente ainda"
        hint="Crie o primeiro pra começar a atender no WhatsApp."
        action={{ label: 'Criar primeiro agente', onClick: onNew }}
        className="w-full max-w-md"
      />
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
        // AGT-LIST-04/05: hairline entre itens (não card por item — sem
        // raio/borda própria); selecionado = --rowhover + filete inset 2px --ac.
        'relative w-full text-left p-3 border-b border-surface-700 last:border-b-0 transition-colors duration-150 group cursor-pointer',
        selected
          ? 'bg-[var(--rowhover)] shadow-[inset_2px_0_0_0_var(--color-brand-500)]'
          : 'hover:bg-[var(--rowhover)]',
      )}
    >
      <div className="flex items-center gap-3">
        <AgentIcon iconId={agent.icon} dashed={agent.status === 'draft'} className="w-[34px] h-[34px]" />
        <div className="flex-1 min-w-0">
          {/* Nome + chip de estado na mesma linha (tela 2a); métricas reais
              (conversas atendidas, última atividade) nas duas linhas abaixo —
              nada de sparkline/CSAT fictício, o AgentConfig de hoje só tem
              conversation_count/updated_at. */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-surface-100 truncate">{agent.name}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold flex-shrink-0',
                agent.status === 'active' ? 'color-chip-soft border [--chip:var(--color-status-active)]'
                  : agent.status === 'paused' ? 'color-chip-soft border [--chip:var(--color-status-pending)]'
                  : 'bg-[var(--sf2)] border border-surface-700 text-surface-400',
              )}
            >
              {agent.status === 'active' && <i className="w-[5px] h-[5px] rounded-full bg-current not-italic" />}
              {statusCfg.label}
            </span>
          </div>
          <p className="text-[11.5px] text-surface-400 truncate mt-0.5">
            {agent.conversation_count.toLocaleString('pt-BR')} conversa{agent.conversation_count === 1 ? '' : 's'}
          </p>
          <p className="text-[11px] text-surface-500 truncate">
            atualizado {relativeTime(agent.updated_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {stale && (
            <span
              title="Contexto da IA foi atualizado — sincronize o prompt"
              className="w-2 h-2 rounded-full bg-status-pending ring-2 ring-status-pending-border"
            />
          )}
          {/* chevron removido — o mock não tem (R2-AGT-04) */}
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
  const { toast } = useToast()
  // Agente aberto na URL (`?agent=<id>`): voltar, recarregar ou chegar por um
  // link reabre o mesmo agente, como `?deal=` em Funis.
  const [searchParams, setSearchParams] = useSearchParams()
  const agentParam = searchParams.get('agent')
  const pedidoRef = useRef<string | null>(null)

  useRegisterTopBarActions(
    <Button size="sm" onClick={() => setShowWizard(true)} leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2} />}>
      Novo agente
    </Button>,
    [],
  )

  const handleStatusChange = useCallback(async (id: string, status: AgentConfig['status']) => {
    try {
      const updated = await updateAgent(id, { status })
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)))
      setSelectedAgent((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev))
    } catch (err) {
      // Erro visível em vez de engolido em silêncio (R36) — sem isso o
      // usuário achava que o status mudou quando o backend rejeitou a
      // troca. Nada no estado local foi alterado ainda (só acontece após
      // o await acima ter sucesso), então não há nada a reverter aqui.
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Não foi possível alterar o status do agente.', 'error')
    }
  }, [toast])

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

  const selectAgent = useCallback(async (id: string) => {
    pedidoRef.current = id
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('agent', id)
      return next
    }, { replace: true })
    setLoadingDetail(true)
    try {
      const agent = await getAgent(id)
      setSelectedAgent(agent)
    } finally {
      setLoadingDetail(false)
    }
  }, [setSearchParams])

  // Abre o agente da URL assim que a lista chega (só se ele existir nela).
  useEffect(() => {
    if (!agentParam || selectedAgent?.id === agentParam || pedidoRef.current === agentParam) return
    if (agents.some((a) => a.id === agentParam)) void selectAgent(agentParam)
  }, [agentParam, agents, selectedAgent?.id, selectAgent])

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
          <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-surface-700 bg-surface-800">
            {/* R2-AGT-04 (mock 2a): sem cabeçalho "Agentes · N" (o TopBar já
                titula); barra de chips h22 — ativo --acsoft/--acs sem borda,
                demais borda --bd — com a contagem dentro do chip. */}
            <div className="flex items-center gap-1.5 flex-wrap px-3 py-2.5 border-b border-surface-700 flex-shrink-0">
              {([['all', 'Todos'], ['active', 'Ativos'], ['draft', 'Rascunhos'], ['paused', 'Pausados']] as const)
                .filter(([val]) => val === 'all' || val === 'active' || val === 'draft' || counts[val] > 0)
                .map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={cn(
                    'inline-flex items-center h-[22px] px-2 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer',
                    statusFilter === val
                      ? 'bg-accent-soft text-accent-dark'
                      : 'border border-surface-700 text-surface-400 hover:bg-[var(--rowhover)]',
                  )}
                >
                  {label}
                  {val === 'all' && <span className="tabular-nums">&nbsp;· {counts[val]}</span>}
                </button>
              ))}
            </div>

            {/* List — AGT-LIST-04: itens edge-to-edge, sem gap lateral (a
                hairline por item é a única separação). */}
            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <SkeletonList items={5} className="px-3 pt-3" />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title={statusFilter === 'all' ? 'Nenhum agente ainda' : 'Nenhum agente neste status'}
                  className="py-10 px-3"
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
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32 bg-[var(--sf2)]" />
                </div>
              </div>
              <Skeleton className="h-9 w-full max-w-lg bg-[var(--sf2)]" />
              <SkeletonCard lines={4} />
            </div>
          ) : selectedAgent ? (
            <AgentDetail
              key={selectedAgent.id}
              agent={selectedAgent}
              // Testado = já tem teste registrado no servidor OU foi testado
              // nesta sessão. Só a sessão fazia o aviso "ainda não testado"
              // reaparecer a cada visita, mesmo em agente testado várias vezes.
              tested={testedAgentIds.has(selectedAgent.id) || (selectedAgent.test_count ?? 0) > 0}
              onTested={() => setTestedAgentIds(prev => new Set([...prev, selectedAgent.id]))}
              onDeleted={() => {
                setSelectedAgent(null)
                void load()
              }}
            />
          ) : agents.length > 0 ? (
            /* Has agents but none selected */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-lg bg-surface-900 ring-1 ring-surface-800 flex items-center justify-center">
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
