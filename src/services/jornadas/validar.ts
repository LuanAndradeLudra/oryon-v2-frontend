import type { ApoioDoEditor, Catalogo, Grafo, ProblemaDoDesenho, VersaoDaJornada } from './tipos'
import { passoDoCatalogo, saidasDoNo } from './catalogo'
import { HORAS_DA_JANELA, horasDesdeAUltimaMensagem, mensagensAntes, modeloAntes, PASSOS_DE_TEXTO_LIVRE, variaveisSemReserva } from './regrasDoWhatsApp'

/**
 * ORY-60 — validação ao vivo do desenho (§2.11). Função pura: a tela chama a cada
 * mudança. No produto, a mesma regra roda no backend em
 * `POST /v1/journeys/{id}/validate` e na publicação; esta cópia serve para o
 * aviso aparecer na hora, sem ir ao servidor.
 */

const VARIAVEIS_FIXAS = [
  'contato.nome', 'contato.telefone', 'contato.email', 'contato.etapa', 'contato.origem',
  'conversa.atendente', 'conversa.linha',
  'evento.id', 'evento.profissional', 'evento.data', 'evento.servico',
  'conector.agenda.id', 'conector.agenda.preparo', 'conector.agenda.status',
  'contexto.tentativa', 'contexto.resposta', 'contexto.resultado',
]

/** Limites do motor (§2.6, §2.7, §2.12). No produto, o plano pode baixar estes números. */
export const LIMITES_DO_MOTOR = { holdMaxHours: 72, maxSteps: 60, maxTtlDays: 90 }

/**
 * Um "Segurar a conversa" logo antes (até 3 passos, num caminho sem ramos)
 * segura esta espera. É o padrão das receitas: enviar → segurar → aguardar.
 */
export function seguraAntes(graph: Grafo, id: string): boolean {
  const antes = (alvo: string) => Object.keys(graph.nodes).filter((k) => Object.values(graph.nodes[k].outputs).includes(alvo))
  let atual = id
  for (let i = 0; i < 3; i++) {
    const p = antes(atual)
    if (p.length !== 1) return false
    if (graph.nodes[p[0]].type === 'hold_conversation') return true
    atual = p[0]
  }
  return false
}

/** Um nome de dado em forma de variável: "Melhor horário" → `melhor_horario`. */
export function chaveDoDado(nome: string): string {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/** Variáveis que os próprios passos produzem: o que a IA extraiu e o resumo. */
export function variaveisDoDesenho(graph: Grafo): string[] {
  const out = new Set<string>()
  for (const no of Object.values(graph.nodes)) {
    if (no.type === 'ai_extract' && Array.isArray(no.params.fields)) {
      for (const f of no.params.fields) if (typeof f === 'string' && f.trim()) out.add(`contexto.extraido.${chaveDoDado(f)}`)
    }
    if (no.type === 'ai_summarize' && no.params.saveAs === 'context') out.add('contexto.resumo')
  }
  return [...out]
}

/** O nome do modelo como as telas mostram: `lembrete_confirmacao` → "Lembrete confirmacao". */
const nomeDoModelo = (nome: string) => { const t = nome.replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1) }

function horasDe(v: unknown): number {
  if (!v || typeof v !== 'object') return 0
  const { amount, unit } = v as { amount?: unknown; unit?: unknown }
  const n = Number(amount) || 0
  return unit === 'minutes' ? n / 60 : unit === 'days' ? n * 24 : n
}

export function variaveisConhecidas(catalogo: Catalogo): Set<string> {
  const s = new Set<string>(VARIAVEIS_FIXAS)
  for (const e of catalogo.events) for (const v of e.variables) s.add(v)
  for (const o of catalogo.connectorOperations) for (const v of o.variables) s.add(v)
  return s
}

