import type { ApoioDoEditor, Grafo, VersaoDaJornada } from './tipos'

/**
 * ORY-60 (P0 de 17/11): as regras do WhatsApp que o desenho precisa respeitar,
 * numa função pura que a validação e o painel do passo usam juntos.
 *
 * - Janela de 24 h: mensagem livre (texto, pergunta, a missão do agente puxando
 *   conversa) só sai se a PESSOA escreveu nas últimas 24 h. Fora disso, só um
 *   modelo aprovado pela Meta. A conta abaixo segue o desenho e diz, para cada
 *   passo, quanto tempo pode ter passado desde a última mensagem da pessoa no
 *   PIOR caminho até ele.
 * - Botões: o caminho de cada botão precisa existir no modelo que vem antes.
 * - Variáveis do modelo: a Meta recusa a mensagem com um dado vazio.
 */

export const HORAS_DA_JANELA = 24

/** Passos que mandam mensagem livre (sem modelo): precisam da janela aberta. */
export const PASSOS_DE_TEXTO_LIVRE = new Set(['send_text', 'ask_question', 'ai_mission'])

/** Passos que mandam alguma mensagem ao contato. */
export const PASSOS_DE_MENSAGEM = new Set(['send_template', 'send_text', 'send_and_wait', 'ask_question'])

/** Eventos que são a PRÓPRIA pessoa escrevendo: abrem (ou renovam) a janela. */
const EVENTOS_DA_PESSOA = new Set(['template.button_replied', 'flow.replied', 'message.received', 'message.first'])

/** Saídas que só acontecem porque a pessoa respondeu. */
const SAIDAS_DE_RESPOSTA: Record<string, (chave: string) => boolean> = {
  send_and_wait: (k) => k !== 'sem_resposta' && k !== 'falhou',
  ask_question: (k) => k === 'respondeu' || k === 'invalida',
  branch_message_status: (k) => k === 'respondeu',
}

/** Horas de uma duração `{ amount, unit }` (0 se não houver). */
export function horasDaDuracao(v: unknown): number {
  if (!v || typeof v !== 'object') return 0
  const { amount, unit } = v as { amount?: unknown; unit?: unknown }
  const n = Number(amount) || 0
  return unit === 'minutes' ? n / 60 : unit === 'days' ? n * 24 : n
}

/** Acima disto a conta vira "não dá para saber" (laços que só somam tempo). */
const TETO = HORAS_DA_JANELA * 60

/**
 * Para cada passo: quantas horas, no pior caminho, podem ter passado desde a
 * última mensagem da pessoa quando ela CHEGA nele. `Infinity` = a pessoa pode
 * nem ter escrito (ex.: entrou por uma agenda e nunca respondeu).
 */
export function horasDesdeAUltimaMensagem(versao: Pick<VersaoDaJornada, 'graph' | 'entry'>): Map<string, number> {
  const { graph, entry } = versao
  // A entrada: o pior caso entre as portas.
  let inicio = 0
  if (!entry.doors.length) inicio = Infinity
  for (const porta of entry.doors) {
    const evento = porta.type === 'event' ? String(porta.params.event ?? '') : ''
    const h = EVENTOS_DA_PESSOA.has(evento) ? 0
      : evento === 'conversation.inactive' ? Number(porta.params.hours) || Infinity
        : Infinity
    inicio = Math.max(inicio, h)
  }
  const chegada = new Map<string, number>()
  if (!graph.start || !graph.nodes[graph.start]) return chegada
  const piorar = (id: string, h: number) => {
    const v = h >= TETO ? Infinity : h
    const atual = chegada.get(id)
    if (atual === undefined || v > atual) { chegada.set(id, v); return true }
    return false
  }
  piorar(graph.start, inicio)
  // Propaga o pior caso até estabilizar (com laços, o teto encerra).
  let fila = [graph.start]
  for (let volta = 0; fila.length && volta < Object.keys(graph.nodes).length * 4 + 8; volta++) {
    const proxima: string[] = []
    for (const id of fila) {
      const no = graph.nodes[id]
      if (!no) continue
      const h = chegada.get(id) ?? Infinity
      for (const [saida, destino] of Object.entries(no.outputs)) {
        if (!destino || !graph.nodes[destino]) continue
        if (piorar(destino, depoisDaSaida(no, saida, h))) proxima.push(destino)
      }
    }
    fila = proxima
  }
  return chegada
}

