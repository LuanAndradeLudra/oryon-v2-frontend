import { useEstadoNaUrl, lerUmDe } from '@/hooks/useEstadoNaUrl'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, BarChart3, TrendingUp, Users, MessageCircle, ShoppingCart,
  AlertTriangle, CheckCircle2, Sparkles, ChevronRight,
  Target, Zap, Megaphone, Globe, Crown, Filter, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { StatStrip } from './StatStrip'
import { RecipientsTab, RepliesTab } from './CampaignReportTabs'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { campaignsApi } from '@/services/api'
import { generateCampaignInsights } from '@/services/copilotService'
import { useChartColors } from '@/hooks/useChartColors'
import type { ChartColors } from '@/components/dashboard/utils'
import { normalizeCampaignAnalytics, formatMinutes } from '@/lib/campaignAnalytics'
import type { Campaign, CampaignAnalytics, CampaignConversionEvent, CampaignAttributionBreakdown, CampaignConversationSummary } from '@/types'
import type { CampaignInsight } from '@/services/copilotService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (!den) return '0%'
  return Math.round((num / den) * 100) + '%'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Tint temático — alpha via color-mix (funciona com var() e hex, nos dois temas). */
function tint(color: string, pctVal: number) {
  return `color-mix(in srgb, ${color} ${pctVal}%, transparent)`
}

// ── Conversion type config ────────────────────────────────────────────────────

// color = chave de useChartColors() — usado em SVG (Recharts), onde var() não funciona
const CONV_CONFIG: Record<CampaignConversionEvent['type'], { label: string; color: keyof ChartColors; icon: React.ReactNode }> = {
  replied:      { label: 'Respondeu',       color: 'cyan',   icon: <MessageCircle className="w-3.5 h-3.5" /> },
  clicked_link: { label: 'Clicou no link',  color: 'purple', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  stage_changed:{ label: 'Avançou no CRM',  color: 'brand',  icon: <ChevronRight className="w-3.5 h-3.5" /> },
  purchase:     { label: 'Comprou',         color: 'online', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
}

const CHURN_COLOR_KEYS: (keyof ChartColors)[] = ['danger', 'away', 'brand', 'purple', 'axis']
const CHURN_LABELS: Record<string, string> = {
  optOut:        'Opt-out / descadastro',
  blocked:       'Bloqueou como spam',
  invalidNumber: 'Número inválido',
  undelivered:   'Falha de entrega',
  noInteraction: 'Sem interação (soft)',
}

// ── AI Insights section ───────────────────────────────────────────────────────

const INSIGHT_COLORS: Record<CampaignInsight['type'], string> = {
  alert:       'var(--color-accent-rose)',
  opportunity: 'var(--color-accent-green)',
  trend:       'var(--color-accent-blue)',
  success:     'var(--color-accent-violet)',
}

const INSIGHT_BG: Record<CampaignInsight['type'], string> = {
  alert:       tint('var(--color-accent-rose)', 9),
  opportunity: tint('var(--color-accent-green)', 9),
  trend:       tint('var(--color-accent-blue)', 9),
  success:     tint('var(--color-accent-violet)', 9),
}

function AiInsightsSection({ campaign, analytics }: { campaign: Campaign; analytics: CampaignAnalytics }) {
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const result = await generateCampaignInsights(
        campaign.name,
        campaign.stats as unknown as Record<string, unknown>,
        analytics.churnBreakdown as unknown as Record<string, unknown>,
      )
      setInsights(result)
      setGenerated(true)
    } finally {
      setLoading(false)
    }
  }, [campaign, analytics])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-surface-200">Análise da IA</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
            loading
              ? 'bg-surface-800 border-surface-700 text-surface-500 cursor-not-allowed'
              : 'bg-brand-600/20 border-brand-600 text-brand-300 hover:bg-brand-600/30',
          )}
        >
          {loading ? (
            <><Spinner className="w-3 h-3" />Analisando...</>
          ) : generated ? (
            <><Sparkles className="w-3 h-3" />Reanalisar</>
          ) : (
            <><Sparkles className="w-3 h-3" />Gerar análise</>
          )}
        </button>
      </div>

      {!generated && !loading && (
        <div className="flex flex-col items-center gap-2 py-6 border border-dashed border-surface-700 rounded-lg">
          <Sparkles className="w-6 h-6 text-surface-600" />
          <p className="text-xs text-surface-500 text-center max-w-xs">
            Clique em "Gerar análise" para que a IA avalie conversões, churn e engajamento desta campanha.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-surface-500">
          <Spinner className="w-4 h-4 text-brand-400" />
          Analisando métricas da campanha...
        </div>
      )}

      <AnimatePresence>
        {generated && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-2"
          >
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="p-3 rounded-lg border"
                style={{ backgroundColor: INSIGHT_BG[ins.type], borderColor: tint(INSIGHT_COLORS[ins.type], 19) }}
              >
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: tint(INSIGHT_COLORS[ins.type], 15), color: INSIGHT_COLORS[ins.type] }}>
                    {ins.type === 'alert' ? <AlertTriangle className="w-3 h-3" /> :
                     ins.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
                     ins.type === 'opportunity' ? <Target className="w-3 h-3" /> :
                     <TrendingUp className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-200">{ins.title}</p>
                    <p className="text-2xs text-surface-400 mt-0.5 leading-relaxed">{ins.body}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Zap className="w-3 h-3" style={{ color: INSIGHT_COLORS[ins.type] }} />
                      <span className="text-3xs" style={{ color: INSIGHT_COLORS[ins.type] }}>{ins.action}</span>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                    ins.priority === 'high' ? 'bg-danger/20 text-danger' :
                    ins.priority === 'medium' ? 'bg-status-pending-bg text-status-pending' :
                    'bg-[var(--sf2)] text-surface-400',
                  )}>
                    {ins.priority === 'high' ? 'ALTA' : ins.priority === 'medium' ? 'MÉD' : 'BAIXA'}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Attribution config ────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  meta_ads:   { label: 'Meta Ads',   color: '#1877f2', icon: <Megaphone className="w-3 h-3" /> },
  google_ads: { label: 'Google Ads', color: '#EA4335', icon: <Globe className="w-3 h-3" /> },
  whatsapp:   { label: 'WhatsApp Orgânico', color: '#25D366', icon: <MessageCircle className="w-3 h-3" /> },
  manual:     { label: 'Manual / Lista', color: 'var(--color-status-muted)', icon: <Users className="w-3 h-3" /> },
}

