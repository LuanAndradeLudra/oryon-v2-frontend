import type { Catalogo, Condicao, GrupoDeCondicoes } from '@/services/jornadas/tipos'

/** As condições em palavras (E/OU, sem código), para o canvas e o painel. */

export const OPERADORES: { value: Condicao['op']; label: string; semValor?: boolean }[] = [
  { value: 'eq', label: 'é' },
  { value: 'neq', label: 'não é' },
  { value: 'contains', label: 'contém' },
  { value: 'not_contains', label: 'não contém' },
  { value: 'in', label: 'é um de' },
  { value: 'gt', label: 'maior que' },
  { value: 'lt', label: 'menor que' },
  { value: 'exists', label: 'está preenchido', semValor: true },
  { value: 'not_exists', label: 'está vazio', semValor: true },
]

export function valorEmTexto(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  return v === undefined || v === null ? '' : String(v)
}

export function frasesDasCondicoes(g: GrupoDeCondicoes, catalogo: Catalogo): string {
  if (g.conditions.length === 0) return 'Sem filtro: todo mundo que passar pela porta entra.'
  const partes = g.conditions.map((c) => {
    const campo = catalogo.conditionFields.find((f) => f.key === c.field)?.label ?? c.field
    const op = OPERADORES.find((o) => o.value === c.op)
    return op?.semValor ? `${campo} ${op.label}` : `${campo} ${op?.label ?? c.op} ${valorEmTexto(c.value)}`
  })
  return partes.join(g.mode === 'all' ? ' · e ' : ' · ou ')
}

