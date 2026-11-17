import type { ApoioDoEditor, Catalogo, Entrada, NoDoGrafo, VersaoDaJornada } from '@/services/jornadas/tipos'
import { PASSOS_DE_ENVIO, paramsDoTipoDeMissao, passoDoCatalogo, saidasDoNo } from '@/services/jornadas/catalogo'
import { normalizar } from '@/services/jornadas/padroes'
import { nomeLegivelDoModelo } from './variaveis'

/**
 * ORY-60 (17/11) — a leitura do caminho até um passo: o que aconteceu antes dele (a
 * pessoa não respondeu, apertou "Quero remarcar", a missão não concluiu…) e de que
 * assunto se trata (o agendamento de tal dia). Com isso, os campos que eram texto livre
 * nascem preenchidos e mostram uma sugestão: o aviso à equipe, a nota, o motivo da
 * entrega, o nome da meta e o motivo de saída. Tudo por regra, sem IA (custo zero).
 */

export type Situacao =
  | 'sem_resposta' | 'botao' | 'recusou' | 'escreveu' | 'respondeu' | 'nao_serviu'
  | 'missao_concluiu' | 'missao_nao_concluiu' | 'missao_prazo'
  | 'nao_enviou' | 'falhou' | 'incerto' | 'categoria' | 'evento' | 'ramo' | 'outros_casos'
  | 'com_equipe' | 'com_agente' | 'sistema' | 'negocio_ganho' | 'fluxo'

export type Intencao = 'confirmar' | 'cancelar' | 'remarcar' | 'recusar' | 'reclamar' | null

export interface Assunto {
  tipo: 'agendamento' | 'negocio' | null
  /** Ex.: `agendamento de {{conector.agenda.data | data:"DD/MM"}} às {{conector.agenda.hora}}`. */
  frase: string | null
}

export interface LeituraDoCaminho {
  situacao: Situacao
  /** O passo que decidiu o caminho (a mensagem, a pergunta, a missão…). */
  origem: { id: string; nome: string; tipo: string } | null
  /** O nome do caminho ("Sem resposta", "Quero remarcar"). */
  rotulo: string | null
  intencao: Intencao
  missao: string | null
  evento: string | null
  /** Para a frase: "a mensagem", "a pergunta", "o formulário". */
  sobre: 'mensagem' | 'pergunta' | 'formulario' | null
  /** Passou por um "Avisar a equipe" no caminho. */
  equipeAvisada: boolean
  /** Ex.: o "Resumir a conversa" com o resumo para os próximos passos. */
  temResumo: boolean
  assunto: Assunto
}

// Passos que só "passam adiante": a leitura continua subindo por eles.
const PASSAM_ADIANTE = new Set([
  'wait', 'tag', 'set_stage', 'set_field', 'assign', 'internal_note', 'notify_team', 'hold_conversation',
  'ai_summarize', 'webhook_out', 'send_text', 'send_template', 'resolve_conversation',
])

export function assuntoDaEntrada(entrada: Entrada | undefined): Assunto {
  for (const d of entrada?.doors ?? []) {
    if (d.type === 'schedule_list') {
      return d.params.operation === 'cancelados_de_ontem'
        ? { tipo: 'agendamento', frase: 'agendamento cancelado de {{conector.cancelada.data | data:"DD/MM"}}' }
        : { tipo: 'agendamento', frase: 'agendamento de {{conector.agenda.data | data:"DD/MM"}} às {{conector.agenda.hora}}' }
    }
    if (d.type === 'event') {
      const ev = String(d.params.event ?? '')
      if (ev === 'appointment_cancelled') return { tipo: 'agendamento', frase: 'agendamento cancelado de {{evento.data | data:"DD/MM"}}' }
      if (ev.startsWith('appointment')) return { tipo: 'agendamento', frase: 'agendamento de {{evento.data | data:"DD/MM às HH:mm"}}' }
      if (ev.startsWith('deal.')) return { tipo: 'negocio', frase: null }
    }
  }
  return { tipo: null, frase: null }
}

