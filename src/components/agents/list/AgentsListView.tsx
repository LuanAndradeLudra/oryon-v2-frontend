// ─── Agentes · view de Lista ──────────────────────────────────────────────
// A4 (SCRUM-1015): a Lista deixa de ser coluna + painel de detalhe e passa a
// ser uma coluna de linhas que abrem no lugar (`.xrow` do mockup). A
// configuração do agente sai daqui e passa a viver no Workspace, atrás de
// "Abrir workspace" — decisão do Maestro: a Lista é triagem, o Workspace é
// onde se configura. Configurar num painel espremido ao lado de uma lista era
// justamente o que o redesenho veio corrigir.
//
// A assinatura de props é a mesma que a A1 deixou, então `AgentsPage` não muda.

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Search } from 'lucide-react'

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { AgentTestModal } from '@/components/agents/AgentTestModal'
import { useDeckData } from '@/components/agents/deck/useDeckData'
import { getAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import type { CompanyHubData } from '@/services/companyContextService'
import { AgentRow } from './AgentRow'
import { AgentRowExpanded } from './AgentRowExpanded'
import { useAgentHealth } from './useAgentHealth'

type StatusFilter = 'all' | AgentConfig['status']

export interface AgentsListViewProps {
  agents: AgentConfig[]
  loading: boolean
  /** Mantido na assinatura por compatibilidade com a página. A A4 não usa o
   *  marcador de "prompt desatualizado" na linha: esse sinal passou para o
   *  bloco Saúde da expansão e para a coluna Atenção do Deck. */
  hub: CompanyHubData | null
  onStatusChange: (id: string, status: AgentConfig['status']) => Promise<AgentConfig | null>
  /** Chamado quando a lista precisa ser recarregada. */
  onAgentsChanged: () => void
  /** Abre o Workspace do agente. Opcional: sem ela, a view navega sozinha
   *  para `/agents/:id/overview`. Existe para a página poder injetar outra
   *  navegação sem que a Lista precise de mudança. */
  onOpenAgent?: (id: string) => void
}

export function AgentsListView({ agents, loading, onStatusChange, onOpenAgent }: AgentsListViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [testAgent, setTestAgent] = useState<AgentConfigWithTools | null>(null)
  const [testLoadingId, setTestLoadingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const deck = useDeckData(agents, !loading)
  const health = useAgentHealth(expandedId)

  const counts = useMemo(() => ({
    all: agents.length,
    active: agents.filter((a) => a.status === 'active').length,
    paused: agents.filter((a) => a.status === 'paused').length,
    draft: agents.filter((a) => a.status === 'draft').length,
  }), [agents])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return agents
      .filter((a) => (statusFilter === 'all' ? true : a.status === statusFilter))
      .filter((a) => (q ? a.name.toLowerCase().includes(q) || (a.sector ?? '').toLowerCase().includes(q) : true))
  }, [agents, statusFilter, query])

  /** Acordeão: abrir uma fecha a outra, como no mockup. */
  const toggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  // O simulador precisa do agente completo (`AgentConfigWithTools`) e a Lista
  // só tem o resumo. Busca no clique, não ao expandir: quem abre a linha para
  // ver saúde não paga por um teste que não vai rodar.
  const abrirSimulador = useCallback(async (id: string) => {
    setTestLoadingId(id)
    try {
      setTestAgent(await getAgent(id))
    } catch {
      // sem toast aqui: o botão volta ao normal e a ação pode ser repetida
    } finally {
      setTestLoadingId(null)
    }
  }, [])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-surface-950">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <SegmentedControl<StatusFilter>
          label="Filtrar agentes por status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Todos', count: counts.all },
            { value: 'active', label: 'Ativos', count: counts.active },
            { value: 'paused', label: 'Pausados', count: counts.paused },
            { value: 'draft', label: 'Rascunhos', count: counts.draft },
          ]}
        />
        <label className="relative flex-shrink-0">
          <span className="sr-only">Buscar agente</span>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="w-[240px] pl-8 pr-3 py-2 rounded-[8px] bg-surface-800 border border-surface-700 text-xs text-surface-100 placeholder:text-surface-400 focus:outline-none focus:border-brand-500"
          />
        </label>
      </div>

      {loading ? (
        <SkeletonList items={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={query ? Search : Bot}
          title={query ? 'Nenhum agente com esse nome' : 'Nenhum agente neste status'}
          className="py-10"
          iconStyle={{ color: 'color-mix(in srgb, var(--color-accent-violet) 55%, transparent)' }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              expanded={expandedId === agent.id}
              onToggle={toggle}
              live={deck.liveAvailable ? deck.live[agent.id] : undefined}
              metrics={deck.metrics[agent.id]}
              queue={deck.queue[agent.id]}
            >
              <AgentRowExpanded
                agent={agent}
                live={deck.liveAvailable ? deck.live[agent.id] : undefined}
                health={health}
                onOpenWorkspace={(id) => (onOpenAgent ? onOpenAgent(id) : navigate(`/agents/${id}/overview`))}
                onTest={(id) => { void abrirSimulador(id) }}
                onToggleStatus={(id, status) => { void onStatusChange(id, status) }}
                testLoading={testLoadingId === agent.id}
              />
            </AgentRow>
          ))}
        </div>
      )}

      {testAgent && (
        <AgentTestModal agent={testAgent} onClose={() => setTestAgent(null)} onTested={() => {}} />
      )}
    </div>
  )
}
