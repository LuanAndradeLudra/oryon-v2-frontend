// ─── View-model do relatório do disparo (D3 / SCRUM-1022) ───────────────────
// Puro: sem React, sem axios, sem DOM. Recebe o que a API devolveu e produz um
// único shape que os componentes de apresentação consomem. Só este arquivo (e
// o hook) sabe que existem dois mundos de dados; os componentes não.

import type { Campaign, CampaignAnalytics } from '@/types'
import type {
  CampaignAnalyticsV2Extra,
  CampaignFailureReason,
  CampaignReadHeatmapPoint,
  CampaignReply,
} from '@/types/campaignsV2'

/**
 * Detecção do "mundo BE.1" é por FORMA, não por status HTTP.
 *
 * `GET /campaigns/:id/analytics` **já existe** e responde **200** hoje, só que
 * com a forma antiga (`{ campaignId, campaignName, stats, sentAt }`). Por isso
 * `withFallback()` — que trata 404/501 — não serve aqui: não há erro nenhum a
 * capturar. Quem tentar "simplificar" isto de volta para `withFallback` vai
 * reintroduzir o bug, porque o teste de 404 nunca dispara.
 *
 * `withFallback` continua correto para `GET /campaigns/:id/recipients`, que
 * hoje 404 de verdade.
 */
export function hasExtendedAnalytics(
  data: unknown,
): data is CampaignAnalytics & CampaignAnalyticsV2Extra & { avgTimeToReadMinutes?: number | null } {
  return typeof data === 'object' && data !== null && 'funnel' in data
}

export type FunnelStepKey = 'sent' | 'delivered' | 'read' | 'replied'

export interface FunnelStep {
  key: FunnelStepKey
  label: string
  /** `null` = o backend não sabe este número ainda; renderiza "—", nunca "0". */
  value: number | null
}

export interface ReportKpis {
  /** Média das notas das respostas (0–10). NÃO é NPS — ver comentário abaixo. */
  averageScore: number | null
  promoterPct: number | null
  promoterCount: number | null
  classifiedCount: number | null
  optOutCount: number | null
  optOutPct: number | null
}

export interface HeatmapModel {
  /** `matrix[dia][hora]` — sempre 24 colunas por dia presente. */
  matrix: number[][]
  dayLabels: string[]
  max: number
  /** Janela de 2h com maior soma, ou `null` sem dados suficientes. */
  peak: { from: number; to: number } | null
  total: number
}

export interface ReportViewModel {
  hasRecipientData: boolean
  funnel: FunnelStep[]
  /** D34 (BE.1). `null` enquanto o backend não devolve — não estimamos no cliente. */
  avgTimeToReadMinutes: number | null
  kpis: ReportKpis
  failures: CampaignFailureReason[]
  failuresTotal: number
  heatmap: HeatmapModel
  replies: CampaignReply[]
  detractorCount: number
  repliesTotal: number
}

const FUNNEL_LABELS: Record<FunnelStepKey, string> = {
  sent: 'Enviadas',
  delivered: 'Entregues',
  read: 'Lidas',
  replied: 'Responderam',
}

const EMPTY_KPIS: ReportKpis = {
  averageScore: null,
  promoterPct: null,
  promoterCount: null,
  classifiedCount: null,
  optOutCount: null,
  optOutPct: null,
}

const EMPTY_HEATMAP: HeatmapModel = { matrix: [], dayLabels: [], max: 0, peak: null, total: 0 }

export function buildReportModel(campaign: Campaign | null, analytics: unknown): ReportViewModel {
  if (hasExtendedAnalytics(analytics)) {
    const replies = analytics.replies ?? []
    const failures = analytics.failures ?? []
    return {
      hasRecipientData: true,
      funnel: [
        { key: 'sent', label: FUNNEL_LABELS.sent, value: num(analytics.funnel?.sent) },
        { key: 'delivered', label: FUNNEL_LABELS.delivered, value: num(analytics.funnel?.delivered) },
        { key: 'read', label: FUNNEL_LABELS.read, value: num(analytics.funnel?.read) },
        { key: 'replied', label: FUNNEL_LABELS.replied, value: num(analytics.funnel?.replied) },
      ],
      avgTimeToReadMinutes: num(analytics.avgTimeToReadMinutes),
      kpis: buildKpis(replies),
      failures,
      failuresTotal: failures.reduce((acc, f) => acc + (f.count ?? 0), 0),
      heatmap: buildHeatmap(analytics.readHeatmap ?? [], campaign?.sentAt ?? null),
      replies,
      detractorCount: replies.filter((r) => r.class === 'detractor').length,
      repliesTotal: replies.length,
    }
  }

  // Mundo antigo: só `campaign.stats` é confiável. Não tocamos em
  // `churnBreakdown`/`conversionEvents`/`engagementTimeline`/`aiInsights` — o
  // tipo `CampaignAnalytics` os promete, mas o backend nunca os devolveu.
  const stats = campaign?.stats
  return {
    hasRecipientData: false,
    funnel: [
      { key: 'sent', label: FUNNEL_LABELS.sent, value: num(stats?.sent) },
      { key: 'delivered', label: FUNNEL_LABELS.delivered, value: num(stats?.delivered) },
      { key: 'read', label: FUNNEL_LABELS.read, value: num(stats?.read) },
      // `replied` é opcional em CampaignStats e hoje ninguém o escreve: fica
      // "—" em vez de um 0 que leria como "ninguém respondeu".
      { key: 'replied', label: FUNNEL_LABELS.replied, value: num(stats?.replied) },
    ],
    avgTimeToReadMinutes: null,
    kpis: EMPTY_KPIS,
    failures: [],
    failuresTotal: num(stats?.failed) ?? 0,
    heatmap: EMPTY_HEATMAP,
    replies: [],
    detractorCount: 0,
    repliesTotal: 0,
  }
}

