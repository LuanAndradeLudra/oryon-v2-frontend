import type {
  ApoioDoEditor,
  Entrada,
  Grafo,
  Inscricao,
  ItemDaLinhaDoTempo,
  Jornada,
  Metas,
  NoDoGrafo,
  Receita,
  ResultadosDaJornada,
  VerificacaoDeEntrada,
  VersaoDaJornada,
} from './tipos'
import { CATALOGO_EXEMPLO } from './catalogo'

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
}

// ── montador de desenho ──────────────────────────────────────────────────────

type DefDeNo = [id: string, type: string, params: Record<string, unknown>, outputs: Record<string, string | null>, x: number, y: number, label?: string]

function grafo(start: string, defs: DefDeNo[]): Grafo {
  const nodes: Record<string, NoDoGrafo> = {}
  const layout: Grafo['layout'] = {}
  for (const [id, type, params, outputs, x, y, label] of defs) {
    nodes[id] = { type, params, outputs, ...(label ? { label } : {}) }
    layout[id] = { x, y }
  }
  return { start, nodes, layout }
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
      { field: 'conversa.posse', op: 'neq', value: 'outra_jornada' },
    ],
  },
  reentry: { mode: 'per_subject', subjectKey: 'agendamento:{{conector.agenda.id}}' },
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

const GRAFO_CONFIRMACAO = grafo('n_enviar', [
  ['n_enviar', 'send_template', {
    whatsappNumberId: 'l_alto', templateId: 't_lembrete',
    variables: ['{{contato.nome|"paciente"}}', '{{conector.agenda.data | data:"DD/MM"}}', '{{conector.agenda.hora}}', '{{conector.agenda.medico}}'],
  }, { next: 'n_segurar' }, 360, 170, 'Lembrete da consulta'],
  ['n_segurar', 'hold_conversation', { duration: H24 }, { next: 'n_aguardar' }, 360, 330],
  ['n_aguardar', 'wait_event', {
    events: [
      { key: 'confirmou', label: 'Confirmou', event: 'template.button_replied', match: 'Confirmar' },
      { key: 'cancelou', label: 'Cancelar ou remarcar', event: 'template.button_replied', match: 'Cancelar|Remarcar' },
      { key: 'outra', label: 'Escreveu outra coisa', event: 'message.received' },
    ],
    timeout: H24,
  }, { confirmou: 'n_confirmar', cancelou: 'n_agente_cancelar', outra: 'n_agente_outra', sem_resposta: 'n_avisar' }, 360, 490],
  ['n_confirmar', 'connector_call', { operation: 'confirmar_consulta' }, { next: 'n_texto_ok' }, 0, 700, 'Confirmar no sistema'],
  ['n_texto_ok', 'send_text', { text: 'Pronto, {{contato.nome}}! Sua consulta de {{conector.agenda.data | data:"DD/MM"}} às {{conector.agenda.hora}} está confirmada.' }, { next: 'n_meta' }, 0, 860, 'Avisar que confirmou'],
  ['n_meta', 'goal', { label: 'Consulta confirmada' }, {}, 0, 1020],
  ['n_agente_cancelar', 'handoff_agent', { note: 'Respondeu ao lembrete: quer cancelar ou remarcar a consulta de {{conector.agenda.data | data:"DD/MM"}}.' }, { next: 'n_sair_agente' }, 300, 700, 'Agente trata o cancelamento'],
  ['n_agente_outra', 'handoff_agent', { note: 'Respondeu ao lembrete da consulta de amanhã com uma mensagem.' }, { next: 'n_sair_agente' }, 600, 700, 'Agente responde'],
  ['n_sair_agente', 'exit', { reason: 'Com o agente' }, {}, 450, 880],
  ['n_avisar', 'notify_team', { departmentId: 'd_recepcao', message: '{{contato.nome}} não respondeu à confirmação de {{conector.agenda.data | data:"DD/MM"}} às {{conector.agenda.hora}}.', groupDaily: true }, { next: 'n_sair' }, 900, 700, 'Avisar a recepção'],
  ['n_sair', 'exit', { reason: 'Sem resposta' }, {}, 900, 880],
])

// ── 2. Recuperar cancelados (com IA: missão do agente) ───────────────────────

