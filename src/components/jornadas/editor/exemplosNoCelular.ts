import type { ApoioDoEditor, Catalogo, Grafo, NoDoGrafo } from '@/services/jornadas/tipos'
import { passoDoCatalogo, saidasDoNo, TIPOS_DE_MISSAO } from '@/services/jornadas/catalogo'
import { rotuloDaDuracao } from '@/services/jornadas/simulador'
import { paraTextoAmigavel } from './variaveis'

/**
 * ORY-60 (16/11, pedido do João): todo passo que envolve o WhatsApp mostra o
 * celular no painel, para quem monta entender o que a ação faz na tela real.
 * - Os passos que MANDAM mensagem mostram a mensagem de verdade (PreviaNoCelular).
 * - Os que agem sobre a conversa sem mandar mensagem própria mostram um EXEMPLO
 *   curto da conversa, montado aqui: a mensagem real que vem antes no desenho
 *   (quando há), o que a pessoa poderia responder, a resposta do agente ou da
 *   equipe e avisos cinza com o que acontece por trás (a pessoa não vê).
 * Os textos são de exemplo e servem a qualquer segmento.
 */

/** Passos que mandam mensagem ao contato. */
export const TIPOS_DE_MENSAGEM = new Set(['send_template', 'send_text', 'send_and_wait', 'ask_question'])

/** Passos que agem sobre a conversa do WhatsApp sem mandar mensagem própria: o celular mostra um exemplo. */
export const TIPOS_COM_EXEMPLO = new Set([
  'wait_event', 'branch_message_status', 'hold_conversation', 'handoff_agent', 'handoff_human',
  'resolve_conversation', 'ai_classify', 'ai_extract', 'ai_summarize', 'ai_mission',
])

export type LinhaDoExemplo =
  /** Uma mensagem de verdade do desenho (aparece como no WhatsApp). */
  | { tipo: 'mensagem'; no: NoDoGrafo }
  /** A empresa respondendo (o agente ou alguém da equipe), de exemplo. */
  | { tipo: 'empresa'; texto: string }
  /** A pessoa respondendo, de exemplo. */
  | { tipo: 'contato'; texto: string }
  /** O que acontece por trás: a pessoa não vê. */
  | { tipo: 'aviso'; texto: string }

/** A mensagem mais próxima ANTES do passo no desenho (até 6 passos para trás). */
export function mensagemAntes(id: string, grafo: Grafo): NoDoGrafo | null {
  const vistos = new Set([id])
  let fila = [id]
  for (let nivel = 0; nivel < 6 && fila.length; nivel++) {
    const proxima: string[] = []
    for (const alvo of fila) {
      for (const [k, n] of Object.entries(grafo.nodes)) {
        if (vistos.has(k) || !Object.values(n.outputs).includes(alvo)) continue
        if (TIPOS_DE_MENSAGEM.has(n.type)) return n
        vistos.add(k)
        proxima.push(k)
      }
    }
    fila = proxima
  }
  return null
}

const lista = (v: unknown): { key: string; label: string; event?: string; match?: string }[] =>
  Array.isArray(v) ? v.filter((x): x is { key: string; label: string } => !!x && typeof x === 'object' && 'label' in x) : []
const textos = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && 'label' in x ? String((x as { label: unknown }).label) : '')).filter(Boolean) : []
const corte = (t: string, n = 90) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)

/** As conversas de exemplo da missão do agente, por tipo de missão. */
const CONVERSA_DA_MISSAO: Record<string, LinhaDoExemplo[]> = {
  reschedule: [
    { tipo: 'empresa', texto: 'Oi! Vamos achar um novo horário para você? Tenho quinta às 9h ou sexta às 14h.' },
    { tipo: 'contato', texto: 'Sexta às 14h' },
    { tipo: 'empresa', texto: 'Pronto, ficou para sexta às 14h. Até lá!' },
  ],
  confirm_attendance: [
    { tipo: 'empresa', texto: 'Oi! Seu horário é amanhã às 10h. Você confirma que vem?' },
    { tipo: 'contato', texto: 'Confirmo, estarei aí' },
    { tipo: 'empresa', texto: 'Obrigado! Até amanhã.' },
  ],
  recover_quote: [
    { tipo: 'empresa', texto: 'Oi! Vi que você pediu um orçamento. Ficou alguma dúvida que eu possa tirar?' },
    { tipo: 'contato', texto: 'Achei um pouco caro' },
    { tipo: 'empresa', texto: 'Entendo! Dá para parcelar em 3 vezes. Quer que eu reserve?' },
  ],
  custom: [
    { tipo: 'empresa', texto: 'Oi! Tudo bem? Posso te ajudar com uma coisa rápida?' },
    { tipo: 'contato', texto: 'Pode sim' },
    { tipo: 'empresa', texto: 'Ótimo! Então, sobre o que combinamos…' },
  ],
  qualify_lead: [
    { tipo: 'empresa', texto: 'Oi! Para te ajudar melhor: é para você ou para a sua empresa?' },
    { tipo: 'contato', texto: 'Para a minha empresa, somos 12 pessoas' },
    { tipo: 'empresa', texto: 'Perfeito! Qual o melhor dia para uma conversa rápida?' },
  ],
}

