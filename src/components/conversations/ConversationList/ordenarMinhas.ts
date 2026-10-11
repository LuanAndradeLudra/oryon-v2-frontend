import type { Conversation } from '@/types'

/**
 * SCRUM-1253 (PO, 06/10 — D11): em "Minhas", as pendentes (aguardando você)
 * primeiro, a que espera há mais tempo no topo; o resto na ordem do servidor.
 *
 * Revisão 11/10: a ordenação reordenava a lista INTEIRA; ao carregar a página
 * 2, as pendentes dela pulavam para o topo e a lista sob o cursor andava.
 * Escolha: ordenar só a "cabeça" — tudo até o último item da 1ª carga, o que
 * inclui as linhas que o socket pôs na frente — e deixar a "cauda" (páginas
 * anexadas no fim por loadMore) na ordem do servidor. Nada que já está na
 * tela muda de lugar ao rolar; uma pendente da página 2 aparece onde chegou e
 * sobe para a seção de pendentes na próxima carga completa (troca de aba,
 * recarga). Sem ids da 1ª carga (ainda carregando), ordena tudo.
 */
export function ordenarMinhas(list: Conversation[], idsDaPrimeiraCarga: ReadonlySet<string>): Conversation[] {
  let corte = list.length
  if (idsDaPrimeiraCarga.size) {
    let ultimo = -1
    list.forEach((c, i) => { if (idsDaPrimeiraCarga.has(c.id)) ultimo = i })
    corte = ultimo + 1
  }
  const cabeca = list.slice(0, corte)
  const cauda = list.slice(corte)
  const espera = (c: Conversation) => new Date(c.lastMessageAt).getTime()
  const pend = cabeca.filter((c) => c.status === 'pending').sort((a, b) => espera(a) - espera(b))
  const resto = cabeca.filter((c) => c.status !== 'pending')
  return [...pend, ...resto, ...cauda]
}