/** O que a pessoa quis dizer com um botão ou uma resposta da IA ("Quero remarcar" → remarcar). */
export function intencaoDoRotulo(rotulo: string | null | undefined): Intencao {
  const t = normalizar(rotulo ?? '')
  if (!t) return null
  if (/cancel|desmarc/.test(t)) return 'cancelar'
  if (/remarc|reagend|outro (dia|horario)|mudar/.test(t)) return 'remarcar'
  if (/ruim|pessim|reclam|insatisf|problema/.test(t)) return 'reclamar'
  if (/^(nao|agora nao)|nao quero|sem interesse|nao tem interesse|depois|^sair|^parar|recus/.test(t)) return 'recusar'
  if (/confirm|^sim|^quero|^vou|^ok|entendi|^pode|aceit|tem interesse|otim|^boa?$|satisf|^tenho interesse/.test(t)) return 'confirmar'
  return null
}

function nomeDoPasso(no: NoDoGrafo, catalogo: Catalogo, apoio?: ApoioDoEditor): string {
  if (no.label) return no.label
  const modelo = apoio?.templates.find((t) => t.id === no.params.templateId)
  if (modelo) return nomeLegivelDoModelo(modelo.name)
  return passoDoCatalogo(catalogo, no.type)?.label ?? no.type
}

type Parcial = Partial<LeituraDoCaminho> & { situacao: Situacao }

/** O que uma saída diz sobre o caminho; `null` quando o passo só passa adiante. */
function lerSaida(versao: VersaoDaJornada, id: string, saida: string, catalogo: Catalogo, apoio?: ApoioDoEditor): Parcial | null {
  const no = versao.graph.nodes[id]
  if (!no) return null
  const origem = { id, nome: nomeDoPasso(no, catalogo, apoio), tipo: no.type }
  const rotulo = saidasDoNo(no, catalogo).find((s) => s.key === saida)?.label || null
  const base = { origem, rotulo }
  if (saida === 'falhou') return { ...base, situacao: PASSOS_DE_ENVIO.has(no.type) ? 'nao_enviou' : 'falhou', sobre: 'mensagem' }
  const botao = (): Parcial => {
    const intencao = intencaoDoRotulo(rotulo)
    return { ...base, situacao: intencao === 'recusar' ? 'recusou' : 'botao', intencao, sobre: 'mensagem' }
  }
  switch (no.type) {
    case 'send_and_wait':
      if (saida === 'sem_resposta') return { ...base, situacao: 'sem_resposta', sobre: 'mensagem' }
      if (saida === 'outra_resposta') return { ...base, situacao: 'escreveu', sobre: 'mensagem' }
      return botao()
    case 'wait_event': {
      if (saida === 'sem_resposta') {
        // A mensagem esperada é a de antes (o nome dela diz mais que "Esperar um acontecimento").
        const antes = mensagemAntes(versao, id)
        return { ...base, origem: antes ? { id: antes, nome: nomeDoPasso(versao.graph.nodes[antes], catalogo, apoio), tipo: versao.graph.nodes[antes].type } : origem, situacao: 'sem_resposta', sobre: 'mensagem' }
      }
      const ev = ((no.params.events ?? []) as { key: string; event: string }[]).find((e) => e.key === saida)
      if (!ev) return null
      const antes = mensagemAntes(versao, id)
      const daMensagem = antes ? { origem: { id: antes, nome: nomeDoPasso(versao.graph.nodes[antes], catalogo, apoio), tipo: versao.graph.nodes[antes].type } } : {}
      if (ev.event === 'template.button_replied') return { ...botao(), ...daMensagem }
      if (ev.event === 'message.received' || ev.event === 'message.first') return { ...base, ...daMensagem, situacao: 'escreveu', sobre: 'mensagem' }
      if (ev.event === 'flow.replied') return { ...base, situacao: 'respondeu', sobre: 'formulario' }
      return { ...base, situacao: 'evento', evento: ev.event }
    }
    case 'ask_question':
      if (saida === 'respondeu') return { ...base, situacao: 'respondeu', sobre: 'pergunta' }
      if (saida === 'invalida') return { ...base, situacao: 'nao_serviu', sobre: 'pergunta' }
      return { ...base, situacao: 'sem_resposta', sobre: 'pergunta' }
    case 'ai_classify':
      if (saida === 'incerto') return { ...base, situacao: 'incerto' }
      return { ...base, situacao: 'categoria', intencao: intencaoDoRotulo(rotulo) }
    case 'ai_extract':
      return saida === 'incerto' ? { ...base, situacao: 'incerto' } : null
    case 'ai_mission': {
      const missao = String(no.params.missionType ?? '') || null
      return { ...base, missao, situacao: saida === 'concluiu' ? 'missao_concluiu' : saida === 'nao_concluiu' ? 'missao_nao_concluiu' : 'missao_prazo' }
    }
    case 'branch':
      return { ...base, situacao: saida === 'senao' ? 'outros_casos' : 'ramo' }
    case 'branch_message_status': {
      const msgId = String(no.params.messageNodeId ?? '')
      const msg = versao.graph.nodes[msgId]
      const daMensagem = msg ? { id: msgId, nome: nomeDoPasso(msg, catalogo, apoio), tipo: msg.type } : origem
      if (saida === 'respondeu') return { ...base, origem: daMensagem, situacao: 'escreveu', sobre: 'mensagem' }
      if (saida === 'nao_chegou') return { ...base, origem: daMensagem, situacao: 'nao_enviou', sobre: 'mensagem' }
      return { ...base, origem: daMensagem, situacao: 'sem_resposta', sobre: 'mensagem' }
    }
    case 'handoff_human': return { ...base, situacao: 'com_equipe' }
    case 'handoff_agent': return { ...base, situacao: 'com_agente' }
    case 'connector_call': return { ...base, situacao: 'sistema' }
    case 'deal_action': return no.params.action === 'won' ? { ...base, situacao: 'negocio_ganho' } : null
    default:
      return null
  }
}