/** O exemplo que o celular mostra para um passo que age sobre a conversa. */
export function exemploNoCelular(no: NoDoGrafo, id: string, grafo: Grafo, apoio: ApoioDoEditor, catalogo: Catalogo): LinhaDoExemplo[] {
  const p = no.params
  const antes = mensagemAntes(id, grafo)
  const linhaAntes: LinhaDoExemplo[] = antes ? [{ tipo: 'mensagem', no: antes }] : []
  switch (no.type) {
    case 'wait_event': {
      const respostas = lista(p.events)
      const primeira = respostas[0]
      const linhas: LinhaDoExemplo[] = antes ? linhaAntes : [{ tipo: 'aviso', texto: 'A mensagem antes deste passo aparece aqui' }]
      if (primeira) {
        const texto = primeira.event === 'template.button_replied'
          ? (primeira.match ?? '').split('|')[0].trim() || primeira.label
          : primeira.event === 'message.received' ? 'Oi, recebi sim!' : ''
        if (texto) linhas.push({ tipo: 'contato', texto })
        linhas.push({ tipo: 'aviso', texto: `Segue pelo caminho “${primeira.label}”` })
      }
      linhas.push({ tipo: 'aviso', texto: `Sem resposta em ${rotuloDaDuracao(p.timeout)}: “Sem resposta”` })
      return linhas
    }
    case 'branch_message_status': {
      const alvo = typeof p.messageNodeId === 'string' ? grafo.nodes[p.messageNodeId] : undefined
      const caminhos = saidasDoNo(no, catalogo).map((s) => s.label).join(' · ')
      return [
        alvo ? { tipo: 'mensagem', no: alvo } : { tipo: 'aviso', texto: 'Escolha a mensagem para vê-la aqui' },
        { tipo: 'aviso', texto: `Em até ${rotuloDaDuracao(p.timeout)}, segue pelo que a pessoa fez: ${caminhos}` },
      ]
    }
    case 'hold_conversation':
      return [
        ...linhaAntes,
        { tipo: 'contato', texto: 'Oi! Posso tirar uma dúvida antes?' },
        { tipo: 'aviso', texto: `A jornada segura a conversa por ${rotuloDaDuracao(p.duration)}. O que ela não espera vai ao agente, com o contexto` },
      ]
    case 'handoff_agent': {
      // A nota com os nomes das variáveis (não o código delas), como no resto do painel.
      const nota = typeof p.note === 'string' && p.note.trim() ? corte(paraTextoAmigavel(p.note.trim()), 80) : ''
      return [
        ...linhaAntes,
        { tipo: 'contato', texto: 'Na verdade, queria mudar o dia' },
        { tipo: 'aviso', texto: nota ? `O agente assume e lê a nota: “${nota}”` : 'O agente assume a conversa, com o contexto da jornada' },
        { tipo: 'empresa', texto: 'Claro! Vou ver os dias livres para você. Prefere de manhã ou à tarde?' },
      ]
    }
    case 'handoff_human': {
      const setor = apoio.departments.find((d) => d.id === p.departmentId)?.name
      return [
        ...linhaAntes,
        { tipo: 'contato', texto: 'Prefiro falar com uma pessoa' },
        { tipo: 'aviso', texto: `Conversa passada para ${setor ?? 'a equipe'}. O agente de IA para de responder` },
        { tipo: 'empresa', texto: `Oi! Aqui é ${setor ? `da ${setor.toLowerCase()}` : 'da equipe'}. Já vou te ajudar.` },
      ]
    }
    case 'resolve_conversation':
      return [
        ...linhaAntes,
        { tipo: 'contato', texto: 'Obrigado, era só isso!' },
        { tipo: 'aviso', texto: 'Conversa resolvida. Se a pessoa escrever de novo, abre outra' },
      ]
    case 'ai_classify': {
      const categorias = lista(p.categories).map((c) => c.label)
      return [
        ...linhaAntes,
        { tipo: 'contato', texto: 'Preciso de ajuda com um problema que aconteceu semana passada' },
        { tipo: 'aviso', texto: categorias.length ? `A IA lê a resposta e escolhe: ${categorias.join(' · ')} ou “Incerto”` : 'A IA lê a resposta e escolhe um caminho' },
      ]
    }
    case 'ai_extract': {
      const campos = textos(p.fields)
      return [
        ...linhaAntes,
        { tipo: 'contato', texto: 'Claro! Meu nome é Ana Souza e o melhor dia é quinta' },
        { tipo: 'aviso', texto: campos.length ? `A IA tira da resposta e guarda: ${campos.join(', ')}` : 'A IA tira da resposta os dados pedidos e guarda' },
      ]
    }
    case 'ai_summarize': {
      // Onde o resumo fica, pelo nome da opção (não a chave interna).
      const onde = passoDoCatalogo(catalogo, 'ai_summarize')?.params.find((c) => c.key === 'saveAs')?.options?.find((o) => o.value === p.saveAs)?.label
      return [
        { tipo: 'contato', texto: 'Queria saber se ainda tem horário esta semana' },
        { tipo: 'empresa', texto: 'Tem sim! Quinta às 9h ou sexta às 14h.' },
        { tipo: 'contato', texto: 'Sexta fica ótimo' },
        { tipo: 'aviso', texto: `A IA resume a conversa${onde ? ` (${onde.toLowerCase()})` : ''}. A pessoa não vê` },
      ]
    }
    case 'ai_mission': {
      const tipo = typeof p.missionType === 'string' ? p.missionType : 'reschedule'
      const missao = TIPOS_DE_MISSAO[tipo]
      return [
        { tipo: 'aviso', texto: tipo === 'custom' && String(p.objective ?? '').trim()
          ? `Missão personalizada: ${String(p.objective).split('\n')[0].slice(0, 80)}`
          : `Missão: ${missao?.label ?? 'do agente'}. O agente conduz a conversa` },
        ...(CONVERSA_DA_MISSAO[tipo] ?? CONVERSA_DA_MISSAO.reschedule),
        { tipo: 'aviso', texto: 'Missão concluída: segue por “Concluiu”' },
      ]
    }
    default:
      return linhaAntes
  }
}
