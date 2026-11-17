import type { Catalogo, NoDoGrafo, PassoDoCatalogo, PoliticaDeErro, TipoDeMissao, TipoDePorta } from './tipos'
import { ACOES_DA_EQUIPE, ANEXOS_DO_AVISO, METAS_PADRAO, MOTIVOS_DA_EQUIPE, MOTIVOS_DE_SAIDA, RESTRICOES_DA_MISSAO } from './padroes'

/**
 * ORY-60 — o catálogo de passos, eventos e operações de conector.
 *
 * No produto, isto vem do backend (`GET /v1/journeys/catalog`, ORY-61): a tela
 * gera o formulário de cada passo a partir daqui e nunca tem lista escrita à mão
 * (princípio 1 do desenho). Enquanto o backend não existe, o catálogo de exemplo
 * mora neste arquivo, no mesmo formato.
 */

const DURACAO_PADRAO_24H = { amount: 24, unit: 'hours' }

/** Os parâmetros com que cada tipo de porta nasce (no editor e ao criar "em branco" pela porta). */
export const PARAMS_PADRAO_DA_PORTA: Record<TipoDePorta, Record<string, unknown>> = {
  schedule_list: { time: '09:00', operation: 'agenda_do_dia', dayOffset: 1, weekdays: ['seg', 'ter', 'qua', 'qui', 'sex'] },
  event: { event: 'appointment_cancelled' },
  segment: { segmentId: '', segmentName: '', frequency: 'weekly', weekdays: ['seg'], time: '10:00' },
  webhook: { name: 'Formulário do site', sampleKeys: [], mapping: { phone: '', subject: '', variables: [] } },
  manual: {},
}

/** O padrão do motor (§2.6): repetir 3 vezes, com espera crescente, e entregar a humano. */
export const ERRO_PADRAO: PoliticaDeErro = { retries: 3, then: 'human' }

/** Passos que enviam mensagem ao contato pelo WhatsApp. */
export const PASSOS_DE_ENVIO = new Set(['send_template', 'send_text', 'send_and_wait', 'ask_question'])

/**
 * Quando um ENVIO não sai (P0, 17/11): entregar a humano só cria trabalho, porque a
 * mensagem não chegou (número sem WhatsApp, bloqueio, janela fechada). O padrão é
 * tirar da jornada com o motivo; o caminho "Não enviou" fica a um clique.
 * Erros definitivos não se repetem; os passageiros (instabilidade), sim.
 */
export const ERRO_DO_ENVIO: PoliticaDeErro = { retries: 3, then: 'exit' }

/**
 * Os tipos de missão (decisão do João, 16/11): instruções escritas e TESTADAS
 * pela Oryon (bateria por tipo antes de liberar), no lugar de um objetivo em
 * texto livre. A missão vai ao MESMO agente que já atende o número, só na
 * conversa daquele contato e só enquanto durar. O texto que o agente recebe
 * fica no agent-server, versionado; aqui ficam o nome, a explicação e o
 * critério de sucesso de cada tipo. Ordem que vale: regras da plataforma >
 * configuração do agente do cliente > missão (as restrições extras somam, nunca
 * passam por cima).
 */
/**
 * Os tipos de missão (decisão do João, 16/11; detalhados em 17/11): instruções escritas
 * e TESTADAS pela Oryon (bateria por tipo, por opção e por restrição antes de liberar),
 * no lugar de um objetivo em texto livre. A missão vai ao MESMO agente que já atende o
 * número, só na conversa daquele contato e só enquanto durar. O texto que o agente
 * recebe fica no agent-server, versionado; aqui ficam o nome, o que o agente faz, as
 * escolhas e restrições permitidas, o critério de sucesso e o prazo de cada tipo. Ordem
 * que vale: regras da plataforma > configuração do agente do cliente > missão (as
 * restrições somam, nunca passam por cima).
 */
