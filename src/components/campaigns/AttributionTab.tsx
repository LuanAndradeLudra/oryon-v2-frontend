import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { Users, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { attributionApi } from '@/services/api'
import type { AdCampaignMetrics, MarketingFunnelTotals } from '@/types'
import { useChartColors } from '@/hooks/useChartColors'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/ui/ErrorState'
import { CampaignLeadsDrawer } from './CampaignLeadsDrawer'

// ── Leads over time chart ─────────────────────────────────────────────────────

function AttributedLeadsChart() {
  const C = useChartColors()
  const [data, setData] = useState<Array<{ date: string; meta: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    attributionApi.getLeadsOverTime({ range: '30d' })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-52 bg-surface-900 border border-surface-700 rounded-lg animate-pulse" />

  return (
    <div className="bg-surface-900 border border-surface-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-surface-100">Leads Gerados por Anúncios</p>
          <p className="text-xs text-surface-400 mt-0.5">Últimos 30 dias — Meta Ads</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-surface-400">
          <span className="w-2.5 h-0.5 rounded inline-block" style={{ backgroundColor: C.meta }} />
          Meta Ads
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.floor(data.length / 6)} />
          <YAxis tick={{ fill: C.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                  <p className="text-surface-400 mb-1">{label}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.meta }} />
                    <span className="text-surface-300">Meta:</span>
                    <span className="text-surface-100 font-medium">{payload[0].value}</span>
                  </div>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="meta" name="meta"
            stroke={C.meta} fill={C.meta} fillOpacity={0.08} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Per-campaign accordion ────────────────────────────────────────────────────

function PerCampaignBreakdown({
  campaigns,
  onLeadsClick,
}: {
  campaigns: AdCampaignMetrics[]
  onLeadsClick: (campaignId: string, campaignName: string) => void
}) {
  const C = useChartColors()
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <p className="text-sm font-semibold text-surface-100 mb-2">Funil por Campanha</p>
      {/* Direção C: uma faixa com linha de 1px entre campanhas, não um
          cartão bem separado por campanha. */}
      <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
      {campaigns.map((camp) => {
        const isOpen = expanded === camp.platformCampaignId
        return (
          <div key={camp.platformCampaignId}>
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--rowhover)] transition-colors"
              onClick={() => setExpanded(isOpen ? null : camp.platformCampaignId)}
            >
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: C.meta }} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-surface-200 truncate">{camp.platformCampaignName}</p>
                <p className="text-xs text-surface-500">
                  {camp.leadsGenerated} leads · R$ {camp.cpl.toFixed(2)} CPL · {camp.conversionRate.toFixed(1)}% conv.
                </p>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-surface-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-surface-500 flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-surface-700 pt-3 space-y-3">
                {/* Funnel breakdown */}
                <div className="flex items-center gap-2 flex-wrap">
                  {camp.funnelBreakdown.map((stage, i) => (
                    <div key={stage.stageKey} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: stage.stageColor }} />
                      <span className="text-xs text-surface-400">{stage.stageLabel}:</span>
                      <span className="text-xs text-surface-200 font-semibold tabular-nums">{stage.count}</span>
                      {i < camp.funnelBreakdown.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-surface-700 mx-0.5" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Stats grid — direção C: números com rótulo miúdo, linha de
                    1px entre eles, sem caixa própria por item. */}
                <div className="grid grid-cols-3 border-t border-l border-surface-700 rounded-md overflow-hidden">
                  {[
                    { label: 'Investimento', value: `R$ ${camp.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` },
                    { label: 'Impressões', value: camp.impressions.toLocaleString('pt-BR') },
                    { label: 'Cliques',    value: camp.clicks.toLocaleString('pt-BR') },
                    { label: 'CTR',        value: `${camp.ctr.toFixed(2)}%` },
                    { label: 'CPC',        value: `R$ ${camp.cpc.toFixed(2)}` },
                    { label: 'ROAS',       value: camp.roas ? `${camp.roas.toFixed(1)}x` : '—', highlight: (camp.roas ?? 0) > 5 },
                  ].map((s) => (
                    <div key={s.label} className="px-3 py-2 border-r border-b border-surface-700">
                      <p className="text-[10px] text-surface-500">{s.label}</p>
                      <p className={cn('text-sm font-semibold tabular-nums', s.highlight ? 'text-online' : 'text-surface-200')}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Ver leads CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onLeadsClick(camp.platformCampaignId, camp.platformCampaignName)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#1877f2]/30 text-[#1877f2] text-xs font-medium hover:bg-[#1877f2]/10 transition-all"
                >
                  <Users className="w-3 h-3" />
                  Ver {camp.leadsGenerated} leads no CRM
                </button>
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}

// ── Totals strip ──────────────────────────────────────────────────────────────

function TotalsStrip({
  totals,
  onLeadsClick,
}: {
  totals: MarketingFunnelTotals
  onLeadsClick: () => void
}) {
  const items: { label: string; value: string; color?: string; onClick?: () => void }[] = [
    { label: 'Total Investido', value: `R$ ${totals.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { label: 'Total de Leads',  value: totals.leads.toLocaleString('pt-BR'), color: 'var(--color-accent-amber)', onClick: onLeadsClick },
    { label: 'CPL Médio',       value: `R$ ${totals.avgCpl.toFixed(2)}` },
    { label: 'ROAS Médio',      value: `${totals.avgRoas.toFixed(1)}x` },
  ]
  // Direção C: número grande + rótulo, linha de 1px entre eles — sem ícone
  // colorido por item (era só decorativo aqui; cor de marca fica só onde
  // identifica a plataforma de fato, na tabela por origem).
  return (
    <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
      {items.map((item) => {
        const Tag = item.onClick ? 'button' : 'div'
        return (
          <Tag
            key={item.label}
            type={item.onClick ? 'button' : undefined}
            onClick={item.onClick}
            title={item.onClick ? 'Clique para ver os leads' : undefined}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left',
              item.onClick && 'cursor-pointer hover:bg-[var(--rowhover)] transition-colors group',
            )}
          >
            <span className="text-xs text-surface-400">{item.label}</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              <span className="text-base font-bold tabular-nums" style={{ color: item.color ?? 'var(--color-surface-100)' }}>
                {item.value}
              </span>
              {item.onClick && <ChevronDown className="w-3 h-3 text-surface-500 group-hover:text-accent-amber transition-colors" />}
            </span>
          </Tag>
        )
      })}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function AttributionTab() {
  const [campaigns, setCampaigns] = useState<AdCampaignMetrics[]>([])
  const [totals, setTotals] = useState<MarketingFunnelTotals | null>(null)
  const [leadsDrawer, setLeadsDrawer] = useState<{ campaignId: string; campaignName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PL-C2-BUS: falha silenciosa aqui virava tela zerada sem aviso (P6) — quem
  // não tinha permissão pro Meta Ads ou tinha o token expirado via só "sem
  // dados", igual a um workspace que nunca conectou anúncio nenhum.
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await attributionApi.getMarketingFunnel({ range: '30d' })
      setCampaigns(res.data.funnel)
      setTotals(res.data.totals)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Não foi possível carregar a atribuição de anúncios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleLeadsClick = (campaignId: string, campaignName: string) => {
    setLeadsDrawer({ campaignId, campaignName })
  }

  // When "Total de Leads" is clicked, show all campaigns combined (first campaign as proxy)
  const handleTotalLeadsClick = () => {
    if (campaigns.length > 0) {
      setLeadsDrawer({ campaignId: campaigns[0].platformCampaignId, campaignName: 'Todas as Campanhas Meta Ads' })
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <p className="text-sm font-display font-bold text-surface-100">Atribuição de Anúncios</p>
          <p className="text-xs text-surface-400 mt-0.5">Rastreamento de leads gerados por Meta Ads nos últimos 30 dias</p>
        </div>

        {error && !loading ? (
          <ErrorState hint={error} onRetry={() => { void load() }} />
        ) : (
          /* Main (série temporal + funil por campanha) + rail (totais) —
             mesmo padrão de Home/Relatórios/Marketing. */
          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-12 xl:col-span-8 space-y-4">
              <AttributedLeadsChart />
              {campaigns.length > 0 && (
                <PerCampaignBreakdown campaigns={campaigns} onLeadsClick={handleLeadsClick} />
              )}
            </div>
            <div className="col-span-12 xl:col-span-4 order-first xl:order-none">
              {totals && <TotalsStrip totals={totals} onLeadsClick={handleTotalLeadsClick} />}
            </div>
          </div>
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
