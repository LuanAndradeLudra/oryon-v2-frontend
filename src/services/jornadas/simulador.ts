import type { ApoioDoEditor, Catalogo, ItemDaLinhaDoTempo, NoDoGrafo, VersaoDaJornada } from './tipos'
import { passoDoCatalogo, saidasDoNo } from './catalogo'

/**
 * ORY-60 — o "Testar" com contato de teste e relógio adiantado.
 *
 * No produto, o teste roda no backend (`POST /v1/journeys/{id}/test-run` com um
 * contato marcado como teste, e o relógio avança só para essa inscrição). Aqui a
 * mesma ideia roda na tela: nada é enviado, e cada efeito vira "teria feito".
 */

export interface OpcaoDoTeste {
  key: string
  label: string
}

export interface EstadoDoTeste {
  relogio: number
  noAtual: string | null
  /** Passos por onde o contato de teste já passou (para destacar no canvas). */
  caminho: string[]
  itens: ItemDaLinhaDoTempo[]
  /** O teste parou esperando você: escolher a resposta ou avançar o relógio. */
  pausa:
    | { tipo: 'escolha'; nodeId: string; pergunta: string; opcoes: OpcaoDoTeste[] }
    | { tipo: 'relogio'; nodeId: string; ate: number; rotulo: string }
    | null
  terminou: { como: 'meta' | 'saida' | 'erro'; texto: string } | null
}

/** O contato de teste e as variáveis inventadas que ele traz. */
export const CONTEXTO_DE_TESTE: Record<string, string> = {
  'contato.nome': 'Contato de teste',
  'contato.telefone': '+55 24 •••• 9999',
  'conector.agenda.id': '99001',
  'conector.agenda.data': '15/11',
  'conector.agenda.hora': '14:00',
  'conector.agenda.medico': 'Dra. Helena',
  'conector.agenda.especialidade': 'Cardiologia',
  'conector.agenda.unidade': 'Alto da Serra',
  'conector.agenda.preparo': 'jejum de 8 horas',
  'evento.data_consulta': '12/11',
  'evento.medico': 'Dra. Helena',
  'evento.especialidade': 'Cardiologia',
}