/** `{{contato.nome|"cliente"}}` e `{{evento.data | data:"DD/MM"}}` → `contato.nome`, `evento.data`. */
export function variaveisNoTexto(texto: string): string[] {
  const achadas: string[] = []
  for (const m of texto.matchAll(/\{\{\s*([a-zA-Z_][\w.*]*)/g)) achadas.push(m[1])
  return achadas
}

function vazio(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object' && 'amount' in (v as Record<string, unknown>)) return !(Number((v as { amount: unknown }).amount) > 0)
  return false
}

function textosDoNo(params: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const v of Object.values(params)) {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.push(x)
  }
  return out
}

export function validarDesenho(versao: Pick<VersaoDaJornada, 'graph' | 'entry' | 'goals' | 'rules'>, catalogo: Catalogo, apoio: ApoioDoEditor): ProblemaDoDesenho[] {
  const problemas: ProblemaDoDesenho[] = []
  // Webhook de entrada e evento externo trazem os campos que o operador mapeou
  // ("ouvir um exemplo"): qualquer `evento.*` vale nessas portas.
  const eventoLivre = versao.entry.doors.some((d) => d.type === 'webhook' || (d.type === 'event' && d.params.event === 'external.event'))
  const { graph, entry, goals } = versao
  const ids = Object.keys(graph.nodes)
  const conhecidas = variaveisConhecidas(catalogo)
  for (const v of variaveisDoDesenho(graph)) conhecidas.add(v)

  if (entry.doors.length === 0) problemas.push({ severity: 'error', code: 'no_door', message: 'A jornada não tem porta de entrada.' })
  if (!graph.start || !graph.nodes[graph.start]) problemas.push({ severity: 'error', code: 'no_start', message: 'Ligue a entrada ao primeiro passo.' })
  if (ids.length > LIMITES_DO_MOTOR.maxSteps) problemas.push({ severity: 'error', code: 'too_many_steps', message: `A jornada tem ${ids.length} passos; o limite é ${LIMITES_DO_MOTOR.maxSteps}.` })
  const janela = versao.rules?.window
  if (janela && !janela.days.length) problemas.push({ severity: 'error', code: 'send_window_empty', message: 'O horário de envio não tem nenhum dia marcado (Configurações).' })
  if (janela && janela.from >= janela.to) problemas.push({ severity: 'error', code: 'send_window_invalid', message: 'No horário de envio, o "até" precisa ser depois do "das" (Configurações).' })
  if (!(goals.ttlDays >= 1) || goals.ttlDays > LIMITES_DO_MOTOR.maxTtlDays) problemas.push({ severity: 'error', code: 'ttl_out_of_range', message: `O prazo máximo de uma inscrição vai de 1 a ${LIMITES_DO_MOTOR.maxTtlDays} dias (Configurações).` })

  // Regras do WhatsApp (P0, 17/11): quanto tempo pode ter passado desde a última mensagem da pessoa em cada passo.
  const janelaPorPasso = horasDesdeAUltimaMensagem(versao)

  for (const id of ids) {
    const no = graph.nodes[id]
    const passo = passoDoCatalogo(catalogo, no.type)
    const nome = no.label || passo?.label || no.type
    if (!passo) {
      problemas.push({ severity: 'error', code: 'unknown_step', message: `"${nome}": passo que não existe no catálogo.`, nodeId: id })
      continue
    }
    if (passo.availability === 'soon') {
      problemas.push({ severity: 'error', code: 'step_soon', message: `"${nome}" chega no próximo épico. Tire do desenho para publicar.`, nodeId: id })
    }
    for (const campo of passo.params) {
      if (!campo.required) continue
      if (campo.showIf && !(Array.isArray(campo.showIf.equals) ? campo.showIf.equals.includes(no.params[campo.showIf.key]) : no.params[campo.showIf.key] === campo.showIf.equals)) continue
      if (vazio(no.params[campo.key])) problemas.push({ severity: 'error', code: 'required', message: `"${nome}": falta preencher "${campo.label}".`, nodeId: id, field: campo.key })
    }
    // saídas
    for (const s of saidasDoNo(no, catalogo)) {
      const destino = no.outputs[s.key]
      if (!destino) {
        problemas.push({
          severity: 'error',
          code: s.key === 'next' ? 'no_exit' : 'branch_without_target',
          message: s.key === 'next' ? `"${nome}" não tem saída. Ligue a um próximo passo, a "Meta atingida" ou a "Sair".` : `"${nome}": o caminho "${s.label}" não leva a lugar nenhum.`,
          nodeId: id,
        })
      } else if (!graph.nodes[destino]) {
        problemas.push({ severity: 'error', code: 'broken_link', message: `"${nome}" aponta para um passo apagado.`, nodeId: id })
      }
    }
    // prazos
    if (no.type === 'wait' && no.params.mode === 'duration' && vazio(no.params.duration)) problemas.push({ severity: 'error', code: 'wait_without_deadline', message: `"${nome}": espera sem prazo.`, nodeId: id })
    if ((no.type === 'wait_event' || no.type === 'send_and_wait' || no.type === 'ask_question' || no.type === 'branch_message_status') && vazio(no.params.timeout)) problemas.push({ severity: 'error', code: 'wait_without_deadline', message: `"${nome}": espera sem prazo.`, nodeId: id })
    if (no.type === 'hold_conversation' && vazio(no.params.duration)) problemas.push({ severity: 'error', code: 'hold_without_deadline', message: `"${nome}" segura a conversa sem prazo.`, nodeId: id })
    if (no.type === 'hold_conversation' && horasDe(no.params.duration) > LIMITES_DO_MOTOR.holdMaxHours) problemas.push({ severity: 'error', code: 'hold_too_long', message: `"${nome}": a jornada segura a conversa por no máximo ${LIMITES_DO_MOTOR.holdMaxHours} h.`, nodeId: id, field: 'duration' })
    // A vez de responder (16/11): esperar botão sem segurar a conversa faz o agente responder junto
    // (duas respostas); segurar sem caminho para texto livre manda essa mensagem ao agente, fora da jornada.
    if (no.type === 'send_and_wait' && no.params.holdConversation === false) problemas.push({ severity: 'warning', code: 'buttons_without_hold', message: `"${nome}" espera a resposta sem segurar a conversa: o agente também responde ao botão, e a pessoa recebe duas respostas.`, nodeId: id, field: 'holdConversation' })
    if (no.type === 'wait_event') {
      const eventos = (Array.isArray(no.params.events) ? no.params.events : []) as { event?: string }[]
      const segurada = seguraAntes(graph, id)
      if (!segurada && eventos.some((e) => e.event === 'template.button_replied')) problemas.push({ severity: 'warning', code: 'buttons_without_hold', message: `"${nome}" espera um botão sem segurar a conversa: o agente também responde ao botão, e a pessoa recebe duas respostas. Use "Enviar e esperar resposta" ou ponha "Segurar a conversa" antes.`, nodeId: id })
      if (segurada && !eventos.some((e) => e.event === 'message.received')) problemas.push({ severity: 'warning', code: 'held_without_free_text', message: `"${nome}" segura a conversa, mas não tem caminho para quem escrever outra coisa. Essa mensagem vai direto ao agente, com o contexto da jornada, e a jornada segue esperando.`, nodeId: id })
    }
    if (no.type === 'ai_mission' && horasDe(no.params.deadline) > 24 * 14) problemas.push({ severity: 'warning', code: 'mission_long', message: `"${nome}": missão com prazo de mais de 14 dias. Confira se é isso mesmo.`, nodeId: id })
    // status de qual mensagem
    if (no.type === 'branch_message_status' && no.params.messageNodeId) {
      const alvo = graph.nodes[String(no.params.messageNodeId)]
      if (!alvo) problemas.push({ severity: 'error', code: 'broken_reference', message: `"${nome}": a mensagem escolhida foi apagada. Escolha outra.`, nodeId: id, field: 'messageNodeId' })
      else if (!mensagensAntes(id, graph).includes(String(no.params.messageNodeId))) problemas.push({ severity: 'error', code: 'message_not_before', message: `"${nome}": a mensagem escolhida não vem antes deste passo. Escolha uma mensagem do mesmo caminho, antes dele.`, nodeId: id, field: 'messageNodeId' })
    }
    // Botões que o "Aguardar resposta" espera: existem no modelo de antes, cada um num caminho só, e nenhum sem caminho.
    if (no.type === 'wait_event') {
      const respostas = (Array.isArray(no.params.events) ? no.params.events : []) as { key?: string; label?: string; event?: string; match?: string }[]
      const comBotao = respostas.filter((r) => r.event === 'template.button_replied')
      if (comBotao.length) {
        const antes = modeloAntes(id, graph, apoio)
        if (!antes) {
          problemas.push({ severity: 'warning', code: 'buttons_without_message', message: `"${nome}" espera um botão, mas não há mensagem com modelo antes dele.`, nodeId: id, field: 'events' })
        } else if (antes.modelo && !antes.modelo.buttons.length) {
          problemas.push({ severity: 'warning', code: 'buttons_without_message', message: `"${nome}" espera um botão, mas o modelo “${nomeDoModelo(antes.modelo.name)}” não tem botões.`, nodeId: id, field: 'events' })
        } else if (antes.modelo) {
          const botoes = antes.modelo.buttons
          const usados = new Map<string, string>()
          for (const r of comBotao) {
            for (const b of String(r.match ?? '').split('|').map((x) => x.trim()).filter(Boolean)) {
              if (!botoes.includes(b)) problemas.push({ severity: 'error', code: 'button_not_in_template', message: `"${nome}": o caminho “${r.label}” espera o botão “${b}”, que não existe no modelo “${nomeDoModelo(antes.modelo.name)}”. Escolha os botões de novo.`, nodeId: id, field: 'events' })
              else if (usados.has(b) && usados.get(b) !== r.key) problemas.push({ severity: 'error', code: 'button_in_two_paths', message: `"${nome}": o botão “${b}” está em dois caminhos. Deixe em um só.`, nodeId: id, field: 'events' })
              else usados.set(b, r.key ?? '')
            }
          }
          const livre = respostas.find((r) => r.event === 'message.received')
          for (const b of botoes) {
            if (!usados.has(b)) problemas.push({ severity: 'warning', code: 'button_without_path', message: `"${nome}": o botão “${b}” não leva a nenhum caminho. Quem tocar nele ${livre ? `vai por “${livre.label}”` : 'fica esperando até o prazo acabar'}.`, nodeId: id, field: 'events' })
          }
        }
      }
    }
    // modelo e linha
    if (no.type === 'send_and_wait') {
      const modelo = apoio.templates.find((t) => t.id === no.params.templateId)
      if (modelo) {
        const respostas = (Array.isArray(no.params.replies) ? no.params.replies : []) as { label?: string }[]
        const sumiu = respostas.find((r) => r.label && !modelo.buttons.includes(r.label))
        if (sumiu) problemas.push({ severity: 'error', code: 'button_not_in_template', message: `"${nome}": o modelo mudou e o botão “${sumiu.label}” não existe mais nele. Escolha o modelo de novo para atualizar os caminhos.`, nodeId: id, field: 'templateId' })
        const semCaminho = modelo.buttons.find((b) => !respostas.some((r) => r.label === b))
        if (!sumiu && semCaminho) problemas.push({ severity: 'warning', code: 'button_without_path', message: `"${nome}": o botão “${semCaminho}” do modelo não tem caminho. Escolha o modelo de novo para criar os caminhos.`, nodeId: id, field: 'templateId' })
      }
      if (modelo && !modelo.buttons.length) problemas.push({ severity: 'warning', code: 'template_without_buttons', message: `"${nome}": o modelo não tem botões; só ficam os caminhos "Escreveu outra coisa" e "Sem resposta".`, nodeId: id })
    }
    if (no.type === 'send_template' || no.type === 'send_and_wait') {
      const linha = no.params.whatsappNumberId as string | undefined
      const modelo = apoio.templates.find((t) => t.id === no.params.templateId)
      if (modelo) {
        if (modelo.status !== 'APPROVED') problemas.push({ severity: 'error', code: 'template_not_approved', message: `"${nome}": o modelo "${nomeDoModelo(modelo.name)}" ainda não foi aprovado pela Meta.`, nodeId: id })
        if (modelo.whatsappNumberId && linha && modelo.whatsappNumberId !== linha) problemas.push({ severity: 'error', code: 'template_line_mismatch', message: `"${nome}": o modelo "${nomeDoModelo(modelo.name)}" é de outra linha de WhatsApp.`, nodeId: id })
        const vars = Array.isArray(no.params.variables) ? (no.params.variables as unknown[]).filter((v) => typeof v === 'string' && v.trim()) : []
        // A Meta recusa a mensagem com um dado vazio: cada dado que pode faltar precisa do texto "se vier vazio".
        const semReserva = variaveisSemReserva(no.params.variables)
        if (semReserva.length) {
          const n = semReserva.length
          problemas.push({
            severity: semReserva.some((k) => k.startsWith('contato.')) ? 'error' : 'warning',
            code: 'template_variable_without_fallback',
            message: `"${nome}": ${n === 1 ? 'um dado da mensagem não tem' : `${n} dados da mensagem não têm`} o texto para quando vier vazio. A Meta recusa a mensagem com um dado vazio: toque na etiqueta marcada e escreva o que vai no lugar (ex.: “cliente”).`,
            nodeId: id,
            field: 'variables',
          })
        }
        if (vars.length < modelo.variableCount) problemas.push({ severity: 'error', code: 'template_variables', message: `"${nome}": o modelo pede ${modelo.variableCount} variável(is); há ${vars.length}.`, nodeId: id })
        if (modelo.category === 'MARKETING' && !entry.criteria.conditions.some((c) => c.field === 'contato.opt_in_marketing')) {
          problemas.push({ severity: 'warning', code: 'marketing_opt_in', message: `"${nome}" usa modelo de marketing: só recebe quem aceitou marketing. Os outros ficam de fora no envio.`, nodeId: id })
        }
      }
    }
    // variáveis
    for (const t of textosDoNo(no.params)) {
      for (const v of variaveisNoTexto(t)) {
        if (!conhecidas.has(v) && !(eventoLivre && v.startsWith('evento.'))) problemas.push({ severity: 'error', code: 'unknown_variable', message: `"${nome}": a variável {{${v}}} não existe.`, nodeId: id })
      }
    }
    // Opções da pergunta (regra do WhatsApp): até 3 botões de 20 letras; de 4 a 10, uma lista de 24 letras.
    if (no.type === 'ask_question' && no.params.answerType === 'option') {
      const opcoes = (Array.isArray(no.params.options) ? no.params.options : []).map((o) => String(typeof o === 'string' ? o : (o as { label?: unknown })?.label ?? ''))
      if (opcoes.length > 10) problemas.push({ severity: 'error', code: 'question_too_many_options', message: `"${nome}": ${opcoes.length} opções. O WhatsApp aceita até 10.`, nodeId: id, field: 'options' })
      const limite = opcoes.length <= 3 ? 20 : 24
      const longa = opcoes.find((o) => o.length > limite)
      if (longa) problemas.push({ severity: 'error', code: 'question_option_too_long', message: `"${nome}": a opção “${longa}” passa de ${limite} letras, e o WhatsApp corta ou recusa. Encurte.`, nodeId: id, field: 'options' })
    }
    // Janela de 24 h (regra do WhatsApp): mensagem livre só até 24 h depois da última mensagem da PESSOA.
    if (PASSOS_DE_TEXTO_LIVRE.has(no.type) && janelaPorPasso.has(id)) {
      const h = janelaPorPasso.get(id) ?? Infinity
      const oQue = no.type === 'ai_mission' ? 'começa com uma mensagem do agente' : 'manda mensagem livre'
      if (!Number.isFinite(h)) {
        problemas.push({ severity: 'error', code: 'window_not_guaranteed', message: `"${nome}" ${oQue}, mas neste ponto a pessoa pode não ter escrito nada. O WhatsApp só deixa mensagem livre até 24 h depois da última mensagem dela: use um modelo aprovado ou ponha este passo depois de uma resposta.`, nodeId: id })
      } else if (h >= HORAS_DA_JANELA) {
        problemas.push({ severity: 'warning', code: 'window_not_guaranteed', message: `"${nome}" ${oQue}, mas podem ter passado até ${Math.round(h)} h desde a última mensagem da pessoa (o WhatsApp só deixa até 24 h). Use um modelo aprovado ou encurte as esperas antes.`, nodeId: id })
      }
    }
    if (passo.cost.credits > 0 && passo.availability === 'available') {
      problemas.push({ severity: 'warning', code: 'ai_cost', message: `"${nome}" usa IA: ${passo.cost.label} por pessoa que passar por aqui.`, nodeId: id })
    }
  }

  // passos soltos: nada chega até eles
  const alcancados = new Set<string>()
  const fila = graph.start ? [graph.start] : []
  while (fila.length) {
    const id = fila.shift()!
    if (alcancados.has(id) || !graph.nodes[id]) continue
    alcancados.add(id)
    for (const d of Object.values(graph.nodes[id].outputs)) if (d) fila.push(d)
  }
  for (const id of ids) {
    if (!alcancados.has(id)) {
      const no = graph.nodes[id]
      problemas.push({ severity: 'warning', code: 'unreachable', message: `"${no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type}" está solto: nada chega até ele. Ligue um passo de cima a ele (arraste a bolinha de baixo do outro cartão até este) ou apague-o.`, nodeId: id })
    }
  }

  const temMeta = goals.goals.length > 0 || ids.some((id) => graph.nodes[id].type === 'goal')
  if (!temMeta) problemas.push({ severity: 'warning', code: 'no_goal', message: 'Sem meta: os resultados não vão mostrar taxa de sucesso.' })

  return problemas
}