export const TIPOS_DE_MISSAO: Record<string, TipoDeMissao> = {
  reschedule: {
    label: 'Remarcar um agendamento',
    hint: 'Ajuda a pessoa a escolher um novo horário (atendimento, visita, reunião, aula…) e marca no sistema. Termina quando o novo horário é marcado.',
    successEvent: 'appointment_scheduled',
    goalCode: 'rescheduled',
    steps: [
      'Lembra o agendamento e pergunta se a pessoa quer um novo horário.',
      'Oferece até 3 horários livres, conforme as escolhas abaixo.',
      'Marca o horário escolhido no sistema e confirma com a pessoa.',
      'Se a pessoa não quiser, agradece e encerra.',
    ],
    restrictions: ['no_insist', 'no_same_day', 'no_prices', 'handoff_on_complaint', 'no_personal_data'],
    defaultRestrictions: ['no_insist', 'handoff_on_complaint'],
    options: [
      { key: 'professional', label: 'Com quem', kind: 'one', default: 'same', options: [{ value: 'same', label: 'A mesma pessoa da equipe' }, { value: 'any', label: 'Qualquer pessoa que faça o mesmo serviço' }] },
      { key: 'withinDays', label: 'Horários nos próximos', kind: 'one', default: '14', options: [{ value: '7', label: '7 dias' }, { value: '14', label: '14 dias' }, { value: '30', label: '30 dias' }] },
      { key: 'unit', label: 'Onde', kind: 'one', default: 'same', options: [{ value: 'same', label: 'No mesmo lugar' }, { value: 'any', label: 'Em qualquer unidade ou loja' }] },
    ],
    deadline: { amount: 48, unit: 'hours' },
    maxReplies: 8,
  },
  confirm_attendance: {
    label: 'Confirmar presença',
    hint: 'Tira as dúvidas e confirma se a pessoa vai ao que foi marcado (atendimento, visita, reunião, aula…). Termina quando o agendamento é confirmado.',
    successEvent: 'appointment_confirmed',
    goalCode: 'attendance_confirmed',
    steps: [
      'Lembra o dia, a hora e o local do agendamento.',
      'Tira as dúvidas (endereço, o que levar, como se preparar).',
      'Confirma a presença no sistema.',
      'Se a pessoa não puder ir, faz o que foi escolhido abaixo.',
    ],
    restrictions: ['no_insist', 'no_prices', 'handoff_on_complaint', 'no_personal_data'],
    defaultRestrictions: ['no_insist'],
    options: [
      { key: 'ifCannot', label: 'Se a pessoa não puder ir', kind: 'one', default: 'offer_new', options: [{ value: 'offer_new', label: 'Oferecer outro horário' }, { value: 'cancel', label: 'Só cancelar' }, { value: 'team', label: 'Passar para a equipe' }] },
    ],
    deadline: { amount: 24, unit: 'hours' },
    maxReplies: 6,
  },
  recover_quote: {
    label: 'Retomar um orçamento',
    hint: 'Entende o que travou o orçamento ou a proposta e responde às dúvidas. Termina quando o negócio é ganho.',
    successEvent: 'deal.won',
    goalCode: 'deal_won',
    steps: [
      'Lembra o orçamento enviado e pergunta o que a pessoa achou.',
      'Entende o que travou (preço, prazo, dúvida) e responde.',
      'Oferece só o que foi liberado abaixo.',
      'Se a pessoa fechar, marca o negócio como ganho.',
    ],
    restrictions: ['no_insist', 'no_discount', 'handoff_on_complaint', 'no_personal_data'],
    defaultRestrictions: ['no_insist', 'no_discount'],
    options: [
      { key: 'offer', label: 'O que pode oferecer', kind: 'one', default: 'none', options: [{ value: 'none', label: 'Nada além do orçamento' }, { value: 'installments', label: 'Parcelamento' }, { value: 'discount_5', label: 'Desconto de até 5%' }, { value: 'discount_10', label: 'Desconto de até 10%' }] },
    ],
    deadline: { amount: 72, unit: 'hours' },
    maxReplies: 8,
  },
  qualify_lead: {
    label: 'Qualificar o contato',
    hint: 'Descobre o interesse, o prazo e a melhor forma de atender, e anda o negócio no funil. Termina quando o negócio muda de etapa.',
    successEvent: 'deal.stage_changed',
    goalCode: 'qualified',
    steps: [
      'Cumprimenta e pergunta como pode ajudar.',
      'Descobre o que foi escolhido abaixo, uma pergunta por vez.',
      'Ao qualificar, leva o negócio para a etapa escolhida.',
      'Se a pessoa não tiver interesse, faz o que foi escolhido abaixo.',
    ],
    restrictions: ['no_insist', 'no_prices', 'handoff_on_complaint', 'no_personal_data'],
    defaultRestrictions: ['no_insist'],
    options: [
      { key: 'discover', label: 'O que descobrir', kind: 'many', default: ['interest', 'deadline'], options: [{ value: 'interest', label: 'O interesse' }, { value: 'deadline', label: 'O prazo' }, { value: 'budget', label: 'O orçamento' }, { value: 'best_time', label: 'O melhor horário para falar' }] },
      { key: 'moveTo', label: 'Ao qualificar, levar o negócio para', kind: 'deal_stage', default: '' },
      { key: 'ifNotInterested', label: 'Se não tiver interesse', kind: 'one', default: 'end', options: [{ value: 'end', label: 'Só encerrar' }, { value: 'lost', label: 'Marcar o negócio como perdido' }] },
    ],
    deadline: { amount: 24, unit: 'hours' },
    maxReplies: 10,
  },
  // A camada livre (17/11): o operador escreve o objetivo, com sugestões por segmento.
  custom: {
    label: 'Missão personalizada',
    hint: 'Você escreve o que o agente deve fazer, para qualquer caso que os tipos acima não cobrem (pedir documentos, confirmar uma entrega, pedir uma avaliação…).',
    successEvent: 'agent.mission_finished',
    goalCode: 'replied',
    steps: [
      'Segue o objetivo que você escrever abaixo.',
      'Respeita as regras de sempre e o que você marcar em “O que o agente não deve fazer”.',
      'Termina quando cumpre o objetivo, quando a pessoa recusa, no prazo ou no máximo de mensagens.',
    ],
    restrictions: ['no_insist', 'no_discount', 'no_prices', 'no_same_day', 'handoff_on_complaint', 'no_personal_data'],
    defaultRestrictions: ['no_insist', 'handoff_on_complaint'],
    options: [],
    deadline: { amount: 48, unit: 'hours' },
    maxReplies: 8,
  },
}

/** Os tipos de missão com instrução e escolhas testadas pela Oryon (a "personalizada" fica de fora). */
export const TIPOS_TESTADOS = Object.keys(TIPOS_DE_MISSAO).filter((k) => k !== 'custom')

/** As escolhas padrão de um tipo de missão (`{ chave: valor }`). */
export function opcoesPadraoDaMissao(tipo: string): Record<string, unknown> {
  return Object.fromEntries((TIPOS_DE_MISSAO[tipo]?.options ?? []).map((o) => [o.key, Array.isArray(o.default) ? [...o.default] : o.default]))
}

/** Ao trocar o tipo de missão: tudo o que foi testado com ele (critério, restrições, escolhas, prazo e máximo). */
export function paramsDoTipoDeMissao(tipo: string): Record<string, unknown> {
  const t = TIPOS_DE_MISSAO[tipo]
  if (!t) return {}
  return { successEvent: t.successEvent, restrictions: [...t.defaultRestrictions], missionOptions: opcoesPadraoDaMissao(tipo), deadline: { ...t.deadline }, maxReplies: t.maxReplies }
}

