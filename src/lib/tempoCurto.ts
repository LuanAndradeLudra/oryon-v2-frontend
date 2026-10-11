// Tempo curto da lista de conversas (SCRUM-1253, PO 06/10): data relativa no
// padrão do mercado e espera em degraus — fim do "30/09/2026" em toda linha e
// das dezenas de "sem resposta" em vermelho.
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Data da lista no padrão do mercado: 14:32 · Ontem · seg · 30 set · 30 set 2025. */
export function dataCurta(iso: string, agora = Date.now()): string {
  const d = new Date(iso)
  const hoje = new Date(agora)
  const meiaNoite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
  const t = d.getTime()
  if (t >= meiaNoite) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (t >= meiaNoite - 86_400_000) return 'Ontem'
  if (t >= meiaNoite - 6 * 86_400_000) return DIAS[d.getDay()]
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`
  return d.getFullYear() === hoje.getFullYear() ? base : `${base} ${d.getFullYear()}`
}

/** Espera em uma unidade só: 12 min · 3 h · 6 d. */
export function esperaCurta(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`
  if (min < 1440) return `${Math.floor(min / 60)} h`
  return `${Math.floor(min / 1440)} d`
}

/**
 * Urgência em degraus (fim da fadiga de alarme): até 15 min neutro, até 1 h
 * âmbar, depois um PONTO vermelho com texto neutro — o vermelho marca, não grita.
 */
export function tomDaEspera(min: number): 'neutro' | 'atencao' | 'atrasada' {
  if (min < 15) return 'neutro'
  if (min < 60) return 'atencao'
  return 'atrasada'
}