/** As horas depois de sair de um passo por uma saída. */
function depoisDaSaida(no: Grafo['nodes'][string], saida: string, h: number): number {
  const p = no.params
  if (no.type === 'wait_event') {
    const respostas = Array.isArray(p.events) ? (p.events as { key?: string; event?: string }[]) : []
    const resposta = respostas.find((r) => r.key === saida)
    if (resposta && EVENTOS_DA_PESSOA.has(String(resposta.event))) return 0
    return h + horasDaDuracao(p.timeout)
  }
  const respondeu = SAIDAS_DE_RESPOSTA[no.type]
  if (respondeu) return respondeu(saida) ? 0 : h + horasDaDuracao(p.timeout)
  if (no.type === 'wait') {
    if (p.mode === 'duration') return h + horasDaDuracao(p.duration)
    if (p.mode === 'time') return h + HORAS_DA_JANELA
    return Infinity
  }
  if (no.type === 'ai_mission') return h + horasDaDuracao(p.deadline)
  return h
}

/** O texto curto do estado da janela para o painel do passo. */
export function situacaoDaJanela(horas: number | undefined): { aberta: boolean; texto: string } {
  if (horas === undefined || !Number.isFinite(horas)) {
    return { aberta: false, texto: 'Neste ponto, a pessoa pode não ter escrito nada para você. O WhatsApp só deixa mandar mensagem livre até 24 h depois da última mensagem DELA.' }
  }
  if (horas >= HORAS_DA_JANELA) {
    return { aberta: false, texto: `Neste ponto, podem ter passado até ${Math.round(horas)} h desde a última mensagem da pessoa. O WhatsApp só deixa mandar mensagem livre até 24 h depois dela.` }
  }
  return { aberta: true, texto: horas === 0 ? 'A pessoa acabou de responder: a janela de 24 h do WhatsApp está aberta aqui.' : `A pessoa respondeu há até ${Math.round(horas)} h: a janela de 24 h do WhatsApp está aberta aqui.` }
}

/**
 * A mensagem de modelo mais próxima ANTES do passo (até 6 passos para trás) e o modelo dela.
 * `modelo` vem nulo quando a mensagem ainda não tem modelo escolhido (o "falta escolher" já avisa).
 */
export function modeloAntes(id: string, graph: Grafo, apoio: ApoioDoEditor): { nodeId: string; modelo: ApoioDoEditor['templates'][number] | null } | null {
  const vistos = new Set([id])
  let fila = [id]
  for (let nivel = 0; nivel < 6 && fila.length; nivel++) {
    const proxima: string[] = []
    for (const alvo of fila) {
      for (const [k, n] of Object.entries(graph.nodes)) {
        if (vistos.has(k) || !Object.values(n.outputs).includes(alvo)) continue
        vistos.add(k)
        if (n.type === 'send_template' || n.type === 'send_and_wait') {
          return { nodeId: k, modelo: apoio.templates.find((t) => t.id === n.params.templateId) ?? null }
        }
        proxima.push(k)
      }
    }
    fila = proxima
  }
  return null
}

/** Os passos de mensagem que vêm ANTES deste em algum caminho (os únicos que fazem sentido no "de qual mensagem?"). */
export function mensagensAntes(id: string, graph: Grafo): string[] {
  const antes = new Set<string>()
  let fila = [id]
  while (fila.length) {
    const proxima: string[] = []
    for (const alvo of fila) {
      for (const [k, n] of Object.entries(graph.nodes)) {
        if (antes.has(k) || k === id || !Object.values(n.outputs).includes(alvo)) continue
        antes.add(k)
        proxima.push(k)
      }
    }
    fila = proxima
  }
  return [...antes].filter((k) => PASSOS_DE_MENSAGEM.has(graph.nodes[k].type))
}

/**
 * Dados que nunca vêm vazios: não precisam do texto "se vier vazio". O que identifica o
 * evento que trouxe a pessoa (o id, a data e a hora do agendamento) vem sempre junto dele;
 * nome, profissional, serviço, preparo etc. podem faltar.
 */
export const DADOS_SEMPRE_PREENCHIDOS = new Set([
  'contato.telefone', 'conversa.linha', 'contexto.tentativa',
  'evento.id', 'evento.data', 'conector.agenda.id', 'conector.agenda.data', 'conector.agenda.hora',
])

/** As variáveis de um modelo sem o texto para quando o dado vier vazio (a Meta recusa a mensagem com um dado vazio). */
export function variaveisSemReserva(variaveis: unknown): string[] {
  if (!Array.isArray(variaveis)) return []
  const faltam: string[] = []
  for (const v of variaveis) {
    if (typeof v !== 'string') continue
    const m = v.match(/^\s*\{\{\s*([a-zA-Z_][\w.*]*)([^}]*)\}\}\s*$/)
    if (!m) continue // texto fixo ou vazio (o vazio já é "falta preencher")
    const temReserva = /\|\s*"[^"]+"/.test(m[2])
    if (!temReserva && !DADOS_SEMPRE_PREENCHIDOS.has(m[1])) faltam.push(m[1])
  }
  return faltam
}