/** A mensagem logo antes de um "Esperar um acontecimento" (por um caminho de "seguir"). */
function mensagemAntes(versao: VersaoDaJornada, id: string): string | null {
  let atual = id
  for (let i = 0; i < 4; i++) {
    const chegada = Object.entries(versao.graph.nodes).find(([, n]) => n.outputs.next === atual)
    if (!chegada) return null
    const [k, n] = chegada
    if (n.type === 'send_template' || n.type === 'send_text') return k
    if (!PASSAM_ADIANTE.has(n.type)) return null
    atual = k
  }
  return null
}

function quemChega(versao: VersaoDaJornada, id: string): { origem: string; saida: string }[] {
  const lista: { origem: string; saida: string }[] = []
  for (const [k, n] of Object.entries(versao.graph.nodes)) {
    for (const [s, d] of Object.entries(n.outputs)) if (d === id) lista.push({ origem: k, saida: s })
  }
  return lista
}

/** A leitura a partir de uma saída (o passo que vai, ou iria, ficar ali). */
export function lerCaminhoDaSaida(versao: VersaoDaJornada, origem: string | null, saida: string | null, catalogo: Catalogo, apoio?: ApoioDoEditor): LeituraDoCaminho {
  const leitura: LeituraDoCaminho = {
    situacao: 'fluxo', origem: null, rotulo: null, intencao: null, missao: null, evento: null, sobre: null,
    equipeAvisada: false, temResumo: false, assunto: assuntoDaEntrada(versao.entry),
  }
  const vistos = new Set<string>()
  let par: { origem: string; saida: string } | null = origem && saida ? { origem, saida } : null
  for (let i = 0; par && i < 16; i++) {
    if (vistos.has(par.origem)) break
    vistos.add(par.origem)
    const no = versao.graph.nodes[par.origem]
    if (!no) break
    const lido = lerSaida(versao, par.origem, par.saida, catalogo, apoio)
    if (lido) return { ...leitura, ...lido }
    if (no.type === 'notify_team') leitura.equipeAvisada = true
    if (no.type === 'ai_summarize' && no.params.saveAs === 'context') leitura.temResumo = true
    par = quemChega(versao, par.origem).find((c) => !vistos.has(c.origem)) ?? null
  }
  return leitura
}

/** A leitura do caminho que chega a um passo (pelo primeiro caminho que chega nele). */
export function lerCaminho(versao: VersaoDaJornada, id: string, catalogo: Catalogo, apoio?: ApoioDoEditor): LeituraDoCaminho {
  const chegada = quemChega(versao, id)[0]
  const leitura = lerCaminhoDaSaida(versao, chegada?.origem ?? null, chegada?.saida ?? null, catalogo, apoio)
  // O resumo pode estar em qualquer passo antes, não só no caminho lido.
  if (!leitura.temResumo) leitura.temResumo = Object.values(versao.graph.nodes).some((n) => n.type === 'ai_summarize' && n.params.saveAs === 'context')
  return leitura
}

