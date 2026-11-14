import type { Grafo } from './tipos'

/**
 * ORY-60 — o botão "Organizar": arruma o desenho em camadas, de cima para baixo,
 * na ordem das saídas de cada passo. O canvas continua livre; isto só evita que o
 * desenho vire "sopa" (o medo do plano de agosto).
 */

export const ID_DA_ENTRADA = '__entrada'
const LARGURA = 300
const ALTURA = 170
/** A caixa da Entrada é mais alta que um passo (portas, filtro, reentrada): fica acima do primeiro. */
export const Y_DA_ENTRADA = -190

export function organizar(grafo: Grafo): Grafo['layout'] {
  const nivel = new Map<string, number>()
  const ordemDosFilhos = new Map<number, string[]>()
  const fila: string[] = []
  if (grafo.start && grafo.nodes[grafo.start]) {
    nivel.set(grafo.start, 1)
    fila.push(grafo.start)
  }
  // Busca em largura: cada passo fica no primeiro nível em que é alcançado.
  while (fila.length) {
    const id = fila.shift()!
    const n = nivel.get(id)!
    const lista = ordemDosFilhos.get(n) ?? []
    lista.push(id)
    ordemDosFilhos.set(n, lista)
    for (const destino of Object.values(grafo.nodes[id]?.outputs ?? {})) {
      if (destino && grafo.nodes[destino] && !nivel.has(destino)) {
        nivel.set(destino, n + 1)
        fila.push(destino)
      }
    }
  }
  // Passos soltos vão para uma coluna à direita, para não sumirem.
  const soltos = Object.keys(grafo.nodes).filter((id) => !nivel.has(id))

  const larguraMaxima = Math.max(1, ...[...ordemDosFilhos.values()].map((l) => l.length))
  const centro = ((larguraMaxima - 1) * LARGURA) / 2
  const layout: Grafo['layout'] = { [ID_DA_ENTRADA]: { x: centro - 26, y: Y_DA_ENTRADA } }
  for (const [n, ids] of ordemDosFilhos) {
    const inicio = centro - ((ids.length - 1) * LARGURA) / 2
    ids.forEach((id, i) => { layout[id] = { x: inicio + i * LARGURA, y: n * ALTURA } })
  }
  soltos.forEach((id, i) => { layout[id] = { x: centro + (larguraMaxima / 2 + 1) * LARGURA, y: (i + 1) * ALTURA } })
  return layout
}
