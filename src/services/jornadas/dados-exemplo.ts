import type {
  ApoioDoEditor,
  Entrada,
  Grafo,
  Inscricao,
  ItemDaLinhaDoTempo,
  ItemDoRegistro,
  Jornada,
  Metas,
  NoDoGrafo,
  Receita,
  ResultadosDaJornada,
  VerificacaoDeEntrada,
  VersaoDaJornada,
} from './tipos'
import { CATALOGO_EXEMPLO, paramsDoTipoDeMissao } from './catalogo'
import { CODIGO_LIVRE, codigoDoRotulo, METAS_PADRAO, MOTIVOS_DA_EQUIPE, MOTIVOS_DE_SAIDA } from './padroes'
import { TARIFA_MEDIA_DA_META_BRL } from './custos'

/**
 * ORY-60 — dados de EXEMPLO do protótipo. Nomes e telefones são inventados.
 * Nada aqui vai ao servidor. Quando a ORY-61/62 ligar a API, este arquivo sai.
 */

// ── apoio do editor (no produto: rotas da v1 do ORY-11) ──────────────────────

export const APOIO_EXEMPLO: ApoioDoEditor = {
  whatsappNumbers: [
    { id: 'l_alto', name: 'Recepção Alto da Serra', phoneMasked: '+55 24 •••• 0101' },
    { id: 'l_petro', name: 'Recepção Petrópolis', phoneMasked: '+55 24 •••• 0202' },
    { id: 'l_itai', name: 'Recepção Itaipava', phoneMasked: '+55 24 •••• 0303' },
  ],
  templates: [
    {
      id: 't_lembrete', name: 'lembrete_confirmacao_final', category: 'UTILITY', status: 'APPROVED', whatsappNumberId: null,
      body: 'Olá, {{1}}! Lembrete da sua consulta em {{2}} às {{3}} com {{4}}. Você confirma?', variableCount: 4,
      buttons: ['Confirmar', 'Remarcar', 'Cancelar'],
    },
    {
      id: 't_remarcar', name: 'convite_remarcar', category: 'MARKETING', status: 'APPROVED', whatsappNumberId: null,
      body: 'Oi, {{1}}! Vimos que sua consulta de {{2}} foi cancelada. Quer escolher um novo horário?', variableCount: 2,
      buttons: ['Quero remarcar', 'Agora não'],
    },
    {
      id: 't_boas_vindas', name: 'boas_vindas_site', category: 'UTILITY', status: 'PENDING', whatsappNumberId: null,
      body: 'Oi, {{1}}! Recebemos seu contato pelo site. Como podemos ajudar?', variableCount: 1, buttons: [],
    },
    {
      id: 't_pesquisa', name: 'pesquisa_pos_consulta', category: 'UTILITY', status: 'APPROVED', whatsappNumberId: null,
      body: 'Oi, {{1}}! Como foi sua consulta de ontem com {{2}}?', variableCount: 2, buttons: ['Ótima', 'Boa', 'Ruim'],
    },
    {
      id: 't_preparo', name: 'preparo_de_exame', category: 'UTILITY', status: 'APPROVED', whatsappNumberId: null,
      body: 'Oi, {{1}}! Seu exame é em {{2}} às {{3}}. Preparo: {{4}}.', variableCount: 4, buttons: ['Entendi'],
    },
    {
      id: 't_volta', name: 'faz_tempo_que_nao_vem', category: 'MARKETING', status: 'APPROVED', whatsappNumberId: 'l_petro',
      body: 'Oi, {{1}}! Faz tempo que você não vem. Quer marcar um retorno?', variableCount: 1, buttons: ['Quero marcar', 'Agora não'],
    },
  ],
  tags: [
    { id: 'tg_nao_remarcar', name: 'Não quer remarcar' },
    { id: 'tg_lead_frio', name: 'Lead frio' },
    { id: 'tg_vip', name: 'VIP' },
    { id: 'tg_paciente', name: 'Paciente' },
  ],
  stages: [
    { id: 's_novo', name: 'Novo contato' },
    { id: 's_agendado', name: 'Agendado' },
    { id: 's_paciente', name: 'Paciente' },
  ],
  dealStages: [
    { id: 'f_novo', name: 'Novo' },
    { id: 'f_contato', name: 'Em contato' },
    { id: 'f_qualificado', name: 'Qualificado' },
    { id: 'f_proposta', name: 'Proposta enviada' },
    { id: 'f_agendado', name: 'Agendado' },
  ],
  users: [
    { id: 'u_gabi', name: 'Gabi (gestora)' },
    { id: 'u_ana', name: 'Ana (recepção)' },
    { id: 'u_rui', name: 'Rui (supervisor)' },
  ],
  departments: [
    { id: 'd_recepcao', name: 'Recepção' },
    { id: 'd_gestao', name: 'Gestão' },
    { id: 'd_comercial', name: 'Comercial' },
  ],
  customFields: [
    { id: 'cf_convenio', name: 'Convênio', type: 'text', options: ['Particular', 'Unimed', 'Bradesco Saúde', 'Amil', 'SulAmérica'] },
    { id: 'cf_interesse', name: 'Interesse', type: 'text' },
    { id: 'cf_melhor_horario', name: 'Melhor horário', type: 'text' },
    { id: 'cf_ultima_visita', name: 'Última visita', type: 'date' },
  ],
  segments: [
    { id: 'sg_sumidos', name: 'Sem conversa há 180 dias', size: 1_240 },
    { id: 'sg_mensalistas', name: 'Etiqueta "Mensalista"', size: 86 },
    { id: 'sg_vip', name: 'Etiqueta "VIP"', size: 312 },
    { id: 'sg_aniversario', name: 'Aniversariantes do mês', size: 410 },
  ],
  // O logo oficial da Feegow (enviado pelo João em 16/11), recortado com cantos de 24%.
  connector: { name: 'Feegow', logoUrl: '/conectores/feegow.png' },
  // O tenant de exemplo é uma clínica: as sugestões de texto começam pelas de clínica.
  segment: 'clinica',
}

/** Contatos para a inscrição manual (no produto: busca em GET /v1/contacts, mascarada). */
export { CONTEXTO_DE_TESTE as CONTEXTO_DE_TESTE_EXEMPLO } from './simulador'

export const CONTATOS_PARA_INSCREVER = [
  { id: 'c_01', name: 'Marina C.', phoneMasked: '+55 24 •••• 4410' },
  { id: 'c_02', name: 'Otávio R.', phoneMasked: '+55 24 •••• 1187' },
  { id: 'c_03', name: 'Paula G.', phoneMasked: '+55 24 •••• 9023' },
  { id: 'c_04', name: 'Rafael S.', phoneMasked: '+55 24 •••• 6652' },
  { id: 'c_05', name: 'Sofia M.', phoneMasked: '+55 24 •••• 3018' },
  { id: 'c_06', name: 'Tiago A.', phoneMasked: '+55 24 •••• 7745' },
  { id: 'c_07', name: 'Vera L.', phoneMasked: '+55 24 •••• 2290' },
  { id: 'c_08', name: 'Wagner P.', phoneMasked: '+55 24 •••• 5531' },
]

// ── montador de desenho ──────────────────────────────────────────────────────

type DefDeNo = [id: string, type: string, params: Record<string, unknown>, outputs: Record<string, string | null>, x: number, y: number, label?: string]

function grafo(start: string, defs: DefDeNo[]): Grafo {
  const nodes: Record<string, NoDoGrafo> = {}
  const layout: Grafo['layout'] = {}
  for (const [id, type, params, outputs, x, y, label] of defs) {
    nodes[id] = { type, params, outputs, ...(label ? { label } : {}) }
    void x; void y // posições antigas: o editor organiza sozinho ao abrir (cartões compactos)
  }
  return { start, nodes: comCodigos(segurarAsEsperas(nodes)), layout }
}

/**
 * As receitas com os códigos das listas padronizadas (17/11): o nome da meta, o motivo
 * de saída e o da entrega à equipe viram itens da lista (com o rótulo dela); o que não tem
 * par fica como "Outro", com o nome escrito. O aviso ganha o "o que fazer", a missão as
 * escolhas e restrições do tipo, e o negócio a etapa pelo id.
 */
const SINONIMOS: Record<string, string> = {
  'Consulta confirmada': 'attendance_confirmed', 'Visita confirmada': 'attendance_confirmed', 'Consulta remarcada': 'rescheduled',
  'Respondeu a pesquisa': 'rated', 'Voltou a conversar': 'came_back',
  'Com o agente': 'with_agent', 'Não quis remarcar': 'declined', 'Não quer agora': 'declined', 'Foi para a retomada': 'with_team',
  'Alguém assumiu': 'with_team', 'Com um corretor': 'with_team', 'Com uma pessoa': 'with_team', 'Fim das boas-vindas': 'end',
  'Sem documentos': 'no_reply', 'Sem confirmação': 'no_reply', 'Problema com a compra': 'complaint',
}
function comCodigos(nodes: Record<string, NoDoGrafo>): Record<string, NoDoGrafo> {
  const padrao = (lista: { code: string; label: string }[], rotulo: unknown) => {
    const porSinonimo = SINONIMOS[String(rotulo ?? '')]
    const item = lista.find((i) => i.code === porSinonimo) ?? lista.find((i) => i.code === codigoDoRotulo(lista, rotulo))
    return item ? { code: item.code, label: item.label } : { code: CODIGO_LIVRE, label: String(rotulo ?? '') }
  }
  const nos: Record<string, NoDoGrafo> = {}
  for (const [id, no] of Object.entries(nodes)) {
    const p = { ...no.params }
    if (no.type === 'goal') { const x = padrao(METAS_PADRAO, p.label); p.goalCode = x.code; p.label = x.label }
    if (no.type === 'exit') { const x = padrao(MOTIVOS_DE_SAIDA, p.reason); p.reasonCode = x.code; p.reason = x.label }
    if (no.type === 'handoff_human') { const x = padrao(MOTIVOS_DA_EQUIPE, p.reason); p.reasonCode = x.code; p.reason = x.label }
    if (no.type === 'notify_team' && !p.action) {
      const m = String(p.message ?? '')
      p.action = /não respondeu|sem resposta|não confirmou|ainda não|avaliou|faltam|não foi confirmado/.test(m) ? 'call' : 'fyi'
      p.include = p.include ?? ['subject', 'last_reply']
    }
    if (no.type === 'ai_mission' && !p.restrictions) Object.assign(p, paramsDoTipoDeMissao(String(p.missionType ?? 'reschedule')), { limits: '' })
    if (no.type === 'deal_action' && p.stageName && !p.stageId) p.stageId = APOIO_EXEMPLO.dealStages.find((e) => e.name === p.stageName)?.id ?? ''
    nos[id] = { ...no, params: p }
  }
  return nos
}

const horasDaDuracao = (d: unknown) => {
  const { amount = 24, unit = 'hours' } = (d ?? {}) as { amount?: number; unit?: string }
  return unit === 'days' ? amount * 24 : unit === 'minutes' ? amount / 60 : amount
}

