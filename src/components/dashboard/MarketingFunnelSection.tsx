import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { DollarSign, Users, Target, BarChart2, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useChartColors } from '@/hooks/useChartColors'
import { attributionApi } from '@/services/api'
import type { AdCampaignMetrics, MarketingFunnelTotals } from '@/types'
import type { DateRange } from '@/types/dashboard'
import { cn } from '@/lib/utils'
import { CampaignLeadsDrawer } from '@/components/campaigns/CampaignLeadsDrawer'

// ── Funnel Chart ──────────────────────────────────────────────────────────────

function FunnelChart({ campaigns }: { campaigns: AdCampaignMetrics[] }) {
  const C = useChartColors()
  if (!campaigns.length) return null

  // Aggregate across all selected campaigns
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const leads = campaigns.reduce((s, c) => s + c.leadsGenerated, 0)
  const qualified = campaigns.reduce((s, c) => s + c.qualified, 0)
  const customers = campaigns.reduce((s, c) => s + c.customers, 0)

  const stages = [
    { label: 'Impressões', value: impressions, color: C.cyan },
    { label: 'Cliques',    value: clicks,      color: C.brand },
    { label: 'Leads',      value: leads,       color: C.away },
    { label: 'Qualif.',    value: qualified,   color: C.purple },
    { label: 'Clientes',   value: customers,   color: C.online },
  ]

  // Normalize to percentage of first step for visual funnel
  const max = impressions || 1
  const chartData = stages.map((s) => ({
    label: s.label,
    value: s.value,
    pct: (s.value / max) * 100,
    color: s.color,
  }))

  const convRate = impressions > 0 ? ((customers / impressions) * 100).toFixed(3) : '0'

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-surface-100">Funil de Conversão</p>
          <p className="text-xs text-surface-400 mt-0.5">Do anúncio ao cliente</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-surface-500">Impressão → Cliente</p>
          <p className="text-sm font-bold text-surface-200">{convRate}%</p>
        </div>
      </div>

      {/* Visual funnel stages */}
      <div className="flex items-end gap-1 mb-4">
        {stages.map((stage, i) => {
          const widthPct = Math.max(20, (stage.value / max) * 100)
          const nextConv = i < stages.length - 1 && stages[i].value > 0
            ? ((stages[i + 1].value / stages[i].value) * 100).toFixed(1)
            : null
          return (
            <div key={stage.label} className="flex-1 flex flex-col items-center gap-1.5">
              <p className="text-xs font-bold text-surface-100 tabular-nums">
                {stage.value.toLocaleString('pt-BR')}
              </p>
              <div className="w-full flex justify-center">
                <div
                  className="rounded-t-lg transition-all"
                  style={{
                    width: `${Math.min(100, widthPct)}%`,
                    height: 40,
                    backgroundColor: stage.color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <p className="text-[10px] text-surface-400 text-center leading-tight">{stage.label}</p>
              {nextConv && (
                <div className="flex items-center gap-0.5 text-[10px] text-surface-500">
                  <ArrowRight className="w-2.5 h-2.5" />
                  <span>{nextConv}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Recharts bar for absolute values */}
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: C.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0]
              return (
                <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                  <p className="text-surface-300 font-medium">{p.payload.label}</p>
                  <p className="text-surface-100 font-bold tabular-nums">{Number(p.value).toLocaleString('pt-BR')}</p>
                </div>
              )
            }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Campaigns Table ───────────────────────────────────────────────────────────

function AdCampaignsTable({
  campaigns,
  onLeadsClick,
}: {
  campaigns: AdCampaignMetrics[]
  onLeadsClick: (campaignId: string, campaignName: string) => void
}) {
  const C = useChartColors()
  const [expanded, setExpanded] = useState<string | null>(null)
  type SortKey = 'spend' | 'leadsGenerated' | 'cpl' | 'customers' | 'roas' | 'conversionRate'
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...campaigns].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
    : null

  const cols: { key: SortKey; label: string }[] = [
    { key: 'spend',          label: 'Invest.' },
    { key: 'leadsGenerated', label: 'Leads'   },
    { key: 'cpl',            label: 'CPL'     },
    { key: 'customers',      label: 'Clientes'},
    { key: 'roas',           label: 'ROAS'    },
    { key: 'conversionRate', label: 'Conv. %' },
  ]

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-800">
        <p className="text-sm font-semibold text-surface-100">Campanhas Pagas</p>
        <p className="text-xs text-surface-400 mt-0.5">Performance com conversão no CRM</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left px-5 py-3 text-surface-400 font-medium">Campanha</th>
              {cols.map((c) => (
                <th key={c.key}
                  className="text-right px-3 py-3 text-surface-400 font-medium cursor-pointer hover:text-surface-200 transition-colors"
                  onClick={() => handleSort(c.key)}>
                  <span className="inline-flex items-center gap-0.5 justify-end">
                    {c.label}<SortIcon k={c.key} />
                  </span>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((camp) => (
              <>
                <tr
                  key={camp.platformCampaignId}
                  className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors cursor-pointer"
                  onClick={() => setExpanded(expanded === camp.platformCampaignId ? null : camp.platformCampaignId)}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: C.meta + '1a', color: C.meta }}>
                        Meta Ads
                      </span>
                      <span className="text-surface-200 font-medium truncate max-w-[200px]">{camp.platformCampaignName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-surface-300 tabular-nums">
                    R$ {camp.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <button
                      onClick={(e) => { e.stopPropagation(); onLeadsClick(camp.platformCampaignId, camp.platformCampaignName) }}
                      className="text-accent-amber font-medium hover:underline transition-colors"
                    >
                      {camp.leadsGenerated}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right text-surface-300 tabular-nums">
                    R$ {camp.cpl.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right text-surface-300 tabular-nums">{camp.customers}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <span className={cn('font-medium', camp.roas && camp.roas > 5 ? 'text-online' : 'text-surface-300')}>
                      {camp.roas ? camp.roas.toFixed(1) + 'x' : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-surface-300 tabular-nums">
                    {camp.conversionRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right">
                    {expanded === camp.platformCampaignId
                      ? <ChevronUp className="w-3.5 h-3.5 text-surface-500 ml-auto" />
                      : <ChevronDown className="w-3.5 h-3.5 text-surface-500 ml-auto" />}
                  </td>
                </tr>
                {expanded === camp.platformCampaignId && (
                  <tr key={`${camp.platformCampaignId}-expanded`} className="border-b border-surface-800/50">
                    <td colSpan={8} className="px-5 py-3 bg-surface-800/20">
                      <div className="flex items-center gap-3 flex-wrap">
                        {camp.funnelBreakdown.map((stage, i) => (
                          <div key={stage.stageKey} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: stage.stageColor }} />
                            <span className="text-surface-400">{stage.stageLabel}:</span>
                            <span className="text-surface-200 font-semibold tabular-nums">{stage.count}</span>
                            {i < camp.funnelBreakdown.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-surface-700 mx-0.5" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 mt-2 text-surface-500">
                        <span>CTR: <strong className="text-surface-300">{camp.ctr.toFixed(2)}%</strong></span>
                        <span>CPC: <strong className="text-surface-300">R$ {camp.cpc.toFixed(2)}</strong></span>
                        <span>CPM: <strong className="text-surface-300">R$ {camp.cpm.toFixed(2)}</strong></span>
                        {camp.revenue && (
                          <span>Receita: <strong className="text-online">R$ {camp.revenue.toLocaleString('pt-BR')}</strong></span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Totals strip ──────────────────────────────────────────────────────────────

function TotalsStrip({ totals }: { totals: MarketingFunnelTotals }) {
  const C = useChartColors()
  const items = [
    {
      label: 'Total Investido',
      value: `R$ ${totals.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <DollarSign className="w-4 h-4" />,
      color: C.brand,
    },
    {
      label: 'Total de Leads',
      value: totals.leads.toLocaleString('pt-BR'),
      icon: <Users className="w-4 h-4" />,
      color: C.away,
    },
    {
      label: 'CPL Médio',
      value: `R$ ${totals.avgCpl.toFixed(2)}`,
      icon: <Target className="w-4 h-4" />,
      color: C.purple,
    },
    {
      label: 'ROAS Médio',
      value: `${totals.avgRoas.toFixed(1)}x`,
      icon: <BarChart2 className="w-4 h-4" />,
      color: C.online,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-900 border border-surface-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: item.color + '1a', color: item.color }}>
            {item.icon}
          </div>
          <div>
            <p className="text-[10px] text-surface-400 leading-tight">{item.label}</p>
            <p className="text-base font-bold text-surface-100 tabular-nums">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────────────

export function MarketingFunnelSection({ dateRange }: { dateRange: DateRange }) {
  const [campaigns, setCampaigns] = useState<AdCampaignMetrics[]>([])
  const [totals, setTotals] = useState<MarketingFunnelTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [leadsDrawer, setLeadsDrawer] = useState<{ campaignId: string; campaignName: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await attributionApi.getMarketingFunnel({ range: dateRange })
      setCampaigns(res.data.funnel)
      setTotals(res.data.totals)
    } catch { /* use empty state */ }
    finally { setLoading(false) }
  }, [dateRange])

  useEffect(() => { void load() }, [load])

  return (
    <>
      <div className="space-y-4">
        {/* Section header */}
        <div>
          <p className="text-sm font-bold text-surface-100">Funil de Marketing</p>
          <p className="text-xs text-surface-400 mt-0.5">Rastreamento de anúncios Meta Ads até a conversão no CRM</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-surface-900 border border-surface-800 rounded-xl animate-pulse" />)}
            </div>
            <div className="h-64 bg-surface-900 border border-surface-800 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {totals && <TotalsStrip totals={totals} />}
            {campaigns.length > 0 && <FunnelChart campaigns={campaigns} />}
            <AdCampaignsTable
              campaigns={campaigns}
              onLeadsClick={(id, name) => setLeadsDrawer({ campaignId: id, campaignName: name })}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {leadsDrawer && (
          <CampaignLeadsDrawer
            campaignId={leadsDrawer.campaignId}
            campaignName={leadsDrawer.campaignName}
            onClose={() => setLeadsDrawer(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
