// ─── Rótulos de tempo do trilho ────────────────────────────────────────────
// O `agora` sempre entra por parâmetro (nunca `new Date()` aqui dentro), para
// que o trilho, a contagem regressiva e os testes falem da mesma referência.
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AgendaBucket, AgendaItem } from './agendaGrouping'

export interface RailLabel {
  primary: string
  secondary: string
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/**
 * "em 25 min" / "em 1h 59" / "em 5 dias". Deliberadamente sem segundos e sem
 * "menos de um minuto": o polling é de 20 s, então precisão abaixo disso seria
 * um número que a tela não consegue manter honesto.
 */
export function relativeToNow(target: Date, now: Date): string {
  const delta = target.getTime() - now.getTime()
  const ahead = delta >= 0
  const abs = Math.abs(delta)

  let body: string
  if (abs < MIN) {
    body = 'menos de 1 min'
  } else if (abs < HOUR) {
    body = `${Math.floor(abs / MIN)} min`
  } else if (abs < DAY) {
    const h = Math.floor(abs / HOUR)
    const m = Math.floor((abs % HOUR) / MIN)
    body = m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`
  } else {
    const d = Math.round(abs / DAY)
    body = `${d} ${d === 1 ? 'dia' : 'dias'}`
  }

  return ahead ? `em ${body}` : `há ${body}`
}

/**
 * O par que o trilho mostra à esquerda do cartão (`.tm` no mockup).
 * - hoje/futuro: `18:00` + o estado ou a contagem regressiva
 * - anteriores:  `qua 2` + `10:30` (o grupo é um só, então o dia vem no trilho)
 * - sem data:    `—` + `sem hora`
 */
export function railLabel(item: AgendaItem, bucket: AgendaBucket, now: Date): RailLabel {
  const { at, campaign } = item

  if (!at) return { primary: '—', secondary: 'sem hora' }

  if (bucket === 'past') {
    return {
      primary: format(at, 'EEE d', { locale: ptBR }),
      secondary: format(at, 'HH:mm'),
    }
  }

  const time = format(at, 'HH:mm')

  // Agendada que ainda não chegou: a contagem regressiva diz mais que o
  // rótulo do status, que o chip do cartão já mostra.
  if (campaign.status === 'scheduled' && at > now) {
    return { primary: time, secondary: relativeToNow(at, now) }
  }

  return { primary: time, secondary: statusWord(campaign.status) }
}

function statusWord(status: AgendaItem['campaign']['status']): string {
  switch (status) {
    case 'sent':      return 'enviada'
    case 'sending':   return 'enviando'
    case 'paused':    return 'pausada'
    case 'failed':    return 'falhou'
    case 'cancelled': return 'cancelada'
    case 'scheduled': return 'agendada'
    case 'draft':     return 'rascunho'
  }
}
