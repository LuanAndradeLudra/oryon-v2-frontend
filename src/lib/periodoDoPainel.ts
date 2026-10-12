import type { DateRange } from '@/types/dashboard'

/**
 * Período da aba Relatórios do Dashboard (28/09).
 *
 * O backend de `developer` aceita `?range=today|7d|30d|month` em `/home/stats`
 * e `/home/snapshot` (A-71). Nem tudo segue o período, porém — parte da tela é
 * estado atual, janela fixa ou histórico inteiro, e isso não se resolve no
 * frontend. Em vez de fingir que filtra, cada cartão diz o próprio recorte
 * (`ESCOPO`); o que segue o período não precisa de etiqueta: vale o seletor.
 */

export const PERIODOS: ReadonlyArray<{ value: DateRange; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'month', label: 'Este mês' },
]

export const PERIODO_PADRAO: DateRange = '7d'

export function lerPeriodo(v: string | null): DateRange {
  return PERIODOS.some((p) => p.value === v) ? (v as DateRange) : PERIODO_PADRAO
}

/** "hoje" · "nos últimos 7 dias" · "neste mês" — para frases. */
export function periodoPorExtenso(p: DateRange): string {
  switch (p) {
    case 'today': return 'hoje'
    case '7d': return 'nos últimos 7 dias'
    case '30d': return 'nos últimos 30 dias'
    case 'month': return 'neste mês'
  }
}

/** O recorte de quem NÃO segue o período. */
export const ESCOPO = {
  agora: 'agora',
  historico: 'todo o histórico',
  seteDias: 'últimos 7 dias',
  quatroHoras: 'últimas 4 h',
} as const

/**
 * K11/K9 (release 2026-09-29): o backend manda o volume já no período pedido e
 * em dias de Brasília — o front não recorta nem escolhe balde.
 */
export function volumeSeguePeriodo(_p: DateRange): boolean {
  return true
}