/**
 * KPIs de resposta.
 *
 * O rótulo é "Nota média", não "NPS" (decisão do Maestro, D3-decisoes §4): a
 * escala aqui é 0–10 por resposta e NPS de verdade é −100..100 sobre
 * promotores menos detratores. Chamar média de nota de NPS induz a decisão
 * errada em quem lê o número.
 *
 * `score`/`class` são `null` até a BE.9 classificar; nesse caso o KPI é "—",
 * não 0.
 */
export function buildKpis(replies: CampaignReply[]): ReportKpis {
  const scored = replies.filter((r) => typeof r.score === 'number')
  const classified = replies.filter((r) => r.class != null)

  const averageScore = scored.length
    ? Math.round((scored.reduce((acc, r) => acc + (r.score as number), 0) / scored.length) * 10) / 10
    : null

  const promoterCount = classified.length ? classified.filter((r) => r.class === 'promoter').length : null
  const optOutCount = classified.length ? classified.filter((r) => r.class === 'optout').length : null

  return {
    averageScore,
    promoterCount,
    classifiedCount: classified.length || null,
    promoterPct:
      promoterCount != null && classified.length
        ? Math.round((promoterCount / classified.length) * 100)
        : null,
    optOutCount,
    optOutPct:
      optOutCount != null && replies.length
        ? Math.round((optOutCount / replies.length) * 1000) / 10
        : null,
  }
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Grade dia × hora.
 *
 * **Não reconverter fuso aqui.** Depois do fix da BE.1 (#81), `hour` e
 * `dayOffset` já chegam em calendário local America/Sao_Paulo, derivados da
 * mesma conversão no SQL. Aplicar `new Date(...).getHours()` sobre eles
 * deslocaria tudo de novo. A ÚNICA data que vira `Date` aqui é `sentAt`, e só
 * para descobrir o nome do dia da semana do rótulo.
 */
export function buildHeatmap(points: CampaignReadHeatmapPoint[], sentAt: string | null): HeatmapModel {
  if (!points.length) return EMPTY_HEATMAP

  const maxDay = points.reduce((acc, p) => Math.max(acc, p.dayOffset ?? 0), 0)
  const days = Math.min(maxDay + 1, 7)
  const matrix: number[][] = Array.from({ length: days }, () => new Array<number>(24).fill(0))

  let max = 0
  let total = 0
  for (const p of points) {
    const d = p.dayOffset ?? 0
    const h = p.hour ?? 0
    if (d < 0 || d >= days || h < 0 || h > 23) continue
    const count = p.count ?? 0
    matrix[d][h] += count
    total += count
    if (matrix[d][h] > max) max = matrix[d][h]
  }

  const start = sentAt ? new Date(sentAt) : null
  const dayLabels = Array.from({ length: days }, (_, i) => {
    if (!start || Number.isNaN(start.getTime())) return `D+${i}`
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return DAY_NAMES[d.getDay()]
  })

  return { matrix, dayLabels, max, total, peak: peakWindow(matrix) }
}

/** Janela de 2 horas com a maior soma de leituras, somando todos os dias. */
export function peakWindow(matrix: number[][]): { from: number; to: number } | null {
  if (!matrix.length) return null
  const byHour = new Array<number>(24).fill(0)
  for (const row of matrix) {
    for (let h = 0; h < 24; h++) byHour[h] += row[h] ?? 0
  }
  if (byHour.every((v) => v === 0)) return null

  let bestFrom = 0
  let best = -1
  for (let h = 0; h < 23; h++) {
    const sum = byHour[h] + byHour[h + 1]
    if (sum > best) {
      best = sum
      bestFrom = h
    }
  }
  return { from: bestFrom, to: bestFrom + 2 }
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
