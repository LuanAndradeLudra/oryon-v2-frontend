import type { Grafo } from './tipos'

/**
 * ORY-60 — o botão "Organizar": arruma o desenho em camadas, de cima para baixo.
 *
 * - Cada passo fica na camada em que é alcançado primeiro (busca em largura).
 * - Dentro da camada, cada passo tenta ficar centrado abaixo de quem leva a ele
 *   (média dos "pais"), na ordem das saídas; depois os cartões são empurrados
 *   para não se sobreporem.
 * - Usa o tamanho real de cada cartão (`medida`), então cartões largos (várias
 *   saídas) e altos (com contadores) não se encostam.
 *
 * O canvas continua livre; isto só evita que o desenho vire "sopa".
 */

export const ID_DA_ENTRADA = '__entrada'
const VAO_X = 56
const VAO_Y = 72

export type Medida = (id: string) => { w: number; h: number }

export function organizar(grafo: Grafo, medida: Medida): Grafo['layout'] {
  const nivel = new Map<string, number>()
  const camadas: string[][] = []
  const pais = new Map<string, string[]>()
  const fila: string[] = []
  if (grafo.start && grafo.nodes[grafo.start]) {
    nivel.set(grafo.start, 0)
    fila.push(grafo.start)
    pais.set(grafo.start, [ID_DA_ENTRADA])
  }
  while (fila.length) {
    const id = fila.shift()!
    const n = nivel.get(id)!
    ;(camadas[n] ??= []).push(id)
    for (const destino of Object.values(grafo.nodes[id]?.outputs ?? {})) {
      if (!destino || !grafo.nodes[destino]) continue
      if (!nivel.has(destino)) {
        nivel.set(destino, n + 1)
        fila.push(destino)
      }
      if ((nivel.get(destino) ?? 0) > n) pais.set(destino, [...(pais.get(destino) ?? []), id])
    }
  }

  const layout: Grafo['layout'] = {}
  const centro = new Map<string, number>()
  const entrada = medida(ID_DA_ENTRADA)
  layout[ID_DA_ENTRADA] = { x: -entrada.w / 2, y: 0 }
  centro.set(ID_DA_ENTRADA, 0)

  let y = entrada.h + VAO_Y
  for (const camada of camadas) {
    // centro desejado = média dos pais já posicionados
    const desejado = camada.map((id, ordem) => {
      const ps = (pais.get(id) ?? []).filter((p) => centro.has(p))
      const c = ps.length ? ps.reduce((s, p) => s + centro.get(p)!, 0) / ps.length : 0
      return { id, c, ordem, w: medida(id).w, h: medida(id).h }
    })
    desejado.sort((a, b) => a.c - b.c || a.ordem - b.ordem)
    // empurra para a direita para não sobrepor
    let direita = -Infinity
    const xs = desejado.map((d) => {
      const x = Math.max(d.c - d.w / 2, direita + VAO_X)
      direita = x + d.w
      return x
    })
    // recentra a camada em torno da média desejada
    const deslocamento = desejado.reduce((s, d, i) => s + (d.c - (xs[i] + d.w / 2)), 0) / desejado.length
    let alturaDaCamada = 0
    desejado.forEach((d, i) => {
      const x = xs[i] + deslocamento
      layout[d.id] = { x, y }
      centro.set(d.id, x + d.w / 2)
      alturaDaCamada = Math.max(alturaDaCamada, d.h)
    })
    y += alturaDaCamada + VAO_Y
  }

  // Passos soltos (nada chega até eles): uma coluna à direita, para não sumirem.
  const soltos = Object.keys(grafo.nodes).filter((id) => !nivel.has(id))
  const maiorX = Math.max(entrada.w / 2, ...Object.entries(layout).map(([id, p]) => p.x + medida(id).w))
  let ySolto = entrada.h + VAO_Y
  for (const id of soltos) {
    layout[id] = { x: maiorX + VAO_X * 2, y: ySolto }
    ySolto += medida(id).h + VAO_Y / 2
  }
  return layout
}

/** Algum cartão encosta em outro? (para arrumar sozinho um desenho antigo) */
export function haSobreposicao(layout: Grafo['layout'], medida: Medida): boolean {
  const caixas = Object.entries(layout).map(([id, p]) => ({ ...p, ...medida(id) }))
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i], b = caixas[j]
      if (a.x < b.x + b.w + 8 && b.x < a.x + a.w + 8 && a.y < b.y + b.h + 8 && b.y < a.y + a.h + 8) return true
    }
  }
  return false
}