function getPlatformCfg(source: string) {
  return PLATFORM_CONFIG[source] ?? { label: source, color: 'var(--color-status-muted)', icon: <Users className="w-3 h-3" /> }
}

// ── Outcome / Sentiment config ────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  converted:   { label: 'Convertido',    color: 'var(--color-accent-green)' },
  churned:     { label: 'Churn',         color: 'var(--color-accent-rose)' },
  pending:     { label: 'Em andamento',  color: 'var(--color-accent-amber)' },
  no_response: { label: 'Sem resposta',  color: 'var(--color-status-muted)' },
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positivo',  color: 'var(--color-accent-green)' },
  neutral:  { label: 'Neutro',    color: 'var(--color-status-muted)' },
  negative: { label: 'Negativo',  color: 'var(--color-accent-rose)' },
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'recipients' | 'replies' | 'conversions' | 'churn' | 'attribution' | 'conversations'
/** D8 — abas sem fonte de dados, atrás de campaignReportLegacyTabs. */
const LEGACY_TABS: ReadonlySet<Tab> = new Set<Tab>(['conversions', 'churn', 'attribution', 'conversations'])

// ── Main report drawer ────────────────────────────────────────────────────────

interface CampaignReportProps {
  campaign: Campaign
  onClose: () => void
}

const lerAbaRelatorio = lerUmDe(['overview', 'recipients', 'replies', 'conversions', 'churn', 'attribution', 'conversations'] as const, 'overview')

