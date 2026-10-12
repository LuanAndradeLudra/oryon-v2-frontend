/**
 * O RELÓGIO da demonstração.
 *
 * Tudo que tem hora na história é medido a partir de um instante fixo —
 * "agora", capturado uma vez quando o módulo carrega — e nunca de um horário
 * absoluto.
 *
 * Isso corrige um defeito que o PO viu na tela: cada linha da lista de
 * conversas estampava **"5h sem resposta"** em vermelho, e o card recém-movido
 * dizia **"5h na etapa"**, enquanto a demonstração mostrava a IA respondendo
 * na hora. Os horários eram fixos (09:14) e o visitante podia chegar a
 * qualquer momento do dia: às 14h, a mesma cena acusava cinco horas de
 * abandono.
 *
 * Com offsets em minutos, a conversa da história tem sempre poucos minutos, as
 * outras linhas têm minutos ou horas plausíveis, e o card que acabou de se
 * mover marca segundos na etapa — em qualquer horário, em qualquer fuso.
 */

/** O instante de referência. Um só por carregamento de página. */
const DEMO_NOW = Date.now()

/** ISO de `min` minutos antes do "agora" da demonstração. */
export function minutesAgo(min: number): string {
  return new Date(DEMO_NOW - min * 60_000).toISOString()
}

/** ISO de `h` horas antes. */
export function hoursAgo(h: number): string {
  return minutesAgo(h * 60)
}

/** ISO de `d` dias antes, preservando a hora do dia. */
export function daysAgo(d: number): string {
  return new Date(DEMO_NOW - d * 86_400_000).toISOString()
}

/** Agora. Para o que acabou de acontecer (o card que assentou na etapa). */
export function justNow(): string {
  return new Date(DEMO_NOW).toISOString()
}

/**
 * Um horário do dia, `d` dias atrás. Para o histórico: `daysAgo(1)` sozinho
 * carrega a HORA atual, e ontem acabava marcado 15:07 — o mesmo minuto das
 * mensagens de hoje, o que fazia a conversa parecer travada no tempo.
 */
export function dayAt(d: number, hour: number, minute: number): string {
  const x = new Date(DEMO_NOW - d * 86_400_000)
  x.setHours(hour, minute, 0, 0)
  return x.toISOString()
}
