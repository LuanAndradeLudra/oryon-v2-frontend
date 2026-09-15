import { resolveRange, type DateRangePreset } from './dateRange'
import type { ConversationFilters } from '@/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Mutually-exclusive handling filter — collapses the (assignedTo × aiHandling)
// matrix into a single radio. 'team' covers both "Sem atribuição" and a
// specific colleague (the exact pick lives in filters.assignedTo).
export type HandlingFilterValue = 'all' | 'ai' | 'paused' | 'me' | 'team'

export function resolveHandlingValue(f: ConversationFilters): HandlingFilterValue {
  if (f.aiHandling === 'active') return 'ai'
  if (f.aiHandling === 'paused') return 'paused'
  if (f.assignedTo === 'me') return 'me'
  if (f.assignedTo === 'unassigned') return 'team'
  if (f.assignedTo && f.assignedTo !== 'all' && UUID_REGEX.test(f.assignedTo)) return 'team'
  return 'all'
}

// Which period preset is currently applied, derived from the start boundary so
// the controls stay in sync even when the parent swaps the filters object.
export function resolveActivePeriod(f: ConversationFilters): DateRangePreset {
  if (!f.startDate) return 'today'
  if (f.startDate === resolveRange('today').startDate) return 'today'
  if (f.startDate === resolveRange('yesterday').startDate) return 'yesterday'
  if (f.startDate === resolveRange('last7').startDate) return 'last7'
  return 'custom'
}
