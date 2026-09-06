// ─── Agentes · view de Lista ──────────────────────────────────────────────
// MOVIMENTO PURO (A1/SCRUM-1012): este arquivo é o list+detail que vivia
// dentro de `pages/agents/AgentsPage.tsx`, recortado sem mudança de
// comportamento — mesma coluna de 320px com filtro por status, mesmo painel de
// detalhe, mesmos textos. A única alteração de conteúdo é o `STATUS_CONFIG`,
// que era uma cópia byte-a-byte da constante e agora vem de
// `agents/detail/constants` (achado do Lince na revisão da W0.2).
//
// Por que sair da página: a `AgentsPage` virou um roteador fino entre as duas
// views (Deck e Lista), e a A4 vai reescrever a Lista por dentro — linha com
// sparkline e expansão inline. Com o recorte feito agora, a A4 mexe só neste
// diretório e nunca mais na página, em vez de a A1 pôr de pé um bloco que a A4
// jogaria fora.
//
// O estado "nenhum agente no tenant" NÃO mora aqui: é condição da rota, vale
// igual para o Deck, e é decidido um nível acima (ver AgentsPage).

import { useCallback, useEffect, useState } from 'react'
import { Bot, ChevronRight, ExternalLink, Copy, ToggleRight, Pause, FileText } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { AgentDetail } from '@/components/agents/AgentDetail'
import { STATUS_CONFIG } from '@/components/agents/detail/constants'
import { SkeletonList, SkeletonCard, Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { isAgentStale, type CompanyHubData } from '@/services/companyContextService'

// ─── Relative time ────────────────────────────────────────────────────────────
// Formato próprio da Lista ("3d atrás"), preservado como estava. O Deck usa um
// formato diferente ("há 3d") em `deck/deckFormat`; unificar os dois mudaria o
// texto de uma das telas, o que este movimento não deve fazer.

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

// ─── View ─────────────────────────────────────────────────────────────────────

export interface AgentsListViewProps {
  agents: AgentConfig[]
  loading: boolean
  /** Hub de contexto da empresa — alimenta o ponto "prompt desatualizado". */
  hub: CompanyHubData | null
  /** Muda o status e devolve o agente atualizado (ou `null` se falhou), para
   *  a view refletir a mudança também no painel de detalhe aberto — que é o
   *  que a página fazia antes do recorte. */
  onStatusChange: (id: string, status: AgentConfig['status']) => Promise<AgentConfig | null>
  /** Chamado quando um agente é excluído: a página recarrega a lista. */
  onAgentsChanged: () => void
  /** Agente recém-criado pelo wizard. A view o adota como seleção — é o que a
   *  AgentsPage fazia com `setSelectedAgent(agent)` antes deste recorte. Vem
   *  completo do wizard, então não precisa de `getAgent`. */
  createdAgent?: AgentConfigWithTools | null
}

export function AgentsListView({ agents, loading, hub, createdAgent, onStatusChange, onAgentsChanged }: AgentsListViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigWithTools | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | AgentConfig['status']>('all')
  const [testedAgentIds, setTestedAgentIds] = useState<Set<string>>(new Set())

  // Espelha no detalhe aberto a mudança feita pelo menu de contexto da linha —
  // comportamento preservado do que a AgentsPage fazia antes deste recorte.
  const handleStatusChange = useCallback(async (id: string, status: AgentConfig['status']) => {
    const updated = await onStatusChange(id, status)
    if (updated) setSelectedAgent((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev))
  }, [onStatusChange])

  // Só reage à identidade do agente criado: uma seleção posterior do usuário
  // não é desfeita, porque `createdAgent` continua o mesmo objeto.
  useEffect(() => {
    if (createdAgent) setSelectedAgent(createdAgent)
  }, [createdAgent])

  const selectAgent = async (id: string) => {
    setLoadingDetail(true)
    try {
      const agent = await getAgent(id)
      setSelectedAgent(agent)
    } finally {
      setLoadingDetail(false)
    }
  }

  const filtered = statusFilter === 'all' ? agents : agents.filter(a => a.status === statusFilter)

  const counts = {
    all:    agents.length,
    active:  agents.filter(a => a.status === 'active').length,
    draft:   agents.filter(a => a.status === 'draft').length,
    paused:  agents.filter(a => a.status === 'paused').length,
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Left: Agent list ── */}
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
          {loading ? (
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
                onStatusChange={(id, status) => { void handleStatusChange(id, status) }}
              />
            ))
          )}
        </div>
      </div>

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
              onAgentsChanged()
            }}
          />
        ) : (
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
        )}
      </div>
    </div>
  )
}