/** Troca `{{variavel|"padrão"}}` (com ou sem filtro) pelo valor do teste. */
export function resolverTexto(texto: string, ctx: Record<string, string> = CONTEXTO_DE_TESTE): string {
  return texto.replace(/\{\{\s*([a-zA-Z_][\w.*]*)\s*(?:\|\s*"([^"]*)")?[^}]*\}\}/g, (_m, nome: string, padrao?: string) => ctx[nome] ?? padrao ?? `[${nome}]`)
}

function duracaoMs(v: unknown): number {
  const d = v as { amount?: number; unit?: string } | undefined
  const n = Number(d?.amount ?? 0)
  const mult = d?.unit === 'minutes' ? 60_000 : d?.unit === 'days' ? 86_400_000 : 3_600_000
  return n * mult
}

export function rotuloDaDuracao(v: unknown): string {
  const d = v as { amount?: number; unit?: string } | undefined
  if (!d || !d.amount) return 'sem prazo'
  const u = d.unit === 'minutes' ? 'min' : d.unit === 'days' ? (d.amount === 1 ? 'dia' : 'dias') : 'h'
  return `${d.amount} ${u}`
}

function item(estado: EstadoDoTeste, nodeId: string | null, nodeType: string, title: string, detail: string, status: ItemDaLinhaDoTempo['status'] = 'shadow', extra: Partial<ItemDaLinhaDoTempo> = {}): ItemDaLinhaDoTempo {
  return { at: new Date(estado.relogio).toISOString(), nodeId, nodeType, title, detail, status, ...extra }
}

interface Contexto {
  versao: Pick<VersaoDaJornada, 'graph' | 'entry' | 'goals'>
  catalogo: Catalogo
  apoio: ApoioDoEditor
}

export function iniciarTeste(c: Contexto): EstadoDoTeste {
  const estado: EstadoDoTeste = { relogio: Date.now(), noAtual: c.versao.graph.start, caminho: [], itens: [], pausa: null, terminou: null }
  estado.itens.push(item(estado, null, 'entry', 'Entrou na jornada', 'O contato de teste entrou pela porta da jornada. Nada é enviado de verdade: cada passo mostra o que teria feito.', 'ok'))
  return rodar(estado, c)
}

/** Continua o teste: com a escolha (resposta, ramo) ou avançando o relógio. */
export function avancarTeste(anterior: EstadoDoTeste, c: Contexto, escolha?: string): EstadoDoTeste {
  const estado: EstadoDoTeste = { ...anterior, itens: [...anterior.itens], caminho: [...anterior.caminho], pausa: null }
  const p = anterior.pausa
  if (!p) return estado
  const no = c.versao.graph.nodes[p.nodeId]
  if (p.tipo === 'relogio') {
    estado.relogio = p.ate
    estado.itens.push(item(estado, p.nodeId, no?.type ?? 'wait', 'Relógio adiantado', `Agora é ${new Date(p.ate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`, 'ok'))
    estado.noAtual = no?.outputs.next ?? null
  } else {
    const opcao = p.opcoes.find((o) => o.key === escolha)
    if (!opcao || !no) return anterior
    if (escolha === 'sem_resposta' && no.type === 'wait_event') {
      estado.relogio += duracaoMs(no.params.timeout)
      estado.itens.push(item(estado, p.nodeId, no.type, 'O prazo acabou', `Relógio adiantado ${rotuloDaDuracao(no.params.timeout)}. Sem resposta.`, 'ok'))
    } else {
      estado.itens.push(item(estado, p.nodeId, no.type, 'Resposta do teste', `Seguiu por: "${opcao.label}".`, 'ok'))
    }
    estado.noAtual = no.outputs[escolha!] ?? null
    if (!estado.noAtual) {
      estado.terminou = { como: 'erro', texto: `O ramo "${opcao.label}" não vai a lugar nenhum. Ligue-o a um passo.` }
      return estado
    }
  }
  return rodar(estado, c)
}

function rodar(estado: EstadoDoTeste, c: Contexto): EstadoDoTeste {
  for (let guarda = 0; guarda < 60; guarda++) {
    const id = estado.noAtual
    if (!id) {
      estado.terminou = estado.terminou ?? { como: 'erro', texto: 'O caminho acabou sem "Meta atingida" nem "Sair". Ligue o último passo.' }
      return estado
    }
    const no = c.versao.graph.nodes[id]
    if (!no) {
      estado.terminou = { como: 'erro', texto: 'Um passo do caminho foi apagado.' }
      return estado
    }
    estado.caminho.push(id)
    const passo = passoDoCatalogo(c.catalogo, no.type)
    const titulo = no.label || passo?.label || no.type

    switch (no.type) {
      case 'goal':
        estado.itens.push(item(estado, id, no.type, titulo, `Meta atingida: ${String(no.params.label ?? '')}.`, 'ok'))
        estado.terminou = { como: 'meta', texto: `Meta atingida: ${String(no.params.label ?? 'sucesso')}.` }
        estado.noAtual = null
        return estado
      case 'exit':
        estado.itens.push(item(estado, id, no.type, titulo, `Saiu: ${String(no.params.reason ?? '')}.`, 'ok'))
        estado.terminou = { como: 'saida', texto: `Saiu da jornada: ${String(no.params.reason ?? '')}.` }
        estado.noAtual = null
        return estado
      case 'wait': {
        const ate = calcularEspera(no, estado.relogio)
        estado.itens.push(item(estado, id, no.type, titulo, `Esperando até ${new Date(ate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`, 'waiting'))
        estado.pausa = { tipo: 'relogio', nodeId: id, ate, rotulo: 'Adiantar o relógio' }
        estado.noAtual = id
        return estado
      }
      case 'wait_event':
      case 'branch':
      case 'ai_classify':
      case 'ai_mission': {
        const opcoes = saidasDoNo(no, c.catalogo).map((s) => ({
          key: s.key,
          label: s.key === 'sem_resposta' ? `Deixar o prazo acabar (+${rotuloDaDuracao(no.params.timeout)})` : s.label,
        }))
        const pergunta =
          no.type === 'wait_event' ? 'O que o contato de teste responde?'
          : no.type === 'branch' ? 'Por qual ramo o contato de teste segue?'
          : no.type === 'ai_classify' ? 'O que a IA responderia? (no teste você escolhe; não gasta crédito)'
          : 'Como a missão do agente termina? (no teste você escolhe; não gasta crédito)'
        estado.itens.push(item(estado, id, no.type, titulo, no.type === 'wait_event' ? `Esperando resposta por até ${rotuloDaDuracao(no.params.timeout)}.` : 'Esperando a sua escolha.', 'waiting'))
        estado.pausa = { tipo: 'escolha', nodeId: id, pergunta, opcoes }
        estado.noAtual = id
        return estado
      }
      default: {
        estado.itens.push(item(estado, id, no.type, titulo, descreverEfeito(no, c), 'shadow'))
        estado.noAtual = no.outputs.next ?? null
      }
    }
  }
  estado.terminou = { como: 'erro', texto: 'O caminho dá voltas demais (mais de 60 passos). Confira se há um ciclo sem saída.' }
  return estado
}

function calcularEspera(no: NoDoGrafo, agora: number): number {
  const modo = no.params.mode
  if (modo === 'duration') return agora + duracaoMs(no.params.duration)
  if (modo === 'until_time' || modo === 'relative_to_field') {
    const [h, m] = String(no.params.time ?? '09:00').split(':').map(Number)
    const d = new Date(agora)
    if (modo === 'relative_to_field') d.setDate(d.getDate() + Math.max(1, Number(no.params.offsetDays ?? 1)))
    d.setHours(h || 9, m || 0, 0, 0)
    if (d.getTime() <= agora) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  // próximo horário útil: amanhã às 8h, só para o teste
  const d = new Date(agora)
  d.setDate(d.getDate() + 1)
  d.setHours(8, 0, 0, 0)
  return d.getTime()
}

function descreverEfeito(no: NoDoGrafo, c: Contexto): string {
  const p = no.params
  switch (no.type) {
    case 'send_template': {
      const t = c.apoio.templates.find((x) => x.id === p.templateId)
      if (!t) return 'Teria enviado um modelo (nenhum escolhido).'
      const vars = (Array.isArray(p.variables) ? p.variables : []) as string[]
      const corpo = t.body.replace(/\{\{(\d+)\}\}/g, (_m, n: string) => resolverTexto(vars[Number(n) - 1] ?? `{{${n}}}`))
      return `Teria enviado o modelo "${t.name}": “${corpo}”${t.buttons.length ? ` [${t.buttons.join('] [')}]` : ''}`
    }
    case 'send_text': return `Teria enviado: “${resolverTexto(String(p.text ?? ''))}”`
    case 'notify_team': return `Teria avisado ${c.apoio.departments.find((d) => d.id === p.departmentId)?.name ?? 'a equipe'}: “${resolverTexto(String(p.message ?? ''))}”${p.groupDaily ? ' (na lista do dia)' : ''}`
    case 'internal_note': return `Teria deixado a nota: “${resolverTexto(String(p.text ?? ''))}”`
    case 'hold_conversation': return `Teria segurado a conversa por ${rotuloDaDuracao(p.duration)}. O agente não responderia nesse tempo.`
    case 'handoff_agent': return `Teria entregado a conversa ao agente com a nota: “${resolverTexto(String(p.note ?? ''))}”`
    case 'handoff_human': return `Teria transferido para ${c.apoio.departments.find((d) => d.id === p.departmentId)?.name ?? 'um humano'}: ${String(p.reason ?? '')}.`
    case 'resolve_conversation': return 'Teria resolvido a conversa.'
    case 'tag': return `Teria ${p.action === 'remove' ? 'tirado' : 'posto'} a etiqueta "${c.apoio.tags.find((t) => t.id === p.tagId)?.name ?? '?'}".`
    case 'set_stage': return `Teria mudado a etapa para "${c.apoio.stages.find((s) => s.id === p.stageId)?.name ?? '?'}".`
    case 'assign': return 'Teria atribuído a conversa.'
    case 'deal_action': return `Teria feito no funil: ${String(p.action ?? '')} ${p.stageName ? `(${String(p.stageName)})` : ''}.`
    case 'connector_call': {
      const op = c.catalogo.connectorOperations.find((o) => o.key === p.operation)
      return `Teria chamado "${op?.label ?? p.operation}" em modo ensaio${op?.writes ? ' (grava no sistema do cliente: no teste, não grava)' : ''}.`
    }
    case 'webhook_out': return `Teria avisado ${String(p.url ?? 'o outro sistema')}.`
    default: return 'Teria feito este passo.'
  }
}
