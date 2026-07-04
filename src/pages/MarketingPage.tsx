import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  TrendingUp, DollarSign, Users, Target, BarChart2,
  MousePointerClick, Eye, RefreshCw, ChevronDown, ChevronUp,
  ArrowRight, Megaphone, CheckCircle2, Send, XCircle, AlertCircle,
  Sparkles, Image, Film, LayoutGrid, AlertTriangle,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { attributionApi, adAccountsApi, adSetsApi, conversionApi } from '@/services/api'
import type {
  AdCampaignMetrics,
  AdSetMetrics,
  AdCreativeMetrics,
  AdCreativeFormat,
  MarketingFunnelTotals,
  AdAccount,
  MetaCapiEvent,
} from '@/types'
import { cn } from '@/lib/utils'
import { CampaignLeadsDrawer } from '@/components/campaigns/CampaignLeadsDrawer'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useChartColors } from '@/hooks/useChartColors'
import { ErrorState } from '@/components/ui/ErrorState'
import { useNavigate } from 'react-router-dom'

const META_BLUE = '#1877f2'

type ChartMetric = 'leads' | 'spend'

type PerfPoint = {
  date: string
  meta_spend: number
  meta_leads: number
  google_spend: number
  google_leads: number
}

// ── Format badge ──────────────────────────────────────────────────────────────

const FORMAT_CFG: Record<AdCreativeFormat, { label: string; icon: React.ReactNode; color: string }> = {
  image:    { label: 'Imagem',    icon: <Image   className="w-3 h-3" />, color: '#6366f1' },
  video:    { label: 'Vídeo',     icon: <Film    className="w-3 h-3" />, color: '#f59e0b' },
  carousel: { label: 'Carrossel', icon: <LayoutGrid className="w-3 h-3" />, color: '#10b981' },
}

// ── Fatigue indicator ─────────────────────────────────────────────────────────

function FrequencyBar({ frequency }: { frequency: number }) {
  const pct   = Math.min(100, (frequency / 5) * 100)
  const color = frequency >= 3.5 ? '#ef4444' : frequency >= 2.5 ? '#f59e0b' : '#10b981'
  const label = frequency >= 3.5 ? 'Fadiga' : frequency >= 2.5 ? 'Atenção' : 'Normal'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden min-w-[48px]">
        <div className="h-full rounded-full transition-colors" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-medium tabular-nums" style={{ color }}>
        {frequency.toFixed(1)}×
      </span>
      {frequency >= 3.5 && <AlertTriangle className="w-3 h-3 text-danger flex-shrink-0" />}
      <span className="text-[9px]" style={{ color }}>{label}</span>
    </div>
  )
}

// ── Creatives panel (lazy-loaded when an ad set is expanded) ──────────────────