/**
 * As receitas que esperam um botão seguram a conversa antes (16/11): sem isso, o
 * agente também responderia ao botão e a pessoa receberia duas respostas. E quem
 * escreve outra coisa em vez de apertar o botão vai ao agente, com uma nota.
 * (A validação avisa quando um desenho não faz isso: `buttons_without_hold`.)
 */
function segurarAsEsperas(nodes: Record<string, NoDoGrafo>): Record<string, NoDoGrafo> {
  const nos = { ...nodes }
  for (const [id, no] of Object.entries(nodes)) {
    if (no.type !== 'wait_event') continue
    const eventos = (no.params.events ?? []) as { key: string; label: string; event: string }[]
    if (!eventos.some((e) => e.event === 'template.button_replied')) continue
    const antes = Object.keys(nos).filter((k) => Object.values(nos[k].outputs).includes(id))
    if (antes.some((k) => nos[k].type === 'hold_conversation')) continue
    const segurar = `${id}_segurar`
    nos[segurar] = { type: 'hold_conversation', params: { duration: { amount: Math.min(72, horasDaDuracao(no.params.timeout)), unit: 'hours' } }, outputs: { next: id } }
    for (const k of antes) nos[k] = { ...nos[k], outputs: Object.fromEntries(Object.entries(nos[k].outputs).map(([saida, destino]) => [saida, destino === id ? segurar : destino])) }
    if (!eventos.some((e) => e.event === 'message.received')) {
      const agente = `${id}_texto`
      const sair = `${id}_texto_sair`
      nos[id] = { ...no, params: { ...no.params, events: [...eventos, { key: 'outra', label: 'Escreveu outra coisa', event: 'message.received' }] }, outputs: { ...no.outputs, outra: agente } }
      nos[agente] = { type: 'handoff_agent', label: 'Agente responde', params: { note: 'Respondeu com um texto em vez de apertar um botão. Veja a conversa e ajude.' }, outputs: { next: sair } }
      nos[sair] = { type: 'exit', params: { reason: 'Com o agente' }, outputs: {} }
    }
  }
  return nos
}

const H24 = { amount: 24, unit: 'hours' }

// ── 1. Reduzir faltas (confirmação de consulta) — §2.14 do desenho ──────────

const ENTRADA_CONFIRMACAO: Entrada = {
  doors: [{ id: 'p_agenda', type: 'schedule_list', params: { time: '11:00', operation: 'agenda_do_dia', dayOffset: 1, weekdays: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] } }],
  criteria: {
    mode: 'all',
    conditions: [
      { field: 'contato.telefone_valido', op: 'eq', value: true },
      { field: 'conector.agenda.status', op: 'neq', value: 'confirmada' },
    ],
  },
  reentry: { mode: 'per_subject', subjectKey: 'agendamento:{{conector.agenda.id}}' },
  skipIfHeldByOtherJourney: true,
}

