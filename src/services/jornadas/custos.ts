import type { Catalogo, Grafo } from './tipos'
import { passoDoCatalogo } from './catalogo'

/**
 * ORY-60 — o custo de uma inscrição, para a barra do desenho e a simulação.
 *
 * A tarifa da Meta depende da categoria do modelo e do país; aqui vale a média
 * usada na estimativa (o backend devolve o valor real na prévia da publicação).
 */
export const TARIFA_MEDIA_DA_META_BRL = 0.08

export interface CustoPorInscricao {
  /** Modelos enviados no caminho mais caro. */
  modelos: number
  /** Créditos de IA no caminho mais caro. */
  creditos: number
  /** Estimativa da tarifa da Meta (R$) no caminho mais caro. */
  reais: number
}

/** O pior caminho a partir do primeiro passo: o que mais envia modelo (empate: o que mais gasta IA). Ciclos contam uma vez. */
export function custoPorInscricao(graph: Grafo, catalogo: Catalogo): CustoPorInscricao {
  const memo = new Map<string, { modelos: number; creditos: number }>()
  const visitando = new Set<string>()
  const pior = (id: string | null | undefined): { modelos: number; creditos: number } => {
    if (!id || !graph.nodes[id]) return { modelos: 0, creditos: 0 }
    const pronto = memo.get(id)
    if (pronto) return pronto
    if (visitando.has(id)) return { modelos: 0, creditos: 0 }
    visitando.add(id)
    const no = graph.nodes[id]
    let melhor = { modelos: 0, creditos: 0 }
    for (const destino of Object.values(no.outputs)) {
      const r = pior(destino)
      if (r.modelos > melhor.modelos || (r.modelos === melhor.modelos && r.creditos > melhor.creditos)) melhor = r
    }
    visitando.delete(id)
    const total = {
      modelos: melhor.modelos + (no.type === 'send_template' ? 1 : 0),
      creditos: melhor.creditos + (passoDoCatalogo(catalogo, no.type)?.cost.credits ?? 0),
    }
    memo.set(id, total)
    return total
  }
  const r = pior(graph.start)
  return { ...r, reais: Math.round(r.modelos * TARIFA_MEDIA_DA_META_BRL * 100) / 100 }
}