const PASSOS: PassoDoCatalogo[] = [
  // ── Mensagem ──────────────────────────────────────────────────────────────
  {
    type: 'send_template',
    group: 'mensagem',
    label: 'Enviar modelo',
    description: 'Manda um modelo aprovado pela Meta (com dados e botões). Depois de enviar, você escolhe: seguir para o próximo passo, esperar a resposta (um caminho por botão) ou ver o que a pessoa fez com a mensagem.',
    icon: 'MessageSquareText',
    outputs: 'single',
    params: [
      { key: 'whatsappNumberId', label: 'Linha de WhatsApp', type: 'whatsapp_number', required: true, help: 'O número de WhatsApp da empresa que manda a mensagem. É ele que a pessoa vê na conversa.' },
      { key: 'templateId', label: 'Modelo', type: 'template', required: true, help: 'Mensagem pronta e aprovada pela Meta: é a única que pode puxar conversa. “Utilidade” serve para avisos do atendimento (lembrete, confirmação); “Marketing”, para ofertas, e só chega a quem aceitou receber.' },
      { key: 'variables', label: 'Os dados da mensagem', type: 'template_variables' },
      { key: 'ifHuman', label: 'Se alguém da equipe estiver na conversa', type: 'select', default: 'wait_then_skip', options: [
        { value: 'wait_then_skip', label: 'Esperar e depois pular', hint: 'Espera a equipe terminar o atendimento, até 24 h. Se não terminar, pula este envio.' },
        { value: 'skip', label: 'Pular este envio', hint: 'Segue a jornada sem enviar nada.' },
        { value: 'exit', label: 'Tirar da jornada', hint: 'A pessoa sai, com o motivo "humano na conversa".' },
      ] },
    ],
    cost: { credits: 0, label: 'tarifa da Meta' },
    requires: ['whatsapp_number'],
    availability: 'available',
  },
  {
    type: 'send_text',
    group: 'mensagem',
    label: 'Enviar texto',
    description: 'Texto escrito por você, sem precisar de aprovação. O WhatsApp só deixa enviar até 24 h depois da última mensagem da pessoa; fora disso, use “Enviar modelo”.',
    icon: 'MessageSquare',
    outputs: 'single',
    params: [
      { key: 'text', label: 'Texto', type: 'longtext', required: true, placeholder: 'Pronto, {{contato.nome}}! Seu horário está confirmado.' },
      { key: 'ifHuman', label: 'Se alguém da equipe estiver na conversa', type: 'select', default: 'wait_then_skip', options: [
        { value: 'wait_then_skip', label: 'Esperar e depois pular', hint: 'Espera a equipe terminar o atendimento, até 24 h. Se não terminar, pula este envio.' },
        { value: 'skip', label: 'Pular este envio', hint: 'Segue a jornada sem enviar nada.' },
        { value: 'exit', label: 'Tirar da jornada', hint: 'A pessoa sai, com o motivo "humano na conversa".' },
      ] },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation', 'window_24h'],
    availability: 'available',
  },
  // P1 do benchmark (16/11): o caso mais comum no WhatsApp num passo só (Twilio, Kommo, Bird).
  {
    type: 'send_and_wait',
    group: 'mensagem',
    label: 'Enviar e esperar resposta',
    description: 'Envia um modelo e espera a resposta: um caminho para cada botão, mais "escreveu outra coisa" e "sem resposta". Enquanto espera, o agente de IA não responde por cima.',
    icon: 'MessageSquareReply',
    outputs: 'dynamic',
    params: [
      { key: 'whatsappNumberId', label: 'Linha de WhatsApp', type: 'whatsapp_number', required: true, help: 'O número de WhatsApp da empresa que manda a mensagem. É ele que a pessoa vê na conversa.' },
      { key: 'templateId', label: 'Modelo', type: 'template', required: true, help: 'Mensagem pronta e aprovada pela Meta: é a única que pode puxar conversa. “Utilidade” serve para avisos do atendimento (lembrete, confirmação); “Marketing”, para ofertas, e só chega a quem aceitou receber.' },
      { key: 'variables', label: 'Os dados da mensagem', type: 'template_variables' },
      { key: 'timeout', label: 'Esperar a resposta por', type: 'duration', required: true, default: DURACAO_PADRAO_24H },
      { key: 'holdConversation', label: 'Segurar a conversa enquanto espera', type: 'boolean', default: true, help: 'Enquanto espera, o agente de IA não responde: a resposta da pessoa segue pelos caminhos abaixo. Desligue só se o agente também deve responder (a pessoa recebe duas respostas).' },
      { key: 'ifHuman', label: 'Se alguém da equipe estiver na conversa', type: 'select', default: 'wait_then_skip', options: [
        { value: 'wait_then_skip', label: 'Esperar e depois pular', hint: 'Espera a equipe terminar o atendimento, até 24 h. Se não terminar, pula este envio.' },
        { value: 'skip', label: 'Pular este envio', hint: 'Segue a jornada sem enviar nada.' },
        { value: 'exit', label: 'Tirar da jornada', hint: 'A pessoa sai, com o motivo "humano na conversa".' },
      ] },
    ],
    cost: { credits: 0, label: 'tarifa da Meta' },
    requires: ['whatsapp_number'],
    availability: 'available',
  },
  {
    type: 'notify_team',
    group: 'mensagem',
    label: 'Avisar a equipe',
    description: 'Manda um aviso para um setor da equipe (ex.: o atendimento ou o comercial). A pessoa da jornada não vê o aviso.',
    icon: 'BellRing',
    outputs: 'single',
    params: [
      { key: 'departmentId', label: 'Setor', type: 'department', required: true },
      { key: 'action', label: 'O que a equipe deve fazer', type: 'select', default: 'call', options: ACOES_DA_EQUIPE.map((a) => ({ value: a.code, label: a.label, hint: a.hint })) },
      { key: 'message', label: 'Aviso', type: 'longtext', required: true, placeholder: '{{contato.nome}} não respondeu à confirmação de amanhã.', help: 'Já vem escrito pelo caminho que chega aqui. Mude se quiser.' },
      { key: 'include', label: 'Junto do aviso', type: 'multiselect', default: ['subject', 'last_reply'], options: ANEXOS_DO_AVISO },
      { key: 'groupDaily', label: 'Juntar numa lista do dia', type: 'boolean', default: true, help: 'Em vez de um aviso por pessoa, a equipe recebe um aviso por dia, com a lista de todas. Desligado, avisa na hora, uma pessoa por vez.' },
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
    params: [{ key: 'text', label: 'Nota', type: 'longtext', required: true, help: 'Fica na conversa, só para a equipe. A pessoa não recebe nada. Já vem escrita pelo caminho que chega aqui.' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  // ── Conversa e posse ──────────────────────────────────────────────────────
  {
    type: 'hold_conversation',
    group: 'conversa',
    label: 'Segurar a conversa',
    description: 'Por um prazo, as respostas que a jornada espera (botões, respostas a perguntas) vão para a jornada, e não para o agente de IA; outras mensagens seguem com o agente. Se alguém da equipe assumir a conversa, a jornada para de segurar. Quase nunca é preciso: “Enviar modelo” com “Esperar a resposta” já segura a conversa.',
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
    description: 'Devolve a conversa ao agente de IA com uma nota de contexto, que ele lê nas próximas mensagens desta conversa.',
    icon: 'Bot',
    outputs: 'single',
    params: [{ key: 'note', label: 'Algo a mais que o agente deve saber', type: 'longtext', placeholder: 'Ex.: é a segunda vez que a pessoa remarca.', help: 'Opcional. O agente lê nas próximas mensagens desta conversa, até ela ser resolvida ou por 24 h.' }],
    cost: { credits: 0, label: 'atendimento normal' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'handoff_human',
    group: 'conversa',
    label: 'Entregar a humano',
    description: 'Passa o atendimento para a equipe do setor escolhido: a IA para de responder e a equipe é avisada, com o motivo.',
    icon: 'UserRound',
    outputs: 'single',
    params: [
      { key: 'departmentId', label: 'Setor', type: 'department', required: true },
      { key: 'reason', label: 'Motivo', type: 'standard_choice', list: 'handoffReasons', codeKey: 'reasonCode', required: true, default: 'Dúvida que a IA não resolveu', help: 'A equipe vê o motivo junto da conversa, e Resultados conta quantas conversas vieram por cada um.' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation'],
    availability: 'available',
  },
  // P1 do benchmark (16/11): respond.io "Ask a Question", Intercom "Collect data", Zendesk, Kommo, Blip.
  {
    type: 'ask_question',
    group: 'conversa',
    label: 'Perguntar e guardar a resposta',
    description: 'Faz uma pergunta, confere a resposta pelo tipo (número, data, e-mail, opção, nota), pede de novo se não servir e guarda num campo do contato.',
    icon: 'MessageCircleQuestionMark',
    outputs: 'dynamic',
    params: [
      { key: 'question', label: 'Pergunta', type: 'longtext', required: true, placeholder: 'Qual é o melhor horário para falar com você?' },
      { key: 'answerType', label: 'Tipo de resposta', type: 'select', required: true, default: 'text', options: [
        { value: 'text', label: 'Texto', hint: 'Qualquer resposta escrita (ex.: o bairro, o produto, o plano).' },
        { value: 'number', label: 'Número', hint: 'Só números (ex.: a idade). Outra coisa não serve, e a pergunta é feita de novo.' },
        { value: 'date', label: 'Data', hint: 'Uma data (ex.: 15/12). Outra coisa não serve, e a pergunta é feita de novo.' },
        { value: 'email', label: 'E-mail', hint: 'Um e-mail válido. Outra coisa não serve, e a pergunta é feita de novo.' },
        { value: 'option', label: 'Uma das opções', hint: 'A pessoa escolhe uma das opções que você escrever abaixo (botões ou lista).' },
        { value: 'rating', label: 'Nota de 0 a 10', hint: 'Uma nota de 0 a 10, como numa pesquisa de satisfação.' },
      ] },
      { key: 'options', label: 'Opções', type: 'list', required: true, showIf: { key: 'answerType', equals: 'option' }, placeholder: 'Manhã', help: 'Até 3 viram botões; mais que isso, uma lista. Para um caminho por opção, use "Ramificar" depois.' },
      { key: 'saveTo', label: 'Guardar a resposta em', type: 'custom_field', required: true, help: 'Também fica em [Resposta] para os próximos passos.' },
      { key: 'retries', label: 'Pedir de novo quantas vezes', type: 'number', default: 2, help: 'Quando a resposta não serve, a pergunta é refeita até este número de vezes. Depois, segue pelo caminho “Não serviu”.' },
      { key: 'retryText', label: 'O que dizer quando a resposta não serve', type: 'text', default: 'Não consegui entender. Pode responder de novo?' },
      { key: 'timeout', label: 'Esperar a resposta por', type: 'duration', required: true, default: DURACAO_PADRAO_24H },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['conversation', 'window_24h'],
    availability: 'available',
  },
  {
    type: 'resolve_conversation',
    group: 'conversa',
    label: 'Resolver conversa',
    description: 'Marca a conversa como resolvida, como se a equipe tivesse encerrado o atendimento. Se a conversa foi passada para a equipe há pouco, ela não é resolvida, para não cortar quem está atendendo.',
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
    params: [{ key: 'stageId', label: 'Etapa', type: 'stage', required: true, help: 'A etapa do cadastro do contato (ex.: Cliente). Para o funil de vendas, use o passo “Negócio”.' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'set_field',
    group: 'crm',
    label: 'Campo do cadastro',
    description: 'Grava um valor num campo personalizado do contato (ex.: interesse, plano, imóvel de interesse).',
    icon: 'PencilLine',
    outputs: 'single',
    params: [
      { key: 'fieldId', label: 'Campo', type: 'custom_field', required: true },
      { key: 'value', label: 'Valor', type: 'longtext', required: true, placeholder: 'Ex.: Premium', help: 'Escreva o valor (ex.: Premium) ou toque em “+ Dado” para usar um dado da jornada (ex.: o que a IA leu na conversa).' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'assign',
    group: 'crm',
    label: 'Atribuir',
    description: 'Define quem da equipe fica responsável pela conversa. Para a equipe assumir o atendimento agora, use “Entregar a humano”.',
    icon: 'UserPlus',
    outputs: 'single',
    params: [
      { key: 'to', label: 'Para', type: 'select', required: true, default: 'department', options: [{ value: 'department', label: 'Setor', hint: 'Vai para a pessoa menos ocupada do setor.' }, { value: 'user', label: 'Pessoa', hint: 'Vai sempre para a pessoa escolhida.' }] },
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
        { value: 'create', label: 'Criar', hint: 'Abre um negócio novo para o contato, na etapa escolhida abaixo.' },
        { value: 'move', label: 'Mover de etapa', hint: 'Leva o negócio aberto do contato para a etapa escolhida abaixo.' },
        { value: 'won', label: 'Marcar como ganho', hint: 'Fecha o negócio aberto do contato como ganho (venda feita).' },
        { value: 'lost', label: 'Marcar como perdido', hint: 'Fecha o negócio aberto do contato como perdido.' },
      ] },
      { key: 'stageId', label: 'Etapa do funil', type: 'deal_stage', required: true, showIf: { key: 'action', equals: ['create', 'move'] } },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  // ── Integração ────────────────────────────────────────────────────────────
  {
    type: 'connector_call',
    group: 'integracao',
    label: 'Sistema do cliente',
    description: 'Pede uma ação ao sistema do cliente (ex.: confirmar o agendamento na agenda). O resultado (deu certo ou não) fica guardado para os próximos passos.',
    icon: 'PlugZap',
    outputs: 'single',
    params: [{ key: 'operation', label: 'Ação', type: 'connector_operation', required: true, help: 'Só aparecem as ações que o sistema ligado permite. “Grava no sistema” muda algo lá; “Só lê” não muda nada.' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: ['connector'],
    availability: 'available',
  },
  {
    type: 'webhook_out',
    group: 'integracao',
    label: 'Webhook de saída',
    description: 'Manda os dados escolhidos para outro sistema da empresa (ex.: o ERP), num endereço que o responsável técnico desse sistema informa. Conta como entregue quando o outro sistema confirma o recebimento.',
    icon: 'Webhook',
    outputs: 'single',
    params: [
      { key: 'url', label: 'Endereço', type: 'text', required: true, placeholder: 'https://erp.exemplo.com.br/webhooks/oryon', help: 'Peça este endereço ao responsável técnico do outro sistema. Começa com https://.' },
      { key: 'fields', label: 'Dados enviados', type: 'list', help: 'Escolha os dados que vão junto (ex.: o nome do contato, a data do agendamento). As mensagens da conversa nunca vão.' },
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
    description: 'Pausa a jornada: por um tempo, até um horário, antes ou depois de uma data ("1 dia antes do agendamento") ou até o horário de atendimento.',
    icon: 'Hourglass',
    outputs: 'single',
    params: [
      { key: 'mode', label: 'Como esperar', type: 'select', required: true, default: 'duration', options: [
        { value: 'duration', label: 'Um tempo', hint: 'Ex.: espera 2 dias e segue.' },
        { value: 'until_time', label: 'Até um horário', hint: 'Segue no próximo horário escolhido (ex.: às 9h).' },
        { value: 'relative_to_field', label: 'Antes ou depois de uma data', hint: 'Ex.: 1 dia antes do agendamento, às 9h.' },
        { value: 'next_business_hour', label: 'Até o horário de atendimento', hint: 'Fora do horário de atendimento da empresa, espera abrir. Dentro dele, segue na hora.' },
      ] },
      { key: 'duration', label: 'Quanto tempo', type: 'duration', showIf: { key: 'mode', equals: 'duration' }, default: { amount: 2, unit: 'days' } },
      { key: 'time', label: 'Horário', type: 'time_of_day', showIf: { key: 'mode', equals: 'until_time' }, default: '09:00' },
      { key: 'field', label: 'Data de referência', type: 'date_variable', required: true, showIf: { key: 'mode', equals: 'relative_to_field' }, default: 'conector.agenda.data' },
      { key: 'offsetDays', label: 'Quanto antes ou depois', type: 'offset_days', showIf: { key: 'mode', equals: 'relative_to_field' }, default: -1 },
      { key: 'time', label: 'Em que horário', type: 'time_of_day', showIf: { key: 'mode', equals: 'relative_to_field' }, default: '09:00' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'wait_event',
    group: 'controle',
    label: 'Esperar um acontecimento',
    description: 'Espera algo acontecer, com prazo: um formulário do WhatsApp, uma mensagem ou um evento do sistema (ex.: agendamento confirmado). Cada um vira um caminho; o prazo vira "sem resposta". Para esperar os botões de uma mensagem, use "Enviar modelo" e escolha "Esperar a resposta".',
    icon: 'MailQuestionMark',
    outputs: 'dynamic',
    params: [
      { key: 'events', label: 'Respostas esperadas', type: 'events', required: true },
      { key: 'timeout', label: 'Prazo', type: 'duration', required: true, default: DURACAO_PADRAO_24H },
      { key: 'sameSubject', label: 'Só respostas a esta mensagem', type: 'boolean', default: true, help: 'Ex.: vale o botão do lembrete DESTE agendamento, não o de um lembrete de outro agendamento.' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'branch',
    group: 'controle',
    label: 'Ramificar',
    description: 'Separa as pessoas por condições (ex.: quem tem a etiqueta VIP vai por um caminho). Quem não atende a nenhuma vai por "Outros casos".',
    icon: 'Split',
    outputs: 'dynamic',
    params: [{ key: 'branches', label: 'Caminhos', type: 'conditions', required: true }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  // P1 do benchmark (16/11): o "Check WhatsApp activity" do Zoho. Leu e não respondeu pede outro caminho que "nem chegou".
  {
    type: 'branch_message_status',
    group: 'controle',
    label: 'Ramificar pelo status da mensagem',
    description: 'Espera e segue pelo que aconteceu com uma mensagem enviada antes: respondeu, leu e não respondeu, chegou e não leu, ou não chegou. "Leu" depende da confirmação de leitura do WhatsApp: quem a desliga aparece como "Chegou e não leu".',
    icon: 'MailCheck',
    outputs: 'dynamic',
    params: [
      { key: 'messageNodeId', label: 'Qual mensagem', type: 'message_step', required: true, help: 'Só aparecem as mensagens que vêm antes deste passo. "Leu" depende da confirmação de leitura: quem a desliga no WhatsApp aparece como "Chegou e não leu".' },
      { key: 'timeout', label: 'Esperar até decidir', type: 'duration', required: true, default: DURACAO_PADRAO_24H, help: 'Se a pessoa responder antes, segue na hora por "Respondeu".' },
    ],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'goal',
    group: 'controle',
    label: 'Meta atingida',
    description: 'Termina a jornada da pessoa como sucesso: ela conta como meta atingida em Resultados.',
    icon: 'Trophy',
    outputs: 'none',
    params: [{ key: 'label', label: 'Nome da meta', type: 'standard_choice', list: 'goalTypes', codeKey: 'goalCode', required: true, default: 'Respondeu', help: 'Aparece em Resultados. Com um nome da lista, dá para comparar esta jornada com as outras.' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'exit',
    group: 'controle',
    label: 'Sair',
    description: 'Termina a jornada da pessoa, com um motivo.',
    icon: 'LogOut',
    outputs: 'none',
    params: [{ key: 'reason', label: 'Motivo', type: 'standard_choice', list: 'exitReasons', codeKey: 'reasonCode', required: true, default: 'Fim do caminho', help: 'Aparece em Pessoas e em Resultados, que somam as saídas por motivo.' }],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'ab_split',
    group: 'controle',
    label: 'Dividir A/B',
    description: 'Divide as pessoas em dois caminhos, por porcentagem, para comparar mensagens. Fica para o próximo épico.',
    icon: 'Shuffle',
    outputs: 'single',
    params: [],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'soon',
  },
  {
    type: 'enroll_journey',
    group: 'controle',
    label: 'Inscrever em outra jornada',
    description: 'Passa a pessoa para outra jornada, com controle de ciclo. Fica para o próximo épico.',
    icon: 'Route',
    outputs: 'single',
    params: [],
    cost: { credits: 0, label: 'sem custo' },
    requires: [],
    availability: 'soon',
  },
  // ── IA (opcional, com custo à vista) ──────────────────────────────────────
  {
    type: 'ai_classify',
    group: 'ia',
    label: 'Classificar resposta',
    description: 'A IA lê a última mensagem da pessoa e escolhe uma das respostas possíveis. Cada uma vira um caminho; quando a IA não tem certeza, segue por "Sem certeza".',
    icon: 'Sparkles',
    outputs: 'dynamic',
    params: [
      { key: 'question', label: 'O que decidir', type: 'text', required: true, placeholder: 'A pessoa quer confirmar, cancelar ou remarcar?', help: 'A pergunta que a IA responde lendo a mensagem da pessoa.' },
      { key: 'categories', label: 'Respostas possíveis', type: 'list', required: true },
    ],
    cost: { credits: 0.2, label: '0,2 crédito' },
    requires: [],
    availability: 'available',
  },
  {
    type: 'ai_extract',
    group: 'ia',
    label: 'Extrair dados',
    description: 'A IA lê a conversa e guarda o que achar (ex.: o interesse e o melhor horário) para os próximos passos. Quando não tem certeza, segue por "Sem certeza".',
    icon: 'ScanText',
    outputs: 'dynamic',
    params: [
      { key: 'fields', label: 'Dados a guardar', type: 'list', required: true, placeholder: 'interesse', help: 'Escolha um campo do cadastro ou escreva o nome do dado. Cada um fica guardado para os próximos passos: [Lido pela IA: interesse].' },
      { key: 'instruction', label: 'O que procurar', type: 'text', required: true, placeholder: 'O interesse e o melhor dia para a pessoa', help: 'Escrito sozinho a partir dos dados acima. Mude só se quiser explicar melhor.' },
    ],
    cost: { credits: 0.2, label: '0,2 crédito' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'ai_summarize',
    group: 'ia',
    label: 'Resumir a conversa',
    description: 'A IA resume a conversa em poucas linhas, para a equipe ou para os próximos passos.',
    icon: 'NotebookPen',
    outputs: 'single',
    params: [
      { key: 'focus', label: 'Para que serve o resumo', type: 'preset_text', required: true, default: 'Para a equipe assumir a conversa', options: [
        { value: 'Para a equipe assumir a conversa', label: 'Para a equipe assumir a conversa' },
        { value: 'Para a equipe ligar para a pessoa', label: 'Para a equipe ligar para a pessoa' },
        { value: 'Para registrar o que aconteceu', label: 'Para registrar o que aconteceu' },
        { value: 'Para usar nos próximos passos', label: 'Para usar nos próximos passos' },
      ], help: 'A IA escreve o resumo pensando em quem vai ler.' },
      { key: 'saveAs', label: 'Onde fica', type: 'select', default: 'note', options: [
        { value: 'note', label: 'Nota na conversa', hint: 'A equipe vê na conversa, como uma nota interna.' },
        { value: 'context', label: 'Só para os próximos passos', hint: 'Fica como o dado [Resumo da IA], para usar num aviso ou numa nota.' },
      ] },
    ],
    cost: { credits: 0.2, label: '0,2 crédito' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'ai_mission',
    group: 'ia',
    label: 'Missão do agente',
    description: 'Entrega a conversa ao agente que já atende o número, com um tipo de missão testado, restrições e prazo. Sempre termina: pelo evento do sistema, pelo prazo ou pelo máximo de respostas.',
    icon: 'Target',
    outputs: 'dynamic',
    params: [
      { key: 'missionType', label: 'Tipo de missão', type: 'select', required: true, default: 'reschedule', options: Object.entries(TIPOS_DE_MISSAO).map(([value, t]) => ({ value, label: t.label, hint: t.hint })) },
      { key: 'objective', label: 'O que o agente deve fazer', type: 'longtext', required: true, showIf: { key: 'missionType', equals: 'custom' }, placeholder: 'Ex.: confirme o endereço de entrega e o melhor horário para receber.', help: 'Escreva do seu jeito ou toque nas sugestões, uma orientação por linha. Este texto não passa pelo teste da Oryon: confira na aba Testar antes de publicar.' },
      { key: 'missionOptions', label: 'Como o agente conduz', type: 'mission_options', default: opcoesPadraoDaMissao('reschedule'), showIf: { key: 'missionType', equals: TIPOS_TESTADOS } },
      { key: 'restrictions', label: 'O que o agente não deve fazer', type: 'mission_restrictions', default: [...TIPOS_DE_MISSAO.reschedule.defaultRestrictions], help: 'Além das regras de sempre.' },
      { key: 'limits', label: 'Orientações a mais (texto livre)', type: 'longtext', placeholder: 'Ex.: fale de um jeito simples e curto.', help: 'Opcional. Escreva do seu jeito ou toque nas sugestões. Somam às regras de sempre.' },
      { key: 'successEvent', label: 'Critério de conclusão', type: 'event', required: true, default: 'appointment_scheduled', help: 'Já vem certo do tipo de missão. Mude só se o seu sistema registrar de outro jeito (ex.: "remarcado" em vez de "marcado").' },
      { key: 'deadline', label: 'Prazo', type: 'duration', required: true, default: { amount: 48, unit: 'hours' } },
      { key: 'maxReplies', label: 'Máximo de mensagens do agente', type: 'number', default: 8, help: 'Ao chegar neste número, a missão termina pelo caminho “Não concluiu”. Evita conversa sem fim.' },
    ],
    cost: { credits: 1, label: '1 crédito (como um atendimento)' },
    requires: ['conversation'],
    availability: 'available',
  },
  {
    type: 'backstage_task',
    group: 'ia',
    label: 'Tarefa de bastidor',
    description: 'Uma IA que analisa e age no sistema sem falar com o contato (Claude Managed Agents). Fica para o próximo épico.',
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

/** Passos com efeito (envio, CRM, sistema, IA) podem falhar: trazem a política padrão (§2.5, §2.6). */
const PODEM_FALHAR = new Set<PassoDoCatalogo['group']>(['mensagem', 'conversa', 'crm', 'integracao', 'ia'])
for (const p of PASSOS) if (PODEM_FALHAR.has(p.group) && p.availability === 'available') p.onError = PASSOS_DE_ENVIO.has(p.type) ? { ...ERRO_DO_ENVIO } : { ...ERRO_PADRAO }

export const CATALOGO_EXEMPLO: Catalogo = {
  version: '2026-11-14.exemplo',
  steps: PASSOS,
  events: [
    { key: 'template.button_replied', label: 'Apertou um botão do modelo', producer: 'plataforma', variables: ['evento.botao'] },
    { key: 'flow.replied', label: 'Respondeu um formulário do WhatsApp', producer: 'plataforma', variables: ['evento.respostas'] },
    { key: 'message.received', label: 'Mandou uma mensagem', producer: 'plataforma', variables: ['evento.texto'] },
    { key: 'message.first', label: 'Primeira mensagem do contato', producer: 'plataforma', variables: ['evento.texto'] },
    // P2 (16/11, como o Kommo): o follow-up clássico do WhatsApp. As horas ficam em `params.hours` da porta.
    { key: 'conversation.inactive', label: 'A conversa parou (o contato não respondeu há um tempo)', producer: 'plataforma', variables: ['evento.horas', 'evento.ultima_mensagem'] },
    { key: 'contact.created', label: 'Contato criado (inclusive pelo WhatsApp)', producer: 'plataforma', variables: ['contato.origem'] },
    { key: 'contact.tag_added', label: 'Etiqueta posta', producer: 'plataforma', variables: ['evento.etiqueta'] },
    { key: 'contact.tag_removed', label: 'Etiqueta tirada', producer: 'plataforma', variables: ['evento.etiqueta'] },
    { key: 'contact.stage_changed', label: 'Mudou de etapa', producer: 'plataforma', variables: ['evento.etapa'] },
    { key: 'contact.field_changed', label: 'Campo do cadastro mudou', producer: 'plataforma', variables: ['evento.campo', 'evento.valor'] },
    { key: 'conversation.human_took_over', label: 'Humano assumiu a conversa', producer: 'plataforma', variables: ['evento.atendente'] },
    { key: 'conversation.ai_paused', label: 'IA pausada', producer: 'plataforma', variables: [] },
    { key: 'conversation.resolved', label: 'Conversa resolvida', producer: 'plataforma', variables: [] },
    { key: 'conversation.assigned', label: 'Conversa atribuída', producer: 'plataforma', variables: ['evento.atendente'] },
    { key: 'deal.created', label: 'Negócio criado', producer: 'plataforma', variables: ['evento.funil', 'evento.valor'] },
    { key: 'deal.stage_changed', label: 'Negócio mudou de etapa', producer: 'plataforma', variables: ['evento.etapa', 'evento.funil'] },
    { key: 'deal.won', label: 'Negócio ganho', producer: 'plataforma', variables: ['evento.valor'] },
    { key: 'deal.lost', label: 'Negócio perdido', producer: 'plataforma', variables: ['evento.motivo'] },
    { key: 'outbound.failed', label: 'Envio recusado pela Meta', producer: 'plataforma', variables: ['evento.motivo'] },
    { key: 'appointment_scheduled', label: 'Agendamento marcado', producer: 'agente', variables: ['evento.data', 'evento.profissional', 'evento.servico'] },
    { key: 'appointment_cancelled', label: 'Agendamento cancelado', producer: 'agente', variables: ['evento.data', 'evento.profissional', 'evento.servico'] },
    { key: 'appointment_confirmed', label: 'Agendamento confirmado', producer: 'agente', variables: ['evento.data'] },
    { key: 'appointment_rescheduled', label: 'Agendamento remarcado', producer: 'agente', variables: ['evento.data', 'evento.profissional', 'evento.servico'] },
    { key: 'agent.handoff_requested', label: 'A IA pediu um humano', producer: 'agente', variables: ['evento.motivo'] },
    { key: 'agent.mission_finished', label: 'Missão do agente terminou', producer: 'agente', variables: ['evento.desfecho'] },
    { key: 'external.event', label: 'Aviso de outro sistema (pela API)', producer: 'externo', variables: ['evento.*'] },
  ],
  connectorOperations: [
    { key: 'agenda_do_dia', label: 'Agenda do dia (lista de agendamentos)', connector: 'Sistema de agenda', kind: 'list', variables: ['conector.agenda.data', 'conector.agenda.hora', 'conector.agenda.profissional', 'conector.agenda.servico', 'conector.agenda.unidade'], writes: false },
    { key: 'cancelados_de_ontem', label: 'Agendamentos cancelados ontem (lista)', connector: 'Sistema de agenda', kind: 'list', variables: ['conector.cancelada.data', 'conector.cancelada.profissional', 'conector.cancelada.servico'], writes: false },
    { key: 'confirmar_agendamento', label: 'Confirmar o agendamento no sistema', connector: 'Sistema de agenda', kind: 'action', variables: ['conector.resultado'], writes: true },
    { key: 'cancelar_agendamento', label: 'Cancelar o agendamento no sistema', connector: 'Sistema de agenda', kind: 'action', variables: ['conector.resultado'], writes: true },
  ],
  goalTypes: METAS_PADRAO,
  exitReasons: MOTIVOS_DE_SAIDA,
  handoffReasons: MOTIVOS_DA_EQUIPE,
  teamActions: ACOES_DA_EQUIPE,
  missionTypes: TIPOS_DE_MISSAO,
  missionRestrictions: RESTRICOES_DA_MISSAO,
  conditionFields: [
    { key: 'contato.etiquetas', label: 'Etiquetas do contato', type: 'list' },
    { key: 'contato.etapa', label: 'Etapa do contato', type: 'text' },
    { key: 'contato.opt_in_marketing', label: 'Aceita marketing', type: 'boolean' },
    { key: 'contato.origem', label: 'Origem do contato', type: 'text' },
    { key: 'contato.campo.convenio', label: 'Convênio (campo do cadastro)', type: 'text' },
    { key: 'contato.telefone_valido', label: 'Telefone válido', type: 'boolean' },
    { key: 'conversa.status', label: 'Status da conversa', type: 'text' },
    { key: 'conversa.posse', label: 'Quem está respondendo a conversa', type: 'text' },
    { key: 'conversa.janela_aberta', label: 'Janela de 24 h aberta', type: 'boolean' },
    { key: 'conversa.atendente', label: 'Atendente da conversa', type: 'text' },
    { key: 'evento.servico', label: 'Serviço do agendamento', type: 'text' },
    { key: 'evento.etapa', label: 'Etapa nova (no evento de etapa)', type: 'text' },
    { key: 'evento.etiqueta', label: 'Etiqueta posta ou tirada (no evento)', type: 'text' },
    { key: 'evento.data', label: 'Data do agendamento', type: 'date' },
    { key: 'conector.agenda.status', label: 'Status do agendamento no sistema', type: 'text' },
    { key: 'fato.agendamento_proximos_30d', label: 'Já tem agendamento nos próximos 30 dias', type: 'boolean' },
    { key: 'contexto.resultado', label: 'Resultado do passo anterior', type: 'text' },
    { key: 'contexto.tentativa', label: 'Número da tentativa (lembretes que se repetem)', type: 'number' },
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
export function saidasDoNo(no: Pick<NoDoGrafo, 'type' | 'params'> & { onError?: NoDoGrafo['onError'] }, catalogo: Catalogo): SaidaDoPasso[] {
  const passo = passoDoCatalogo(catalogo, no.type)
  if (!passo || passo.outputs === 'none') return []
  // Ramo de falha desenhado (P1, 16/11): o passo ganha a saída "Falhou".
  const comFalha = (lista: SaidaDoPasso[]): SaidaDoPasso[] =>
    passo.onError && no.onError?.then === 'branch'
      ? [...lista.map((s) => (s.key === 'next' && !s.label ? { ...s, label: PASSOS_DE_ENVIO.has(no.type) ? 'Enviou' : 'Deu certo' } : s)), { key: 'falhou', label: PASSOS_DE_ENVIO.has(no.type) ? 'Não enviou' : 'Falhou' }]
      : lista
  if (passo.outputs === 'single') return comFalha([{ key: 'next', label: '' }])
  return comFalha(saidasDinamicas(no))
}

function saidasDinamicas(no: Pick<NoDoGrafo, 'type' | 'params'>): SaidaDoPasso[] {
  const lista = (v: unknown): { key: string; label: string }[] =>
    Array.isArray(v) ? v.filter((x): x is { key: string; label: string } => !!x && typeof x === 'object' && 'key' in x) : []
  switch (no.type) {
    case 'wait_event':
      return [...lista(no.params.events).map((e) => ({ key: e.key, label: e.label })), { key: 'sem_resposta', label: 'Sem resposta' }]
    case 'branch':
      return [...lista(no.params.branches).map((b) => ({ key: b.key, label: b.label })), { key: 'senao', label: 'Outros casos' }]
    case 'ai_classify':
      return [...lista(no.params.categories).map((c) => ({ key: c.key, label: c.label })), { key: 'incerto', label: 'Sem certeza' }]
    case 'ai_extract':
      return [{ key: 'encontrou', label: 'Encontrou' }, { key: 'incerto', label: 'Sem certeza' }]
    case 'ai_mission':
      return [
        { key: 'concluiu', label: 'Concluiu' },
        { key: 'nao_concluiu', label: 'Não concluiu' },
        { key: 'prazo', label: 'Prazo acabou' },
      ]
    case 'send_and_wait':
      return [...lista(no.params.replies).map((r) => ({ key: r.key, label: r.label })), { key: 'outra_resposta', label: 'Escreveu outra coisa' }, { key: 'sem_resposta', label: 'Sem resposta' }]
    case 'ask_question':
      return [{ key: 'respondeu', label: 'Respondeu' }, { key: 'invalida', label: 'Não serviu' }, { key: 'sem_resposta', label: 'Sem resposta' }]
    case 'branch_message_status':
      return [
        { key: 'respondeu', label: 'Respondeu' },
        { key: 'leu', label: 'Leu e não respondeu' },
        { key: 'entregue', label: 'Chegou e não leu' },
        { key: 'nao_chegou', label: 'Não chegou' },
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