function CreativesPanel({ adSetId }: { adSetId: string }) {
  const [creatives, setCreatives] = useState<AdCreativeMetrics[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(false)
    adSetsApi.getCreatives(adSetId)
      .then((r) => setCreatives(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [adSetId, reloadKey])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 bg-surface-800/60 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState compact title="Erro ao carregar criativos" onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    )
  }

  if (!creatives.length) {
    return <p className="px-5 py-4 text-xs text-surface-500">Nenhum criativo encontrado.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4 bg-surface-900/40">
      {creatives.map((cr) => {
        const fmt  = FORMAT_CFG[cr.format]
        const isHighFreq   = cr.frequency >= 3.5
        const isWatchFreq  = cr.frequency >= 2.5 && cr.frequency < 3.5
        return (
          <div
            key={cr.id}
            className={cn(
              'bg-surface-800 rounded-xl border overflow-hidden flex flex-col',
              isHighFreq  ? 'border-danger/40'    :
              isWatchFreq ? 'border-warning/30'   : 'border-surface-700',
            )}
          >
            {/* Creative header */}
            <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-2">
              {/* Format badge */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: fmt.color + '1a', color: fmt.color }}
              >
                {fmt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="color-chip inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide"
                    style={{ ['--chip']: fmt.color } as React.CSSProperties}
                  >
                    {fmt.icon}
                    {fmt.label}
                  </span>
                  {isHighFreq && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-danger/15 text-danger">
                      <AlertTriangle className="w-2.5 h-2.5" /> Fadiga
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-surface-100 leading-snug line-clamp-1">
                  {cr.headline}
                </p>
              </div>
            </div>

            {/* Body text */}
            <p className="text-[11px] text-surface-400 leading-relaxed px-3.5 pb-2.5 line-clamp-2">
              {cr.body}
            </p>

            {/* CTA */}
            <div className="px-3.5 pb-3">
              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#1877f2]/15 text-[#1877f2]">
                {cr.callToAction}
              </span>
            </div>

            {/* Divider */}
            <div className="mx-3.5 border-t border-surface-700/50" />

            {/* Frequency */}
            <div className="px-3.5 pt-2.5 pb-1.5">
              <p className="text-[9px] text-surface-600 mb-1 uppercase tracking-wide">Frequência</p>
              <FrequencyBar frequency={cr.frequency} />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-4 gap-px bg-surface-700/30 mt-auto border-t border-surface-700/30">
              {[
                { label: 'Impressões', value: cr.impressions.toLocaleString('pt-BR') },
                { label: 'CTR',        value: `${cr.ctr.toFixed(2)}%` },
                { label: 'CPL',        value: `R$${cr.cpl.toFixed(0)}` },
                { label: 'ROAS',       value: cr.roas ? `${cr.roas.toFixed(1)}x` : '—', good: (cr.roas ?? 0) > 5 },
              ].map((m) => (
                <div key={m.label} className="bg-surface-800 px-2 py-2 text-center">
                  <p className={cn('text-xs font-bold tabular-nums', m.good ? 'text-online' : 'text-surface-200')}>
                    {m.value}
                  </p>
                  <p className="text-[9px] text-surface-600 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Ad Sets table (inside campaign detail) ────────────────────────────────────

function AdSetsTable({ campaignId }: { campaignId: string }) {
  const [adSets, setAdSets]     = useState<AdSetMetrics[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [openSet, setOpenSet]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(false)
    adSetsApi.list(campaignId)
      .then((r) => setAdSets(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [campaignId, reloadKey])

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2].map((i) => <div key={i} className="h-10 bg-surface-800/60 rounded-lg animate-pulse" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState compact title="Erro ao carregar conjuntos de anúncios" onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    )
  }

  if (!adSets.length) {
    return <p className="px-5 py-4 text-xs text-surface-500">Nenhum conjunto de anúncios encontrado.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-surface-700/60">
            <th className="text-left px-4 py-2.5 text-surface-500 font-medium text-[10px] uppercase tracking-wide">
              Conjunto
            </th>
            <th className="text-right px-3 py-2.5 text-surface-500 font-medium text-[10px]">Alcance</th>
            <th className="text-right px-3 py-2.5 text-surface-500 font-medium text-[10px]">Freq.</th>
            <th className="text-right px-3 py-2.5 text-surface-500 font-medium text-[10px]">Investimento</th>
            <th className="text-right px-3 py-2.5 text-surface-500 font-medium text-[10px]">Leads</th>
            <th className="text-right px-3 py-2.5 text-surface-500 font-medium text-[10px]">CPL</th>
            <th className="text-right px-3 py-2.5 text-surface-500 font-medium text-[10px]">ROAS</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {adSets.map((as) => {
            const isOpen = openSet === as.id
            const highFreq = as.frequency >= 3.5
            return (
              <>
                <tr
                  key={as.id}
                  className={cn(
                    'border-b border-surface-700/40 cursor-pointer transition-colors',
                    isOpen ? 'bg-surface-700/30' : 'hover:bg-surface-700/15',
                  )}
                  onClick={() => setOpenSet(isOpen ? null : as.id)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-surface-200 font-medium">{as.name}</p>
                      {highFreq && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0 rounded text-[9px] font-semibold bg-danger/15 text-danger">
                          <AlertTriangle className="w-2.5 h-2.5" />Fadiga
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-surface-500 mt-0.5 tabular-nums">
                      {as.impressions.toLocaleString('pt-BR')} imp · CTR {as.ctr.toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right text-surface-400 tabular-nums">
                    {as.reach.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={cn(
                      'font-medium',
                      highFreq ? 'text-danger' : as.frequency >= 2.5 ? 'text-warning' : 'text-surface-400',
                    )}>
                      {as.frequency.toFixed(2)}×
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-surface-300 tabular-nums font-medium">
                    R${as.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: META_BLUE }}>
                    {as.leadsGenerated}
                  </td>
                  <td className="px-3 py-2.5 text-right text-surface-300 tabular-nums">
                    R${as.cpl.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={cn('font-semibold', (as.roas ?? 0) > 5 ? 'text-online' : 'text-surface-300')}>
                      {as.roas ? `${as.roas.toFixed(1)}x` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {isOpen
                      ? <ChevronUp   className="w-3.5 h-3.5 text-surface-500 ml-auto" />
                      : <ChevronDown className="w-3.5 h-3.5 text-surface-500 ml-auto" />}
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${as.id}-cr`} className="border-b border-surface-700/30">
                    <td colSpan={8}>
                      <div className="border-t border-surface-700/40">
                        <div className="flex items-center gap-2 px-4 py-2 bg-surface-800/30">
                          <LayoutGrid className="w-3.5 h-3.5 text-surface-500" />
                          <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide">
                            Criativos deste conjunto
                          </p>
                        </div>
                        <CreativesPanel adSetId={as.id} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ campaigns }: { campaigns: AdCampaignMetrics[] }) {
  const spend       = campaigns.reduce((s, c) => s + c.spend, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const clicks      = campaigns.reduce((s, c) => s + c.clicks, 0)
  const leads       = campaigns.reduce((s, c) => s + c.leadsGenerated, 0)
  const qualified   = campaigns.reduce((s, c) => s + c.qualified, 0)
  const customers   = campaigns.reduce((s, c) => s + c.customers, 0)
  const revenue     = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0)

  const avgCtr  = impressions > 0 ? (clicks / impressions * 100) : 0
  const avgCpl  = leads > 0       ? spend / leads                : 0
  const avgRoas = spend > 0       ? revenue / spend              : 0

  const kpis = [
    { label: 'Investimento', value: `R$ ${spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <DollarSign className="w-4 h-4" />, crm: false },
    { label: 'Impressões',   value: impressions.toLocaleString('pt-BR'),                                   icon: <Eye className="w-4 h-4" />,             crm: false },
    { label: 'Cliques',      value: clicks.toLocaleString('pt-BR'),                                        icon: <MousePointerClick className="w-4 h-4" />, crm: false },
    { label: 'CTR',          value: `${avgCtr.toFixed(2)}%`,                                               icon: <TrendingUp className="w-4 h-4" />,       crm: false },
    { label: 'Leads',        value: leads.toLocaleString('pt-BR'),                                         icon: <Users className="w-4 h-4" />,            crm: true  },
    { label: 'CPL',          value: `R$ ${avgCpl.toFixed(2)}`,                                             icon: <Target className="w-4 h-4" />,           crm: true  },
    { label: 'Qualificados', value: qualified.toLocaleString('pt-BR'),                                     icon: <CheckCircle2 className="w-4 h-4" />,     crm: true  },
    { label: 'ROAS',         value: `${avgRoas.toFixed(1)}x`,                                              icon: <BarChart2 className="w-4 h-4" />,        crm: true, highlight: avgRoas > 5 },
  ]

  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn(
            'relative bg-surface-900 border rounded-xl px-3 py-3',
            kpi.crm ? 'border-surface-700' : 'border-surface-800',
          )}
        >
          {kpi.crm && (
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#1877f2]" />
          )}
          <div className="flex items-center gap-1.5 mb-1.5 text-surface-500">
            {kpi.icon}
          </div>
          <p className={cn('text-sm font-bold tabular-nums', kpi.highlight ? 'text-online' : 'text-surface-100')}>
            {kpi.value}
          </p>
          <p className="text-[10px] text-surface-500 mt-0.5">{kpi.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Performance Chart ─────────────────────────────────────────────────────────

function PerformanceChart({ data, metric }: { data: PerfPoint[]; metric: ChartMetric }) {
  const C = useChartColors()
  const dataKey = metric === 'spend' ? 'meta_spend' : 'meta_leads'

  if (!data.length) return <div className="h-48 bg-surface-800 rounded-xl animate-pulse" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-mktg-meta" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={META_BLUE} stopOpacity={0.25} />
            <stop offset="95%" stopColor={META_BLUE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: C.axis, fontSize: 10 }}
          axisLine={false} tickLine={false}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis tick={{ fill: C.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const val = payload[0]?.value
            return (
              <div className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
                <p className="text-surface-400 mb-1">{label}</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1877f2]" />
                  <span className="text-surface-300">{metric === 'spend' ? 'Investimento' : 'Leads'}:</span>
                  <span className="text-surface-100 font-medium">
                    {metric === 'spend' ? `R$ ${Number(val ?? 0).toLocaleString('pt-BR')}` : val}
                  </span>
                </div>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={META_BLUE}
          fill="url(#grad-mktg-meta)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: META_BLUE, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── CRM mini pipeline bars ────────────────────────────────────────────────────

function CrmPipelineMini({ campaign }: { campaign: AdCampaignMetrics }) {
  const max = campaign.funnelBreakdown[0]?.count || 1
  return (
    <div className="flex items-end gap-1 mt-1">
      {campaign.funnelBreakdown.map((stage, i) => (
        <div key={stage.stageKey} className="flex items-end gap-0.5">
          <div
            className="w-4 rounded-sm"
            style={{
              height: Math.max(3, (stage.count / max) * 18),
              backgroundColor: stage.stageColor,
              opacity: 0.8,
            }}
            title={`${stage.stageLabel}: ${stage.count}`}
          />
          {i < campaign.funnelBreakdown.length - 1 && (
            <ArrowRight className="w-2 h-2 text-surface-700 self-center" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Campaign detail (expanded row) ───────────────────────────────────────────

function CampaignDetail({ campaign }: { campaign: AdCampaignMetrics }) {
  const stages = campaign.funnelBreakdown
  const max    = stages[0]?.count || 1
  const [activeTab, setActiveTab] = useState<'funnel' | 'adsets'>('adsets')

  return (
    <div className="bg-surface-800/20 border-t border-surface-800/60">

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 px-5 pt-4 pb-0">
        {([
          { id: 'adsets', label: 'Conjuntos e Criativos' },
          { id: 'funnel',  label: 'Jornada CRM' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === t.id
                ? 'bg-surface-700 text-surface-100'
                : 'text-surface-500 hover:text-surface-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'funnel' ? (
        <div className="px-5 py-5 space-y-5">
          {/* CRM journey funnel */}
          <div>
            <p className="text-xs font-semibold text-surface-300 mb-3">Jornada no CRM — do clique ao cliente</p>
            <div className="flex items-end gap-4">
              {stages.map((stage, i) => {
                const pct = (stage.count / max) * 100
                const convPct = i > 0 && stages[i - 1].count > 0
                  ? (stage.count / stages[i - 1].count * 100).toFixed(1)
                  : null
                return (
                  <div key={stage.stageKey} className="flex items-end gap-3">
                    {i > 0 && (
                      <div className="flex flex-col items-center self-center mb-5">
                        <ArrowRight className="w-3 h-3 text-surface-700" />
                        {convPct && <span className="text-[9px] text-surface-600 mt-0.5">{convPct}%</span>}
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-surface-200 tabular-nums">{stage.count}</span>
                      <div
                        className="w-14 rounded-t transition-colors"
                        style={{ height: Math.max(8, pct * 0.5), backgroundColor: stage.stageColor, opacity: 0.85 }}
                      />
                      <span className="text-[10px] text-surface-500 text-center leading-tight max-w-[56px]">
                        {stage.stageLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'Impressões', value: campaign.impressions.toLocaleString('pt-BR') },
              { label: 'Cliques',    value: campaign.clicks.toLocaleString('pt-BR') },
              { label: 'CTR',        value: `${campaign.ctr.toFixed(2)}%` },
              { label: 'CPM',        value: `R$ ${campaign.cpm.toFixed(2)}` },
              { label: 'CPC',        value: `R$ ${campaign.cpc.toFixed(2)}` },
              { label: 'CPL',        value: `R$ ${campaign.cpl.toFixed(2)}` },
              { label: 'Leads',      value: campaign.leadsGenerated.toString() },
              { label: 'Qualif.',    value: campaign.qualified.toString() },
              { label: 'Clientes',   value: campaign.customers.toString() },
              { label: 'Receita',    value: campaign.revenue ? `R$ ${campaign.revenue.toLocaleString('pt-BR')}` : '—' },
              { label: 'ROAS',       value: campaign.roas ? `${campaign.roas.toFixed(1)}x` : '—', good: (campaign.roas ?? 0) > 5 },
              { label: 'Conv. %',    value: `${campaign.conversionRate.toFixed(1)}%` },
            ].map((s) => (
              <div key={s.label} className="bg-surface-800 rounded-lg px-3 py-2">
                <p className="text-[10px] text-surface-500">{s.label}</p>
                <p className={cn('text-sm font-semibold tabular-nums', s.good ? 'text-online' : 'text-surface-100')}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Lead → Client rate */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500 whitespace-nowrap">Taxa Lead → Cliente</span>
            <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, campaign.conversionRate)}%`, backgroundColor: META_BLUE }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-[#1877f2]">
              {campaign.conversionRate.toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="py-3">
          <div className="flex items-center justify-between px-5 pb-2">
            <p className="text-xs text-surface-400">
              Clique em um conjunto para ver os criativos individuais
            </p>
            <span className="text-[10px] text-surface-600 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/70 inline-block" />
              Frequência {'>'} 3.5× = fatiga criativa
            </span>
          </div>
          <AdSetsTable campaignId={campaign.platformCampaignId} />
        </div>
      )}
    </div>
  )
}

// ── Campaign table ────────────────────────────────────────────────────────────

type SortKey = 'spend' | 'leadsGenerated' | 'cpl' | 'qualified' | 'customers' | 'roas' | 'conversionRate' | 'impressions' | 'ctr'

function CampaignTable({
  campaigns,
  onLeadsClick,
}: {
  campaigns: AdCampaignMetrics[]
  onLeadsClick: (campaignId: string, campaignName: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [sortKey, setSortKey]   = useState<SortKey>('spend')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')

  const sorted = [...campaigns].sort((a, b) => {
    const va = (a[sortKey] ?? 0) as number
    const vb = (b[sortKey] ?? 0) as number
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  type ColDef = { key: SortKey; label: string; crm?: boolean }
  const cols: ColDef[] = [
    { key: 'impressions',    label: 'Impressões'  },
    { key: 'ctr',            label: 'CTR'         },
    { key: 'spend',          label: 'Investimento'},
    { key: 'leadsGenerated', label: 'Leads',       crm: true },
    { key: 'cpl',            label: 'CPL',         crm: true },
    { key: 'qualified',      label: 'Qualif.',     crm: true },
    { key: 'customers',      label: 'Clientes',    crm: true },
    { key: 'roas',           label: 'ROAS',        crm: true },
    { key: 'conversionRate', label: 'Conv. %',     crm: true },
  ]

  function Th({ c }: { c: ColDef }) {
    return (
      <th
        className={cn(
          'text-right px-3 py-3 font-medium cursor-pointer hover:text-surface-200 transition-colors text-[11px] whitespace-nowrap',
          sortKey === c.key ? 'text-surface-200' : c.crm ? 'text-surface-400' : 'text-surface-500',
        )}
        onClick={() => handleSort(c.key)}
      >
        <span className="inline-flex items-center gap-0.5 justify-end">
          {c.crm && <span className="w-1.5 h-1.5 rounded-full mr-0.5 flex-shrink-0 bg-[#1877f2]" />}
          {c.label}
          {sortKey === c.key && (sortDir === 'desc'
            ? <ChevronDown className="w-3 h-3 ml-0.5" />
            : <ChevronUp   className="w-3 h-3 ml-0.5" />
          )}
        </span>
      </th>
    )
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-surface-100">Campanhas</p>
          <p className="text-xs text-surface-400 mt-0.5">
            Expanda para ver conjuntos de anúncios e criativos ·{' '}
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1877f2]" />
              <span>= dados do CRM</span>
            </span>
          </p>
        </div>
        <span className="text-xs text-surface-500">{campaigns.length} campanhas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-800">
              <th className="text-left px-5 py-3 text-surface-400 font-medium text-[11px]">Campanha</th>
              {cols.map((c) => <Th key={c.key} c={c} />)}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((camp) => {
              const isOpen = selected === camp.platformCampaignId
              return (
                <>
                  <tr
                    key={camp.platformCampaignId}
                    className={cn(
                      'border-b border-surface-800/50 transition-colors cursor-pointer',
                      isOpen ? 'bg-surface-800/40' : 'hover:bg-surface-800/20',
                    )}
                    onClick={() => setSelected(isOpen ? null : camp.platformCampaignId)}
                  >
                    <td className="px-5 py-3 max-w-[220px]">
                      <p className="text-surface-200 font-medium truncate">{camp.platformCampaignName}</p>
                      <CrmPipelineMini campaign={camp} />
                    </td>
                    <td className="px-3 py-3 text-right text-surface-400 tabular-nums">
                      {camp.impressions.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-3 text-right text-surface-400 tabular-nums">
                      {camp.ctr.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-right text-surface-300 tabular-nums font-medium">
                      R$ {camp.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <button
                        onClick={(e) => { e.stopPropagation(); onLeadsClick(camp.platformCampaignId, camp.platformCampaignName) }}
                        className="group/leads inline-flex flex-col items-end gap-0.5 transition-colors"
                        title="Ver leads no CRM"
                      >
                        <span className="flex items-center gap-1">
                          <span className="font-bold text-[#1877f2] tabular-nums group-hover/leads:scale-110 transition-transform origin-right inline-block">
                            {camp.leadsGenerated}
                          </span>
                          <Users className="w-3 h-3 text-[#1877f2] opacity-0 group-hover/leads:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-[#1877f2]/10 text-[#1877f2]/60 group-hover/leads:bg-[#1877f2]/20 group-hover/leads:text-[#1877f2] transition-colors leading-none tracking-wide uppercase">
                          Ver CRM
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right text-surface-300 tabular-nums">
                      R$ {camp.cpl.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-[#1877f2]">
                      {camp.qualified}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-[#1877f2]">
                      {camp.customers}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={cn('font-semibold', (camp.roas ?? 0) > 5 ? 'text-online' : 'text-surface-300')}>
                        {camp.roas ? camp.roas.toFixed(1) + 'x' : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={cn('font-medium', camp.conversionRate > 15 ? 'text-online' : 'text-surface-400')}>
                        {camp.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {isOpen
                        ? <ChevronUp   className="w-3.5 h-3.5 text-surface-500 ml-auto" />
                        : <ChevronDown className="w-3.5 h-3.5 text-surface-500 ml-auto" />}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${camp.platformCampaignId}-detail`} className="border-b border-surface-800/40">
                      <td colSpan={11}>
                        <CampaignDetail campaign={camp} />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Conversion funnel ─────────────────────────────────────────────────────────

function ConversionFunnel({ campaigns }: { campaigns: AdCampaignMetrics[] }) {
  const stages = [
    { label: 'Impressões', value: campaigns.reduce((s, c) => s + c.impressions, 0),      color: '#5588b0' },
    { label: 'Cliques',    value: campaigns.reduce((s, c) => s + c.clicks, 0),           color: '#6366f1' },
    { label: 'Leads',      value: campaigns.reduce((s, c) => s + c.leadsGenerated, 0),   color: '#f59e0b' },
    { label: 'Qualif.',    value: campaigns.reduce((s, c) => s + c.qualified, 0),        color: '#8b5cf6' },
    { label: 'Clientes',   value: campaigns.reduce((s, c) => s + c.customers, 0),        color: '#10b981' },
  ]
  const max = stages[0].value || 1

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 lg:col-span-2">
      <p className="text-sm font-semibold text-surface-100 mb-0.5">Funil de Conversão</p>
      <p className="text-xs text-surface-400 mb-4">Do clique no anúncio ao cliente no CRM</p>
      <div className="space-y-2.5">
        {stages.map((stage, i) => {
          const pct      = (stage.value / max) * 100
          const prevConv = i > 0 && stages[i - 1].value > 0
            ? ` — ${(stage.value / stages[i - 1].value * 100).toFixed(1)}% do anterior`
            : ''
          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-surface-300 font-medium">{stage.label}</span>
                <span className="tabular-nums text-surface-400">
                  {stage.value.toLocaleString('pt-BR')}
                  <span className="text-surface-600 text-[10px]">{prevConv}</span>
                </span>
              </div>
              <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-colors"
                  style={{ width: `${Math.max(0.5, pct)}%`, backgroundColor: stage.color, opacity: 0.85 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Summary panel ─────────────────────────────────────────────────────────────

function SummaryPanel({ campaigns, totals }: { campaigns: AdCampaignMetrics[]; totals: MarketingFunnelTotals | null }) {
  const spend     = campaigns.reduce((s, c) => s + c.spend, 0)
  const leads     = campaigns.reduce((s, c) => s + c.leadsGenerated, 0)
  const customers = campaigns.reduce((s, c) => s + c.customers, 0)
  const revenue   = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0)
  const avgCpl    = leads > 0  ? spend / leads   : 0
  const avgRoas   = spend > 0  ? revenue / spend : 0

  const items = [
    { label: 'Total Investido', value: `R$ ${spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,  icon: <DollarSign className="w-3.5 h-3.5" />,   color: META_BLUE },
    { label: 'Leads Gerados',   value: leads.toLocaleString('pt-BR'),                                         icon: <Users className="w-3.5 h-3.5" />,        color: '#f59e0b' },
    { label: 'CPL Médio',       value: `R$ ${avgCpl.toFixed(2)}`,                                             icon: <Target className="w-3.5 h-3.5" />,       color: '#8b5cf6' },
    { label: 'ROAS Médio',      value: `${avgRoas.toFixed(1)}x`,                                              icon: <BarChart2 className="w-3.5 h-3.5" />,    color: '#10b981' },
    { label: 'Novos Clientes',  value: customers.toLocaleString('pt-BR'),                                     icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#10b981' },
  ]

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 space-y-3">
      <p className="text-sm font-semibold text-surface-100">Resumo do Período</p>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: item.color + '1a', color: item.color }}
          >
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-surface-500">{item.label}</p>
            <p className="text-sm font-bold text-surface-100 tabular-nums leading-tight">{item.value}</p>
          </div>
        </div>
      ))}
      {totals && (
        <div className="pt-2 border-t border-surface-800">
          <p className="text-[10px] text-surface-600 mb-1">Conv. Lead → Cliente</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1877f2]"
                style={{ width: `${Math.min(100, leads > 0 ? (customers / leads * 100) : 0)}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-surface-300">
              {leads > 0 ? (customers / leads * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CAPI Events Section ───────────────────────────────────────────────────────

const EVENT_LABEL: Record<MetaCapiEvent['eventName'], string> = {
  Purchase:         'Purchase',
  Lead:             'Lead',
  InitiateCheckout: 'Initiate Checkout',
  Contact:          'Contact',
}

const STATUS_CFG = {
  sent:    { label: 'Enviado',  color: 'var(--color-accent-green)', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  failed:  { label: 'Falhou',   color: 'var(--color-danger)',       icon: <XCircle      className="w-3.5 h-3.5" /> },
  pending: { label: 'Pendente', color: 'var(--color-accent-amber)', icon: <AlertCircle  className="w-3.5 h-3.5" /> },
}

function CapiEventsSection() {
  const [events, setEvents] = useState<MetaCapiEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(false)
    conversionApi.getCapiEvents()
      .then((r) => setEvents(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [reloadKey])

  const totalRevenue = events.filter((e) => e.status === 'sent' && e.value).reduce((s, e) => s + (e.value ?? 0), 0)
  const sentCount    = events.filter((e) => e.status === 'sent').length
  const failedCount  = events.filter((e) => e.status === 'failed').length

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-800">
        <div className="w-8 h-8 rounded-lg bg-[#1877f2]/15 flex items-center justify-center flex-shrink-0">
          <Send className="w-4 h-4 text-[#1877f2]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-surface-100">Meta Conversions API (CAPI)</p>
          <p className="text-xs text-surface-400 mt-0.5">
            Eventos de conversão enviados ao Meta para fechar o loop de atribuição
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <p className="text-[10px] text-surface-500">Enviados</p>
            <p className="text-sm font-bold text-online tabular-nums">{sentCount}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-surface-500">Receita reportada</p>
            <p className="text-sm font-bold text-surface-100 tabular-nums">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {failedCount > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-surface-500">Falhas</p>
              <p className="text-sm font-bold text-danger tabular-nums">{failedCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Callout */}
      <div className="flex items-start gap-3 px-5 py-3 bg-[#1877f2]/5 border-b border-[#1877f2]/10">
        <Sparkles className="w-3.5 h-3.5 text-[#1877f2] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-surface-400 leading-relaxed">
          Quando um lead CTWA é confirmado como convertido pela IA, a plataforma envia um evento{' '}
          <strong className="text-surface-300">Purchase</strong> ao Meta usando o{' '}
          <code className="bg-surface-800 px-1 rounded text-[10px] font-mono text-brand-300">ctwa_click_id</code>
          {' '}capturado no webhook. O Meta passa a otimizar para perfis similares, reduzindo o CPL ao longo do tempo.
        </p>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="px-5 py-6 flex items-center gap-2 text-xs text-surface-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando eventos...
        </div>
      ) : error ? (
        <div className="p-4">
          <ErrorState compact title="Erro ao carregar eventos CAPI" onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      ) : events.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-surface-500">
          Nenhum evento enviado. Confirme uma conversão nas conversas para gerar o primeiro evento.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-5 py-3 text-surface-500 font-medium text-[11px]">Contato</th>
                <th className="text-left px-3 py-3 text-surface-500 font-medium text-[11px]">Campanha</th>
                <th className="text-left px-3 py-3 text-surface-500 font-medium text-[11px]">Evento</th>
                <th className="text-right px-3 py-3 text-surface-500 font-medium text-[11px]">Valor</th>
                <th className="text-left px-3 py-3 text-surface-500 font-medium text-[11px]">CTWA Click ID</th>
                <th className="text-left px-3 py-3 text-surface-500 font-medium text-[11px]">Enviado em</th>
                <th className="text-left px-3 py-3 text-surface-500 font-medium text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => {
                const stCfg = STATUS_CFG[evt.status]
                return (
                  <tr key={evt.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                    <td className="px-5 py-3">
                      <p className="text-surface-200 font-medium">{evt.contactName}</p>
                      <p className="text-[10px] text-surface-500 font-mono">{evt.contactId}</p>
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      <p className="text-surface-300 truncate">{evt.campaignName ?? '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1877f2]/15 text-[#1877f2]">
                        {EVENT_LABEL[evt.eventName]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {evt.value
                        ? <span className="font-semibold text-online">R$ {evt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        : <span className="text-surface-600">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <code className="text-[10px] font-mono text-surface-500 bg-surface-800 px-1.5 py-0.5 rounded">
                        {evt.ctwaClickId.slice(0, 20)}…
                      </code>
                    </td>
                    <td className="px-3 py-3 text-surface-400">
                      {evt.sentAt
                        ? new Date(evt.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5" style={{ color: stCfg.color }}>
                        {stCfg.icon}
                        <span className="font-medium">{stCfg.label}</span>
                      </div>
                      {evt.errorMessage && (
                        <p className="text-[10px] text-danger/70 mt-0.5">{evt.errorMessage}</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MarketingPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  if (isMobile) {
    return (
      <MobileFeatureGate
        open
        onClose={() => navigate('/home')}
        featureName="Marketing"
        description="Painel de Marketing tem múltiplos charts (funil, séries temporais, donut), tabelas de campanhas Meta e drilldowns. Tudo otimizado para tela larga. Abra no desktop para análise completa."
      />
    )
  }

  return <MarketingPageDesktop />
}

function MarketingPageDesktop() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<AdCampaignMetrics[]>([])
  const [totals, setTotals]       = useState<MarketingFunnelTotals | null>(null)
  const [perfData, setPerfData]   = useState<PerfPoint[]>([])
  const [account, setAccount]     = useState<AdAccount | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chartMetric, setChartMetric] = useState<ChartMetric>('leads')
  const [leadsDrawer, setLeadsDrawer] = useState<{ campaignId: string; campaignName: string } | null>(null)

  const currentUser = user ? { firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl } : undefined

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [funnelRes, perfRes, accountsRes] = await Promise.all([
        attributionApi.getMarketingFunnel({ range: '30d', platform: 'meta' }),
        attributionApi.getPerformanceOverTime({ range: '30d', platform: 'meta' }),
        adAccountsApi.list(),
      ])
      setCampaigns(funnelRes.data.funnel)
      setTotals(funnelRes.data.totals)
      setPerfData(perfRes.data.map(p => ({ ...p, google_spend: (p as unknown as PerfPoint).google_spend ?? 0, google_leads: (p as unknown as PerfPoint).google_leads ?? 0 })))
      setAccount(accountsRes.data.find((a) => a.platform === 'meta') ?? null)
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  useRegisterTopBarActions(
    <button
      onClick={() => void load(true)}
      className="p-1.5 rounded-lg border border-surface-700 text-surface-400 hover:text-surface-200 hover:border-surface-600 transition-colors"
      title="Atualizar dados"
    >
      <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
    </button>,
    [refreshing],
  )

  // Derived totals from campaigns
  const platformTotals: MarketingFunnelTotals | null = campaigns.length > 0
    ? (() => {
        const spend     = campaigns.reduce((s, c) => s + c.spend, 0)
        const leads     = campaigns.reduce((s, c) => s + c.leadsGenerated, 0)
        const qualified = campaigns.reduce((s, c) => s + c.qualified, 0)
        const customers = campaigns.reduce((s, c) => s + c.customers, 0)
        const revenue   = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0)
        return { spend, leads, qualified, customers, avgCpl: leads > 0 ? spend / leads : 0, avgRoas: spend > 0 ? revenue / spend : 0 }
      })()
    : totals

  return (
    <>
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 bg-surface-900 border border-surface-800 rounded-xl" />
                ))}
              </div>
              <div className="h-72 bg-surface-900 border border-surface-800 rounded-xl" />
              <div className="grid grid-cols-3 gap-4">
                <div className="lg:col-span-2 h-48 bg-surface-900 border border-surface-800 rounded-xl" />
                <div className="h-48 bg-surface-900 border border-surface-800 rounded-xl" />
              </div>
              <div className="h-40 bg-surface-900 border border-surface-800 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account bar */}
              {account && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-900 border border-surface-800 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-online flex-shrink-0" />
                  <span className="text-xs font-semibold text-surface-200">{account.accountName}</span>
                  <span className="text-xs text-surface-600">·</span>
                  <span className="text-xs text-surface-500 font-mono">{account.accountId}</span>
                  <div className="flex-1" />
                  <span className="text-xs text-surface-500">
                    Sincronizado:{' '}
                    {account.lastSyncAt
                      ? new Date(account.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </span>
                </div>
              )}

              {/* KPI strip */}
              <KpiStrip campaigns={campaigns} />

              {/* Performance chart */}
              <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-surface-100">Desempenho — Últimos 30 dias</p>
                    <p className="text-xs text-surface-400 mt-0.5">Evolução diária das campanhas Meta Ads</p>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-lg p-0.5">
                    {(['leads', 'spend'] as ChartMetric[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setChartMetric(m)}
                        className={cn(
                          'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                          chartMetric === m ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300',
                        )}
                      >
                        {m === 'leads' ? 'Leads' : 'Investimento'}
                      </button>
                    ))}
                  </div>
                </div>
                <PerformanceChart data={perfData} metric={chartMetric} />
              </div>

              {/* Funnel + Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ConversionFunnel campaigns={campaigns} />
                <SummaryPanel campaigns={campaigns} totals={platformTotals} />
              </div>

              {/* Campaign table with ad sets + creatives drill-down */}
              <CampaignTable
                campaigns={campaigns}
                onLeadsClick={(id, name) => setLeadsDrawer({ campaignId: id, campaignName: name })}
              />

              {/* CAPI Events */}
              <CapiEventsSection />
            </div>
          )}
        </div>
      </main>

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
