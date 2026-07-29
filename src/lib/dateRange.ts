/**
 * Period filter helpers — resolve "today", "yesterday", "last 7 days" and
 * "custom" ranges aligned to America/Sao_Paulo (BRT, UTC-3) regardless of the
 * browser's local timezone.
 *
 * We use `Intl.DateTimeFormat` to read the current date in São Paulo and then
 * construct UTC instants for that day's 00:00 BRT. The 03:00 UTC offset is
 * fixed because Brazil abolished DST in 2019; if it ever returns, swap the
 * hardcoded offset for a `timeZoneName` parse step.
 */

export type DateRangePreset = 'today' | 'yesterday' | 'last7' | 'custom'

export interface ResolvedRange {
  startDate?: string
  endDate?: string
}

/** Returns 00:00:00 of the given day (default: today) in America/Sao_Paulo,
 *  expressed as a UTC Date. The end of the same day is just startOfBrasiliaDay + 24h. */
function startOfBrasiliaDay(refDate: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(refDate)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  // 00:00 BRT = 03:00 UTC. Hardcoded because Brazil has no DST since 2019.
  return new Date(`${get('year')}-${get('month')}-${get('day')}T03:00:00.000Z`)
}

const DAY_MS = 24 * 60 * 60 * 1000

export function resolveRange(
  preset: DateRangePreset,
  customStart?: Date,
  customEnd?: Date,
): ResolvedRange {
  const todayStart = startOfBrasiliaDay()
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS)

  switch (preset) {
    case 'today':
      return { startDate: todayStart.toISOString(), endDate: tomorrowStart.toISOString() }
    case 'yesterday': {
      const yesterdayStart = new Date(todayStart.getTime() - DAY_MS)
      return { startDate: yesterdayStart.toISOString(), endDate: todayStart.toISOString() }
    }
    case 'last7': {
      // Last 7 days inclusive of today: from 6 days ago 00:00 BRT through end of today.
      const start = new Date(todayStart.getTime() - 6 * DAY_MS)
      return { startDate: start.toISOString(), endDate: tomorrowStart.toISOString() }
    }
    case 'custom': {
      if (!customStart || !customEnd) return {}
      // Normalize the picked dates to BRT day boundaries: customStart at 00:00,
      // customEnd at the start of the day AFTER its selected date (exclusive).
      const start = startOfBrasiliaDay(customStart)
      const endDayStart = startOfBrasiliaDay(customEnd)
      const end = new Date(endDayStart.getTime() + DAY_MS)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }
  }
}

/**
 * Which period chip should render as active, derived from the `startDate`
 * actually applied to the query.
 *
 * Returns `null` when NO period filter is applied. That state is reachable in
 * practice: ConversationsPage clears the range when restoring a conversation
 * from `?id=` (an external CRM link, or a notification) so a conversation
 * outside the current period still surfaces in the list.
 *
 * This used to fall back to `'today'` whenever `startDate` was absent, which
 * made the strip claim "Hoje" while the list actually spanned every period —
 * the operator reads a filter that isn't applied. An unlit strip is the honest
 * rendering of "no period narrowing".
 */
export function resolveActivePreset(startDate?: string): DateRangePreset | null {
  if (!startDate) return null
  if (startDate === resolveRange('today').startDate) return 'today'
  if (startDate === resolveRange('yesterday').startDate) return 'yesterday'
  if (startDate === resolveRange('last7').startDate) return 'last7'
  return 'custom'
}
