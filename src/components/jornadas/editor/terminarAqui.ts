import type { VersaoDaJornada } from '@/services/jornadas/tipos'

/**
 * ORY-60 (P2, 17/11): um caminho vazio termina ali, com um passo "Sair" cujo motivo vem
 * da lista padronizada, lido pelo caminho ("Sem resposta", "Recusou"). No respond.io,
 * ramo vazio já encerra; aqui fica explícito no desenho, para a pessoa ver onde a jornada acaba.
 */
export function terminarAqui(versao: VersaoDaJornada, caminhos: { origem: string; saida: string; motivo: string; codigo?: string }[]): VersaoDaJornada {
  const nodes = { ...versao.graph.nodes }
  const layout = { ...versao.graph.layout }
  caminhos.forEach(({ origem, saida, motivo, codigo }, i) => {
    const no = nodes[origem]
    if (!no || no.outputs[saida]) return
    let id = `n_sair_${Math.random().toString(36).slice(2, 7)}`
    while (nodes[id]) id = `n_sair_${Math.random().toString(36).slice(2, 7)}`
    nodes[id] = { type: 'exit', params: { reasonCode: codigo ?? (motivo ? 'other' : 'end'), reason: motivo || 'Fim do caminho' }, outputs: {} }
    nodes[origem] = { ...no, outputs: { ...no.outputs, [saida]: id } }
    const pos = layout[origem] ?? { x: 0, y: 0 }
    layout[id] = { x: pos.x + (i - (caminhos.length - 1) / 2) * 300, y: pos.y + 200 }
  })
  return { ...versao, graph: { ...versao.graph, nodes, layout } }
}