// ── frases ───────────────────────────────────────────────────────────────────

const aspas = (t: string) => `“${t}”`
const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** O que aconteceu, numa frase sem sujeito: "não respondeu à mensagem “Convite para remarcar”". */
export function oQueAconteceu(l: LeituraDoCaminho, catalogo: Catalogo): string {
  const nome = l.origem ? aspas(l.origem.nome) : ''
  const daMensagem = l.sobre === 'pergunta' ? `à pergunta ${nome}` : l.sobre === 'formulario' ? `ao formulário ${nome}` : `à mensagem ${nome}`
  const missao = l.missao ? catalogo.missionTypes[l.missao]?.label : null
  switch (l.situacao) {
    case 'sem_resposta': return `não respondeu ${daMensagem}`
    case 'botao': case 'recusou': return `escolheu ${aspas(l.rotulo ?? '')} na mensagem ${nome}`
    case 'escreveu': return l.rotulo === 'Escreveu outra coisa' ? `escreveu uma resposta ${daMensagem}, em vez de usar os botões` : `respondeu ${daMensagem}`
    case 'respondeu': return `respondeu ${daMensagem}`
    case 'nao_serviu': return `não deu uma resposta que sirva ${daMensagem}`
    case 'missao_concluiu': return `concluiu com o agente a missão ${aspas(missao ?? 'do agente')}`
    case 'missao_nao_concluiu': return `não concluiu com o agente a missão ${aspas(missao ?? 'do agente')}`
    case 'missao_prazo': return `não concluiu no prazo a missão ${aspas(missao ?? 'do agente')}`
    case 'nao_enviou': return `não recebeu a mensagem ${nome} (o WhatsApp não entregou)`
    case 'falhou': return `passou por um erro no passo ${nome}`
    case 'incerto': return l.origem?.tipo === 'ai_extract' ? 'tem dados que a IA não achou na conversa' : 'mandou uma mensagem que a IA não soube classificar'
    case 'categoria': return `mandou uma mensagem que a IA entendeu como ${aspas(l.rotulo ?? '')}`
    case 'evento': return `teve: ${(catalogo.events.find((e) => e.key === l.evento)?.label ?? 'um acontecimento').toLowerCase()}`
    case 'ramo': return `entrou no caminho ${aspas(l.rotulo ?? '')} de ${nome}`
    case 'outros_casos': return `não se encaixou em nenhum caminho de ${nome}`
    case 'com_equipe': return 'foi passado para a equipe'
    case 'com_agente': return 'ficou com o agente de IA'
    case 'sistema': return `passou por ${nome}`
    case 'negocio_ganho': return 'fechou o negócio'
    default: return 'entrou nesta jornada'
  }
}

const doAssunto = (l: LeituraDoCaminho) => (l.assunto.frase ? ` (${l.assunto.frase})` : '')

/** O aviso à equipe: "{{contato.nome}} não respondeu à mensagem “X” (agendamento de 18/11 às 9h)." */
export function textoDoAviso(l: LeituraDoCaminho, catalogo: Catalogo): string {
  return `{{contato.nome}} ${oQueAconteceu(l, catalogo)}${doAssunto(l)}.`
}

/** A nota na conversa (a equipe já está na conversa da pessoa: sem o nome). */
export function textoDaNota(l: LeituraDoCaminho, catalogo: Catalogo): string {
  return `${capitalizar(oQueAconteceu(l, catalogo))}${doAssunto(l)}.`
}

// ── sugestões (códigos das listas do catálogo) ──────────────────────────────

export function sugerirMeta(l: LeituraDoCaminho, catalogo: Catalogo): string {
  const doEvento = (ev: string | null) => catalogo.goalTypes.find((g) => g.event && g.event === ev)?.code
  switch (l.situacao) {
    case 'missao_concluiu': return (l.missao && catalogo.missionTypes[l.missao]?.goalCode) || 'replied'
    case 'evento': return doEvento(l.evento) ?? 'replied'
    case 'negocio_ganho': return 'deal_won'
    case 'sistema': return /confirm/.test(String(l.origem?.nome ?? '').toLowerCase()) || l.assunto.tipo === 'agendamento' ? 'attendance_confirmed' : 'replied'
    case 'botao': case 'categoria':
      if (l.intencao === 'confirmar' && l.assunto.tipo === 'agendamento' && /confirm/.test(normalizar(l.rotulo ?? ''))) return 'attendance_confirmed'
      return 'replied'
    default: return 'replied'
  }
}

