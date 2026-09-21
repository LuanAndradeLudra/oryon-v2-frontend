import type { CampaignAnalytics } from '@/types'

/**
 * `GET /campaigns/:id/analytics` devolve `funnel`, `failures`, `replies`,
 * `readHeatmap`, `avgTimeToReadMinutes` (BE.1) — e NÃO devolve os campos
 * legados que o relatório sempre leu (`churnBreakdown`, `engagementTimeline`,
 * `conversionEvents`, `attributionBreakdown`, `aiInsights`). Sem normalizar,
 * `analytics.churnBreakdown.optOut` lançava TypeError e derrubava o relatório.
 *
 * Aqui os legados ausentes viram vazio/zero, então o restante do componente
 * segue acessando-os sem guarda; os campos novos ganham default seguro.
 */
export function normalizeCampaignAnalytics(raw: Partial<CampaignAnalytics> | null | undefined): CampaignAnalytics | null {
  if (!raw) return null
  return {
    ...raw,
    campaignId: raw.campaignId ?? '',
    churnBreakdown: {
      optOut: 0,
      blocked: 0,
      invalidNumber: 0,
      undelivered: 0,
      noInteraction: 0,
      ...(raw.churnBreakdown ?? {}),
    },
    conversionEvents: raw.conversionEvents ?? [],
    engagementTimeline: raw.engagementTimeline ?? [],
    attributionBreakdown: raw.attributionBreakdown ?? [],
    aiInsights: raw.aiInsights ?? [],
    failures: raw.failures ?? [],
    replies: raw.replies ?? [],
    readHeatmap: raw.readHeatmap ?? [],
    avgTimeToReadMinutes: raw.avgTimeToReadMinutes ?? null,
  }
}

/** "1,5 min", "42 min", "3 h 10 min" — para o tempo médio até a leitura. */
export function formatMinutes(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return '—'
  if (min < 60) return `${String(Math.round(min * 10) / 10).replace('.', ',')} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}
