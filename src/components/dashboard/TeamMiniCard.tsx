import { Avatar } from '@/components/ui/Avatar'
import { formatKpiValue } from './utils'
import type { AgentMetrics } from '@/types/dashboard'

/**
 * SCRUM-1104 (tela 1b) — "Equipe": mini-tabela do rail (nome · abertas · TMR),
 * complemento compacto da tabela completa (`AgentTable`, mais abaixo na
 * coluna principal). Mostra só os agentes com mais conversas abertas hoje —
 * quem precisa de atenção primeiro.
 *
 * O mock (`1b`) tem uma linha extra pro agente de IA com tile de acento —
 * omitida aqui: `AgentMetrics` de hoje só descreve atendentes humanos, e um
 * agente de IA fixo sempre mostrando "—" seria número fictício (P14).
 */
export function TeamMiniCard({ agents }: { agents: AgentMetrics[] }) {
  const top = [...agents]
    .sort((a, b) => b.conversationsToday - a.conversationsToday)
    .slice(0, 5)

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 min-h-10 border-b border-surface-800">
        <p className="text-sm font-semibold text-surface-100">Equipe</p>
        <span className="text-xs text-surface-500 tabular-nums">
          {agents.filter((a) => a.isOnline).length} online
        </span>
      </div>

      {top.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-surface-500">Nenhum agente com dados hoje.</p>
      ) : (
        <div>
          <div className="flex items-center px-4 py-1.5 text-[10px] font-semibold text-surface-600 uppercase tracking-wider">
            <span className="flex-1">Nome</span>
            <span className="w-12 text-right">Abertas</span>
            <span className="w-12 text-right">TMR</span>
          </div>
          {top.map((agent) => (
            <div key={agent.userId} className="flex items-center gap-2 px-4 h-8 border-t border-surface-800/60">
              <Avatar name={agent.name} size="xs" online={agent.isOnline} kind="operator" />
              <span className="flex-1 min-w-0 truncate text-xs font-medium text-surface-200">{agent.name}</span>
              <span className="w-12 text-right text-xs tabular-nums text-surface-300">{agent.conversationsToday || '—'}</span>
              <span className="w-12 text-right text-xs tabular-nums text-surface-400">
                {agent.avgResponseTime ? formatKpiValue(agent.avgResponseTime, 'seconds') : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