export function sugerirSaida(l: LeituraDoCaminho): string {
  switch (l.situacao) {
    case 'sem_resposta': return 'no_reply'
    case 'recusou': return 'declined'
    case 'botao': case 'categoria': return l.intencao === 'cancelar' || l.intencao === 'recusar' ? 'declined' : 'end'
    case 'com_equipe': return 'with_team'
    case 'com_agente': return 'with_agent'
    case 'nao_enviou': return 'not_sent'
    case 'falhou': return 'system_error'
    case 'missao_nao_concluiu': case 'missao_prazo': return 'mission_not_done'
    case 'nao_serviu': return 'invalid_answer'
    case 'outros_casos': return 'not_eligible'
    default: return 'end'
  }
}

export function sugerirMotivoDaEquipe(l: LeituraDoCaminho): string {
  if (l.intencao === 'cancelar') return 'wants_cancel'
  if (l.intencao === 'remarcar') return 'wants_reschedule'
  if (l.intencao === 'reclamar') return 'complaint'
  switch (l.situacao) {
    case 'sem_resposta': return 'no_reply'
    case 'missao_nao_concluiu': case 'missao_prazo': return 'mission_not_done'
    case 'incerto': return 'ai_unsure'
    default: return 'question'
  }
}

export function sugerirAcaoDaEquipe(l: LeituraDoCaminho): string {
  if (l.intencao === 'cancelar' || l.intencao === 'remarcar') return 'update_system'
  if (l.intencao === 'reclamar') return 'call'
  switch (l.situacao) {
    case 'sem_resposta': case 'nao_enviou': case 'missao_nao_concluiu': case 'missao_prazo': return 'call'
    case 'escreveu': case 'incerto': case 'nao_serviu': case 'categoria': case 'respondeu': return 'reply'
    default: return 'fyi'
  }
}

/** A missão que combina com a jornada: pela resposta que chega nela ou pela entrada. */
export function sugerirMissao(l: LeituraDoCaminho, entrada: Entrada | undefined): string {
  if (l.intencao === 'remarcar' || l.intencao === 'cancelar') return 'reschedule'
  for (const d of entrada?.doors ?? []) {
    if (d.type === 'schedule_list') return d.params.operation === 'cancelados_de_ontem' ? 'reschedule' : 'confirm_attendance'
    if (d.type === 'event') {
      const ev = String(d.params.event ?? '')
      if (ev === 'appointment_cancelled') return 'reschedule'
      if (ev.startsWith('appointment')) return 'confirm_attendance'
      if (ev.startsWith('deal.')) return 'recover_quote'
      if (ev === 'message.first' || ev === 'contact.created') return 'qualify_lead'
    }
    if (d.type === 'webhook') return 'qualify_lead'
  }
  return 'reschedule'
}

const rotuloDoCodigo = (lista: { code: string; label: string }[], code: string) => lista.find((i) => i.code === code)?.label ?? ''

/**
 * O que o caminho sugere para cada campo do passo (chave do parâmetro → valor).
 * O painel mostra "Pelo caminho que chega aqui: …  Usar" quando o valor é outro.
 */
export function sugestoesDoPasso(no: NoDoGrafo, l: LeituraDoCaminho, catalogo: Catalogo): Record<string, unknown> {
  switch (no.type) {
    case 'notify_team': return { message: textoDoAviso(l, catalogo), action: sugerirAcaoDaEquipe(l) }
    case 'internal_note': return { text: textoDaNota(l, catalogo) }
    case 'handoff_human': { const c = sugerirMotivoDaEquipe(l); return { reasonCode: c, reason: rotuloDoCodigo(catalogo.handoffReasons, c) } }
    case 'goal': { const c = sugerirMeta(l, catalogo); return { goalCode: c, label: rotuloDoCodigo(catalogo.goalTypes, c) } }
    case 'exit': { const c = sugerirSaida(l); return { reasonCode: c, reason: rotuloDoCodigo(catalogo.exitReasons, c) } }
    default: return {}
  }
}

