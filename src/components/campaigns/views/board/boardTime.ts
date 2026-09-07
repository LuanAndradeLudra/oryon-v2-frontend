// ─── Quando, dito dentro do cartão ─────────────────────────────────────────
// Na Agenda o relógio vinha do TRILHO, fora do cartão. O Board não tem trilho:
// as colunas são status, não tempo, então cada cartão carrega o seu quando.
// O `agora` entra por parâmetro, como no `agendaTime` — nunca `new Date()`
// aqui dentro.
import { format, differenceInCalendarDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * "hoje · 20:30", "amanhã · 09:00", "ontem · 18:00", "ter 8 · 18:00".
 *
 * Dias de CALENDÁRIO, como no `agendaTime`: a linha aparece do lado de uma
 * contagem regressiva, e as duas não podem discordar sobre que dia é.
 * `EEEEEE`, não `EEE`: em ptBR o date-fns devolve "terça" para `EEE`, e só a
 * forma de 6 letras dá o "ter" de 3 que o mockup usa.
 */
export function boardWhen(at: Date, now: Date): string {
  const hora = format(at, 'HH:mm')
  switch (differenceInCalendarDays(at, now)) {
    case 0:  return `hoje · ${hora}`
    case 1:  return `amanhã · ${hora}`
    case -1: return `ontem · ${hora}`
    default: return `${format(at, 'EEEEEE d', { locale: ptBR })} · ${hora}`
  }
}

/** A data que o cartão mostra, por status. `null` quando a campanha não tem nenhuma. */
export function whenOf(c: { sentAt?: string; scheduledAt?: string; createdAt?: string }): Date | null {
  const raw = c.sentAt ?? c.scheduledAt ?? c.createdAt
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}
