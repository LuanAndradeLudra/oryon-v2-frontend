import type { Deal } from '@/types'
import { diaDaPrevisao } from './previsaoDeFechamento'

/**
 * Filtros e resumo da barra do board de Funis (R2-1E-BAR, RODADA-2.md).
 * Tudo client-side sobre os negócios que o board já carregou — nenhum dado novo.
 */

/** 'all' = sem filtro · 'none' = sem responsável · demais = `ownerUserId`. */
export type OwnerFilter = 'all' | 'none' | (string & {})

export type CloseFilter = 'all' | 'overdue' | 'week' | 'month' | 'none'

export const CLOSE_FILTER_LABELS: Record<CloseFilter, string> = {
  all: 'Qualquer data',
  overdue: 'Vencido',
  week: 'Próximos 7 dias',
  month: 'Este mês',
  none: 'Sem previsão',
}

export function matchesOwner(deal: Pick<Deal, 'ownerUserId'>, owner: OwnerFilter): boolean {
  if (owner === 'all') return true
  if (owner === 'none') return !deal.ownerUserId
  return deal.ownerUserId === owner
}

/**
 * `expectedCloseAt` do negócio dentro da janela. "Vencido" só faz sentido para
 * negócio aberto (o ganho/perdido já fechou, a previsão deixou de valer).
 */
export function matchesCloseDate(
  deal: Pick<Deal, 'expectedCloseAt' | 'status'>,
  filter: CloseFilter,
  now: Date = new Date(),
): boolean {
  if (filter === 'all') return true
  if (filter === 'none') return !deal.expectedCloseAt
  if (!deal.expectedCloseAt) return false
  const t = diaDaPrevisao(deal.expectedCloseAt)?.getTime() ?? NaN
  if (!Number.isFinite(t)) return false
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  if (filter === 'overdue') return deal.status === 'open' && t < dayStart
  if (filter === 'week') return t >= dayStart && t < dayStart + 7 * 86_400_000
  // 'month': mês-calendário corrente
  const d = new Date(t)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export interface BoardSummary {
  total: number
  openCents: number
  wonMonthCents: number
}

/** "147 negócios · R$ … em aberto · R$ … ganhos no mês" — só do que está carregado. */
export function boardSummary(
  deals: ReadonlyArray<Pick<Deal, 'status' | 'amountCents' | 'closedAt'>>,
  now: Date = new Date(),
): BoardSummary {
  let openCents = 0
  let wonMonthCents = 0
  for (const d of deals) {
    if (d.status === 'open') openCents += d.amountCents ?? 0
    else if (d.status === 'won' && d.closedAt) {
      const c = new Date(d.closedAt)
      if (c.getFullYear() === now.getFullYear() && c.getMonth() === now.getMonth()) {
        wonMonthCents += d.amountCents ?? 0
      }
    }
  }
  return { total: deals.length, openCents, wonMonthCents }
}
