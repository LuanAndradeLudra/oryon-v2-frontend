import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { formatKpiValue } from './utils'
import type { AgentMetrics } from '@/types/dashboard'

type SortKey = keyof AgentMetrics
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-surface-600" />
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-brand-400" />
    : <ChevronDown className="w-3 h-3 text-brand-400" />
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-surface-800 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-surface-300 tabular-nums">{value}%</span>
    </div>
  )
}

function slaColor(v: number): string {
  if (v >= 90) return '#10b981'
  if (v >= 70) return '#f59e0b'
  return '#ef4444'
}

function utilizationColor(v: number): string {
  if (v >= 85) return '#ef4444'
  if (v >= 60) return '#6366f1'
  return '#5588b0'
}

export function AgentTable({ agents }: { agents: AgentMetrics[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'conversationsToday', dir: 'desc',
  })

  const sorted = [...agents].sort((a, b) => {
    const va = a[sort.key]
    const vb = b[sort.key]
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sort.dir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    )
  }

  const Th = ({ label, sortKey, className }: { label: string; sortKey?: SortKey; className?: string }) => (
    <th
      className={cn(
        'text-left px-4 py-3 text-[11px] font-semibold text-surface-500 uppercase tracking-wider select-none',
        sortKey && 'cursor-pointer hover:text-surface-300 transition-colors',
        className,
      )}
      onClick={() => sortKey && toggleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey && <SortIcon active={sort.key === sortKey} dir={sort.dir} />}
      </div>
    </th>
  )

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-surface-100">Performance da Equipe</p>
          <p className="text-xs text-surface-400 mt-0.5">Métricas individuais do período</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-online" />
          <span className="text-xs text-surface-400">
            {agents.filter((a) => a.isOnline).length} de {agents.length} online
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-800">
              <Th label="Agente"         sortKey="name"               />
              <Th label="Status"         sortKey="isOnline"           />
              <Th label="Conversas"      sortKey="conversationsToday" />
              <Th label="Resolvidas"     sortKey="resolvedToday"      />
              <Th label="TMR"            sortKey="avgResponseTime"    />
              <Th label="Resolução"      sortKey="avgResolutionTime"  />
              <Th label="CSAT"           sortKey="csat"               />
              <Th label="SLA"            sortKey="slaCompliance"      />
              <Th label="Utilização"     sortKey="utilization"        />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {sorted.map((agent) => (
              <tr key={agent.userId} className="hover:bg-surface-800/50 transition-colors">
                {/* Agent */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={agent.name} size="sm" online={agent.isOnline} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-100">{agent.name}</p>
                      <p className="text-xs text-surface-500">{agent.departmentName}</p>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  {agent.isOnline
                    ? <span className="text-xs text-online font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-online" />Online</span>
                    : <span className="text-xs text-surface-500 font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-surface-600" />Offline</span>
                  }
                </td>

                {/* Conversations */}
                <td className="px-4 py-3.5 text-sm text-surface-200 font-semibold tabular-nums">
                  {agent.conversationsToday || '—'}
                </td>

                {/* Resolved */}
                <td className="px-4 py-3.5 text-sm text-surface-200 tabular-nums">
                  {agent.resolvedToday || '—'}
                </td>

                {/* First response time */}
                <td className="px-4 py-3.5 text-sm text-surface-300 tabular-nums">
                  {agent.avgResponseTime ? formatKpiValue(agent.avgResponseTime, 'seconds') : '—'}
                </td>

                {/* Resolution time */}
                <td className="px-4 py-3.5 text-sm text-surface-300 tabular-nums">
                  {agent.avgResolutionTime ? formatKpiValue(agent.avgResolutionTime, 'seconds') : '—'}
                </td>

                {/* CSAT */}
                <td className="px-4 py-3.5">
                  {agent.csat > 0 ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-surface-100 tabular-nums">{agent.csat.toFixed(1)}</span>
                      <span className="text-xs text-away">★</span>
                    </div>
                  ) : <span className="text-xs text-surface-600">—</span>}
                </td>

                {/* SLA */}
                <td className="px-4 py-3.5">
                  {agent.slaCompliance > 0
                    ? <MiniBar value={agent.slaCompliance} color={slaColor(agent.slaCompliance)} />
                    : <span className="text-xs text-surface-600">—</span>}
                </td>

                {/* Utilization */}
                <td className="px-4 py-3.5">
                  {agent.utilization > 0
                    ? <MiniBar value={agent.utilization} color={utilizationColor(agent.utilization)} />
                    : <span className="text-xs text-surface-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