const ENTRADA_CANCELADOS: Entrada = {
  doors: [{ id: 'p_evento', type: 'event', params: { event: 'appointment_cancelled' } }],
  criteria: {
    mode: 'all',
    conditions: [
      { field: 'fato.consulta_marcada_30d', op: 'eq', value: false },
      { field: 'contato.opt_in_marketing', op: 'eq', value: true },
      { field: 'contato.etiquetas', op: 'not_contains', value: 'Caso de retomada aberto' },
    ],
  },
  reentry: { mode: 'per_subject', subjectKey: 'cancelamento:{{evento.id}}' },
}

const GRAFO_CANCELADOS = grafo('n_esperar', [
  ['n_esperar', 'wait', { mode: 'duration', duration: { amount: 2, unit: 'days' } }, { next: 'n_convite' }, 360, 170],
  ['n_convite', 'send_template', { whatsappNumberId: 'l_alto', templateId: 't_remarcar', variables: ['{{contato.nome|"paciente"}}', '{{evento.data_consulta | data:"DD/MM"}}'] }, { next: 'n_resposta' }, 360, 330, 'Convite para remarcar'],
  ['n_resposta', 'wait_event', {
    events: [
      { key: 'quer', label: 'Quero remarcar', event: 'template.button_replied', match: 'Quero remarcar' },
      { key: 'nao', label: 'Agora não', event: 'template.button_replied', match: 'Agora não' },
    ],
    timeout: { amount: 48, unit: 'hours' },
  }, { quer: 'n_missao', nao: 'n_etiqueta', sem_resposta: 'n_retomada' }, 360, 490],
  ['n_missao', 'ai_mission', { objective: 'Ajudar a pessoa a escolher um novo horário e remarcar a consulta.', limits: 'Não oferecer desconto. Não insistir depois de um "não".', deadline: { amount: 48, unit: 'hours' }, maxReplies: 8 }, { concluiu: 'n_meta_c', nao_concluiu: 'n_sair_c', prazo: 'n_retomada' }, 0, 700, 'Missão: remarcar'],
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
  ['n_p_espera', 'wait', { mode: 'relative_to_field', field: 'evento.data_consulta', offsetDays: 1, time: '10:00' }, { next: 'n_p_envio' }, 360, 170, 'Dia seguinte, 10h'],
  ['n_p_envio', 'send_template', { whatsappNumberId: 'l_alto', templateId: 't_pesquisa', variables: ['{{contato.nome|"paciente"}}', '{{evento.medico}}'] }, { next: 'n_p_resp' }, 360, 330],
  ['n_p_resp', 'wait_event', {
    events: [
      { key: 'boa', label: 'Ótima ou boa', event: 'template.button_replied', match: 'Ótima|Boa' },
      { key: 'ruim', label: 'Ruim', event: 'template.button_replied', match: 'Ruim' },
    ],
    timeout: { amount: 2, unit: 'days' },
  }, { boa: 'n_p_meta', ruim: 'n_p_gestor', sem_resposta: 'n_p_fim' }, 360, 490],
  ['n_p_meta', 'goal', { label: 'Respondeu a pesquisa' }, {}, 60, 680],
  ['n_p_gestor', 'notify_team', { departmentId: 'd_gestao', message: '{{contato.nome}} avaliou a consulta com {{evento.medico}} como ruim.', groupDaily: false }, { next: 'n_p_meta2' }, 360, 680, 'Avisar a gestão'],
  ['n_p_meta2', 'goal', { label: 'Respondeu a pesquisa' }, {}, 360, 850],
  ['n_p_fim', 'exit', { reason: 'Sem resposta' }, {}, 660, 680],
])

// ── 6 e 7. Só receitas: preparo de exame e reativar quem sumiu ───────────────

const GRAFO_PREPARO = grafo('n_pr_envio', [
  ['n_pr_envio', 'send_template', { whatsappNumberId: 'l_alto', templateId: 't_preparo', variables: ['{{contato.nome|"paciente"}}', '{{conector.agenda.data | data:"DD/MM"}}', '{{conector.agenda.hora}}', '{{conector.agenda.preparo}}'] }, { next: 'n_pr_resp' }, 360, 170, 'Instruções de preparo'],
  ['n_pr_resp', 'wait_event', { events: [{ key: 'entendeu', label: 'Entendi', event: 'template.button_replied', match: 'Entendi' }], timeout: H24 }, { entendeu: 'n_pr_meta', sem_resposta: 'n_pr_de_novo' }, 360, 330],
  ['n_pr_de_novo', 'send_text', { text: 'Só reforçando o preparo do seu exame de amanhã: {{conector.agenda.preparo}}.' }, { next: 'n_pr_meta' }, 600, 500, 'Lembrar de novo'],
  ['n_pr_meta', 'goal', { label: 'Preparo confirmado' }, {}, 360, 660],
])

