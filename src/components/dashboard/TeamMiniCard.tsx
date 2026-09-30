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
    <div className="bg-surface-800 border border-surface-700 rounded-lg overflow-hidden">
      {/* PL-C3-FAR-eixo10: h-10 fixo, mesma medida dos irmãos do grid. */}
      <div className="flex items-center justify-between px-3.5 h-10 border-b border-surface-700">
        <p className="text-[13px] font-semibold text-surface-100">Equipe</p>
        <span className="text-[11.5px] text-surface-400 tabular-nums">
          {agents.filter((a) => a.isOnline).length} online
        </span>
      </div>

      {top.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-xs text-surface-500">Nenhum agente com dados hoje.</p>
      ) : (
        <div>
          {/* DASH-TEAM-02: grid fixo (não flex) pra alinhar com as linhas;
              1ª coluna sem rótulo — o mock não nomeia "Nome". */}
          <div className="grid grid-cols-[1fr_60px_60px] px-3.5 pt-1.5 pb-0.5 text-[10.5px] font-semibold text-surface-500">
            <span />
            <span className="text-right">Abertas</span>
            <span className="text-right">TMR</span>
          </div>
          {top.map((agent) => (
            <div key={agent.userId} className="grid grid-cols-[1fr_60px_60px] items-center px-3.5 h-8 text-[12.5px]">
              <span className="flex items-center gap-2 min-w-0">
                <Avatar name={agent.name} size="2xs" online={agent.isOnline} kind="operator" />
                <span className="flex-1 min-w-0 truncate">{agent.name}</span>
              </span>
              <span className="text-right tabular-nums">{agent.conversationsToday || '—'}</span>
              <span className="text-right tabular-nums text-surface-400">
                {agent.avgResponseTime ? formatKpiValue(agent.avgResponseTime, 'seconds') : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
