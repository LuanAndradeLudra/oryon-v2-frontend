/**
 * Previsão de fechamento (`expectedCloseAt`) é uma DATA de calendário, gravada
 * como meia-noite UTC (`2026-10-02T00:00:00Z`). Revisão 02/10: lida com
 * `new Date()` no fuso do Brasil (UTC−3) virava 01/10 21h — a lista mostrava
 * um dia antes, "Previsão vencida" acendia no próprio dia e a previsão de 01/11
 * contava em "Este mês" de outubro. Leia sempre pela parte de data.
 */
export function diaDaPrevisao(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** "02/10" — dia e mês da previsão, sem deslocamento de fuso. */
export function previsaoCurta(iso: string | null | undefined): string | null {
  return diaDaPrevisao(iso)?.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) ?? null
}