/** O que o agente recebe sozinho no "Entregar ao agente" (o bloco `<jornada>`), em frases. */
export function contextoParaOAgente(l: LeituraDoCaminho, catalogo: Catalogo): string[] {
  const linhas = [`O que aconteceu: a pessoa ${oQueAconteceu(l, catalogo)}.`]
  if (l.assunto.frase) linhas.push(`O assunto: ${l.assunto.frase}.`)
  if (l.temResumo) linhas.push('O resumo da IA feito antes, nesta jornada.')
  return linhas
}

/**
 * Os parâmetros de um passo que acabou de entrar no desenho, preenchidos pelo caminho
 * (o setor do passo de equipe anterior, o aviso, o motivo, a meta, a missão…).
 */
export function preencherPeloCaminho(versao: VersaoDaJornada, id: string, catalogo: Catalogo, apoio: ApoioDoEditor): Record<string, unknown> {
  const no = versao.graph.nodes[id]
  if (!no) return {}
  const l = lerCaminho(versao, id, catalogo, apoio)
  const params: Record<string, unknown> = { ...sugestoesDoPasso(no, l, catalogo) }
  if (no.type === 'notify_team' && l.temResumo) params.include = ['subject', 'last_reply', 'ai_summary']
  if (no.type === 'notify_team' || no.type === 'handoff_human' || no.type === 'assign') {
    const setor = setorDoCaminho(versao, id) ?? (apoio.departments.length === 1 ? apoio.departments[0].id : null)
    if (setor && !no.params.departmentId) params.departmentId = setor
  }
  if (no.type === 'ai_mission') {
    const tipo = sugerirMissao(l, versao.entry)
    Object.assign(params, { missionType: tipo, ...paramsDaMissao(tipo, apoio) })
  }
  if (no.type === 'ai_summarize' && (l.situacao === 'sem_resposta' || l.situacao === 'missao_nao_concluiu')) params.focus = 'Para a equipe ligar para a pessoa'
  return params
}

/** O setor usado no passo de equipe mais próximo (o mesmo desenho costuma falar com o mesmo setor). */
function setorDoCaminho(versao: VersaoDaJornada, id: string): string | null {
  const vistos = new Set([id])
  let fila = [id]
  for (let nivel = 0; nivel < 12 && fila.length; nivel++) {
    const proxima: string[] = []
    for (const alvo of fila) {
      for (const { origem } of quemChega(versao, alvo)) {
        if (vistos.has(origem)) continue
        vistos.add(origem)
        const d = versao.graph.nodes[origem]?.params.departmentId
        if (typeof d === 'string' && d) return d
        proxima.push(origem)
      }
    }
    fila = proxima
  }
  // Nenhum antes: o de qualquer outro passo de equipe do desenho.
  for (const n of Object.values(versao.graph.nodes)) {
    const d = n.params.departmentId
    if (typeof d === 'string' && d) return d
  }
  return null
}

/** "Extrair dados": a instrução escrita sozinha a partir dos dados ("Ache na conversa: convênio e melhor horário."). */
export function instrucaoDosDados(campos: unknown): string {
  const lista = Array.isArray(campos) ? campos.map(String).filter((c) => c.trim()) : []
  if (!lista.length) return ''
  const juntos = lista.length === 1 ? lista[0] : `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`
  return `Ache na conversa: ${juntos}.`
}

/** A etapa do funil que costuma significar "qualificado" (a missão "Qualificar" nasce com ela). */
export function etapaDeQualificacao(apoio: ApoioDoEditor): string {
  return apoio.dealStages.find((e) => /qualific/.test(normalizar(e.name)))?.id ?? apoio.dealStages[1]?.id ?? apoio.dealStages[0]?.id ?? ''
}

/** Os parâmetros de um tipo de missão já com a etapa do funil escolhida (quando o tipo pede uma). */
export function paramsDaMissao(tipo: string, apoio: ApoioDoEditor): Record<string, unknown> {
  const params = paramsDoTipoDeMissao(tipo)
  const opcoes = params.missionOptions as Record<string, unknown> | undefined
  if (opcoes && 'moveTo' in opcoes && !opcoes.moveTo) opcoes.moveTo = etapaDeQualificacao(apoio)
  return params
}