export function CampaignReport({ campaign, onClose }: CampaignReportProps) {
  const navigate = useNavigate()
  const C = useChartColors()
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [conversations, setConversations] = useState<CampaignConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const legacy = useFeatureVisibility().isFeatureVisible('campaignReportLegacyTabs')
  // Aba e filtros do relatório na URL (limpos junto com ?report= ao fechar).
  const [tabNaUrl, setTab] = useEstadoNaUrl<Tab>('relatorioAba', { padrao: 'overview', ler: lerAbaRelatorio })
  // D8 — link antigo para uma aba escondida cai na visão geral.
  const tab: Tab = !legacy && LEGACY_TABS.has(tabNaUrl) ? 'overview' : tabNaUrl
  const [outcomeFilter, setOutcomeFilter] = useEstadoNaUrl<string>('resultado', { padrao: 'all' })
  const [sentimentFilter, setSentimentFilter] = useEstadoNaUrl<string>('sentimento', { padrao: 'all' })

  // Os contadores do `/analytics` são lidos AGORA; `campaign.stats` vem da lista e
  // pode estar velho (delivered/read sobem depois, por webhook, e a aba não recarrega).
  const stats = analytics?.stats ?? campaign.stats
  // SCRUM-1150: campanha parada sozinha pelo circuit breaker; o /analytics traz o motivo atual.
  const stopReason = analytics?.stopReason ?? campaign.stopReason ?? null

  // T2 — o analytics não depende mais de `/campaigns/:id/conversations`: esse
  // endpoint não existe, e no Promise.all a falha dele derrubava o relatório
  // inteiro (em silêncio). As conversas por campanha só com as abas legadas (D8).
  useEffect(() => {
    let vivo = true
    setLoading(true)
    setLoadError(false)
    campaignsApi.getAnalytics(campaign.id)
      .then((r) => { if (vivo) setAnalytics(normalizeCampaignAnalytics(r.data)) })
      .catch(() => { if (vivo) setLoadError(true) })
      .finally(() => { if (vivo) setLoading(false) })
    if (legacy) {
      campaignsApi.getConversations(campaign.id)
        .then((r) => { if (vivo) setConversations(r.data ?? []) })
        .catch(() => { if (vivo) setConversations([]) })
    }
    return () => { vivo = false }
  }, [campaign.id, legacy])

  // D7 — cada percentual com a base escrita na tela: entregues e falhas sobre
  // as ENVIADAS; lidas e respostas sobre as ENTREGUES. Excluídos e opt-out à
  // parte, fora de toda base. Sem base (0), mostra "—", não "0%".
  const funnel = analytics?.funnel
  const sent      = funnel?.sent ?? stats.sent
  const delivered = funnel?.delivered ?? stats.delivered
  const read      = funnel?.read ?? stats.read
  const replied   = funnel?.replied ?? stats.replied ?? 0
  const failed    = funnel?.failed ?? stats.failed
  const excluded  = funnel?.excluded ?? stats.excluded ?? 0
  const optedOut  = funnel?.optedOut ?? stats.optedOut ?? 0
  const pending   = funnel?.pending ?? 0
  // "Enviadas" = tudo que tentamos mandar (aceitas pela Meta + falhas): é a
  // base de entregues e de falhas (D7), então as duas somam no máximo 100%.
  const enviadas  = sent + failed
  const pctDe = (n: number, base: number) => (base > 0 ? `${Math.round((n / base) * 100)}%` : '—')
  const convRate  = stats.read > 0 && stats.conversions ? Math.round((stats.conversions / stats.read) * 100) : 0

  const funnelData = [
    { label: 'Enviadas',    value: enviadas,  base: enviadas,  baseLabel: '',              color: 'var(--color-accent-blue)' },
    { label: 'Entregues',   value: delivered, base: enviadas,  baseLabel: 'das enviadas',  color: 'var(--color-accent-cyan)' },
    { label: 'Lidas',       value: read,      base: delivered, baseLabel: 'das entregues', color: 'var(--color-accent-amber)' },
    { label: 'Responderam', value: replied,   base: delivered, baseLabel: 'das entregues', color: 'var(--color-accent-violet)' },
    { label: 'Falharam',    value: failed,    base: enviadas,  baseLabel: 'das enviadas',  color: 'var(--color-danger)' },
  ]

  const churnColors = CHURN_COLOR_KEYS.map((k) => C[k])

  const churnPieData = analytics ? [
    { name: CHURN_LABELS.optOut,        value: analytics.churnBreakdown.optOut },
    { name: CHURN_LABELS.blocked,       value: analytics.churnBreakdown.blocked },
    { name: CHURN_LABELS.invalidNumber, value: analytics.churnBreakdown.invalidNumber },
    { name: CHURN_LABELS.undelivered,   value: analytics.churnBreakdown.undelivered },
    { name: CHURN_LABELS.noInteraction, value: analytics.churnBreakdown.noInteraction },
  ].filter((d) => d.value > 0) : []

  const totalChurn = churnPieData.reduce((s, d) => s + d.value, 0)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',       label: 'Visão Geral' },
    { id: 'recipients',     label: 'Destinatários' },
    { id: 'replies',        label: `Respostas (${replied})` },
    ...(legacy ? [
      { id: 'conversions' as const,   label: `Conversões (${stats.conversions ?? 0})` },
      { id: 'churn' as const,         label: `Churn (${stats.churnCount ?? totalChurn})` },
      { id: 'attribution' as const,   label: 'Atribuição' },
      { id: 'conversations' as const, label: `Conversas (${conversations.length})` },
    ] : []),
  ]

  // Filtered conversations
  const filteredConvs = conversations.filter((c) => {
    if (outcomeFilter !== 'all' && c.outcome !== outcomeFilter) return false
    if (sentimentFilter !== 'all' && c.sentiment !== sentimentFilter) return false
    return true
  })

  return (
    <>
      {/* Backdrop */}
      {/* Eixo 10: scrim do token (--color-scrim-soft), não bg-black/70 cru — preto
          cru fica pesado demais no tema claro (MODAL-07). */}
      <div className="fixed inset-0 z-40 bg-[var(--color-scrim-soft)]" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[600px] bg-surface-950 border-l overlay-frame flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-700 flex-shrink-0">
          {/* Eixo 10: rounded-lg (8px), não rounded-xl (10px) — mesma medida
              do ícone 32px de cabeçalho de drawer em CampaignLeadsDrawer.tsx
              e AttributionTab.tsx (mesma tela T7). */}
          <div className="w-8 h-8 rounded-lg bg-brand-600/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-surface-100 truncate">{campaign.name}</h2>
            <p className="text-2xs text-surface-500 mt-0.5">
              Relatório de desempenho · {stats.total} contatos · {campaign.sentAt ? fmtDate(campaign.sentAt) : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1 gap-2 text-xs text-surface-500">
            <Spinner className="w-5 h-5 text-brand-400" />
            Carregando dados...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-xs text-surface-400 px-6 text-center">
            <AlertTriangle className="w-5 h-5 text-danger" />
            Não foi possível carregar o relatório desta campanha. Os números não aparecem para não mostrar zero no lugar do dado real.
          </div>
        ) : (
          <>
            {/* KPI Strip — direção C: número grande + rótulo miúdo, linha de
                1px entre eles, sem cartão por item. */}
            <div className="px-5 py-3 border-b border-surface-700 flex-shrink-0">
              <StatStrip items={[
                { label: 'Enviadas',    value: enviadas,                  sub: pending > 0 ? `${pending} na fila` : `de ${stats.total} contatos`, color: 'var(--color-accent-blue)' },
                { label: 'Entregues',   value: pctDe(delivered, enviadas), sub: `${delivered} das enviadas`,  color: 'var(--color-accent-cyan)' },
                { label: 'Lidas',       value: pctDe(read, delivered),    sub: `${read} das entregues`,      color: 'var(--color-accent-amber)' },
                { label: 'Responderam', value: pctDe(replied, delivered), sub: `${replied} das entregues`,   color: 'var(--color-accent-violet)' },
                { label: 'Falhas',      value: pctDe(failed, enviadas),   sub: `${failed} das enviadas`,     color: 'var(--color-danger)' },
              ]} />
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-surface-700 flex-shrink-0">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tab === t.id ? 'bg-surface-800 text-surface-100' : 'text-surface-500 hover:text-surface-300',
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="p-5 space-y-5"
                >
                  {/* ── OVERVIEW ── */}
                  {tab === 'overview' && (
                    <>
                      {/* Pausa automática (circuit breaker) e contatos suprimidos */}
                      {stopReason && (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5"
                        >
                          <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                          <p className="text-2xs text-surface-200">{stopReason}</p>
                        </div>
                      )}
                      {(excluded > 0 || optedOut > 0) && (
                        <p className="text-2xs text-surface-400">
                          À parte, fora dos percentuais:{' '}
                          {excluded > 0 && (
                            <><span className="font-semibold text-surface-200">{excluded}</span> {excluded === 1 ? 'contato ficou' : 'contatos ficaram'} fora do envio (número inválido ou opt-out)</>
                          )}
                          {excluded > 0 && optedOut > 0 && '; '}
                          {optedOut > 0 && (
                            <><span className="font-semibold text-surface-200">{optedOut}</span> {optedOut === 1 ? 'saiu' : 'saíram'} de marketing ao receber</>
                          )}
                          .{' '}
                          <button type="button" className="underline hover:text-surface-200" onClick={() => setTab('recipients')}>Ver destinatários</button>
                        </p>
                      )}

                      {/* Funnel */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Funil de engajamento</p>
                        <div className="space-y-2">
                          {funnelData.map((f, i) => (
                            <div key={f.label} className="flex items-center gap-3">
                              <span className="text-2xs text-surface-400 w-24 flex-shrink-0">{f.label}</span>
                              <div className="flex-1 h-6 bg-surface-800 rounded-lg overflow-hidden relative">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${f.base > 0 ? Math.min(100, (f.value / f.base) * 100) : 0}%` }}
                                  transition={{ duration: 0.6, delay: i * 0.08 }}
                                  className="h-full rounded-lg flex items-center pl-2"
                                  style={{ backgroundColor: tint(f.color, 25), borderLeft: `3px solid ${f.color}` }}
                                >
                                  <span className="text-3xs font-bold" style={{ color: f.color }}>{f.value}</span>
                                </motion.div>
                              </div>
                              <span className="text-2xs text-surface-500 w-32 text-right flex-shrink-0">
                                {f.baseLabel ? `${pctDe(f.value, f.base)} ${f.baseLabel}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Falhas de entrega por motivo (SCRUM-1142) */}
                      {analytics && (analytics.failures.length > 0 || analytics.avgTimeToReadMinutes != null) && (
                        <div>
                          {analytics.avgTimeToReadMinutes != null && (
                            <p className="text-2xs text-surface-400 mb-3">
                              Tempo médio até a leitura:{' '}
                              <span className="font-semibold text-surface-200">{formatMinutes(analytics.avgTimeToReadMinutes)}</span>
                            </p>
                          )}
                          {analytics.failures.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-surface-300 mb-3">
                                Falhas por motivo ({analytics.failures.reduce((n, f) => n + f.count, 0)})
                              </p>
                              <div className="space-y-1.5">
                                {analytics.failures.map((f) => (
                                  <div
                                    key={f.code}
                                    className="flex items-center justify-between gap-3 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2"
                                  >
                                    <span className="text-2xs text-surface-300" title={`Código ${f.code}`}>{f.reason}</span>
                                    <span className="text-2xs font-semibold text-danger flex-shrink-0">{f.count}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Timeline (D8: sem fonte — só com as abas legadas) */}
                      {legacy && analytics && analytics.engagementTimeline.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-300 mb-3">Engajamento ao longo do tempo</p>
                          <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analytics.engagementTimeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                <defs>
                                  <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.away} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={C.away} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="gReplied" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="gConverted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={C.online} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={C.online} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.axis }} />
                                <YAxis tick={{ fontSize: 10, fill: C.axis }} />
                                <Tooltip contentStyle={{ background: C.surface8, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 11 }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="read"      name="Lidas"      stroke={C.away} fill="url(#gRead)"      strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="replied"   name="Responderam" stroke={C.purple} fill="url(#gReplied)"   strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="converted" name="Convertidas" stroke={C.online} fill="url(#gConverted)" strokeWidth={2} dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* AI Insights (D8: analisava números sem fonte — só com as abas legadas) */}
                      {legacy && analytics && <AiInsightsSection campaign={campaign} analytics={analytics} />}
                    </>
                  )}

                  {/* ── DESTINATÁRIOS (T2 + D9) ── */}
                  {tab === 'recipients' && (
                    <RecipientsTab campaignId={campaign.id} failures={analytics?.failures ?? []} />
                  )}

                  {/* ── RESPOSTAS (T2) ── */}
                  {tab === 'replies' && <RepliesTab replies={analytics?.replies ?? []} />}

                  {/* ── CONVERSIONS ── */}
                  {tab === 'conversions' && analytics && (
                    <>
                      {/* Stats row */}
                      <StatStrip items={[
                        { label: 'Total de conversões',    value: stats.conversions ?? 0, color: 'var(--color-accent-green)' },
                        { label: 'Taxa (lidas → converteu)', value: `${convRate}%`,        color: 'var(--color-brand-400)' },
                        { label: 'Taxa sobre enviadas',    value: pct(stats.conversions ?? 0, stats.sent), color: 'var(--color-accent-amber)' },
                      ]} />

                      {/* Conversion type breakdown */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Por tipo de conversão</p>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.entries(CONV_CONFIG).map(([type, cfg]) => ({
                                name: cfg.label,
                                value: analytics.conversionEvents.filter((e) => e.type === type).length,
                                fill: C[cfg.color],
                              }))}
                              margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} />
                              <YAxis tick={{ fontSize: 10, fill: C.axis }} />
                              <Tooltip contentStyle={{ background: C.surface8, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 11 }} />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {Object.values(CONV_CONFIG).map((cfg, i) => (
                                  <Cell key={i} fill={C[cfg.color]} fillOpacity={0.8} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Events table — direção C: faixa com linha de 1px
                          entre eventos, não um cartão por evento. */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-2">Eventos de conversão</p>
                        {analytics.conversionEvents.length === 0 ? (
                          <p className="text-xs text-surface-500 text-center py-6">Nenhum evento de conversão registrado</p>
                        ) : (
                          <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
                            {analytics.conversionEvents.map((ev, i) => {
                              const cfg = CONV_CONFIG[ev.type]
                              return (
                                <div key={i} className="flex items-center gap-3 px-3 py-2">
                                  <span style={{ color: C[cfg.color] }} className="flex-shrink-0">{cfg.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-surface-200">{ev.contactName}</p>
                                    {ev.detail && <p className="text-3xs text-surface-500">{ev.detail}</p>}
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <p className="text-3xs font-medium" style={{ color: C[cfg.color] }}>{cfg.label}</p>
                                    <p className="text-[9px] text-surface-600">{fmtDate(ev.convertedAt)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ── ATTRIBUTION ── */}
                  {tab === 'attribution' && analytics && analytics.attributionBreakdown && (
                    <>
                      {/* Best performer highlight */}
                      {(() => {
                        const best = [...analytics.attributionBreakdown].sort((a, b) => b.conversionRate - a.conversionRate)[0]
                        if (!best) return null
                        const cfg = getPlatformCfg(best.source)
                        return (
                          // Direção C: quase nenhuma cor de fundo — o destaque
                          // vem do peso da tipografia; a cor fica só no ícone
                          // e no rótulo, que já identificam a origem.
                          <div className="flex items-center gap-3 px-4 py-3 rounded-sm border border-surface-700">
                            <Crown className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold" style={{ color: cfg.color }}>Melhor origem: {cfg.label}</p>
                              <p className="text-2xs text-surface-400 mt-0.5">
                                {best.conversionCount} conversões · {Math.round(best.conversionRate * 100)}% de taxa · {best.contactCount} contatos
                              </p>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Horizontal comparison bars */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Taxa de leitura por origem</p>
                        <div className="space-y-2.5">
                          {analytics.attributionBreakdown.map((ab: CampaignAttributionBreakdown) => {
                            const cfg = getPlatformCfg(ab.source)
                            return (
                              <div key={ab.source} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                    <span className="text-2xs text-surface-300">{cfg.label}</span>
                                    <span className="text-3xs text-surface-600">({ab.contactCount} contatos)</span>
                                  </div>
                                  <span className="text-2xs font-bold" style={{ color: cfg.color }}>
                                    {Math.round(ab.readRate * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ab.readRate * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: cfg.color }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-3">Taxa de conversão por origem</p>
                        <div className="space-y-2.5">
                          {analytics.attributionBreakdown.map((ab: CampaignAttributionBreakdown) => {
                            const cfg = getPlatformCfg(ab.source)
                            return (
                              <div key={ab.source} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                    <span className="text-2xs text-surface-300">{cfg.label}</span>
                                  </div>
                                  <span className="text-2xs font-bold" style={{ color: cfg.color }}>
                                    {Math.round(ab.conversionRate * 100)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ab.conversionRate * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: tint(cfg.color, 80) }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Comparison table */}
                      <div>
                        <p className="text-xs font-semibold text-surface-300 mb-2">Tabela comparativa</p>
                        <div className="overflow-x-auto rounded-lg border border-surface-700">
                          <table className="w-full text-2xs">
                            <thead>
                              <tr className="border-b border-surface-700 bg-surface-800">
                                <th className="text-left px-3 py-2 text-surface-400 font-medium">Origem</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Contatos</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Lidos</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Respostas</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Conversões</th>
                                <th className="text-right px-3 py-2 text-surface-400 font-medium">Conv.%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.attributionBreakdown.map((ab: CampaignAttributionBreakdown, i: number) => {
                                const cfg = getPlatformCfg(ab.source)
                                const isLast = i === analytics.attributionBreakdown.length - 1
                                return (
                                  <tr key={ab.source} className={cn('transition-colors hover:bg-[var(--rowhover)]', !isLast && 'border-b border-surface-700')}>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                        <span className="text-surface-300 font-medium">{cfg.label}</span>
                                      </div>
                                      {ab.adCampaignName && (
                                        <p className="text-3xs text-surface-600 mt-0.5 pl-4">{ab.adCampaignName}</p>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right text-surface-300">{ab.contactCount}</td>
                                    <td className="px-3 py-2 text-right text-surface-300">{ab.readCount} <span className="text-surface-600">({Math.round(ab.readRate * 100)}%)</span></td>
                                    <td className="px-3 py-2 text-right text-surface-300">{ab.replyCount}</td>
                                    <td className="px-3 py-2 text-right font-bold" style={{ color: cfg.color }}>{ab.conversionCount}</td>
                                    <td className="px-3 py-2 text-right font-bold" style={{ color: cfg.color }}>{Math.round(ab.conversionRate * 100)}%</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CONVERSATIONS ── */}
                  {tab === 'conversations' && (
                    <>
                      {/* Outcome distribution */}
                      {conversations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-300 mb-3">Distribuição por resultado</p>
                          <StatStrip items={Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => ({
                            label: cfg.label,
                            value: conversations.filter((c) => c.outcome === key).length,
                            color: cfg.color,
                            active: outcomeFilter === key,
                            onClick: () => setOutcomeFilter(outcomeFilter === key ? 'all' : key),
                          }))} />
                        </div>
                      )}

                      {/* Sentiment + filters row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                        <span className="text-3xs text-surface-500">Sentimento:</span>
                        {['all', 'positive', 'neutral', 'negative'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSentimentFilter(s)}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-3xs font-medium border transition-all',
                              sentimentFilter === s
                                ? 'bg-[var(--sf2)] border-[var(--bd2)] text-surface-200'
                                : 'border-surface-700 text-surface-500 hover:text-surface-300',
                            )}
                          >
                            {s === 'all' ? 'Todos' : SENTIMENT_CONFIG[s]?.label ?? s}
                          </button>
                        ))}
                        {(outcomeFilter !== 'all' || sentimentFilter !== 'all') && (
                          <button
                            onClick={() => { setOutcomeFilter('all'); setSentimentFilter('all') }}
                            className="ml-auto text-3xs text-accent-dark hover:opacity-80 transition-colors"
                          >
                            Limpar filtros
                          </button>
                        )}
                      </div>

                      {/* Conversation list — direção C: faixa com linha de
                          1px entre conversas, não um cartão por conversa. */}
                      {filteredConvs.length === 0 ? (
                        <div className="flex flex-col items-center py-8 gap-2 text-surface-500">
                          <MessageCircle className="w-6 h-6" />
                          <p className="text-xs">Nenhuma conversa encontrada com esses filtros</p>
                        </div>
                      ) : (
                      <div className="border border-surface-700 rounded-lg divide-y divide-surface-700 overflow-hidden">
                        {filteredConvs.map((conv) => {
                          const outcomeCfg = OUTCOME_CONFIG[conv.outcome] ?? { label: conv.outcome, color: 'var(--color-status-muted)' }
                          const sentimentCfg = SENTIMENT_CONFIG[conv.sentiment] ?? { label: conv.sentiment, color: 'var(--color-status-muted)' }
                          const adCfg = conv.adSource ? getPlatformCfg(conv.adSource) : null
                          return (
                            <div key={conv.contactId} className="px-3 py-2.5 space-y-1.5">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-surface-200">{conv.contactName}</span>
                                    <span className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                      style={{ ['--chip']: outcomeCfg.color } as React.CSSProperties}>
                                      {outcomeCfg.label}
                                    </span>
                                    <span className="color-chip px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                                      style={{ ['--chip']: sentimentCfg.color } as React.CSSProperties}>
                                      {sentimentCfg.label}
                                    </span>
                                    {adCfg && (
                                      <span className="color-chip flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                                        style={{ ['--chip']: adCfg.color } as React.CSSProperties}>
                                        {adCfg.icon}
                                        {conv.adCampaignName ?? adCfg.label}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-2xs text-surface-400 mt-1 leading-relaxed line-clamp-2">{conv.lastMessageSnippet}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className="text-[9px] text-surface-600">{fmtDate(conv.lastMessageAt)}</span>
                                  <button
                                    onClick={() => { onClose(); navigate(`/contacts?contact=${conv.contactId}`) }}
                                    className="text-[9px] text-accent-dark hover:opacity-80 transition-colors flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    CRM
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      )}

                      {/* Sentiment summary chart */}
                      {conversations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-300 mb-3">Sentimento geral</p>
                          <StatStrip items={Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => {
                            const count = conversations.filter((c) => c.sentiment === key).length
                            const pctVal = Math.round((count / conversations.length) * 100)
                            return {
                              label: cfg.label,
                              value: `${pctVal}%`,
                              sub: `${count} conversa${count !== 1 ? 's' : ''}`,
                              color: cfg.color,
                            }
                          })} />
                        </div>
                      )}
                    </>
                  )}

                  {/* ── CHURN ── */}
                  {tab === 'churn' && analytics && (
                    <>
                      {/* Summary */}
                      <StatStrip items={[
                        { label: 'Total churn',      value: totalChurn,                     color: 'var(--color-danger)' },
                        { label: 'Taxa de churn',    value: pct(totalChurn, stats.sent),     color: 'var(--color-accent-amber)' },
                        { label: 'Descadastraram',   value: pct(stats.optedOut ?? analytics.churnBreakdown.optOut + analytics.churnBreakdown.blocked, stats.sent) },
                      ]} />

                      {/* Pie + breakdown */}
                      {churnPieData.length > 0 && (
                        <div className="flex gap-4">
                          <div className="w-44 flex-shrink-0 h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={churnPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                                  dataKey="value" paddingAngle={3}>
                                  {churnPieData.map((_, i) => (
                                    <Cell key={i} fill={churnColors[i % churnColors.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: C.surface8, border: `1px solid ${C.grid}`, borderRadius: 8, fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-2">
                            {churnPieData.map((d, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[i % churnColors.length] }} />
                                <span className="text-2xs text-surface-400 flex-1 truncate">{d.name}</span>
                                <span className="text-2xs font-bold text-surface-200 flex-shrink-0">{d.value}</span>
                                <span className="text-3xs text-surface-600 w-10 text-right flex-shrink-0">{pct(d.value, totalChurn)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interpretation — direção C: linha de 1px no topo em
                          vez de cartão com fundo. */}
                      <div className="border-t border-surface-700 pt-3 space-y-2.5">
                        <p className="text-3xs font-semibold text-surface-400 uppercase tracking-wider">Interpretação dos motivos</p>
                        {analytics.churnBreakdown.optOut > 0 && (
                          <div className="flex gap-2">
                            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[0] }} />
                            <p className="text-2xs text-surface-400 leading-relaxed">
                              <strong className="text-surface-200">{analytics.churnBreakdown.optOut} opt-outs</strong>: contatos que clicaram em "parar de receber". Revise a relevância do conteúdo e a frequência dos envios para esse segmento.
                            </p>
                          </div>
                        )}
                        {analytics.churnBreakdown.blocked > 0 && (
                          <div className="flex gap-2">
                            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[1] }} />
                            <p className="text-2xs text-surface-400 leading-relaxed">
                              <strong className="text-surface-200">{analytics.churnBreakdown.blocked} bloqueios</strong>: contatos que reportaram como spam. Taxa elevada pode impactar o quality score do número WABA.
                            </p>
                          </div>
                        )}
                        {analytics.churnBreakdown.noInteraction > 0 && (
                          <div className="flex gap-2">
                            <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: churnColors[4] }} />
                            <p className="text-2xs text-surface-400 leading-relaxed">
                              <strong className="text-surface-200">{analytics.churnBreakdown.noInteraction} sem interação</strong>: entregue mas ignorado. Considere um follow-up ou retirar este segmento das próximas campanhas.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* AI insights on churn */}
                      {analytics && <AiInsightsSection campaign={campaign} analytics={analytics} />}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </>
  )
}