const METAS_CONFIRMACAO: Metas = {
  goals: [{ id: 'g_confirmada', label: 'Consulta confirmada', event: 'appointment_confirmed', sameSubject: true }],
  exitIf: [
    { id: 'x_passou', label: 'A consulta passou', event: 'time.subject_passed' },
    { id: 'x_optout', label: 'Pediu para não receber', event: 'contact.opted_out' },
    { id: 'x_humano', label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' },
  ],
  ttlDays: 3,
}

const GRAFO_CONFIRMACAO = grafo('n_aguardar', [
  // P1 (17/11): o padrão único. O lembrete JÁ espera a resposta (antes eram 3 passos: enviar → segurar → aguardar).
  ['n_aguardar', 'send_and_wait', {
    whatsappNumberId: 'l_alto', templateId: 't_lembrete',
    variables: ['{{contato.nome|"paciente"}}', '{{conector.agenda.data | data:"DD/MM"}}', '{{conector.agenda.hora}}', '{{conector.agenda.profissional|"nossa equipe"}}'],
    replies: [{ key: 'confirmar', label: 'Confirmar' }, { key: 'remarcar', label: 'Remarcar' }, { key: 'cancelar', label: 'Cancelar' }],
    timeout: H24, holdConversation: true, ifHuman: 'wait_then_skip',
  }, { confirmar: 'n_confirmar', remarcar: 'n_agente_cancelar', cancelar: 'n_agente_cancelar', outra_resposta: 'n_agente_outra', sem_resposta: 'n_avisar' }, 360, 170, 'Lembrete da consulta'],
  ['n_confirmar', 'connector_call', { operation: 'confirmar_agendamento' }, { next: 'n_texto_ok' }, 0, 380, 'Confirmar no sistema'],
  ['n_texto_ok', 'send_text', { text: 'Pronto, {{contato.nome}}! Sua consulta de {{conector.agenda.data | data:"DD/MM"}} às {{conector.agenda.hora}} está confirmada.' }, { next: 'n_meta' }, 0, 540, 'Avisar que confirmou'],
  ['n_meta', 'goal', { label: 'Consulta confirmada' }, {}, 0, 700],
  ['n_agente_cancelar', 'handoff_agent', { note: 'Respondeu ao lembrete: quer cancelar ou remarcar a consulta de {{conector.agenda.data | data:"DD/MM"}}.' }, { next: 'n_sair_agente' }, 300, 380, 'Agente trata o cancelamento'],
  ['n_agente_outra', 'handoff_agent', { note: 'Respondeu ao lembrete da consulta de amanhã com uma mensagem.' }, { next: 'n_sair_agente' }, 600, 380, 'Agente responde'],
  ['n_sair_agente', 'exit', { reason: 'Com o agente' }, {}, 450, 560],
  ['n_avisar', 'notify_team', { departmentId: 'd_recepcao', message: '{{contato.nome}} não respondeu à confirmação de {{conector.agenda.data | data:"DD/MM"}} às {{conector.agenda.hora}}.', groupDaily: true }, { next: 'n_sair' }, 900, 380, 'Avisar a recepção'],
  ['n_sair', 'exit', { reason: 'Sem resposta' }, {}, 900, 560],
])

// ── 2. Recuperar cancelados (com IA: missão do agente) ───────────────────────

const ENTRADA_CANCELADOS: Entrada = {
  doors: [{ id: 'p_evento', type: 'event', params: { event: 'appointment_cancelled' } }],
  criteria: {
    mode: 'all',
    conditions: [
      { field: 'fato.agendamento_proximos_30d', op: 'eq', value: false },
      { field: 'contato.opt_in_marketing', op: 'eq', value: true },
      { field: 'contato.etiquetas', op: 'not_contains', value: 'Caso de retomada aberto' },
    ],
  },
  reentry: { mode: 'per_subject', subjectKey: 'cancelamento:{{evento.id}}' },
}

const GRAFO_CANCELADOS = grafo('n_esperar', [
  ['n_esperar', 'wait', { mode: 'duration', duration: { amount: 2, unit: 'days' } }, { next: 'n_convite' }, 360, 170],
  // 16/11: "Enviar e esperar resposta" segura a conversa (o agente não responde ao botão junto),
  // e quem escreve em vez de apertar o botão também vai para a missão: o agente lê e conduz.
  ['n_convite', 'send_and_wait', {
    whatsappNumberId: 'l_alto', templateId: 't_remarcar', variables: ['{{contato.nome|"paciente"}}', '{{evento.data | data:"DD/MM"}}'],
    replies: [{ key: 'quero_remarcar', label: 'Quero remarcar' }, { key: 'agora_nao', label: 'Agora não' }],
    timeout: { amount: 48, unit: 'hours' }, holdConversation: true, ifHuman: 'wait_then_skip',
  }, { quero_remarcar: 'n_missao', agora_nao: 'n_etiqueta', outra_resposta: 'n_missao', sem_resposta: 'n_retomada' }, 360, 330, 'Convite para remarcar'],
  ['n_missao', 'ai_mission', { missionType: 'reschedule', limits: 'Não oferecer desconto. Não insistir depois de um "não".', successEvent: 'appointment_scheduled', deadline: { amount: 48, unit: 'hours' }, maxReplies: 8 }, { concluiu: 'n_meta_c', nao_concluiu: 'n_sair_c', prazo: 'n_retomada' }, 0, 700, 'Missão: remarcar'],
  ['n_meta_c', 'goal', { label: 'Consulta remarcada' }, {}, 0, 880],
  ['n_sair_c', 'exit', { reason: 'Não quis remarcar' }, {}, 300, 880],
  ['n_etiqueta', 'tag', { action: 'add', tagId: 'tg_nao_remarcar' }, { next: 'n_sair_c' }, 360, 700],
  ['n_retomada', 'notify_team', { departmentId: 'd_recepcao', message: 'Abrir caso de retomada: {{contato.nome}} cancelou e não respondeu ao convite.', groupDaily: true }, { next: 'n_sair_r' }, 720, 700, 'Abrir caso de retomada'],
  ['n_sair_r', 'exit', { reason: 'Foi para a retomada' }, {}, 720, 880],
])

// ── 3. Boas-vindas a quem chega pelo site (rascunho com um problema) ────────

const GRAFO_BOAS_VINDAS = grafo('n_bv', [
  ['n_bv', 'send_template', { whatsappNumberId: 'l_petro', templateId: 't_boas_vindas', variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_bv_espera' }, 360, 170, 'Boas-vindas'],
  ['n_bv_espera', 'wait_event', { events: [{ key: 'respondeu', label: 'Respondeu', event: 'message.received' }], timeout: { amount: 2, unit: 'days' } }, { respondeu: 'n_bv_agente', sem_resposta: 'n_bv_tag' }, 360, 330],
  ['n_bv_agente', 'handoff_agent', { note: 'Chegou pelo formulário do site.' }, { next: 'n_bv_fim' }, 160, 520],
  ['n_bv_tag', 'tag', { action: 'add', tagId: 'tg_lead_frio' }, { next: 'n_bv_fim' }, 560, 520],
  ['n_bv_fim', 'exit', { reason: 'Fim das boas-vindas' }, {}, 360, 700],
])

// ── 4. Avisar o supervisor quando a IA transfere e ninguém assume ────────────

const GRAFO_TRANSFERENCIA = grafo('n_t_espera', [
  ['n_t_espera', 'wait', { mode: 'duration', duration: { amount: 15, unit: 'minutes' } }, { next: 'n_t_ramo' }, 360, 170],
  ['n_t_ramo', 'branch', { branches: [{ key: 'ninguem', label: 'Ninguém assumiu', group: { mode: 'all', conditions: [{ field: 'conversa.atendente', op: 'not_exists' }] } }] }, { ninguem: 'n_t_aviso', senao: 'n_t_ok' }, 360, 330],
  ['n_t_aviso', 'notify_team', { departmentId: 'd_gestao', message: 'A IA transferiu {{contato.nome}} há 15 min e ninguém assumiu.', groupDaily: false }, { next: 'n_t_fim' }, 160, 510],
  ['n_t_ok', 'exit', { reason: 'Alguém assumiu' }, {}, 560, 510],
  ['n_t_fim', 'exit', { reason: 'Supervisor avisado' }, {}, 160, 680],
])

// ── 5. Pesquisa depois da consulta ───────────────────────────────────────────

const GRAFO_PESQUISA = grafo('n_p_espera', [
  ['n_p_espera', 'wait', { mode: 'relative_to_field', field: 'evento.data', offsetDays: 1, time: '10:00' }, { next: 'n_p_envio' }, 360, 170, 'Dia seguinte, 10h'],
  ['n_p_envio', 'send_template', { whatsappNumberId: 'l_alto', templateId: 't_pesquisa', variables: ['{{contato.nome|"paciente"}}', '{{evento.profissional|"nossa equipe"}}'] }, { next: 'n_p_resp' }, 360, 330],
  ['n_p_resp', 'wait_event', {
    events: [
      { key: 'boa', label: 'Ótima ou boa', event: 'template.button_replied', match: 'Ótima|Boa' },
      { key: 'ruim', label: 'Ruim', event: 'template.button_replied', match: 'Ruim' },
    ],
    timeout: { amount: 2, unit: 'days' },
  }, { boa: 'n_p_meta', ruim: 'n_p_gestor', sem_resposta: 'n_p_fim' }, 360, 490],
  ['n_p_meta', 'goal', { label: 'Respondeu a pesquisa' }, {}, 60, 680],
  ['n_p_gestor', 'notify_team', { departmentId: 'd_gestao', message: '{{contato.nome}} avaliou a consulta com {{evento.profissional}} como ruim.', groupDaily: false }, { next: 'n_p_meta2' }, 360, 680, 'Avisar a gestão'],
  ['n_p_meta2', 'goal', { label: 'Respondeu a pesquisa' }, {}, 360, 850],
  ['n_p_fim', 'exit', { reason: 'Sem resposta' }, {}, 660, 680],
])

// ── 6 e 7. Só receitas: preparo de exame e reativar quem sumiu ───────────────

const GRAFO_PREPARO = grafo('n_pr_envio', [
  ['n_pr_envio', 'send_template', { whatsappNumberId: 'l_alto', templateId: 't_preparo', variables: ['{{contato.nome|"paciente"}}', '{{conector.agenda.data | data:"DD/MM"}}', '{{conector.agenda.hora}}', '{{conector.agenda.preparo|"siga as orientações que você recebeu"}}'] }, { next: 'n_pr_resp' }, 360, 170, 'Instruções de preparo'],
  ['n_pr_resp', 'wait_event', { events: [{ key: 'entendeu', label: 'Entendi', event: 'template.button_replied', match: 'Entendi' }], timeout: H24 }, { entendeu: 'n_pr_meta', sem_resposta: 'n_pr_de_novo' }, 360, 330],
  ['n_pr_de_novo', 'send_template', { whatsappNumberId: 'l_alto', templateId: 't_preparo', variables: ['{{contato.nome|"paciente"}}', '{{conector.agenda.data | data:"DD/MM"}}', '{{conector.agenda.hora}}', '{{conector.agenda.preparo|"siga as orientações que você recebeu"}}'] }, { next: 'n_pr_meta' }, 600, 500, 'Lembrar de novo'],
  ['n_pr_meta', 'goal', { label: 'Preparo confirmado' }, {}, 360, 660],
])

const GRAFO_REATIVAR = grafo('n_r_envio', [
  ['n_r_envio', 'send_template', { whatsappNumberId: 'l_petro', templateId: 't_volta', variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_r_resp' }, 360, 170, 'Convite para voltar'],
  ['n_r_resp', 'wait_event', { events: [{ key: 'quer', label: 'Quer voltar', event: 'template.button_replied', match: 'Quero marcar' }, { key: 'agora_nao', label: 'Agora não', event: 'template.button_replied', match: 'Agora não' }], timeout: { amount: 3, unit: 'days' } }, { quer: 'n_r_agente', agora_nao: 'n_r_nao', sem_resposta: 'n_r_fim' }, 360, 330],
  ['n_r_agente', 'handoff_agent', { note: 'Respondeu ao convite para voltar.' }, { next: 'n_r_meta' }, 160, 510],
  ['n_r_meta', 'goal', { label: 'Voltou a conversar' }, {}, 160, 680],
  ['n_r_fim', 'exit', { reason: 'Sem resposta' }, {}, 560, 510],
  ['n_r_nao', 'exit', { reason: 'Não quer agora' }, {}, 360, 510],
])

const METAS_SIMPLES = (label: string, event: string): Metas => ({
  goals: [{ id: 'g1', label, event, sameSubject: true }],
  exitIf: [{ id: 'x_optout', label: 'Pediu para não receber', event: 'contact.opted_out' }, { id: 'x_humano', label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' }],
  ttlDays: 7,
})

function versao(n: number, status: VersaoDaJornada['status'], g: Grafo, entry: Entrada, goals: Metas, publishedAt: string | null): VersaoDaJornada {
  return { version: n, status, graph: g, entry, goals, catalogVersion: CATALOGO_EXEMPLO.version, publishedAt, publishedBy: publishedAt ? 'Gabi (gestora)' : null }
}

// ── receitas de outros segmentos ─────────────────────────────────────────────
// Os campos de cada empresa (linha, modelo, setor, etiqueta) ficam em branco:
// quem usa a receita escolhe os seus, e a validação aponta o que falta.

const SAIDAS_PADRAO: Metas['exitIf'] = [
  { id: 'x_optout', label: 'Pediu para não receber', event: 'contact.opted_out' },
  { id: 'x_humano', label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' },
]
const SO_SAIDAS = (ttlDays: number, goals: Metas['goals'] = []): Metas => ({ goals, exitIf: SAIDAS_PADRAO, ttlDays })
const MODELO_EM_BRANCO = { whatsappNumberId: '', templateId: '' }

// Imobiliária: lead de portal respondido na hora
const ENTRADA_LEAD_PORTAL: Entrada = { doors: [{ id: 'p_portal', type: 'webhook', params: { name: 'Lead de portal de imóveis' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'cooldown', cooldownDays: 7 } }
const GRAFO_LEAD_PORTAL = grafo('n_lp_msg', [
  ['n_lp_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}', '{{evento.imovel}}'] }, { next: 'n_lp_espera' }, 360, 170, 'Mensagem sobre o imóvel'],
  ['n_lp_espera', 'wait_event', { events: [{ key: 'respondeu', label: 'Respondeu', event: 'message.received' }], timeout: { amount: 1, unit: 'hours' } }, { respondeu: 'n_lp_agente', sem_resposta: 'n_lp_corretor' }, 360, 330],
  ['n_lp_agente', 'handoff_agent', { note: 'Lead do portal, interessado em: {{evento.imovel}}.' }, { next: 'n_lp_meta' }, 120, 510, 'Agente atende'],
  ['n_lp_meta', 'goal', { label: 'Lead atendido' }, {}, 120, 680],
  ['n_lp_corretor', 'assign', { to: 'department', departmentId: '' }, { next: 'n_lp_aviso' }, 600, 510, 'Passar a um corretor'],
  ['n_lp_aviso', 'notify_team', { departmentId: '', message: 'Lead do portal sem resposta em 1 h: {{contato.nome}}, imóvel {{evento.imovel}}.', groupDaily: false }, { next: 'n_lp_fim' }, 600, 680, 'Avisar os corretores'],
  ['n_lp_fim', 'exit', { reason: 'Com um corretor' }, {}, 600, 850],
])

// Imobiliária: confirmar a visita na véspera
const ENTRADA_VISITA: Entrada = { doors: [{ id: 'p_visita', type: 'event', params: { event: 'appointment_scheduled' } }], criteria: { mode: 'all', conditions: [{ field: 'evento.servico', op: 'eq', value: 'Visita' }] }, reentry: { mode: 'per_subject', subjectKey: 'visita:{{evento.id}}' } }
const GRAFO_VISITA = grafo('n_v_esperar', [
  ['n_v_esperar', 'wait', { mode: 'relative_to_field', field: 'evento.data', offsetDays: -1, time: '09:00' }, { next: 'n_v_msg' }, 360, 170, 'Véspera, 9h'],
  ['n_v_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}', '{{evento.data | data:"DD/MM às HH:mm"}}'] }, { next: 'n_v_resp' }, 360, 330, 'Confirmação da visita'],
  ['n_v_resp', 'wait_event', {
    events: [
      { key: 'confirmou', label: 'Confirmou', event: 'template.button_replied', match: 'Confirmo' },
      { key: 'remarcar', label: 'Quer remarcar', event: 'template.button_replied', match: 'Remarcar' },
      { key: 'outra', label: 'Escreveu outra coisa', event: 'message.received' },
    ],
    timeout: { amount: 12, unit: 'hours' },
  }, { confirmou: 'n_v_ok', remarcar: 'n_v_agente', outra: 'n_v_agente', sem_resposta: 'n_v_ligar' }, 360, 490],
  ['n_v_ok', 'notify_team', { departmentId: '', message: '{{contato.nome}} confirmou a visita de {{evento.data | data:"DD/MM às HH:mm"}}.', groupDaily: true }, { next: 'n_v_meta' }, 0, 690, 'Avisar o corretor'],
  ['n_v_meta', 'goal', { label: 'Visita confirmada' }, {}, 0, 860],
  ['n_v_agente', 'handoff_agent', { note: 'Respondeu à confirmação da visita de {{evento.data | data:"DD/MM"}}.' }, { next: 'n_v_sair' }, 360, 690, 'Agente ajuda'],
  ['n_v_sair', 'exit', { reason: 'Com o agente' }, {}, 360, 860],
  ['n_v_ligar', 'notify_team', { departmentId: '', message: '{{contato.nome}} não confirmou a visita de amanhã. Vale ligar.', groupDaily: false }, { next: 'n_v_fim' }, 720, 690, 'Pedir ao corretor que ligue'],
  ['n_v_fim', 'exit', { reason: 'Sem resposta' }, {}, 720, 860],
])

// Loja: orçamento parado
const ENTRADA_ORCAMENTO: Entrada = { doors: [{ id: 'p_orc', type: 'event', params: { event: 'deal.stage_changed' } }], criteria: { mode: 'all', conditions: [{ field: 'evento.etapa', op: 'eq', value: 'Orçamento enviado' }] }, reentry: { mode: 'per_subject', subjectKey: 'negocio:{{evento.id}}' } }
const GRAFO_ORCAMENTO = grafo('n_o_esperar', [
  ['n_o_esperar', 'wait', { mode: 'duration', duration: { amount: 1, unit: 'days' } }, { next: 'n_o_msg' }, 360, 170, 'Um dia depois'],
  ['n_o_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_o_resp' }, 360, 330, 'Retomar o orçamento'],
  ['n_o_resp', 'wait_event', { events: [{ key: 'respondeu', label: 'Respondeu', event: 'message.received' }], timeout: { amount: 2, unit: 'days' } }, { respondeu: 'n_o_agente', sem_resposta: 'n_o_frio' }, 360, 490],
  ['n_o_agente', 'handoff_agent', { note: 'Retomou a conversa sobre o orçamento enviado.' }, { next: 'n_o_sair' }, 120, 680, 'Agente segue a venda'],
  ['n_o_sair', 'exit', { reason: 'Com o agente' }, {}, 120, 850],
  ['n_o_frio', 'tag', { action: 'add', tagId: '' }, { next: 'n_o_aviso' }, 600, 680, 'Marcar como lead frio'],
  ['n_o_aviso', 'notify_team', { departmentId: '', message: 'Orçamento sem resposta: {{contato.nome}}.', groupDaily: true }, { next: 'n_o_fim' }, 600, 850, 'Avisar o comercial'],
  ['n_o_fim', 'exit', { reason: 'Sem resposta' }, {}, 600, 1020],
])

// Loja: pós-venda
const ENTRADA_POS_VENDA: Entrada = { doors: [{ id: 'p_venda', type: 'event', params: { event: 'deal.won' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'per_subject', subjectKey: 'negocio:{{evento.id}}' } }
const GRAFO_POS_VENDA = grafo('n_pv_esperar', [
  ['n_pv_esperar', 'wait', { mode: 'duration', duration: { amount: 3, unit: 'days' } }, { next: 'n_pv_msg' }, 360, 170, 'Três dias depois'],
  ['n_pv_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_pv_resp' }, 360, 330, 'Como foi a compra?'],
  ['n_pv_resp', 'wait_event', {
    events: [
      { key: 'gostou', label: 'Gostou', event: 'template.button_replied', match: 'Gostei' },
      { key: 'problema', label: 'Teve um problema', event: 'template.button_replied', match: 'Tive um problema' },
    ],
    timeout: { amount: 2, unit: 'days' },
  }, { gostou: 'n_pv_meta', problema: 'n_pv_humano', sem_resposta: 'n_pv_fim' }, 360, 490],
  ['n_pv_meta', 'goal', { label: 'Cliente satisfeito' }, {}, 60, 680],
  ['n_pv_humano', 'handoff_human', { departmentId: '', reason: 'Problema com a compra' }, { next: 'n_pv_sair' }, 360, 680, 'Uma pessoa resolve'],
  ['n_pv_sair', 'exit', { reason: 'Com uma pessoa' }, {}, 360, 850],
  ['n_pv_fim', 'exit', { reason: 'Sem resposta' }, {}, 660, 680],
])

// Contabilidade: documentos do mês
const ENTRADA_DOCS_MES: Entrada = { doors: [{ id: 'p_mes', type: 'segment', params: { segmentId: 'sg_mensalistas', segmentName: 'Etiqueta "Mensalista"', frequency: 'monthly', monthDay: 1, time: '09:00' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'cooldown', cooldownDays: 25 } }
const GRAFO_DOCS_MES = grafo('n_dm_msg', [
  ['n_dm_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_dm_resp' }, 360, 170, 'Pedido dos documentos do mês'],
  ['n_dm_resp', 'wait_event', { events: [{ key: 'mandou', label: 'Mandou algo', event: 'message.received' }], timeout: { amount: 4, unit: 'days' } }, { mandou: 'n_dm_ok', sem_resposta: 'n_dm_lembrete' }, 360, 330],
  ['n_dm_lembrete', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_dm_resp2' }, 640, 500, 'Lembrete'],
  ['n_dm_resp2', 'wait_event', { events: [{ key: 'mandou', label: 'Mandou algo', event: 'message.received' }], timeout: { amount: 3, unit: 'days' } }, { mandou: 'n_dm_ok', sem_resposta: 'n_dm_aviso' }, 640, 660],
  ['n_dm_ok', 'notify_team', { departmentId: '', message: 'Chegaram documentos de {{contato.nome}}.', groupDaily: true }, { next: 'n_dm_meta' }, 120, 840, 'Avisar a equipe'],
  ['n_dm_meta', 'goal', { label: 'Documentos recebidos' }, {}, 120, 1010],
  ['n_dm_aviso', 'notify_team', { departmentId: '', message: 'Faltam os documentos do mês de {{contato.nome}}.', groupDaily: true }, { next: 'n_dm_fim' }, 640, 840, 'Avisar o que falta'],
  ['n_dm_fim', 'exit', { reason: 'Sem documentos' }, {}, 640, 1010],
])

// Contabilidade: guia a vencer
const ENTRADA_GUIA: Entrada = { doors: [{ id: 'p_guia', type: 'webhook', params: { name: 'Guia emitida no sistema contábil' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'per_subject', subjectKey: 'guia:{{evento.id}}' } }
const GRAFO_GUIA = grafo('n_g_msg', [
  ['n_g_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}', '{{evento.valor}}', '{{evento.vencimento | data:"DD/MM"}}'] }, { next: 'n_g_resp' }, 360, 170, 'Guia disponível'],
  ['n_g_resp', 'wait_event', {
    events: [
      { key: 'pagou', label: 'Já pagou', event: 'template.button_replied', match: 'Já paguei' },
      { key: 'duvida', label: 'Tem dúvida', event: 'message.received' },
    ],
    timeout: { amount: 3, unit: 'days' },
  }, { pagou: 'n_g_meta', duvida: 'n_g_agente', sem_resposta: 'n_g_esperar' }, 360, 330],
  ['n_g_meta', 'goal', { label: 'Guia paga' }, {}, 0, 520],
  ['n_g_agente', 'handoff_agent', { note: 'Dúvida sobre a guia que vence em {{evento.vencimento | data:"DD/MM"}}.' }, { next: 'n_g_sair' }, 300, 520, 'Agente tira a dúvida'],
  ['n_g_sair', 'exit', { reason: 'Com o agente' }, {}, 300, 690],
  ['n_g_esperar', 'wait', { mode: 'relative_to_field', field: 'evento.vencimento', offsetDays: -2, time: '09:00' }, { next: 'n_g_lembrete' }, 660, 520, '2 dias antes do vencimento'],
  ['n_g_lembrete', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}', '{{evento.vencimento | data:"DD/MM"}}'] }, { next: 'n_g_resp2' }, 660, 690, 'Lembrete do vencimento'],
  ['n_g_resp2', 'wait_event', { events: [{ key: 'pagou', label: 'Já pagou', event: 'template.button_replied', match: 'Já paguei' }], timeout: { amount: 2, unit: 'days' } }, { pagou: 'n_g_meta', sem_resposta: 'n_g_aviso' }, 660, 860],
  ['n_g_aviso', 'notify_team', { departmentId: '', message: 'A guia de {{contato.nome}} vence hoje e o pagamento não foi confirmado.', groupDaily: true }, { next: 'n_g_fim' }, 660, 1030, 'Avisar a equipe'],
  ['n_g_fim', 'exit', { reason: 'Sem confirmação' }, {}, 660, 1200],
])

// Jurídico: documentos pendentes do caso
const ENTRADA_DOCS_CASO: Entrada = { doors: [{ id: 'p_tag', type: 'event', params: { event: 'contact.tag_added' } }], criteria: { mode: 'all', conditions: [{ field: 'evento.etiqueta', op: 'eq', value: 'Documentos pendentes' }] }, reentry: { mode: 'cooldown', cooldownDays: 1 } }
const GRAFO_DOCS_CASO = grafo('n_dc_msg', [
  ['n_dc_msg', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_dc_resp' }, 360, 170, 'Pedido dos documentos'],
  ['n_dc_resp', 'wait_event', { events: [{ key: 'mandou', label: 'Mandou algo', event: 'message.received' }], timeout: { amount: 3, unit: 'days' } }, { mandou: 'n_dc_ok', sem_resposta: 'n_dc_lembrete' }, 360, 330],
  ['n_dc_lembrete', 'send_template', { ...MODELO_EM_BRANCO, variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_dc_resp2' }, 640, 500, 'Lembrete'],
  ['n_dc_resp2', 'wait_event', { events: [{ key: 'mandou', label: 'Mandou algo', event: 'message.received' }], timeout: { amount: 3, unit: 'days' } }, { mandou: 'n_dc_ok', sem_resposta: 'n_dc_aviso' }, 640, 660],
  ['n_dc_ok', 'tag', { action: 'remove', tagId: '' }, { next: 'n_dc_avisa' }, 120, 840, 'Tirar "Documentos pendentes"'],
  ['n_dc_avisa', 'notify_team', { departmentId: '', message: 'Chegaram documentos de {{contato.nome}}.', groupDaily: false }, { next: 'n_dc_meta' }, 120, 1010, 'Avisar o advogado'],
  ['n_dc_meta', 'goal', { label: 'Documentos recebidos' }, {}, 120, 1180],
  ['n_dc_aviso', 'notify_team', { departmentId: '', message: '{{contato.nome}} ainda não mandou os documentos pendentes.', groupDaily: true }, { next: 'n_dc_fim' }, 640, 840, 'Avisar o advogado'],
  ['n_dc_fim', 'exit', { reason: 'Sem documentos' }, {}, 640, 1010],
])

// Jurídico: triagem de caso novo (IA)
const ENTRADA_TRIAGEM: Entrada = { doors: [{ id: 'p_primeira', type: 'event', params: { event: 'message.first' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'once' } }
const GRAFO_TRIAGEM = grafo('n_tr_pergunta', [
  ['n_tr_pergunta', 'send_text', { text: 'Olá, {{contato.nome|"tudo bem"}}! Para te direcionar ao advogado certo, conte em poucas palavras o que aconteceu.' }, { next: 'n_tr_resp' }, 360, 170, 'Pedir o resumo do caso'],
  ['n_tr_resp', 'wait_event', { events: [{ key: 'contou', label: 'Contou o caso', event: 'message.received' }], timeout: { amount: 1, unit: 'days' } }, { contou: 'n_tr_classificar', sem_resposta: 'n_tr_fim' }, 360, 330],
  ['n_tr_classificar', 'ai_classify', {
    question: 'Qual é a área do direito do caso descrito?',
    categories: [{ key: 'trabalhista', label: 'Trabalhista' }, { key: 'familia', label: 'Família' }, { key: 'civel', label: 'Cível' }],
  }, { trabalhista: 'n_tr_trab', familia: 'n_tr_fam', civel: 'n_tr_civ', incerto: 'n_tr_pessoa' }, 360, 500, 'Identificar a área'],
  ['n_tr_trab', 'handoff_human', { departmentId: '', reason: 'Caso trabalhista' }, { next: 'n_tr_meta' }, 0, 690, 'Equipe trabalhista'],
  ['n_tr_fam', 'handoff_human', { departmentId: '', reason: 'Caso de família' }, { next: 'n_tr_meta' }, 270, 690, 'Equipe de família'],
  ['n_tr_civ', 'handoff_human', { departmentId: '', reason: 'Caso cível' }, { next: 'n_tr_meta' }, 540, 690, 'Equipe cível'],
  ['n_tr_pessoa', 'handoff_human', { departmentId: '', reason: 'Triagem: área não identificada' }, { next: 'n_tr_meta' }, 810, 690, 'Uma pessoa faz a triagem'],
  ['n_tr_meta', 'goal', { label: 'Caso direcionado' }, {}, 405, 870],
  ['n_tr_fim', 'exit', { reason: 'Não contou o caso' }, {}, 760, 500],
])

// ── receitas (galeria) ───────────────────────────────────────────────────────

const ENTRADA_SITE: Entrada = { doors: [{ id: 'p_site', type: 'webhook', params: { name: 'Formulário do site' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'once' } }
const ENTRADA_TRANSF: Entrada = { doors: [{ id: 'p_transf', type: 'event', params: { event: 'agent.handoff_requested' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'one_open' } }
const ENTRADA_PESQUISA: Entrada = { doors: [{ id: 'p_conf', type: 'event', params: { event: 'appointment_confirmed' } }], criteria: { mode: 'all', conditions: [{ field: 'contato.etiquetas', op: 'not_contains', value: 'Não quer pesquisa' }] }, reentry: { mode: 'cooldown', cooldownDays: 30 } }
const ENTRADA_PREPARO: Entrada = { doors: [{ id: 'p_agenda2', type: 'schedule_list', params: { time: '09:00', operation: 'agenda_do_dia', dayOffset: 2, weekdays: ['seg', 'ter', 'qua', 'qui', 'sex'] } }], criteria: { mode: 'all', conditions: [{ field: 'evento.servico', op: 'in', value: ['Ultrassom', 'Endoscopia', 'Exames de sangue'] }] }, reentry: { mode: 'per_subject', subjectKey: 'agendamento:{{conector.agenda.id}}' } }
const ENTRADA_REATIVAR: Entrada = { doors: [{ id: 'p_seg', type: 'segment', params: { segmentId: 'sg_sumidos', segmentName: 'Sem conversa há 180 dias', frequency: 'weekly', weekdays: ['seg'], time: '10:00' } }], criteria: { mode: 'all', conditions: [{ field: 'contato.opt_in_marketing', op: 'eq', value: true }] }, reentry: { mode: 'cooldown', cooldownDays: 90 } }

export const RECEITAS_EXEMPLO: Receita[] = [
  { id: 'r_faltas', goal: 'confirmar', name: 'Reduzir faltas (confirmação)', outcome: 'Menos faltas na agenda', description: 'Um dia antes, confirma cada consulta pelo WhatsApp. Quem confirma é confirmado no sistema da clínica; quem quer cancelar vai para o agente; o silêncio avisa a recepção.', segment: 'clinica', usesAi: false, icon: 'CalendarCheck2',
    version: { graph: GRAFO_CONFIRMACAO, entry: ENTRADA_CONFIRMACAO, goals: METAS_CONFIRMACAO, catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_cancelados', goal: 'recuperar', name: 'Recuperar cancelados', outcome: 'Consultas remarcadas', description: 'Dois dias depois do cancelamento, convida para remarcar. Quem aceita conversa com o agente numa missão de remarcar; o silêncio vira caso de retomada.', segment: 'clinica', usesAi: true, icon: 'CalendarClock',
    version: { graph: GRAFO_CANCELADOS, entry: ENTRADA_CANCELADOS, goals: METAS_SIMPLES('Consulta remarcada', 'appointment_scheduled'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_preparo', goal: 'confirmar', name: 'Preparo de exame', outcome: 'Exames sem remarcação por preparo errado', description: 'Dois dias antes de um exame que pede preparo, manda as instruções e confirma a leitura. Sem resposta, reforça na véspera.', segment: 'clinica', usesAi: false, icon: 'ClipboardList',
    version: { graph: GRAFO_PREPARO, entry: ENTRADA_PREPARO, goals: METAS_SIMPLES('Preparo confirmado', 'template.button_replied'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_pesquisa', goal: 'ouvir', name: 'Pesquisa depois da consulta', outcome: 'Saber como foi o atendimento', description: 'No dia seguinte, pede uma avaliação. Avaliação ruim avisa a gestão na hora.', segment: 'clinica', usesAi: false, icon: 'Star',
    version: { graph: GRAFO_PESQUISA, entry: ENTRADA_PESQUISA, goals: METAS_SIMPLES('Respondeu a pesquisa', 'template.button_replied'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_boas_vindas', goal: 'atender', name: 'Boas-vindas', outcome: 'Resposta rápida a quem chega', description: 'Quem chega pelo formulário do site recebe boas-vindas na hora e é atendido pelo agente quando responde.', segment: 'geral', usesAi: false, icon: 'HandHeart',
    version: { graph: GRAFO_BOAS_VINDAS, entry: ENTRADA_SITE, goals: SO_SAIDAS(3), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_reativar', goal: 'recuperar', name: 'Reativar quem sumiu', outcome: 'Clientes de volta', description: 'Toda segunda, convida para voltar quem não conversa há 6 meses (só quem aceita marketing). Quem responde é atendido pelo agente.', segment: 'geral', usesAi: false, icon: 'RotateCcw',
    version: { graph: GRAFO_REATIVAR, entry: ENTRADA_REATIVAR, goals: SO_SAIDAS(7), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_lead_portal', goal: 'atender', name: 'Responder lead de portal na hora', outcome: 'Lead atendido em minutos', description: 'Quem pede informação num portal de imóveis recebe resposta na hora pelo WhatsApp. Se responder, o agente atende já sabendo do imóvel; sem resposta em 1 hora, o lead vai para um corretor.', segment: 'imobiliaria', usesAi: false, icon: 'Building2',
    version: { graph: GRAFO_LEAD_PORTAL, entry: ENTRADA_LEAD_PORTAL, goals: SO_SAIDAS(2), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_visita', goal: 'confirmar', name: 'Confirmar visita ao imóvel', outcome: 'Menos visitas perdidas', description: 'Na véspera de cada visita, confirma com o cliente. Confirmou: o corretor é avisado. Quer remarcar: o agente ajuda. Silêncio: o corretor é avisado para ligar.', segment: 'imobiliaria', usesAi: false, icon: 'KeyRound',
    version: { graph: GRAFO_VISITA, entry: ENTRADA_VISITA, goals: SO_SAIDAS(3, [{ id: 'g_visita', label: 'Visita confirmada', event: 'appointment_confirmed', sameSubject: true }]), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_orcamento', goal: 'recuperar', name: 'Orçamento sem resposta', outcome: 'Mais orçamentos fechados', description: 'Quando um negócio entra em "Orçamento enviado", espera um dia e retoma a conversa. Se responder, o agente segue a venda; sem resposta, o contato é marcado como lead frio e o comercial é avisado.', segment: 'loja', usesAi: false, icon: 'ReceiptText',
    version: { graph: GRAFO_ORCAMENTO, entry: ENTRADA_ORCAMENTO, goals: SO_SAIDAS(10, [{ id: 'g_venda', label: 'Orçamento fechado', event: 'deal.won', sameSubject: true }]), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_pos_venda', goal: 'ouvir', name: 'Pós-venda', outcome: 'Problema resolvido antes de virar reclamação', description: 'Três dias depois da compra, pergunta como foi. Quem teve problema vai direto para uma pessoa da equipe.', segment: 'loja', usesAi: false, icon: 'ShoppingBag',
    version: { graph: GRAFO_POS_VENDA, entry: ENTRADA_POS_VENDA, goals: SO_SAIDAS(7), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_docs_mes', goal: 'cobrar', name: 'Documentos do mês no prazo', outcome: 'Fechamento sem atraso', description: 'Todo dia 1º, pede aos clientes mensalistas as notas e os extratos do mês. Sem resposta, lembra no dia 5; se ainda faltar, avisa a equipe.', segment: 'contabilidade', usesAi: false, icon: 'FolderOpen',
    version: { graph: GRAFO_DOCS_MES, entry: ENTRADA_DOCS_MES, goals: SO_SAIDAS(10), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_guia', goal: 'cobrar', name: 'Guia de imposto a vencer', outcome: 'Menos multa por atraso', description: 'Quando o sistema contábil emite uma guia, avisa o cliente com o valor e o vencimento. Dois dias antes, quem não confirmou o pagamento recebe um lembrete; no dia, a equipe é avisada.', segment: 'contabilidade', usesAi: false, icon: 'Landmark',
    version: { graph: GRAFO_GUIA, entry: ENTRADA_GUIA, goals: SO_SAIDAS(30), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_docs_caso', goal: 'cobrar', name: 'Cobrar documentos pendentes', outcome: 'Processos sem atraso por falta de documento', description: 'Quando o contato recebe a etiqueta "Documentos pendentes", pede os documentos e lembra depois de 3 dias. Chegou algo: tira a etiqueta e avisa o advogado.', segment: 'juridico', usesAi: false, icon: 'FileText',
    version: { graph: GRAFO_DOCS_CASO, entry: ENTRADA_DOCS_CASO, goals: SO_SAIDAS(10), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_triagem', goal: 'atender', name: 'Triagem de caso novo', outcome: 'Cada caso com a equipe certa', description: 'Quem chega pela primeira vez conta o caso; a IA identifica a área (trabalhista, família, cível) e passa a conversa para a equipe certa. Na dúvida, uma pessoa faz a triagem.', segment: 'juridico', usesAi: true, icon: 'Scale',
    version: { graph: GRAFO_TRIAGEM, entry: ENTRADA_TRIAGEM, goals: SO_SAIDAS(2), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_avisar', goal: 'avisar', name: 'Avisar a equipe quando…', outcome: 'Nada esquecido', description: 'Exemplo: a IA transferiu e ninguém assumiu em 15 minutos? Avisa o supervisor.', segment: 'geral', usesAi: false, icon: 'BellRing',
    version: { graph: GRAFO_TRANSFERENCIA, entry: ENTRADA_TRANSF, goals: { goals: [], exitIf: [], ttlDays: 1 }, catalogVersion: CATALOGO_EXEMPLO.version } },
]

// ── jornadas de exemplo ──────────────────────────────────────────────────────

const agora = Date.now()
const haDias = (d: number, h = 0) => new Date(agora - d * 86_400_000 - h * 3_600_000).toISOString()
const emHoras = (h: number) => new Date(agora + h * 3_600_000).toISOString()

export function jornadasDeExemplo(): Jornada[] {
  return [
    {
      id: 'j_confirmacao', name: 'Reduzir faltas — confirmação de consulta', description: 'Um dia antes, às 11h, confirma cada consulta da agenda do Alto da Serra.',
      status: 'active', publishedVersion: 3, hasDraftChanges: true, whatsappNumberId: 'l_alto', enrolledNow: 87, goalRate30d: 69, lastActivityAt: haDias(0, 1),
      errors24h: 2, creditsThisMonth: 0, messagesThisMonth: 2_538, createdBy: 'Gabi (gestora)', updatedBy: 'Rui (supervisor)', updatedAt: haDias(4), recipeId: 'r_faltas', labels: ['Agenda', 'Alto da Serra'],
      alerts: [{ kind: 'stuck_enrollments', message: '2 inscrições passaram do horário de acordar há mais de 15 minutos. O motor tenta de novo sozinho; se continuar, avise o suporte.', since: haDias(0, 1) }],
      draft: versao(4, 'draft', GRAFO_CONFIRMACAO, ENTRADA_CONFIRMACAO, METAS_CONFIRMACAO, null),
      enrolledByVersion: [{ version: 3, count: 75 }, { version: 2, count: 12 }],
    },
    {
      id: 'j_cancelados', name: 'Recuperar cancelados', description: 'Convida para remarcar quem cancelou e não marcou de novo. Em sombra: mostra o que teria feito.',
      status: 'shadow', publishedVersion: 1, hasDraftChanges: false, whatsappNumberId: 'l_alto', enrolledNow: 23, goalRate30d: null, lastActivityAt: haDias(0, 3),
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0, createdBy: 'Gabi (gestora)', updatedAt: haDias(2), recipeId: 'r_cancelados', labels: ['Agenda', 'Alto da Serra'],
      alerts: [{ kind: 'circuit_open', message: 'O sistema de agenda falhou 5 vezes seguidas. A porta "Cancelados de ontem" está pausada e tenta de novo às 10h.', since: haDias(0, 2) }],
      draft: versao(2, 'draft', GRAFO_CANCELADOS, ENTRADA_CANCELADOS, METAS_SIMPLES('Consulta remarcada', 'appointment_scheduled'), null),
      enrolledByVersion: [{ version: 1, count: 23 }],
    },
    {
      id: 'j_pesquisa', name: 'Pesquisa depois da consulta', description: 'No dia seguinte à consulta, pede uma avaliação. Avaliação ruim avisa a gestão.',
      status: 'active', publishedVersion: 1, hasDraftChanges: false, whatsappNumberId: 'l_alto', enrolledNow: 41, goalRate30d: 38, lastActivityAt: haDias(0, 2),
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 1_104, createdBy: 'Rui (supervisor)', updatedAt: haDias(12), recipeId: 'r_pesquisa', labels: ['Qualidade'],
      draft: versao(2, 'draft', GRAFO_PESQUISA, ENTRADA_PESQUISA, METAS_SIMPLES('Respondeu a pesquisa', 'template.button_replied'), null),
      enrolledByVersion: [{ version: 1, count: 41 }],
    },
    {
      id: 'j_transferencia', name: 'Transferência esquecida', description: 'A IA transferiu e ninguém assumiu em 15 minutos: avisa o supervisor.',
      status: 'paused', publishedVersion: 2, hasDraftChanges: false, whatsappNumberId: null, enrolledNow: 0, goalRate30d: null, lastActivityAt: haDias(118),
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0, createdBy: 'Rui (supervisor)', updatedAt: haDias(6), recipeId: 'r_avisar', labels: ['Atendimento'],
      draft: versao(3, 'draft', GRAFO_TRANSFERENCIA, ENTRADA_TRANSF, { goals: [], exitIf: [], ttlDays: 1 }, null),
      enrolledByVersion: [],
    },
    {
      id: 'j_boas_vindas', name: 'Boas-vindas a quem chega pelo site', description: 'Rascunho: falta o modelo de boas-vindas ser aprovado pela Meta.',
      status: 'draft', publishedVersion: null, hasDraftChanges: true, whatsappNumberId: 'l_petro', enrolledNow: 0, goalRate30d: null, lastActivityAt: null,
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0, createdBy: 'Ana (recepção)', updatedAt: haDias(1), recipeId: 'r_boas_vindas',
      draft: versao(1, 'draft', GRAFO_BOAS_VINDAS, ENTRADA_SITE, METAS_SIMPLES('Respondeu', 'message.received'), null),
      enrolledByVersion: [],
    },
  ]
}

// ── pessoas inscritas, linha do tempo e "por que não entrou" ─────────────────

interface PessoaDeExemplo {
  id: string
  nome: string
  tel: string
  assunto: string
  status: Inscricao['status']
  no: string | null
  caminho: string[]
  saida?: Inscricao['exitReason']
  /** A saída escolhida em cada passo que ramifica. */
  escolhas?: Record<string, string>
  falhaEm?: string
  version?: number
}

const PESSOAS_CONFIRMACAO: PessoaDeExemplo[] = [
  { id: 'e01', nome: 'Ana Paula S.', tel: '+55 24 •••• 0142', assunto: 'consulta 48213 · amanhã às 08h', status: 'waiting', no: 'n_aguardar', caminho: ['n_aguardar'] },
  { id: 'e02', nome: 'Bruno M.', tel: '+55 24 •••• 7710', assunto: 'consulta 48219 · amanhã às 08h30', status: 'completed', no: null, caminho: ['n_aguardar', 'n_confirmar', 'n_texto_ok', 'n_meta'], saida: 'goal', escolhas: { n_aguardar: 'confirmar' } },
  { id: 'e03', nome: 'Carla R.', tel: '+55 24 •••• 3391', assunto: 'consulta 48220 · amanhã às 09h', status: 'exited', no: null, caminho: ['n_aguardar', 'n_agente_cancelar', 'n_sair_agente'], saida: 'end', escolhas: { n_aguardar: 'cancelar' } },
  { id: 'e04', nome: 'Diego F.', tel: '+55 24 •••• 5528', assunto: 'consulta 48224 · amanhã às 09h30', status: 'waiting', no: 'n_aguardar', caminho: ['n_aguardar'], version: 2 },
  { id: 'e05', nome: 'Eduarda L.', tel: '+55 24 •••• 0909', assunto: 'consulta 48231 · amanhã às 10h', status: 'completed', no: null, caminho: ['n_aguardar', 'n_confirmar', 'n_texto_ok', 'n_meta'], saida: 'goal', escolhas: { n_aguardar: 'confirmar' } },
  { id: 'e06', nome: 'Fábio T.', tel: '+55 24 •••• 4417', assunto: 'consulta 48190 · hoje às 14h', status: 'exited', no: null, caminho: ['n_aguardar', 'n_avisar', 'n_sair'], saida: 'end', escolhas: { n_aguardar: 'sem_resposta' } },
  { id: 'e07', nome: 'Gisele P.', tel: '+55 24 •••• 8283', assunto: 'consulta 48235 · amanhã às 10h30', status: 'failed', no: 'n_confirmar', caminho: ['n_aguardar', 'n_confirmar'], saida: 'error', escolhas: { n_aguardar: 'confirmar' }, falhaEm: 'n_confirmar' },
  { id: 'e08', nome: 'Henrique A.', tel: '+55 24 •••• 1306', assunto: 'consulta 48240 · amanhã às 11h', status: 'exited', no: null, caminho: ['n_aguardar', 'n_agente_outra', 'n_sair_agente'], saida: 'end', escolhas: { n_aguardar: 'outra_resposta' } },
  { id: 'e09', nome: 'Isabela N.', tel: '+55 24 •••• 6620', assunto: 'consulta 48243 · amanhã às 11h30', status: 'waiting', no: 'n_aguardar', caminho: ['n_aguardar'] },
  { id: 'e10', nome: 'João Pedro V.', tel: '+55 24 •••• 2958', assunto: 'consulta 48197 · hoje às 16h', status: 'exited', no: null, caminho: ['n_aguardar'], saida: 'exit_if' },
  { id: 'e11', nome: 'Karina B.', tel: '+55 24 •••• 7074', assunto: 'consulta 48250 · amanhã às 14h', status: 'waiting', no: 'n_aguardar', caminho: ['n_aguardar'] },
  { id: 'e12', nome: 'Lucas D.', tel: '+55 24 •••• 3845', assunto: 'consulta 48251 · amanhã às 14h30', status: 'completed', no: null, caminho: ['n_aguardar'], saida: 'goal' },
]

function inscricaoDe(journeyId: string, p: PessoaDeExemplo, i: number, shadow = false): Inscricao {
  const finalizada = p.status === 'completed' || p.status === 'exited' || p.status === 'failed'
  return {
    id: `${journeyId}:${p.id}`,
    journeyId,
    version: p.version ?? 3,
    contact: { id: `c_${p.id}`, name: p.nome, phoneMasked: p.tel },
    subjectLabel: p.assunto,
    status: p.status,
    shadow,
    currentNodeId: finalizada ? null : p.no,
    nextWakeAt: p.status === 'waiting' ? emHoras(4 + (i % 5)) : null,
    enteredAt: haDias(1, i % 6),
    finishedAt: finalizada ? haDias(0, i % 4) : null,
    exitReason: p.saida ?? null,
  }
}

/** As pessoas escritas à mão de cada jornada de exemplo. */
function pessoasBase(journey: Jornada): { pessoas: PessoaDeExemplo[]; sombra: boolean } {
  const journeyId = journey.id
  if (journeyId === 'j_confirmacao') return { pessoas: PESSOAS_CONFIRMACAO, sombra: false }
  if (journeyId === 'j_cancelados') {
    const pessoas: PessoaDeExemplo[] = [
      { id: 'c01', nome: 'Márcia O.', tel: '+55 24 •••• 5150', assunto: 'cancelamento · consulta de 10/11', status: 'waiting', no: 'n_esperar', caminho: ['n_esperar'], version: 1 },
      { id: 'c02', nome: 'Nelson Q.', tel: '+55 24 •••• 9081', assunto: 'cancelamento · consulta de 08/11', status: 'waiting', no: 'n_convite', caminho: ['n_esperar', 'n_convite'], version: 1 },
      { id: 'c03', nome: 'Olívia S.', tel: '+55 24 •••• 2727', assunto: 'cancelamento · consulta de 06/11', status: 'completed', no: null, caminho: ['n_esperar', 'n_convite', 'n_missao', 'n_meta_c'], saida: 'goal', escolhas: { n_convite: 'quero_remarcar', n_missao: 'concluiu' }, version: 1 },
    ]
    return { pessoas, sombra: true }
  }
  // As outras: quem está dentro espera no 3º passo (o mesmo do selo do canvas) — P2, 16/11.
  const ids = Object.keys(journey.draft.graph.nodes)
  const espera = ids[2] ?? ids[0]
  if (!espera || !journey.publishedVersion) return { pessoas: [], sombra: false }
  const caminho = ids.slice(0, ids.indexOf(espera) + 1)
  return {
    pessoas: [
      { id: 'g01', nome: 'Renata C.', tel: '+55 24 •••• 4410', assunto: 'inscrição de 14/11', status: 'waiting', no: espera, caminho, version: journey.publishedVersion },
      { id: 'g02', nome: 'Sérgio P.', tel: '+55 24 •••• 8126', assunto: 'inscrição de 13/11', status: 'waiting', no: espera, caminho, version: journey.publishedVersion },
      { id: 'g03', nome: 'Tânia M.', tel: '+55 24 •••• 3391', assunto: 'inscrição de 12/11', status: 'exited', no: null, caminho, saida: 'end', version: journey.publishedVersion },
    ],
    sombra: journey.status === 'shadow',
  }
}

/** Quantos estão em cada passo agora, pelas MESMAS pessoas de "Pessoas": o selo do passo e a lista batem. */
function agoraPorPasso(journey: Jornada): Record<string, number> {
  const baseDentro = pessoasBase(journey).pessoas.filter((p) => p.status === 'waiting' || p.status === 'active')
  const agora: Record<string, number> = {}
  for (let k = 0; baseDentro.length && k < Math.max(baseDentro.length, journey.enrolledNow); k++) {
    const p = baseDentro[k % baseDentro.length]
    if (p.no) agora[p.no] = (agora[p.no] ?? 0) + 1
  }
  return agora
}

const PRIMEIROS = ['Alice', 'Bernardo', 'Camila', 'Davi', 'Elisa', 'Felipe', 'Gabriela', 'Heitor', 'Iara', 'Júlio', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Priscila', 'Renan', 'Sabrina', 'Tomás', 'Valéria', 'Yuri']
const INICIAIS = 'ABCDFGLMNPRSTV'

/** Uma pessoa a mais, no mesmo ponto do caminho de uma das pessoas de exemplo (nome e telefone mascarados). */
function pessoaSintetica(modelo: PessoaDeExemplo, k: number, prefixo: string): PessoaDeExemplo {
  const tel = `+55 24 •••• ${String(1000 + ((k * 7919) % 9000)).padStart(4, '0')}`
  return { ...modelo, id: `${prefixo}${k}`, nome: `${PRIMEIROS[k % PRIMEIROS.length]} ${INICIAIS[(k * 5) % INICIAIS.length]}.`, tel, assunto: modelo.assunto.replace(/\d{5}/, String(48300 + k)) }
}

/**
 * As inscrições de uma jornada de exemplo, fechando com os números dela:
 * "dentro agora" bate com `enrolledNow` e as encerradas com as entradas dos
 * últimos 30 dias. As pessoas além das escritas à mão copiam o caminho delas.
 */
export function inscricoesDeExemplo(journey: Jornada): { pessoas: PessoaDeExemplo[]; inscricoes: Inscricao[] } {
  const { pessoas: base, sombra } = pessoasBase(journey)
  const dentro = (p: PessoaDeExemplo) => p.status === 'waiting' || p.status === 'active'
  const baseDentro = base.filter(dentro)
  const baseFora = base.filter((p) => !dentro(p))
  const pessoas = [...base]
  if (baseDentro.length) for (let k = 0; pessoas.filter(dentro).length < journey.enrolledNow; k++) pessoas.push(pessoaSintetica(baseDentro[k % baseDentro.length], k, 'd'))
  const entradas = journey.enrolledNow ? resultadosDeExemplo(journey).entered : 0
  if (baseFora.length) for (let k = 0; pessoas.filter((p) => !dentro(p)).length < Math.max(0, entradas - journey.enrolledNow); k++) pessoas.push(pessoaSintetica(baseFora[k % baseFora.length], k, 'f'))
  return { pessoas, inscricoes: pessoas.map((p, i) => inscricaoDe(journey.id, p, i, sombra)) }
}

/**
 * O registro de ações da jornada inteira (P1, 16/11): as ações das primeiras
 * pessoas, da mais nova para a mais antiga, com as falhas dos resultados
 * (motivo da Meta ou do sistema do cliente, e se dá para tentar de novo).
 */
const registroGuardado = new Map<string, ItemDoRegistro[]>()
const ERROS_DE_EXEMPLO: NonNullable<ItemDoRegistro['error']>[] = [
  { code: 'connector_timeout', message: 'O sistema do cliente não respondeu em 10 s (3 tentativas).', retryable: true, attempts: 3 },
  { code: 'meta_131026', message: 'A Meta não entregou: o número não tem WhatsApp.', retryable: false, attempts: 1 },
  { code: 'connector_timeout', message: 'O sistema do cliente não respondeu em 10 s (3 tentativas).', retryable: true, attempts: 3 },
  { code: 'meta_131049', message: 'A Meta segurou a mensagem para não cansar a pessoa (limite de marketing).', retryable: true, attempts: 1 },
  { code: 'window_closed', message: 'A janela de 24 h fechou antes do envio do texto.', retryable: false, attempts: 1 },
  { code: 'connector_409', message: 'O agendamento já estava cancelado no sistema.', retryable: false, attempts: 1 },
]
export function registroDeExemplo(journey: Jornada): ItemDoRegistro[] {
  const ja = registroGuardado.get(journey.id)
  if (ja) return ja
  const { pessoas } = inscricoesDeExemplo(journey)
  const nos = journey.draft.graph.nodes
  const sombra = journey.status === 'shadow'
  const itens: ItemDoRegistro[] = []
  pessoas.slice(0, 90).forEach((p, k) => {
    let horas = 2 + (k % 20)
    for (const id of p.caminho) {
      const no = nos[id]
      if (!no) continue
      horas += 1
      const esperando = p.status === 'waiting' && p.no === id
      itens.push({
        id: `${journey.id}:a${k}:${id}`,
        at: haDias(0, horas),
        enrollmentId: `${journey.id}:${p.id}`,
        contact: { name: p.nome, phoneMasked: p.tel },
        nodeId: id,
        nodeType: no.type,
        title: no.label ?? CATALOGO_EXEMPLO.steps.find((s) => s.type === no.type)?.label ?? no.type,
        detail: detalheDoPasso(no, p.escolhas?.[id], false, esperando),
        status: esperando ? 'waiting' : sombra ? 'shadow' : 'ok',
      })
    }
  })
  // As falhas dos resultados, cada uma num passo do tipo certo: erro do sistema
  // do cliente no passo do sistema; recusa da Meta nos envios.
  const doTipo = (codigo: string) => (codigo.startsWith('connector') ? ['connector_call'] : codigo === 'window_closed' ? ['send_text', 'send_template'] : ['send_template', 'send_text'])
  const usados = new Set<ItemDoRegistro>()
  const falhas = Math.min(resultadosDeExemplo(journey).failed, ERROS_DE_EXEMPLO.length)
  for (let i = 0; i < falhas; i++) {
    const erro = ERROS_DE_EXEMPLO[i]
    const tipos = doTipo(erro.code)
    const opcoes = itens.filter((x) => tipos.includes(x.nodeType) && !usados.has(x) && x.status !== 'waiting')
    const x = opcoes[Math.floor((i * opcoes.length) / Math.max(1, falhas))] ?? opcoes[0]
    if (!x) continue
    usados.add(x)
    x.status = 'failed'
    x.error = erro
    x.detail = erro.retryable ? 'Falhou e foi entregue à recepção.' : 'Falhou; a pessoa saiu com o motivo "erro".'
  }
  itens.sort((a, b) => (a.at < b.at ? 1 : -1))
  registroGuardado.set(journey.id, itens)
  return itens
}

/** O que cada passo "fez", em linguagem simples, para a linha do tempo de exemplo. */
export function linhaDoTempoDeExemplo(journey: Jornada, enrollmentId: string): ItemDaLinhaDoTempo[] {
  const { pessoas } = inscricoesDeExemplo(journey)
  const p = pessoas.find((x) => `${journey.id}:${x.id}` === enrollmentId)
  if (!p) return []
  const sombra = journey.status === 'shadow'
  const nos = journey.draft.graph.nodes
  const itens: ItemDaLinhaDoTempo[] = [
    { at: haDias(1, 6), nodeId: null, nodeType: 'entry', title: 'Entrou na jornada', detail: `Pela porta "${rotuloDaPorta(journey.draft.entry.doors[0]?.type)}". Assunto: ${p.assunto}.`, status: 'ok' },
  ]
  let horas = 6
  for (const id of p.caminho) {
    const no = nos[id]
    if (!no) continue
    horas = Math.max(0, horas - 1)
    const at = haDias(1, horas)
    const falhou = p.falhaEm === id
    const esperando = p.status === 'waiting' && p.no === id
    const escolha = p.escolhas?.[id]
    itens.push({
      at,
      nodeId: id,
      nodeType: no.type,
      title: no.label ?? CATALOGO_EXEMPLO.steps.find((s) => s.type === no.type)?.label ?? no.type,
      detail: detalheDoPasso(no, escolha, falhou, esperando),
      status: falhou ? 'failed' : esperando ? 'waiting' : sombra ? 'shadow' : 'ok',
      reason: falhou ? 'O sistema da clínica não respondeu em 10 s (3 tentativas). A recepção foi avisada.' : esperando ? 'Aguardando a resposta até o prazo.' : undefined,
    })
  }
  const ultimo = p.caminho[p.caminho.length - 1]
  if (p.saida === 'goal' && nos[ultimo]?.type !== 'goal') {
    itens.push({ at: haDias(0, 3), nodeId: null, nodeType: 'goal', title: 'Meta atingida', detail: 'O paciente confirmou a consulta conversando com o agente. A meta contínua tirou a pessoa da jornada na hora, sem mensagem a mais.', status: 'ok', reason: 'Meta contínua: "Consulta confirmada" (mesma consulta).' })
  }
  if (p.saida === 'exit_if') {
    itens.push({ at: haDias(0, 2), nodeId: null, nodeType: 'exit', title: 'Saiu da jornada', detail: 'Um humano assumiu a conversa. Nenhuma mensagem a mais foi enviada.', status: 'ok', reason: 'Saída automática: "Humano assumiu a conversa".' })
  }
  return itens
}

function detalheDoPasso(no: NoDoGrafo, escolha: string | undefined, falhou: boolean, esperando: boolean): string {
  if (falhou) return 'Falhou.'
  switch (no.type) {
    case 'send_template': return 'Modelo enviado. Passou pelas travas: sem duplicata, dentro do horário, consentimento ok.'
    case 'send_text': return 'Texto enviado dentro da janela de 24 h.'
    case 'hold_conversation': return 'A jornada segurou a conversa por 24 h. O agente não respondeu nesse tempo.'
    case 'send_and_wait': {
      if (esperando) return 'Convite enviado. Esperando a resposta, com a conversa segura pela jornada.'
      const r = (no.params.replies as { key: string; label: string }[] | undefined)?.find((x) => x.key === escolha)
      return escolha === 'sem_resposta' ? 'O prazo acabou sem resposta.' : escolha === 'outra_resposta' ? 'Escreveu outra coisa: seguiu para o próximo passo.' : `Resposta: "${r?.label ?? escolha}".`
    }
    case 'wait_event': {
      if (esperando) return 'Esperando o paciente responder.'
      const ev = (no.params.events as { key: string; label: string }[] | undefined)?.find((e) => e.key === escolha)
      return escolha === 'sem_resposta' ? 'O prazo acabou sem resposta.' : `Resposta: "${ev?.label ?? escolha}".`
    }
    case 'connector_call': return 'Consulta confirmada no sistema da clínica.'
    case 'handoff_agent': return 'Conversa entregue ao agente, com a nota de contexto.'
    case 'notify_team': return 'Recepção avisada (lista do dia).'
    case 'goal': return 'Meta atingida.'
    case 'exit': return `Saiu: ${String(no.params.reason ?? '')}.`
    case 'wait': return 'Esperou o tempo combinado.'
    case 'ai_mission': return escolha === 'concluiu' ? 'O agente cumpriu a missão: consulta remarcada (1 crédito).' : 'Missão encerrada.'
    case 'tag': return 'Etiqueta aplicada.'
    default: return 'Feito.'
  }
}

export function rotuloDaPorta(type: string | undefined): string {
  switch (type) {
    case 'schedule_list': return 'Lista do sistema (agenda)'
    case 'event': return 'Quando algo acontecer'
    case 'segment': return 'Grupo de contatos'
    case 'webhook': return 'Outro sistema avisa'
    case 'manual': return 'À mão'
    default: return 'Entrada'
  }
}

const NAO_ENTROU: Record<string, { nome: string; tel: string; result: VerificacaoDeEntrada['result']; reason: string }> = {
  marcos: { nome: 'Marcos A.', tel: '+55 24 •••• 4410', result: 'filtered', reason: 'Filtro: a consulta já estava confirmada no sistema da clínica.' },
  lucia: { nome: 'Lúcia F.', tel: '+55 24 •••• 1188', result: 'reentry_blocked', reason: 'Já existe uma inscrição para esta mesma consulta (uma por consulta).' },
  pedro: { nome: 'Pedro H.', tel: '+55 24 •••• 0000', result: 'filtered', reason: 'Filtro: telefone inválido no cadastro.' },
  joana: { nome: 'Joana M.', tel: '+55 24 •••• 7302', result: 'suppressed', reason: 'Outra jornada estava segurando a conversa ("Recuperar cancelados").' },
  renata: { nome: 'Renata C.', tel: '+55 24 •••• 6061', result: 'entered', reason: 'Entrou às 11h02.' },
}

export function porQueNaoEntrouDeExemplo(journey: Jornada, busca: string): { contact: { name: string; phoneMasked: string }; checks: VerificacaoDeEntrada[] } | null {
  const chave = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0]
  const achado = NAO_ENTROU[chave]
  if (!achado) return null
  const porta = journey.draft.entry.doors[0]
  return {
    contact: { name: achado.nome, phoneMasked: achado.tel },
    checks: [
      { doorId: porta?.id ?? 'p', doorLabel: rotuloDaPorta(porta?.type), at: haDias(0, 5), result: achado.result, reason: achado.reason },
      ...(achado.result === 'entered' ? [] : [{ doorId: porta?.id ?? 'p', doorLabel: rotuloDaPorta(porta?.type), at: haDias(1, 5), result: achado.result, reason: achado.reason }]),
    ],
  }
}


/**
 * Os resultados num período (7, 30 ou 90 dias), com o período anterior, a série
 * por dia e, em cada envio, os motivos da Meta e a tarifa (P1, 16/11).
 */
export function resultadosDeExemplo(journey: Jornada, dias = 30): ResultadosDaJornada {
  const r = resultados30Dias(journey)
  const k = dias / 30
  const esc = (n: number) => Math.round(n * k)
  const tipoDe = (id: string) => journey.draft.graph.nodes[id]?.type
  const entered = esc(r.entered)
  const completedGoal = esc(r.completedGoal)
  const exited = esc(r.exited)
  const failed = r.failed ? Math.max(1, esc(r.failed)) : 0
  // Dias úteis com mais movimento; a semana passada um pouco menor.
  const series = Array.from({ length: dias }, (_, i) => {
    const d = new Date(agora - (dias - 1 - i) * 86_400_000)
    const peso = d.getDay() === 0 ? 0.25 : d.getDay() === 6 ? 0.55 : 1.15 + 0.12 * Math.sin(i / 2.3)
    const dia = (total: number) => Math.max(0, Math.round((total / dias) * peso))
    return { date: d.toISOString().slice(0, 10), entered: dia(entered), completed: dia(completedGoal), exited: dia(exited) }
  })
  return {
    ...r,
    period: { from: haDias(dias), to: haDias(0) },
    entered, completedGoal, exited, failed,
    byNode: r.byNode.map((b) => ({ ...b, reached: esc(b.reached) })),
    exitReasons: r.exitReasons.map((x) => ({ ...x, count: esc(x.count) })),
    byBranch: r.byBranch.map((b) => ({ ...b, count: esc(b.count) })),
    byVersion: r.byVersion.map((v) => ({ ...v, entered: esc(v.entered) })),
    byMessage: r.byMessage?.map((m) => {
      const sent = esc(m.sent)
      const nao = esc(m.failed)
      const semWhats = Math.ceil(nao * 0.6)
      const segurou = Math.floor(nao * 0.3)
      const ehModelo = tipoDe(m.nodeId) === 'send_template' || tipoDe(m.nodeId) === 'send_and_wait'
      return {
        ...m, sent, delivered: esc(m.delivered), read: esc(m.read), replied: esc(m.replied), failed: nao,
        failedReasons: nao ? [
          { reason: 'O número não tem WhatsApp', count: semWhats },
          { reason: 'A Meta segurou (limite de marketing)', count: segurou },
          { reason: 'Outro erro da Meta', count: nao - semWhats - segurou },
        ].filter((x) => x.count > 0) : [],
        costBrl: ehModelo ? Math.round(sent * TARIFA_MEDIA_DA_META_BRL * 100) / 100 : 0,
      }
    }),
    previous: { entered: Math.round(entered * 0.92), completedGoal: Math.round(completedGoal * 0.86), exited: Math.round(exited * 1.06), failed: failed + Math.max(1, Math.round(failed * 0.4)) },
    series,
    skipped: r.skipped?.map((x) => ({ ...x, count: esc(x.count) })).filter((x) => x.count > 0),
    attribution: r.attribution ? { ...r.attribution, deals: esc(r.attribution.deals), won: esc(r.attribution.won), revenueBrl: esc(r.attribution.revenueBrl), previousRevenueBrl: r.attribution.previousRevenueBrl ? esc(r.attribution.previousRevenueBrl) : undefined } : r.attribution,
  }
}

function resultados30Dias(journey: Jornada): ResultadosDaJornada {
  const ids = Object.keys(journey.draft.graph.nodes)
  const agora = agoraPorPasso(journey)
  if (journey.id === 'j_confirmacao') {
    const reached: Record<string, [number, number]> = {
      n_aguardar: [2480, 63], n_confirmar: [1646, 1], n_texto_ok: [1640, 0], n_meta: [1640, 0],
      n_agente_cancelar: [214, 0], n_agente_outra: [301, 0], n_sair_agente: [515, 0], n_avisar: [325, 0], n_sair: [325, 0],
    }
    return {
      period: { from: haDias(30), to: haDias(0) }, entered: 2480, completedGoal: 1712, exited: 762, failed: 6,
      byNode: ids.map((id) => ({ nodeId: id, reached: reached[id]?.[0] ?? 0, now: agora[id] ?? 0 })),
      exitReasons: [
        { reason: 'Com o agente (cancelar ou outra resposta)', count: 515 },
        { reason: 'Sem resposta (recepção avisada)', count: 325 },
        { reason: 'A consulta passou', count: 61 },
        { reason: 'Humano assumiu a conversa', count: 44 },
        { reason: 'Pediu para não receber', count: 9 },
        { reason: 'Erro no sistema da clínica', count: 6 },
      ],
      byVersion: [{ version: 2, entered: 2010, goalRate: 64 }, { version: 3, entered: 470, goalRate: 71 }],
      byBranch: [
        { nodeId: 'n_aguardar', output: 'confirmar', label: 'Confirmar', count: 1646 },
        { nodeId: 'n_aguardar', output: 'remarcar', label: 'Remarcar', count: 121 },
        { nodeId: 'n_aguardar', output: 'cancelar', label: 'Cancelar', count: 93 },
        { nodeId: 'n_aguardar', output: 'outra_resposta', label: 'Escreveu outra coisa', count: 301 },
        { nodeId: 'n_aguardar', output: 'sem_resposta', label: 'Sem resposta', count: 325 },
      ],
      byMessage: [
        { nodeId: 'n_aguardar', sent: 2480, delivered: 2431, read: 2207, replied: 2161, failed: 49 },
        { nodeId: 'n_texto_ok', sent: 1640, delivered: 1631, read: 1502, replied: 212, failed: 9 },
      ],
      skipped: [
        { code: 'filter', count: 412 }, { code: 'invalid_phone', count: 96 }, { code: 'other_journey', count: 38 }, { code: 'opt_out', count: 9 },
        { code: 'no_whatsapp', count: 31 }, { code: 'window_closed', count: 4 },
        { code: 'quiet_hours', count: 57 },
      ],
      attribution: { pipelineName: 'Consultas', windowDays: 30, deals: 1712, won: 1488, revenueBrl: 223_200, previousRevenueBrl: 197_400 },
    }
  }
  // As outras jornadas: números pequenos e proporcionais, só para a tela ter o que mostrar.
  const base = journey.status === 'draft' ? 0 : journey.status === 'paused' ? 64 : 180
  return {
    period: { from: haDias(30), to: haDias(0) }, entered: base, completedGoal: Math.round(base * 0.4), exited: Math.round(base * 0.55), failed: 0,
    byNode: ids.map((id, i) => ({ nodeId: id, reached: Math.max(0, Math.round(base * (1 - i * 0.12))), now: agora[id] ?? 0 })),
    skipped: base ? [{ code: 'filter', count: Math.round(base * 0.4) }, { code: 'reentry', count: Math.round(base * 0.1) }, { code: 'opt_out', count: 2 }, { code: 'quiet_hours', count: Math.round(base * 0.15) }] : [],
    attribution: null,
    exitReasons: base ? [{ reason: 'Sem resposta', count: Math.round(base * 0.35) }, { reason: 'Fim do caminho', count: Math.round(base * 0.2) }] : [],
    byVersion: journey.publishedVersion ? [{ version: journey.publishedVersion, entered: base, goalRate: 40 }] : [],
    byBranch: [],
    // Mensagens: proporções típicas do WhatsApp sobre quem passou pelo passo.
    byMessage: ids.flatMap((id, i) => {
      const tipo = journey.draft.graph.nodes[id].type
      if (tipo !== 'send_template' && tipo !== 'send_text') return []
      const sent = Math.max(0, Math.round(base * (1 - i * 0.12)))
      return [{ nodeId: id, sent, delivered: Math.round(sent * 0.98), read: Math.round(sent * 0.89), replied: Math.round(sent * 0.52), failed: Math.round(sent * 0.02) }]
    }),
  }
}
