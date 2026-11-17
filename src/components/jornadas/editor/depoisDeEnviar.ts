import type { ApoioDoEditor, Catalogo, NoDoGrafo, VersaoDaJornada } from '@/services/jornadas/tipos'
import { saidasDoNo } from '@/services/jornadas/catalogo'
import { chaveDoDado } from '@/services/jornadas/validar'

/**
 * ORY-60 (P1, 17/11): UM jeito de mandar uma mensagem e seguir pela resposta.
 * O "Enviar modelo" pergunta "E depois de enviar?":
 *  - `seguir`: só envia e vai para o próximo passo (tipo `send_template`);
 *  - `esperar`: espera a resposta, um caminho por botão + "escreveu outra coisa"
 *    + "não respondeu" (tipo `send_and_wait`, com a conversa segura);
 *  - `status`: segue pelo que a pessoa fez com a mensagem (o `send_template`
 *    ganha logo depois um `branch_message_status` que aponta para ele).
 * Os tipos são os de sempre (o contrato com o backend não muda): a tela só
 * troca um pelo outro. O desenho antigo "enviar → segurar → aguardar" vira um
 * passo só ao escolher "esperar", com as ligações de cada botão preservadas.
 */
export type ModoDoEnvio = 'seguir' | 'esperar' | 'status'

const H24 = { amount: 24, unit: 'hours' }
const novoId = () => `n_${Math.random().toString(36).slice(2, 8)}`
/** Os parâmetros que o modelo leva de um tipo para o outro. */
const doModelo = (p: Record<string, unknown>) => ({
  whatsappNumberId: p.whatsappNumberId ?? '',
  templateId: p.templateId ?? '',
  variables: p.variables ?? [],
  ifHuman: p.ifHuman ?? 'wait_then_skip',
})

/** O passo de status que logo segue esta mensagem (e aponta para ela), se houver. */
function statusLogoDepois(versao: Pick<VersaoDaJornada, 'graph'>, id: string): string | null {
  const proximo = versao.graph.nodes[id]?.outputs.next
  const no = proximo ? versao.graph.nodes[proximo] : undefined
  return no && no.type === 'branch_message_status' && no.params.messageNodeId === id ? proximo! : null
}

export function modoDoEnvio(versao: Pick<VersaoDaJornada, 'graph'>, id: string): ModoDoEnvio {
  const no = versao.graph.nodes[id]
  if (no?.type === 'send_and_wait') return 'esperar'
  return statusLogoDepois(versao, id) ? 'status' : 'seguir'
}

/**
 * O desenho antigo logo depois da mensagem: "aguardar resposta" (com ou sem "segurar a conversa"
 * antes), que só é alcançado por aqui. Devolve o passo que espera e os passos que viram parte da
 * mensagem ao escolher "esperar" (se outro caminho também chega neles, eles ficam no desenho).
 */
function esperaSeparadaA(g: VersaoDaJornada['graph'], seguinte: string): { esperaId: string; absorvidos: string[] } | null {
  const soDaqui = (alvoId: string) => g.start !== alvoId && Object.values(g.nodes).filter((n) => Object.values(n.outputs).includes(alvoId)).length === 1
  if (!soDaqui(seguinte)) return null
  const alvo = g.nodes[seguinte]
  if (alvo?.type === 'wait_event') return { esperaId: seguinte, absorvidos: [seguinte] }
  if (alvo?.type !== 'hold_conversation') return null
  const depois = alvo.outputs.next ?? null
  if (depois && soDaqui(depois) && g.nodes[depois]?.type === 'wait_event') return { esperaId: depois, absorvidos: [seguinte, depois] }
  return null
}

/** Se a mensagem "só envia", mas os passos logo abaixo já esperam a resposta (o desenho antigo). */
export function esperaEmPassosSeparados(versao: Pick<VersaoDaJornada, 'graph'>, id: string): boolean {
  const no = versao.graph.nodes[id]
  const seguinte = no?.type === 'send_template' ? no.outputs.next : null
  return !!seguinte && !!esperaSeparadaA(versao.graph, seguinte)
}

/** Visto do "aguardar": a mensagem logo acima que pode absorver este passo ("Juntar à mensagem"). */
export function mensagemQueEsperaAqui(versao: Pick<VersaoDaJornada, 'graph'>, esperaId: string): string | null {
  for (const [k, n] of Object.entries(versao.graph.nodes)) {
    if (n.type !== 'send_template' || !n.outputs.next) continue
    if (esperaSeparadaA(versao.graph, n.outputs.next)?.esperaId === esperaId) return k
  }
  return null
}

