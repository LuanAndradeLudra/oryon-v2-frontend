import type { Catalogo, NoDoGrafo, VersaoDaJornada } from './tipos'
import { passoDoCatalogo } from './catalogo'

/**
 * ORY-60 (P1 do benchmark, 16/11) — o que mudou no desenho entre duas versões:
 * passo novo, passo que mudou (e o quê) e passo que saiu, mais entrada, metas e
 * regras de envio. Alimenta a janela de publicar ("o que muda"), o destaque das
 * mudanças no canvas e a prévia do exemplo. Como o "View Changes" do Braze e o
 * "Publish Draft" do Iterable.
 *
 * O backend pode repetir a mesma conta no `publish` (a prévia traz `changes`).
 */

export type TipoDeMudanca = 'novo' | 'mudou' | 'saiu'

export interface MudancaNoPasso {
  tipo: TipoDeMudanca
  nodeId: string
  nome: string
  /** No "mudou": o que mudou, em palavras ("texto", "ligações", "se der erro"). */
  detalhes: string[]
}

export interface DiferencasDoDesenho {
  passos: MudancaNoPasso[]
  /** Mudanças fora dos passos: entrada, metas, regras de envio, primeiro passo. */
  outras: string[]
  total: number
}

/** JSON com as chaves em ordem: a ordem dos campos não conta como mudança. */
function estavel(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(estavel).join(',')}]`
  if (x && typeof x === 'object') {
    return `{${Object.keys(x as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${estavel((x as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(x ?? null)
}
const igual = (a: unknown, b: unknown) => estavel(a) === estavel(b)

export const nomeDoNo = (no: NoDoGrafo, catalogo: Catalogo) => no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type

export function diferencasDoDesenho(antes: VersaoDaJornada, depois: VersaoDaJornada, catalogo: Catalogo): DiferencasDoDesenho {
  const passos: MudancaNoPasso[] = []
  for (const [id, no] of Object.entries(depois.graph.nodes)) {
    const velho = antes.graph.nodes[id]
    if (!velho) { passos.push({ tipo: 'novo', nodeId: id, nome: nomeDoNo(no, catalogo), detalhes: [] }); continue }
    const detalhes: string[] = []
    if (velho.type !== no.type) detalhes.push('tipo')
    if ((velho.label ?? '') !== (no.label ?? '')) detalhes.push('nome')
    const campos = passoDoCatalogo(catalogo, no.type)?.params ?? []
    for (const k of new Set([...Object.keys(velho.params), ...Object.keys(no.params)])) {
      if (!igual(velho.params[k], no.params[k])) detalhes.push((campos.find((c) => c.key === k)?.label ?? k).toLowerCase())
    }
    if (!igual(velho.outputs, no.outputs)) detalhes.push('ligações')
    if (!igual(velho.onError ?? null, no.onError ?? null)) detalhes.push('se der erro')
    if (detalhes.length) passos.push({ tipo: 'mudou', nodeId: id, nome: nomeDoNo(no, catalogo), detalhes: [...new Set(detalhes)] })
  }
  for (const [id, no] of Object.entries(antes.graph.nodes)) {
    if (!depois.graph.nodes[id]) passos.push({ tipo: 'saiu', nodeId: id, nome: nomeDoNo(no, catalogo), detalhes: [] })
  }
  const outras: string[] = []
  if (antes.graph.start !== depois.graph.start && depois.graph.nodes[depois.graph.start ?? ''] && antes.graph.nodes[depois.graph.start ?? '']) outras.push('O primeiro passo depois da entrada mudou.')
  if (!igual(antes.entry, depois.entry)) outras.push('A entrada mudou (portas, quem pode entrar ou reentrada).')
  if (!igual(antes.goals, depois.goals)) outras.push('Metas, saídas automáticas ou prazo mudaram.')
  if (!igual(antes.rules ?? null, depois.rules ?? null)) outras.push('Horários de envio ou limites mudaram.')
  return { passos, outras, total: passos.length + outras.length }
}

/** As mudanças em frases curtas, para a prévia de publicar e a lista de versões. */
export function frasesDasDiferencas(d: DiferencasDoDesenho): string[] {
  const frases = d.passos.map((m) =>
    m.tipo === 'novo' ? `Passo novo: “${m.nome}”.`
      : m.tipo === 'saiu' ? `Saiu: “${m.nome}”.`
        : `Mudou “${m.nome}”: ${m.detalhes.join(', ')}.`)
  return [...frases, ...d.outras]
}
