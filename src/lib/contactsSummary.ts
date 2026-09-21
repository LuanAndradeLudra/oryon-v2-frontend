import type { Contact } from '@/types'

/** Chave do estado aberto/fechado do resumo — a página (ContactsPage) o guarda. */
export const STATS_COLLAPSE_KEY = 'crm-stats-collapsed'

/** Linha-resumo em texto — vai no tooltip do botão "Resumo" e no subtítulo da TopBar. */
export function contactsSummaryText(contacts: Contact[], total: number, stageCounts?: Record<string, number>): string {
  const withTags = contacts.filter((c) => (c.tags?.length ?? 0) > 0).length
  const withOptIn = contacts.filter((c) => c.optIn).length
  const byStage: Record<string, number> = stageCounts ? { ...stageCounts } : {}
  if (!stageCounts) contacts.forEach((c) => { const st = c.stage ?? 'lead'; byStage[st] = (byStage[st] ?? 0) + 1 })
  const top = Object.entries(byStage).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1])[0]
  const topLabel = top ? top[0].charAt(0).toUpperCase() + top[0].slice(1) : '—'
  return `${total.toLocaleString('pt-BR')} contatos · ${withOptIn} opt-in · ${withTags} c/ etiquetas · predominante ${topLabel}${top ? ` (${top[1].toLocaleString('pt-BR')})` : ''}`
}
