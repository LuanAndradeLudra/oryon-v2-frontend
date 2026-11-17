import type { Grafo } from '@/services/jornadas/tipos'

/**
 * ORY-60 — o número de cada passo ("2 · Lembrete da consulta"), na ordem em que
 * a pessoa encontra os passos a partir da Entrada (busca em largura, na ordem
 * das saídas). Passos soltos vêm no fim. É o que o canvas, o painel e a linha do
 * tempo usam para falar do mesmo passo (como fazem HubSpot, Zapier e monday).
 */
export function numerarPassos(graph: Grafo): Map<string, number> {
  const numeros = new Map<string, number>()
  const fila = graph.start && graph.nodes[graph.start] ? [graph.start] : []
  while (fila.length) {
    const id = fila.shift()!
    if (numeros.has(id) || !graph.nodes[id]) continue
    numeros.set(id, numeros.size + 1)
    for (const destino of Object.values(graph.nodes[id].outputs)) if (destino && !numeros.has(destino)) fila.push(destino)
  }
  for (const id of Object.keys(graph.nodes)) if (!numeros.has(id)) numeros.set(id, numeros.size + 1)
  return numeros
}