/** O primeiro destino ligado, na ordem dos caminhos (para não perder a ligação ao voltar a "só enviar"). */
function primeiroDestino(no: NoDoGrafo, catalogo: Catalogo): string | null {
  for (const s of saidasDoNo(no, catalogo)) if (no.outputs[s.key]) return no.outputs[s.key]
  return Object.values(no.outputs).find(Boolean) ?? null
}

function semNos(versao: VersaoDaJornada, ids: string[]): VersaoDaJornada['graph'] {
  const nodes = { ...versao.graph.nodes }
  const layout = { ...versao.graph.layout }
  for (const id of ids) { delete nodes[id]; delete layout[id] }
  return { ...versao.graph, nodes, layout }
}

/** Troca o que acontece depois de enviar. Devolve a versão nova (ou a mesma, se nada muda). */
export function trocarModoDoEnvio(versao: VersaoDaJornada, id: string, modo: ModoDoEnvio, apoio: ApoioDoEditor, catalogo: Catalogo): VersaoDaJornada {
  const atual = modoDoEnvio(versao, id)
  if (atual === modo) return versao
  const no = versao.graph.nodes[id]
  if (!no) return versao

  // 1) Volta a "só enviar" (de onde estiver), guardando um destino.
  let base = versao
  let seguinte: string | null = no.outputs.next ?? null
  if (atual === 'esperar') seguinte = primeiroDestino(no, catalogo)
  if (atual === 'status') {
    const st = statusLogoDepois(versao, id)!
    seguinte = primeiroDestino(versao.graph.nodes[st], catalogo)
    base = { ...versao, graph: semNos(versao, [st]) }
  }
  const soEnviar: NoDoGrafo = { type: 'send_template', label: no.label, params: doModelo(no.params), outputs: { next: seguinte }, ...(no.onError ? { onError: no.onError } : {}) }
  if (modo === 'seguir') return { ...base, graph: { ...base.graph, nodes: { ...base.graph.nodes, [id]: soEnviar } } }

  // 2) "Ver o que a pessoa fez": um status logo depois, apontando para esta mensagem.
  if (modo === 'status') {
    const st = novoId()
    const pos = base.graph.layout[id] ?? { x: 0, y: 0 }
    return {
      ...base,
      graph: {
        ...base.graph,
        nodes: {
          ...base.graph.nodes,
          [id]: { ...soEnviar, outputs: { next: st } },
          [st]: { type: 'branch_message_status', params: { messageNodeId: id, timeout: H24 }, outputs: { respondeu: seguinte } },
        },
        layout: { ...base.graph.layout, [st]: { x: pos.x, y: pos.y + 140 } },
      },
    }
  }

  // 3) "Esperar a resposta": um caminho por botão do modelo. Se depois vier o desenho antigo
  //    (segurar a conversa → aguardar resposta), ele vira parte deste passo, com as ligações.
  const modelo = apoio.templates.find((t) => t.id === no.params.templateId)
  const botoes = modelo?.buttons ?? []
  const replies = botoes.map((b, i) => ({ key: chaveDoDado(b) || `botao_${i + 1}`, label: b }))
  const g = base.graph
  const separada = seguinte ? esperaSeparadaA(g, seguinte) : null
  const alvo = separada ? g.nodes[separada.esperaId] : undefined
  const absorvidos: string[] = separada?.absorvidos ?? []
  const outputs: Record<string, string | null> = {}
  let timeout: unknown = H24
  if (alvo) {
    const respostas = (Array.isArray(alvo.params.events) ? alvo.params.events : []) as { key: string; event?: string; match?: string }[]
    for (const r of replies) {
      const resposta = respostas.find((e) => e.event === 'template.button_replied' && String(e.match ?? '').split('|').map((x) => x.trim()).includes(r.label))
      outputs[r.key] = resposta ? alvo.outputs[resposta.key] ?? null : null
    }
    const livre = respostas.find((e) => e.event === 'message.received')
    outputs.outra_resposta = livre ? alvo.outputs[livre.key] ?? null : null
    outputs.sem_resposta = alvo.outputs.sem_resposta ?? null
    timeout = alvo.params.timeout ?? H24
  } else {
    // Sem o desenho antigo: o próximo passo de antes fica no primeiro botão (ou em "escreveu outra coisa").
    if (replies[0]) outputs[replies[0].key] = seguinte
    else outputs.outra_resposta = seguinte
  }
  const esperar: NoDoGrafo = {
    type: 'send_and_wait',
    label: no.label,
    params: { ...doModelo(no.params), replies, timeout, holdConversation: true },
    outputs,
    ...(no.onError ? { onError: no.onError } : {}),
  }
  const g2 = absorvidos.length ? semNos(base, absorvidos) : g
  return { ...base, graph: { ...g2, nodes: { ...g2.nodes, [id]: esperar } } }
}