const GRAFO_REATIVAR = grafo('n_r_envio', [
  ['n_r_envio', 'send_template', { whatsappNumberId: 'l_petro', templateId: 't_volta', variables: ['{{contato.nome|"tudo bem"}}'] }, { next: 'n_r_resp' }, 360, 170],
  ['n_r_resp', 'wait_event', { events: [{ key: 'quer', label: 'Quero marcar', event: 'template.button_replied', match: 'Quero marcar' }], timeout: { amount: 3, unit: 'days' } }, { quer: 'n_r_agente', sem_resposta: 'n_r_fim' }, 360, 330],
  ['n_r_agente', 'handoff_agent', { note: 'Respondeu ao convite de retorno. Ajude a marcar.' }, { next: 'n_r_fim' }, 160, 510],
  ['n_r_fim', 'exit', { reason: 'Fim do convite' }, {}, 460, 680],
])

const METAS_SIMPLES = (label: string, event: string): Metas => ({
  goals: [{ id: 'g1', label, event, sameSubject: true }],
  exitIf: [{ id: 'x_optout', label: 'Pediu para não receber', event: 'contact.opted_out' }, { id: 'x_humano', label: 'Humano assumiu a conversa', event: 'conversation.human_took_over' }],
  ttlDays: 7,
})

function versao(n: number, status: VersaoDaJornada['status'], g: Grafo, entry: Entrada, goals: Metas, publishedAt: string | null): VersaoDaJornada {
  return { version: n, status, graph: g, entry, goals, catalogVersion: CATALOGO_EXEMPLO.version, publishedAt, publishedBy: publishedAt ? 'Gabi (gestora)' : null }
}

// ── receitas (galeria) ───────────────────────────────────────────────────────

