// ─── Pontos de densidade do mini-calendário ────────────────────────────────
// Função pura: `Campaign[]` → por dia, até 3 pontos coloridos + o total real
// do dia. O teto de 3 é do mockup (`.mcal .d .dots`, 3 pontos de 4px); acima
// disso os status de menor urgência somem do calendário, mas o total continua
// no `aria-label` do dia — quem usa leitor de tela ouve "4 disparos" mesmo
// vendo 3 pontos.
import { format } from 'date-fns'
import type { Campaign } from '@/types'
import type { CampaignStatus } from '@/types'
import { executionDate } from './agendaGrouping'
import { statusColor, statusRank } from './agendaStatus'

export const MAX_DOTS = 3

export interface DayDensity {
  /** Cores já resolvidas (tokens CSS), no máximo `MAX_DOTS`. */
  colors: string[]
  /** Quantas campanhas o dia tem no total — pode ser maior que `colors`. */
  total: number
  /** Status distintos do dia, ordenados por urgência. */
  statuses: CampaignStatus[]
}

/**
 * Chaveado por `yyyy-MM-dd` da data de execução. Rascunho sem data não entra
 * no calendário — não há dia onde pintá-lo.
 */
export function densityByDay(campaigns: Campaign[], max = MAX_DOTS): Map<string, DayDensity> {
  const buckets = new Map<string, { statuses: Set<CampaignStatus>; total: number }>()

  for (const c of campaigns) {
    const at = executionDate(c)
    if (!at) continue
    const key = format(at, 'yyyy-MM-dd')
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.statuses.add(c.status)
      bucket.total += 1
    } else {
      buckets.set(key, { statuses: new Set([c.status]), total: 1 })
    }
  }

  const out = new Map<string, DayDensity>()
  for (const [key, bucket] of buckets) {
    const statuses = [...bucket.statuses].sort((a, b) => statusRank(a) - statusRank(b))
    out.set(key, {
      statuses,
      total: bucket.total,
      colors: statuses.slice(0, max).map(statusColor),
    })
  }
  return out
}

/** Texto do `aria-label` da célula do dia — o que o calendário diz em voz. */
export function dayAriaLabel(dayLabel: string, density: DayDensity | undefined): string {
  if (!density || density.total === 0) return `${dayLabel}, sem disparos`
  const n = density.total
  return `${dayLabel}, ${n} ${n === 1 ? 'disparo' : 'disparos'}`
}
