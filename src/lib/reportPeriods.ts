import { resolveRange, resolveReportRange, type ResolvedRange } from './dateRange'

/** Períodos dos Relatórios do funil — o valor mora na URL (`?periodo=`). */
export type ReportPeriod = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'all'

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last7', label: '7 dias' },
  { value: 'last30', label: '30 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'all', label: 'Tudo' },
]

export function isReportPeriod(v: string | null | undefined): v is ReportPeriod {
  return !!v && REPORT_PERIODS.some((p) => p.value === v)
}

export function reportPeriodRange(period: ReportPeriod): ResolvedRange {
  if (period === 'all') return { startDate: undefined, endDate: undefined }
  if (period === 'last30' || period === 'thisMonth') return resolveReportRange(period)
  return resolveRange(period)
}