const ENTRADA_SITE: Entrada = { doors: [{ id: 'p_site', type: 'webhook', params: { name: 'Formulário do site' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'once' } }
const ENTRADA_TRANSF: Entrada = { doors: [{ id: 'p_transf', type: 'event', params: { event: 'agent.handoff_requested' } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'always' } }
const ENTRADA_PESQUISA: Entrada = { doors: [{ id: 'p_conf', type: 'event', params: { event: 'appointment_confirmed' } }], criteria: { mode: 'all', conditions: [{ field: 'contato.etiquetas', op: 'not_contains', value: 'Não quer pesquisa' }] }, reentry: { mode: 'cooldown', cooldownDays: 30 } }
const ENTRADA_PREPARO: Entrada = { doors: [{ id: 'p_agenda2', type: 'schedule_list', params: { time: '09:00', operation: 'agenda_do_dia', dayOffset: 2, weekdays: ['seg', 'ter', 'qua', 'qui', 'sex'] } }], criteria: { mode: 'all', conditions: [{ field: 'evento.especialidade', op: 'in', value: ['Ultrassom', 'Endoscopia', 'Exames de sangue'] }] }, reentry: { mode: 'per_subject', subjectKey: 'agendamento:{{conector.agenda.id}}' } }
const ENTRADA_REATIVAR: Entrada = { doors: [{ id: 'p_seg', type: 'segment', params: { schedule: 'toda segunda, 10h', segment: 'Etiqueta "Paciente" e sem conversa há 180 dias' } }], criteria: { mode: 'all', conditions: [{ field: 'contato.opt_in_marketing', op: 'eq', value: true }] }, reentry: { mode: 'cooldown', cooldownDays: 90 } }

export const RECEITAS_EXEMPLO: Receita[] = [
  { id: 'r_faltas', name: 'Reduzir faltas (confirmação)', outcome: 'Menos faltas na agenda', description: 'Um dia antes, confirma cada consulta pelo WhatsApp. Quem confirma é confirmado no sistema da clínica; quem quer cancelar vai para o agente; o silêncio avisa a recepção.', segment: 'clinica', usesAi: false, icon: 'CalendarCheck2',
    version: { graph: GRAFO_CONFIRMACAO, entry: ENTRADA_CONFIRMACAO, goals: METAS_CONFIRMACAO, catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_cancelados', name: 'Recuperar cancelados', outcome: 'Consultas remarcadas', description: 'Dois dias depois do cancelamento, convida para remarcar. Quem aceita conversa com o agente numa missão de remarcar; o silêncio vira caso de retomada.', segment: 'clinica', usesAi: true, icon: 'CalendarClock',
    version: { graph: GRAFO_CANCELADOS, entry: ENTRADA_CANCELADOS, goals: METAS_SIMPLES('Consulta remarcada', 'appointment_scheduled'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_preparo', name: 'Preparo de exame', outcome: 'Exames sem remarcação por preparo errado', description: 'Dois dias antes de um exame que pede preparo, manda as instruções e confirma a leitura. Sem resposta, reforça na véspera.', segment: 'clinica', usesAi: false, icon: 'ClipboardList',
    version: { graph: GRAFO_PREPARO, entry: ENTRADA_PREPARO, goals: METAS_SIMPLES('Preparo confirmado', 'template.button_replied'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_pesquisa', name: 'Pesquisa depois da consulta', outcome: 'Saber como foi o atendimento', description: 'No dia seguinte, pede uma avaliação. Avaliação ruim avisa a gestão na hora.', segment: 'clinica', usesAi: false, icon: 'Star',
    version: { graph: GRAFO_PESQUISA, entry: ENTRADA_PESQUISA, goals: METAS_SIMPLES('Respondeu a pesquisa', 'template.button_replied'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_boas_vindas', name: 'Boas-vindas', outcome: 'Resposta rápida a quem chega', description: 'Quem chega pelo formulário do site recebe boas-vindas na hora e é atendido pelo agente quando responde.', segment: 'geral', usesAi: false, icon: 'HandHeart',
    version: { graph: GRAFO_BOAS_VINDAS, entry: ENTRADA_SITE, goals: METAS_SIMPLES('Respondeu', 'message.received'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_reativar', name: 'Reativar quem sumiu', outcome: 'Pacientes de volta', description: 'Toda segunda, convida para um retorno quem não conversa há 6 meses (só quem aceita marketing).', segment: 'geral', usesAi: false, icon: 'RotateCcw',
    version: { graph: GRAFO_REATIVAR, entry: ENTRADA_REATIVAR, goals: METAS_SIMPLES('Marcou o retorno', 'appointment_scheduled'), catalogVersion: CATALOGO_EXEMPLO.version } },
  { id: 'r_avisar', name: 'Avisar a equipe quando…', outcome: 'Nada esquecido', description: 'Exemplo: a IA transferiu e ninguém assumiu em 15 minutos? Avisa o supervisor.', segment: 'geral', usesAi: false, icon: 'BellRing',
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
      status: 'active', publishedVersion: 3, hasDraftChanges: false, whatsappNumberId: 'l_alto', enrolledNow: 87, goalRate30d: 69, lastActivityAt: haDias(0, 1),
      errors24h: 2, creditsThisMonth: 0, messagesThisMonth: 2_538, createdBy: 'Gabi (gestora)', updatedAt: haDias(4), recipeId: 'r_faltas',
      draft: versao(4, 'draft', GRAFO_CONFIRMACAO, ENTRADA_CONFIRMACAO, METAS_CONFIRMACAO, null),
      enrolledByVersion: [{ version: 3, count: 75 }, { version: 2, count: 12 }],
    },
    {
      id: 'j_cancelados', name: 'Recuperar cancelados', description: 'Convida para remarcar quem cancelou e não marcou de novo. Em sombra: mostra o que teria feito.',
      status: 'shadow', publishedVersion: 1, hasDraftChanges: false, whatsappNumberId: 'l_alto', enrolledNow: 23, goalRate30d: null, lastActivityAt: haDias(0, 3),
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0, createdBy: 'Gabi (gestora)', updatedAt: haDias(2), recipeId: 'r_cancelados',
      draft: versao(2, 'draft', GRAFO_CANCELADOS, ENTRADA_CANCELADOS, METAS_SIMPLES('Consulta remarcada', 'appointment_scheduled'), null),
      enrolledByVersion: [{ version: 1, count: 23 }],
    },
    {
      id: 'j_pesquisa', name: 'Pesquisa depois da consulta', description: 'No dia seguinte à consulta, pede uma avaliação. Avaliação ruim avisa a gestão.',
      status: 'active', publishedVersion: 1, hasDraftChanges: false, whatsappNumberId: 'l_alto', enrolledNow: 41, goalRate30d: 38, lastActivityAt: haDias(0, 2),
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 1_104, createdBy: 'Rui (supervisor)', updatedAt: haDias(12), recipeId: 'r_pesquisa',
      draft: versao(2, 'draft', GRAFO_PESQUISA, ENTRADA_PESQUISA, METAS_SIMPLES('Respondeu a pesquisa', 'template.button_replied'), null),
      enrolledByVersion: [{ version: 1, count: 41 }],
    },
    {
      id: 'j_transferencia', name: 'Transferência esquecida', description: 'A IA transferiu e ninguém assumiu em 15 minutos: avisa o supervisor.',
      status: 'paused', publishedVersion: 2, hasDraftChanges: false, whatsappNumberId: null, enrolledNow: 0, goalRate30d: null, lastActivityAt: haDias(6),
      errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0, createdBy: 'Rui (supervisor)', updatedAt: haDias(6), recipeId: 'r_avisar',
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
  { id: 'e01', nome: 'Ana Paula S.', tel: '+55 24 •••• 0142', assunto: 'consulta 48213 · amanhã às 08h', status: 'waiting', no: 'n_aguardar', caminho: ['n_enviar', 'n_segurar', 'n_aguardar'] },
  { id: 'e02', nome: 'Bruno M.', tel: '+55 24 •••• 7710', assunto: 'consulta 48219 · amanhã às 08h30', status: 'completed', no: null, caminho: ['n_enviar', 'n_segurar', 'n_aguardar', 'n_confirmar', 'n_texto_ok', 'n_meta'], saida: 'goal', escolhas: { n_aguardar: 'confirmou' } },
  { id: 'e03', nome: 'Carla R.', tel: '+55 24 •••• 3391', assunto: 'consulta 48220 · amanhã às 09h', status: 'exited', no: null, caminho: ['n_enviar', 'n_segurar', 'n_aguardar', 'n_agente_cancelar', 'n_sair_agente'], saida: 'end', escolhas: { n_aguardar: 'cancelou' } },
  { id: 'e04', nome: 'Diego F.', tel: '+55 24 •••• 5528', assunto: 'consulta 48224 · amanhã às 09h30', status: 'waiting', no: 'n_aguardar', caminho: ['n_enviar', 'n_segurar', 'n_aguardar'], version: 2 },
  { id: 'e05', nome: 'Eduarda L.', tel: '+55 24 •••• 0909', assunto: 'consulta 48231 · amanhã às 10h', status: 'completed', no: null, caminho: ['n_enviar', 'n_segurar', 'n_aguardar', 'n_confirmar', 'n_texto_ok', 'n_meta'], saida: 'goal', escolhas: { n_aguardar: 'confirmou' } },
  { id: 'e06', nome: 'Fábio T.', tel: '+55 24 •••• 4417', assunto: 'consulta 48190 · hoje às 14h', status: 'exited', no: null, caminho: ['n_enviar', 'n_segurar', 'n_aguardar', 'n_avisar', 'n_sair'], saida: 'end', escolhas: { n_aguardar: 'sem_resposta' } },
  { id: 'e07', nome: 'Gisele P.', tel: '+55 24 •••• 8283', assunto: 'consulta 48235 · amanhã às 10h30', status: 'failed', no: 'n_confirmar', caminho: ['n_enviar', 'n_segurar', 'n_aguardar', 'n_confirmar'], saida: 'error', escolhas: { n_aguardar: 'confirmou' }, falhaEm: 'n_confirmar' },
  { id: 'e08', nome: 'Henrique A.', tel: '+55 24 •••• 1306', assunto: 'consulta 48240 · amanhã às 11h', status: 'exited', no: null, caminho: ['n_enviar', 'n_segurar', 'n_aguardar', 'n_agente_outra', 'n_sair_agente'], saida: 'end', escolhas: { n_aguardar: 'outra' } },
  { id: 'e09', nome: 'Isabela N.', tel: '+55 24 •••• 6620', assunto: 'consulta 48243 · amanhã às 11h30', status: 'waiting', no: 'n_aguardar', caminho: ['n_enviar', 'n_segurar', 'n_aguardar'] },
  { id: 'e10', nome: 'João Pedro V.', tel: '+55 24 •••• 2958', assunto: 'consulta 48197 · hoje às 16h', status: 'exited', no: null, caminho: ['n_enviar', 'n_segurar'], saida: 'exit_if' },
  { id: 'e11', nome: 'Karina B.', tel: '+55 24 •••• 7074', assunto: 'consulta 48250 · amanhã às 14h', status: 'waiting', no: 'n_aguardar', caminho: ['n_enviar', 'n_segurar', 'n_aguardar'] },
  { id: 'e12', nome: 'Lucas D.', tel: '+55 24 •••• 3845', assunto: 'consulta 48251 · amanhã às 14h30', status: 'completed', no: null, caminho: ['n_enviar', 'n_segurar', 'n_aguardar'], saida: 'goal' },
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

export function inscricoesDeExemplo(journeyId: string): { pessoas: PessoaDeExemplo[]; inscricoes: Inscricao[] } {
  if (journeyId === 'j_confirmacao') return { pessoas: PESSOAS_CONFIRMACAO, inscricoes: PESSOAS_CONFIRMACAO.map((p, i) => inscricaoDe(journeyId, p, i)) }
  if (journeyId === 'j_cancelados') {
    const pessoas: PessoaDeExemplo[] = [
      { id: 'c01', nome: 'Márcia O.', tel: '+55 24 •••• 5150', assunto: 'cancelamento · consulta de 10/11', status: 'waiting', no: 'n_esperar', caminho: ['n_esperar'], version: 1 },
      { id: 'c02', nome: 'Nelson Q.', tel: '+55 24 •••• 9081', assunto: 'cancelamento · consulta de 08/11', status: 'waiting', no: 'n_resposta', caminho: ['n_esperar', 'n_convite', 'n_resposta'], version: 1 },
      { id: 'c03', nome: 'Olívia S.', tel: '+55 24 •••• 2727', assunto: 'cancelamento · consulta de 06/11', status: 'completed', no: null, caminho: ['n_esperar', 'n_convite', 'n_resposta', 'n_missao', 'n_meta_c'], saida: 'goal', escolhas: { n_resposta: 'quer', n_missao: 'concluiu' }, version: 1 },
    ]
    return { pessoas, inscricoes: pessoas.map((p, i) => inscricaoDe(journeyId, p, i, true)) }
  }
  return { pessoas: [], inscricoes: [] }
}

/** O que cada passo "fez", em linguagem simples, para a linha do tempo de exemplo. */
export function linhaDoTempoDeExemplo(journey: Jornada, enrollmentId: string): ItemDaLinhaDoTempo[] {
  const { pessoas } = inscricoesDeExemplo(journey.id)
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
    case 'schedule_list': return 'Agenda + lista do sistema'
    case 'event': return 'Evento'
    case 'segment': return 'Segmento'
    case 'webhook': return 'Webhook de entrada'
    case 'manual': return 'Manual ou API'
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


export function resultadosDeExemplo(journey: Jornada): ResultadosDaJornada {
  const ids = Object.keys(journey.draft.graph.nodes)
  if (journey.id === 'j_confirmacao') {
    const reached: Record<string, [number, number]> = {
      n_enviar: [2480, 0], n_segurar: [2471, 0], n_aguardar: [2471, 63], n_confirmar: [1646, 1], n_texto_ok: [1640, 0], n_meta: [1640, 0],
      n_agente_cancelar: [214, 0], n_agente_outra: [301, 0], n_sair_agente: [515, 0], n_avisar: [325, 0], n_sair: [325, 0],
    }
    return {
      period: { from: haDias(30), to: haDias(0) }, entered: 2480, completedGoal: 1712, exited: 762, failed: 6,
      byNode: ids.map((id) => ({ nodeId: id, reached: reached[id]?.[0] ?? 0, now: reached[id]?.[1] ?? 0 })),
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
        { nodeId: 'n_aguardar', output: 'confirmou', label: 'Confirmou', count: 1646 },
        { nodeId: 'n_aguardar', output: 'cancelou', label: 'Cancelar ou remarcar', count: 214 },
        { nodeId: 'n_aguardar', output: 'outra', label: 'Escreveu outra coisa', count: 301 },
        { nodeId: 'n_aguardar', output: 'sem_resposta', label: 'Sem resposta', count: 325 },
      ],
    }
  }
  // As outras jornadas: números pequenos e proporcionais, só para a tela ter o que mostrar.
  const base = journey.status === 'draft' ? 0 : journey.status === 'paused' ? 64 : 180
  return {
    period: { from: haDias(30), to: haDias(0) }, entered: base, completedGoal: Math.round(base * 0.4), exited: Math.round(base * 0.55), failed: 0,
    byNode: ids.map((id, i) => ({ nodeId: id, reached: Math.max(0, Math.round(base * (1 - i * 0.12))), now: i === 2 ? Math.round(base * 0.1) : 0 })),
    exitReasons: base ? [{ reason: 'Sem resposta', count: Math.round(base * 0.35) }, { reason: 'Fim do caminho', count: Math.round(base * 0.2) }] : [],
    byVersion: journey.publishedVersion ? [{ version: journey.publishedVersion, entered: base, goalRate: 40 }] : [],
    byBranch: [],
  }
}
