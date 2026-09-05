// ─── O insight da coluna esquerda ──────────────────────────────────────────
// O mockup mostra "3 disparos entre 18h e 21h para bases que se sobrepõem em
// 41%". A concentração de horário é computável aqui; a SOBREPOSIÇÃO de
// públicos não é — segmento é definição, não lista resolvida, e cruzar isso
// exigiria BE.3 + BE.1. Decisão 8 do Maestro: fica a metade computável, com o
// rascunho parado como segunda opção quando não há concentração.
import { format, isSameDay, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Campaign } from '@/types'
import { executionDate } from './agendaGrouping'

export interface AgendaInsight {
  title: string
  description: string
}

/** Quantos disparos numa mesma janela de horas antes de virar aviso. */
const CROWD_MIN = 3
const CROWD_WINDOW_HOURS = 4
const STALE_DRAFT_DAYS = 7

export function buildInsight(campaigns: Campaign[], now: Date): AgendaInsight | null {
  return crowdedDayInsight(campaigns, now) ?? staleDraftInsight(campaigns, now)
}

/**
 * Dia com N ou mais disparos agendados dentro de uma janela de poucas horas.
 * Só olha para a frente: avisar sobre um aperto que já passou não muda nada.
 */
function crowdedDayInsight(campaigns: Campaign[], now: Date): AgendaInsight | null {
  const upcoming = campaigns
    .filter((c) => c.status === 'scheduled')
    .map((c) => ({ c, at: executionDate(c) }))
    .filter((x): x is { c: Campaign; at: Date } => x.at !== null && x.at > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  const byDay = new Map<string, Date[]>()
  for (const { at } of upcoming) {
    const key = format(at, 'yyyy-MM-dd')
    const list = byDay.get(key)
    if (list) list.push(at)
    else byDay.set(key, [at])
  }

  for (const [, times] of byDay) {
    if (times.length < CROWD_MIN) continue
    // Janela deslizante: o aperto é N disparos dentro de X horas, não N
    // disparos espalhados pelo dia inteiro.
    for (let i = 0; i + CROWD_MIN - 1 < times.length; i++) {
      const first = times[i]
      if (!withinWindow(first, times[i + CROWD_MIN - 1])) continue
      // `CROWD_MIN` é o GATILHO, não a medição: achada a janela, ela se estende
      // enquanto os próximos disparos couberem nas mesmas X horas, e o aviso
      // reporta a contagem e o último horário REAIS. Parar no 3º subdimensiona
      // o aperto que o próprio card detectou, e subdimensionar é a direção ruim:
      // quem lê acha que o resto do dia está livre e agenda mais um bem ali.
      let end = i + CROWD_MIN - 1
      while (end + 1 < times.length && withinWindow(first, times[end + 1])) end++
      const last = times[end]
      const count = end - i + 1
      const dayLabel = isSameDay(first, now)
        ? 'Hoje'
        : format(first, 'EEEE', { locale: ptBR })
      return {
        title: `${capitalize(dayLabel)} está carregada`,
        description: `${count} disparos entre ${format(first, 'HH')}h e ${format(last, 'HH')}h. Vale escalonar um deles para outro dia.`,
      }
    }
  }
  return null
}

/** Rascunho esquecido — a segunda melhor opção quando não há aperto de horário. */
function staleDraftInsight(campaigns: Campaign[], now: Date): AgendaInsight | null {
  const stale = campaigns
    .filter((c) => c.status === 'draft')
    .map((c) => ({ c, days: differenceInCalendarDays(now, new Date(c.createdAt)) }))
    .filter((x) => Number.isFinite(x.days) && x.days >= STALE_DRAFT_DAYS)
    .sort((a, b) => b.days - a.days)

  if (stale.length === 0) return null
  const [oldest] = stale
  const n = stale.length
  return {
    title: n === 1 ? 'Um rascunho parado' : `${n} rascunhos parados`,
    description: n === 1
      ? `"${oldest.c.name}" está sem mexer há ${oldest.days} dias. Ou vira disparo, ou vale descartar.`
      : `O mais antigo, "${oldest.c.name}", está sem mexer há ${oldest.days} dias.`,
  }
}

function withinWindow(first: Date, at: Date): boolean {
  return (at.getTime() - first.getTime()) / 3_600_000 <= CROWD_WINDOW_HOURS
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
