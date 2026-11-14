import type { Catalogo, NoDoGrafo, PassoDoCatalogo } from './tipos'

/**
 * ORY-60 — o catálogo de passos, eventos e operações de conector.
 *
 * No produto, isto vem do backend (`GET /v1/journeys/catalog`, ORY-61): a tela
 * gera o formulário de cada passo a partir daqui e nunca tem lista escrita à mão
 * (princípio 1 do desenho). Enquanto o backend não existe, o catálogo de exemplo
 * mora neste arquivo, no mesmo formato.
 */

const DURACAO_PADRAO_24H = { amount: 24, unit: 'hours' }

const PASSOS: PassoDoCatalogo[] = [
  // ── Mensagem ──────────────────────────────────────────────────────────────
  {
    type: 'send_template',
    group: 'mensagem',
    label: 'Enviar modelo',
    description: 'Modelo aprovado pela Meta, com variáveis e botões. Passa pela porta única de envio.',
    icon: 'MessageSquareText',
    outputs: 'single',
    params: [
      { key: 'whatsappNumberId', label: 'Linha de WhatsApp', type: 'whatsapp_number', required: true },
      { key: 'templateId', label: 'Modelo', type: 'template', required: true, help: 'Só aparecem modelos aprovados.' },
      { key: 'variables', label: 'Variáveis do modelo', type: 'template_variables', help: 'Ex.: {{contato.nome|"paciente"}} ou {{conector.agenda.hora}}.' },
    ],
    cost: { credits: 0, label: 'tarifa da Meta' },
    requires: ['whatsapp_number'],
    availability: 'available',
  },
  {
    type: 'send_text',
    group: 'mensagem',
    label: 'Enviar texto',
    description: 'Texto livre. Só sai com a janela de 24 h aberta; fora dela o passo falha com o motivo.',
    icon: 'MessageSquare',
    outputs: 'single',
    params: [{ key: 'text', label: 'Texto', type: 'longtext', required: true, placeholder: 'Pronto, {{contato.nome}}! Sua consulta está confirmada.' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation', 'window_24h'],
    availability: 'available',
  },
  {
    type: 'notify_team',
    group: 'mensagem',
    label: 'Avisar a equipe',
    description: 'Aviso para um setor ou pessoa. Pode juntar o dia numa lista só.',
    icon: 'BellRing',
    outputs: 'single',
    params: [
      { key: 'departmentId', label: 'Setor', type: 'department', required: true },
      { key: 'message', label: 'Aviso', type: 'longtext', required: true, placeholder: '{{contato.nome}} não respondeu à confirmação de amanhã.' },
      { key: 'groupDaily', label: 'Juntar numa lista do dia', type: 'boolean', default: true },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'internal_note',
    group: 'mensagem',
    label: 'Nota interna',
    description: 'Nota na conversa, que só a equipe vê.',
    icon: 'StickyNote',
    outputs: 'single',
    params: [{ key: 'text', label: 'Nota', type: 'longtext', required: true }],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  // ── Conversa e posse ──────────────────────────────────────────────────────
  {
    type: 'hold_conversation',
    group: 'conversa',
    label: 'Segurar a conversa',
    description: 'A jornada assume a vez por um prazo. O agente não responde nesse tempo. Se um humano assumir, a jornada sai da frente.',
    icon: 'Hand',
    outputs: 'single',
    params: [{ key: 'duration', label: 'Por quanto tempo', type: 'duration', required: true, default: DURACAO_PADRAO_24H }],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'handoff_agent',
    group: 'conversa',
    label: 'Entregar ao agente',
    description: 'Devolve a conversa ao agente de IA com uma nota de contexto.',
    icon: 'Bot',
    outputs: 'single',
    params: [{ key: 'note', label: 'Nota para o agente', type: 'longtext', placeholder: 'Respondeu ao lembrete da consulta de amanhã.' }],
    cost: { credits: 0, label: 'atendimento normal' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'handoff_human',
    group: 'conversa',
    label: 'Entregar a humano',
    description: 'Transfere com motivo, pausa a IA e avisa (o mesmo caminho da transferência de hoje).',
    icon: 'UserRound',
    outputs: 'single',
    params: [
      { key: 'departmentId', label: 'Setor', type: 'department', required: true },
      { key: 'reason', label: 'Motivo', type: 'text', required: true, placeholder: 'Quer cancelar ou remarcar' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'resolve_conversation',
    group: 'conversa',
    label: 'Resolver conversa',
    description: 'Marca a conversa como resolvida, respeitando uma transferência recente.',
    icon: 'CheckCheck',
    outputs: 'single',
    params: [],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  // ── CRM ───────────────────────────────────────────────────────────────────
  {
    type: 'tag',
    group: 'crm',
    label: 'Etiqueta',
    description: 'Põe ou tira uma etiqueta do contato.',
    icon: 'Tag',
    outputs: 'single',
    params: [
      { key: 'action', label: 'Ação', type: 'select', required: true, default: 'add', options: [{ value: 'add', label: 'Pôr' }, { value: 'remove', label: 'Tirar' }] },
      { key: 'tagId', label: 'Etiqueta', type: 'tag', required: true },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'set_stage',
    group: 'crm',
    label: 'Etapa do contato',
    description: 'Muda a etapa do contato.',
    icon: 'Milestone',
    outputs: 'single',
    params: [{ key: 'stageId', label: 'Etapa', type: 'stage', required: true }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'assign',
    group: 'crm',
    label: 'Atribuir',
    description: 'Atribui a conversa a uma pessoa ou setor.',
    icon: 'UserPlus',
    outputs: 'single',
    params: [
      { key: 'to', label: 'Para', type: 'select', required: true, default: 'department', options: [{ value: 'department', label: 'Setor' }, { value: 'user', label: 'Pessoa' }] },
      { key: 'departmentId', label: 'Setor', type: 'department', showIf: { key: 'to', equals: 'department' } },
      { key: 'userId', label: 'Pessoa', type: 'user', showIf: { key: 'to', equals: 'user' } },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'deal_action',
    group: 'crm',
    label: 'Negócio',
    description: 'Cria, move, ganha ou perde um negócio no funil.',
    icon: 'SquareKanban',
    outputs: 'single',
    params: [
      { key: 'action', label: 'Ação', type: 'select', required: true, default: 'move', options: [
        { value: 'create', label: 'Criar' }, { value: 'move', label: 'Mover de etapa' }, { value: 'won', label: 'Marcar como ganho' }, { value: 'lost', label: 'Marcar como perdido' },
      ] },
      { key: 'stageName', label: 'Etapa do funil', type: 'text', placeholder: 'Agendado' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  // ── Integração ────────────────────────────────────────────────────────────
  {
    type: 'connector_call',
    group: 'integracao',
    label: 'Sistema da clínica',
    description: 'Chama uma operação do conector (ex.: confirmar a consulta no sistema). O resultado vai para o contexto.',
    icon: 'PlugZap',
    outputs: 'single',
    params: [{ key: 'operation', label: 'Operação', type: 'connector_operation', required: true }],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['connector'],
    availability: 'available',
  },
  {
    type: 'webhook_out',
    group: 'integracao',
    label: 'Webhook de saída',
    description: 'Avisa outro sistema por HTTPS, com assinatura. Só resposta 2xx conta como sucesso.',
    icon: 'Webhook',
    outputs: 'single',
    params: [
      { key: 'url', label: 'Endereço (HTTPS)', type: 'text', required: true, placeholder: 'https://erp.exemplo.com.br/webhooks/oryon' },
      { key: 'fields', label: 'Campos enviados', type: 'list', help: 'Só ids e campos escolhidos. Nada de texto de conversa.' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  // ── Controle ──────────────────────────────────────────────────────────────
  {
    type: 'wait',
    group: 'controle',
    label: 'Esperar',
    description: 'Um tempo, até um horário, relativo a uma data ("1 dia antes da consulta") ou até o próximo horário útil.',
    icon: 'Hourglass',
    outputs: 'single',
    params: [
      { key: 'mode', label: 'Esperar', type: 'select', required: true, default: 'duration', options: [
        { value: 'duration', label: 'Um tempo' },
        { value: 'until_time', label: 'Até um horário' },
        { value: 'relative_to_field', label: 'Relativo a uma data' },
        { value: 'next_business_hour', label: 'Até o próximo horário útil' },
      ] },
      { key: 'duration', label: 'Quanto tempo', type: 'duration', showIf: { key: 'mode', equals: 'duration' }, default: { amount: 2, unit: 'days' } },
      { key: 'time', label: 'Horário', type: 'time_of_day', showIf: { key: 'mode', equals: 'until_time' }, default: '09:00' },
      { key: 'field', label: 'Data de referência', type: 'text', showIf: { key: 'mode', equals: 'relative_to_field' }, placeholder: 'evento.data_consulta' },
      { key: 'offsetDays', label: 'Dias antes (negativo) ou depois', type: 'number', showIf: { key: 'mode', equals: 'relative_to_field' }, default: -1 },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'wait_event',
    group: 'controle',
    label: 'Aguardar resposta',
    description: 'Espera um botão, um formulário ou um evento do mesmo assunto, com prazo. Cada resposta vira um ramo, e o prazo vira o ramo "sem resposta".',
    icon: 'MailQuestionMark',
    outputs: 'dynamic',
    params: [
      { key: 'events', label: 'Respostas esperadas', type: 'events', required: true },
      { key: 'timeout', label: 'Prazo', type: 'duration', required: true, default: DURACAO_PADRAO_24H },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'branch',
    group: 'controle',
    label: 'Ramificar',
    description: 'Escolhe o caminho por condição (grupos E/OU, sem código). O que não cair em nenhum ramo segue pelo "senão".',
    icon: 'Split',
    outputs: 'dynamic',
    params: [{ key: 'branches', label: 'Ramos', type: 'conditions', required: true }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'goal',
    group: 'controle',
    label: 'Meta atingida',
    description: 'Encerra a inscrição como sucesso.',
    icon: 'Trophy',
    outputs: 'none',
    params: [{ key: 'label', label: 'Nome da meta', type: 'text', default: 'Consulta confirmada' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'exit',
    group: 'controle',
    label: 'Sair',
    description: 'Encerra a inscrição com um motivo.',
    icon: 'LogOut',
    outputs: 'none',
    params: [{ key: 'reason', label: 'Motivo', type: 'text', required: true, default: 'Sem resposta' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  // ── IA (opcional, com custo à vista) ──────────────────────────────────────
  {
    type: 'ai_classify',
    group: 'ia',
    label: 'Classificar resposta',
    description: 'A IA lê a resposta livre e escolhe uma categoria. Confiança baixa segue pelo ramo "incerto".',
    icon: 'Sparkles',
    outputs: 'dynamic',
    params: [
      { key: 'question', label: 'O que decidir', type: 'text', required: true, placeholder: 'O paciente quer confirmar, cancelar ou remarcar?' },
      { key: 'categories', label: 'Categorias', type: 'list', required: true },
    ],
    cost: { credits: 0.2, label: '0,2 crédito' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'ai_mission',
    group: 'ia',
    label: 'Missão do agente',
    description: 'Entrega a conversa ao agente com um objetivo, limites e prazo. A missão sempre termina, por desfecho ou por prazo.',
    icon: 'Target',
    outputs: 'dynamic',
    params: [
      { key: 'objective', label: 'Objetivo', type: 'longtext', required: true, placeholder: 'Ajudar a pessoa a remarcar a consulta cancelada.' },
      { key: 'limits', label: 'Limites', type: 'longtext', placeholder: 'Não oferecer desconto. Não insistir depois de um "não".' },
      { key: 'deadline', label: 'Prazo', type: 'duration', required: true, default: { amount: 48, unit: 'hours' } },
      { key: 'maxReplies', label: 'Máximo de respostas', type: 'number', default: 8 },
    ],
    cost: { credits: 1, label: '1 crédito (como um atendimento)' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'backstage_task',
    group: 'ia',
    label: 'Tarefa de bastidor',
    description: 'Uma IA que analisa e age no sistema sem falar com o paciente (Claude Managed Agents). Fica para o próximo épico.',
    icon: 'Cpu',
    outputs: 'single',
    params: [{ key: 'task', label: 'Tarefa', type: 'longtext', required: true }],
    cost: { credits: 5, label: 'até 5 créditos' },
    requires: [],
    availability: 'soon',
  },
  {
    type: 'human_approval',
    group: 'ia',
    label: 'Aprovação humana',
    description: 'A jornada para até alguém aprovar no app. Fica para o próximo épico.',
    icon: 'ShieldCheck',
    outputs: 'single',
    params: [{ key: 'question', label: 'O que aprovar', type: 'text', required: true }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'soon',
  },
]

export const CATALOGO_EXEMPLO: Catalogo = {
  version: '2026-11-13.exemplo',
  steps: PASSOS,
  events: [
    { key: 'template.button_replied', label: 'Apertou um botão do modelo', producer: 'plataforma', variables: ['evento.botao'] },
    { key: 'flow.replied', label: 'Respondeu um formulário do WhatsApp', producer: 'plataforma', variables: ['evento.respostas'] },
    { key: 'message.received', label: 'Mandou uma mensagem', producer: 'plataforma', variables: ['evento.texto'] },
    { key: 'message.first', label: 'Primeira mensagem do contato', producer: 'plataforma', variables: ['evento.texto'] },
    { key: 'contact.created', label: 'Contato criado (inclusive pelo WhatsApp)', producer: 'plataforma', variables: ['contato.origem'] },
    { key: 'contact.tag_added', label: 'Etiqueta posta', producer: 'plataforma', variables: ['evento.etiqueta'] },
    { key: 'contact.tag_removed', label: 'Etiqueta tirada', producer: 'plataforma', variables: ['evento.etiqueta'] },
    { key: 'contact.stage_changed', label: 'Mudou de etapa', producer: 'plataforma', variables: ['evento.etapa'] },
    { key: 'conversation.human_took_over', label: 'Humano assumiu a conversa', producer: 'plataforma', variables: ['evento.atendente'] },
    { key: 'conversation.ai_paused', label: 'IA pausada', producer: 'plataforma', variables: [] },
    { key: 'conversation.resolved', label: 'Conversa resolvida', producer: 'plataforma', variables: [] },
    { key: 'conversation.assigned', label: 'Conversa atribuída', producer: 'plataforma', variables: ['evento.atendente'] },
    { key: 'deal.stage_changed', label: 'Negócio mudou de etapa', producer: 'plataforma', variables: ['evento.etapa', 'evento.funil'] },
    { key: 'deal.won', label: 'Negócio ganho', producer: 'plataforma', variables: ['evento.valor'] },
    { key: 'appointment_scheduled', label: 'Consulta marcada', producer: 'agente', variables: ['evento.data_consulta', 'evento.medico', 'evento.especialidade'] },
    { key: 'appointment_cancelled', label: 'Consulta cancelada', producer: 'agente', variables: ['evento.data_consulta', 'evento.medico', 'evento.especialidade'] },
    { key: 'appointment_confirmed', label: 'Consulta confirmada', producer: 'agente', variables: ['evento.data_consulta'] },
    { key: 'agent.handoff_requested', label: 'A IA pediu um humano', producer: 'agente', variables: ['evento.motivo'] },
    { key: 'agent.mission_finished', label: 'Missão do agente terminou', producer: 'agente', variables: ['evento.desfecho'] },
    { key: 'external.event', label: 'Evento de outro sistema (POST /v1/events)', producer: 'externo', variables: ['evento.*'] },
  ],
  connectorOperations: [
    { key: 'agenda_do_dia', label: 'Agenda do dia (lista de consultas)', connector: 'Sistema da clínica', kind: 'list', variables: ['conector.agenda.data', 'conector.agenda.hora', 'conector.agenda.medico', 'conector.agenda.especialidade', 'conector.agenda.unidade'], writes: false },
    { key: 'cancelados_de_ontem', label: 'Consultas canceladas ontem (lista)', connector: 'Sistema da clínica', kind: 'list', variables: ['conector.cancelada.data', 'conector.cancelada.medico', 'conector.cancelada.especialidade'], writes: false },
    { key: 'confirmar_consulta', label: 'Confirmar a consulta no sistema', connector: 'Sistema da clínica', kind: 'action', variables: ['conector.resultado'], writes: true },
    { key: 'cancelar_consulta', label: 'Cancelar a consulta no sistema', connector: 'Sistema da clínica', kind: 'action', variables: ['conector.resultado'], writes: true },
  ],
  conditionFields: [
    { key: 'contato.etiquetas', label: 'Etiquetas do contato', type: 'list' },
    { key: 'contato.etapa', label: 'Etapa do contato', type: 'text' },
    { key: 'contato.opt_in_marketing', label: 'Aceita marketing', type: 'boolean' },
    { key: 'contato.origem', label: 'Origem do contato', type: 'text' },
    { key: 'contato.telefone_valido', label: 'Telefone válido', type: 'boolean' },
    { key: 'conversa.posse', label: 'Quem tem a vez na conversa', type: 'text' },
    { key: 'conversa.janela_aberta', label: 'Janela de 24 h aberta', type: 'boolean' },
    { key: 'conversa.atendente', label: 'Atendente da conversa', type: 'text' },
    { key: 'evento.especialidade', label: 'Especialidade da consulta', type: 'text' },
    { key: 'evento.data_consulta', label: 'Data da consulta', type: 'date' },
    { key: 'conector.agenda.status', label: 'Status da consulta no sistema', type: 'text' },
    { key: 'fato.consulta_marcada_30d', label: 'Já tem consulta marcada nos próximos 30 dias', type: 'boolean' },
    { key: 'contexto.tentativa', label: 'Tentativa', type: 'number' },
  ],
}

export function passoDoCatalogo(catalogo: Catalogo, type: string): PassoDoCatalogo | undefined {
  return catalogo.steps.find((p) => p.type === type)
}

export interface SaidaDoPasso {
  key: string
  label: string
}

/**
 * As saídas de um passo. Passo comum tem uma ("next"); quem ramifica tira as
 * saídas dos parâmetros (respostas esperadas, ramos, categorias) e sempre
 * acrescenta a saída de reserva (sem resposta, senão, incerto).
 */
export function saidasDoNo(no: Pick<NoDoGrafo, 'type' | 'params'>, catalogo: Catalogo): SaidaDoPasso[] {
  const passo = passoDoCatalogo(catalogo, no.type)
  if (!passo || passo.outputs === 'none') return []
  if (passo.outputs === 'single') return [{ key: 'next', label: '' }]
  const lista = (v: unknown): { key: string; label: string }[] =>
    Array.isArray(v) ? v.filter((x): x is { key: string; label: string } => !!x && typeof x === 'object' && 'key' in x) : []
  switch (no.type) {
    case 'wait_event':
      return [...lista(no.params.events).map((e) => ({ key: e.key, label: e.label })), { key: 'sem_resposta', label: 'Sem resposta' }]
    case 'branch':
      return [...lista(no.params.branches).map((b) => ({ key: b.key, label: b.label })), { key: 'senao', label: 'Senão' }]
    case 'ai_classify':
      return [...lista(no.params.categories).map((c) => ({ key: c.key, label: c.label })), { key: 'incerto', label: 'Incerto' }]
    case 'ai_mission':
      return [
        { key: 'concluiu', label: 'Concluiu' },
        { key: 'nao_concluiu', label: 'Não concluiu' },
        { key: 'prazo', label: 'Prazo acabou' },
      ]
    default:
      return [{ key: 'next', label: '' }]
  }
}

export const ROTULO_DO_GRUPO: Record<PassoDoCatalogo['group'], string> = {
  mensagem: 'Mensagem',
  conversa: 'Conversa',
  crm: 'CRM',
  integracao: 'Integração',
  controle: 'Controle',
  ia: 'IA (opcional)',
}
