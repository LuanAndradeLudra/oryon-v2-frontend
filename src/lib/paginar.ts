/**
 * Fatia uma lista já carregada em páginas. A página pedida é presa ao
 * intervalo válido — a lista encolhe ao vivo (alguém assume uma conversa) e a
 * página da URL pode deixar de existir.
 */
export function paginar<T>(itens: ReadonlyArray<T>, pagina: number, porPagina: number) {
  const total = itens.length
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const atual = Math.min(Math.max(1, Math.floor(pagina) || 1), paginas)
  const inicio = (atual - 1) * porPagina
  return {
    itens: itens.slice(inicio, inicio + porPagina),
    pagina: atual,
    paginas,
    total,
    /** Posição (1-based) do primeiro e do último item da página. */
    de: total === 0 ? 0 : inicio + 1,
    ate: Math.min(inicio + porPagina, total),
  }
}

/** Lê `?param=` como número de página (1 quando ausente ou inválido). */
export function lerPagina(v: string | null): number {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : 1
}
