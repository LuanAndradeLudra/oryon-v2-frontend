// ─── Agrupamento do fluxo da Agenda ────────────────────────────────────────
// Função pura: `Campaign[]` → grupos de dia, na ordem em que o fluxo vertical
// os desenha. Sem React, sem rede, sem `new Date()` implícito — o "agora"
// entra por parâmetro, que é o que torna a linha AGORA e as contagens
// regressivas testáveis.
import { format, isSameDay, startOfDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Campaign } from '@/types'

export type AgendaBucket = 'today' | 'future' | 'past' | 'undated'

export interface AgendaItem {
  campaign: Campaign
  /** `sentAt ?? scheduledAt`, ou `null` num rascunho que ainda não tem data. */
  at: Date | null
}

export interface DayGroup {
  key: string
  date: Date | null
  label: string
  sublabel: string
  bucket: AgendaBucket
  items: AgendaItem[]
  /**
   * Soma de `stats.total` — só dos itens em que esse número é REAL (campanha
   * já enviada ou em envio). `null` quando nenhum item do dia tem número real:
   * o cabeçalho então mostra só "N disparos", nunca "0 mensagens".
   * Campanha agendada não sabe quantos contatos vai atingir até o envio
   * (`stats` nasce `{}`), e somar estimativa com número medido na mesma frase
   * seria inventar precisão que não existe.
   */
  realMessages: number | null
}

/** Data em que a campanha acontece (ou aconteceu). */
export function executionDate(c: Campaign): Date | null {
  const raw = c.sentAt ?? c.scheduledAt
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** `stats.total` só conta como número real depois que o envio começou. */
function realTotalOf(c: Campaign): number | null {
  if (c.status !== 'sent' && c.status !== 'sending' && c.status !== 'paused') return null
  const total = c.stats?.total
  return typeof total === 'number' && total > 0 ? total : null
}

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function futureLabel(date: Date, now: Date): { label: string; sublabel: string } {
  const today = startOfDay(now)
  if (isSameDay(date, addDays(today, 1))) {
    return {
      label: 'Amanhã',
      sublabel: `${weekdayShort(date)}, ${format(date, "d 'de' MMMM", { locale: ptBR })}`,
    }
  }
  return {
    // Dia da semana capitalizado e curto ("Terça", "Sábado"), data completa
    // embaixo — o par exato do mockup.
    label: capitalize(weekdayShort(date)),
    sublabel: format(date, "d 'de' MMMM", { locale: ptBR }),
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "terça-feira" → "terça". O mockup usa a forma curta nos cabeçalhos. */
function weekdayShort(date: Date): string {
  return format(date, 'EEEE', { locale: ptBR }).replace(/-feira$/, '')
}

/**
 * Ordem dos grupos: hoje → futuro crescente → "Anteriores" (um grupo só, mais
 * recente primeiro, como no mockup) → "Sem data".
 *
 * Rascunho sem data cai em "Sem data", não em hoje: pôr no dia de hoje uma
 * campanha que não tem data marcada é afirmar um compromisso que ninguém
 * marcou.
 */
export function groupByDay(campaigns: Campaign[], now: Date): DayGroup[] {
  const today = startOfDay(now)
  const todayItems: AgendaItem[] = []
  const undatedItems: AgendaItem[] = []
  const pastItems: AgendaItem[] = []
  const futureByDay = new Map<string, AgendaItem[]>()

  for (const campaign of campaigns) {
    const at = executionDate(campaign)
    const item: AgendaItem = { campaign, at }
    if (!at) { undatedItems.push(item); continue }
    if (isSameDay(at, today)) { todayItems.push(item); continue }
    if (at < today) { pastItems.push(item); continue }
    const key = dayKey(at)
    const bucket = futureByDay.get(key)
    if (bucket) bucket.push(item)
    else futureByDay.set(key, [item])
  }

  const byTimeAsc = (a: AgendaItem, b: AgendaItem) =>
    (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0)

  const groups: DayGroup[] = []

  if (todayItems.length > 0) {
    todayItems.sort(byTimeAsc)
    groups.push(makeGroup({
      key: dayKey(today),
      date: today,
      label: 'Hoje',
      sublabel: `${weekdayShort(today)}, ${format(today, "d 'de' MMMM", { locale: ptBR })}`,
      bucket: 'today',
      items: todayItems,
    }))
  }

  for (const key of [...futureByDay.keys()].sort()) {
    const items = futureByDay.get(key)!.sort(byTimeAsc)
    const date = startOfDay(items[0].at!)
    const { label, sublabel } = futureLabel(date, now)
    groups.push(makeGroup({ key, date, label, sublabel, bucket: 'future', items }))
  }

  if (pastItems.length > 0) {
    pastItems.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
    groups.push(makeGroup({
      key: 'past',
      date: null,
      label: 'Anteriores',
      sublabel: 'mais recentes primeiro',
      bucket: 'past',
      items: pastItems,
    }))
  }

  if (undatedItems.length > 0) {
    groups.push(makeGroup({
      key: 'undated',
      date: null,
      label: 'Sem data',
      sublabel: 'rascunhos sem horário definido',
      bucket: 'undated',
      items: undatedItems,
    }))
  }

  return groups
}

function makeGroup(base: Omit<DayGroup, 'realMessages'>): DayGroup {
  let sum = 0
  let any = false
  for (const item of base.items) {
    const real = realTotalOf(item.campaign)
    if (real !== null) { sum += real; any = true }
  }
  return { ...base, realMessages: any ? sum : null }
}

/**
 * Onde a linha AGORA entra dentro do grupo de hoje: índice do primeiro item
 * cujo horário ainda não chegou. Se tudo no dia já passou, vai para o fim
 * (o dia acabou); se o grupo não é o de hoje, não há linha.
 */
export function nowLineIndex(group: DayGroup, now: Date): number | null {
  if (group.bucket !== 'today' || group.items.length === 0) return null
  const i = group.items.findIndex((item) => item.at !== null && item.at > now)
  return i === -1 ? group.items.length : i
}
