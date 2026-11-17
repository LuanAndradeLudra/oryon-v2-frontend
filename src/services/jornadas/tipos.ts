/**
 * ORY-60 — tipos das Jornadas, no formato das rotas `/v1/journeys` planejadas
 * (docs/jornadas/MOTOR-DE-JORNADAS.md, §2.3 e §2.10).
 *
 * As telas só conhecem estes tipos. Quando o backend existir (ORY-61), a camada
 * `jornadasApi` passa a chamar as rotas reais e devolve estes mesmos formatos.
 */

// ── jornada e versão ─────────────────────────────────────────────────────────

/** O status é a "chave" da jornada (não existe flag): rascunho, sombra, ativa, pausada. */
export type StatusDaJornada = 'draft' | 'shadow' | 'active' | 'paused' | 'archived'

export interface ResumoDaJornada {
  id: string
  name: string
  description: string
  status: StatusDaJornada
  /** Versão publicada que está rodando (ativa ou em sombra). */
  publishedVersion: number | null
  /** Há rascunho com mudanças ainda não publicadas? */
  hasDraftChanges: boolean
  /** Linha de WhatsApp padrão dos envios. */
  whatsappNumberId: string | null
  /** Pessoas dentro agora (ativas ou esperando). */
  enrolledNow: number
  /** % das inscrições encerradas nos últimos 30 dias que bateram a meta. */
  goalRate30d: number | null
  lastActivityAt: string | null
  /** Passos com erro nas últimas 24 h. */
  errors24h: number
  /** Créditos de IA no mês (passos de IA). Mensagens da Meta são cobradas à parte. */
  creditsThisMonth: number
  /** Mensagens enviadas no mês. */
  messagesThisMonth: number
  createdBy: string
  updatedAt: string
  /** Receita de origem, se veio da galeria. */
  recipeId: string | null
  /** As portas de entrada do desenho (P2, 16/11: o ícone da porta na lista). */
  doors?: TipoDePorta[]
  /** Por onde a jornada age (P2, 16/11): WhatsApp, equipe, agente, sistema, CRM, IA. */
  channels?: CanalDaJornada[]
  /** Quem salvou o rascunho por último (P2, 16/11: "editada por … há …"). */
  updatedBy?: string
  /**
   * Tarifa estimada da Meta no mês, em R$ (P2, 16/11): mensagens × a tarifa da
   * categoria de cada modelo. Os créditos de IA ficam em `creditsThisMonth`.
   */
  metaCostThisMonthBrl?: number
  /** Alertas abertos (§2.12): inscrição presa, disjuntor do conector, erro fora do normal. */
  alerts?: AlertaDaJornada[]
  /**
   * Pausada: o que foi escolhido para quem estava dentro (P1, 16/11). `continue`
   * = terminam o caminho; `hold` = parados onde estão até retomar; `exit` = saíram.
   */
  pauseMode?: ModoDaPausa | null
  /** Etiquetas para organizar a lista (P1, 16/11: pastas/etiquetas da HubSpot e do Customer.io). */
  labels?: string[]
  /** Apagada: some da lista e fica 90 dias na lixeira, de onde dá para restaurar. */
  deletedAt?: string | null
  /** Quem é avisado quando abre um alerta (P1, 16/11). Sem valor: só aparece no app. */
  alertRecipients?: { userIds: string[]; channels: ('email' | 'whatsapp')[] } | null
  /**
   * Publicação pedida e esperando um administrador (P2, 16/11: "propor" ×
   * "publicar", como Braze e Intercom). Quem monta pede; quem pode, aprova.
   */
  pendingApproval?: { requestedBy: string; at: string; mode: 'shadow' | 'active'; note?: string } | null
  /** Publicação agendada para uma data (P2, 16/11: HubSpot, Klaviyo, Customer.io). */
  scheduledPublish?: { at: string; mode: 'shadow' | 'active' } | null
  /** Desliga sozinha (pausa) nesta data, ex.: o fim de uma campanha. */
  endsAt?: string | null
}

/** Outra pessoa com a jornada aberta agora (P2, 16/11: presença, como o Intercom). */
export interface PresencaNoEditor {
  name: string
  /** O passo que ela está editando, se estiver. */
  nodeId: string | null
  since: string
}

/** Ao publicar mudanças, o que acontece com quem já está dentro (P2, 16/11: Microsoft, MoEngage, CleverTap). */
export type DestinoAoPublicar = 'finish_old' | 'migrate' | 'exit'

/** Uma linha do histórico do rascunho: quem mudou o quê, com o antes e o depois (P2, 16/11, como o Klaviyo). */
export interface AlteracaoDoRascunho {
  id: string
  at: string
  author: string
  tipo: 'novo' | 'mudou' | 'saiu' | 'outra'
  /** O passo, quando a mudança é num passo. */
  nodeId?: string | null
  titulo: string
  antes?: string
  depois?: string
}

export type ModoDaPausa = 'continue' | 'hold' | 'exit'

/** A prévia de pausar (GET /v1/journeys/{id}/pause-preview): o que está em andamento. */
export interface PreviaDaPausa {
  enrolledNow: number
  /** Esperando resposta de alguém (aguardar resposta, perguntar). */
  waitingReply: number
  /** Mensagens que sairiam nas próximas 24 h (esperas que vencem, lembretes). */
  scheduledMessages24h: number
}

export interface AlertaDaJornada {
  kind: 'stuck_enrollments' | 'circuit_open' | 'error_rate' | 'bus_delay' | 'ai_cap_reached'
  message: string
  since: string
  /** Adiado até esta hora (P1, 16/11: tratar o alerta, como o "Automation issues" da HubSpot). */
  snoozedUntil?: string | null
}

/** O que fazer com um alerta: resolvido (some), adiar 24 h ou ignorar este tipo nesta jornada. */
export type TratamentoDoAlerta = 'resolved' | 'snooze_24h' | 'ignore'

/** Limites do plano (§2.12), lidos do plano do cliente. */
export interface LimitesDoPlano {
  activeJourneys: { used: number; max: number }
  maxStepsPerJourney: number
  maxTtlDays: number
  aiCreditsThisMonth: { used: number; max: number }
  /** Testes de passos de IA por dia (não gastam crédito; 16/11). */
  aiStepTestsPerDay: { used: number; max: number }
}

/** Uma versão publicada: imutável; "voltar" é publicar uma anterior de novo. */
export interface VersaoPublicada {
  version: number
  status: 'published' | 'retired'
  publishedAt: string
  publishedBy: string
  /** O que mudou em relação à versão anterior. */
  changes: string[]
  /** Pessoas que ainda estão nesta versão. */
  enrolledNow: number
  /** A nota de quem publicou ("O que mudou?"), P2 16/11. */
  note?: string
}

export interface Jornada extends ResumoDaJornada {
  /** O desenho em edição (rascunho). */
  draft: VersaoDaJornada
  /** Pessoas que ainda estão em versões antigas ("312 pessoas ainda na v2"). */
  enrolledByVersion: { version: number; count: number }[]
}

export interface VersaoDaJornada {
  version: number
  status: 'draft' | 'published' | 'retired'
  graph: Grafo
  entry: Entrada
  goals: Metas
  /** Horários de envio e limites por pessoa (P1, 16/11). Sem valor: sem restrição. */
  rules?: RegrasDeEnvio
  /** Versão do catálogo com que o desenho foi validado. */
  catalogVersion: string
  publishedAt: string | null
  publishedBy: string | null
  /** Só nas versões publicadas: a nota de quem publicou. */
  note?: string
}

// ── o desenho (graph jsonb) ──────────────────────────────────────────────────

export interface Grafo {
  /** Id do primeiro passo depois da entrada. */
  start: string | null
  nodes: Record<string, NoDoGrafo>
  /** Posição no canvas. Não muda o comportamento. */
  layout: Record<string, { x: number; y: number }>
  /**
   * Notas adesivas no canvas (P1, 16/11, como o Customer.io): explicam o desenho
   * para quem vem depois ("a recepção monta, a gerência aprova"). A posição fica
   * em `layout`. Não mudam o comportamento nem entram no diff.
   */
  notes?: Record<string, NotaDoDesenho>
}

export interface NotaDoDesenho {
  text: string
  color?: 'amarelo' | 'azul' | 'verde'
  author?: string
  at?: string
}

/**
 * Um comentário num passo (ou na jornada), com @menção (P1, 16/11, como a
 * HubSpot). Fica fora da versão: comentar não mexe no rascunho.
 */
export interface Comentario {
  id: string
  /** `null` = na jornada inteira. */
  nodeId: string | null
  author: string
  text: string
  /** Ids das pessoas mencionadas (recebem aviso). */
  mentions: string[]
  at: string
  resolved: boolean
}

export interface NoDoGrafo {
  /** Chave do passo no catálogo (`send_template`, `wait_event`…). */
  type: string
  /** Rótulo dado pelo operador (opcional). */
  label?: string
  params: Record<string, unknown>
  /**
   * Para onde vai cada saída. Passo de saída única usa `next`; passos que
   * ramificam usam a chave da saída (`confirmou`, `sem_resposta`, `senao`…).
   */
  outputs: Record<string, string | null>
  /** O que fazer se o passo falhar. Sem valor, vale o padrão do catálogo. */
  onError?: PoliticaDeErro
}

/**
 * O que fazer quando um passo falha (§2.6): repetir com espera crescente até N
 * vezes e, se ainda falhar, entregar a humano, pular o passo ou sair da jornada.
 * O padrão do motor é repetir 3 vezes e entregar a humano.
 */
export interface PoliticaDeErro {
  retries: number
  /**
   * `branch` (P1, 16/11): o passo ganha a saída "Falhou" no desenho, para o
   * operador decidir o caminho (ex.: avisar a recepção), como o "fault path" do
   * Salesforce e o ramo de falha do Kommo e do respond.io.
   */
  then: 'human' | 'skip' | 'exit' | 'branch'
}

// ── entrada, metas e saídas ──────────────────────────────────────────────────

export type TipoDePorta = 'schedule_list' | 'event' | 'segment' | 'webhook' | 'manual'

export interface Porta {
  id: string
  type: TipoDePorta
  params: Record<string, unknown>
}

export interface Condicao {
  /** Campo: `contato.etiquetas`, `conversa.posse`, `evento.servico`… */
  field: string
  op: 'eq' | 'neq' | 'contains' | 'not_contains' | 'exists' | 'not_exists' | 'gt' | 'lt' | 'in'
  value?: unknown
}

/** Grupo E/OU, sem editor de código. */
export interface GrupoDeCondicoes {
  mode: 'all' | 'any'
  conditions: Condicao[]
}

export interface Entrada {
  doors: Porta[]
  criteria: GrupoDeCondicoes
  reentry: {
    /**
     * `one_open` (padrão do motor) = uma inscrição aberta por vez; `per_subject` =
     * uma por assunto, ex.: por agendamento (chave do assunto).
     */
    mode: 'one_open' | 'per_subject' | 'once' | 'cooldown'
    cooldownDays?: number
    subjectKey?: string
  }
  /**
   * Supressão: não entra quem está numa outra jornada que segura a conversa
   * (padrão ligado, §2.7). Opt-out nunca entra, e isso não se desliga.
   */
  skipIfHeldByOtherJourney?: boolean
  /**
   * Conferir o filtro de novo antes de cada mensagem (P2, 16/11, como o
   * "profile filter" do Klaviyo): quem deixou de se encaixar sai da jornada.
   * Sem valor: o filtro vale só na entrada.
   */
  recheckBeforeSend?: boolean
  /** Limite de entradas (P2, 16/11, Braze "Limit entrance volume"): no máximo N por dia, semana ou no total. */
  limit?: { max: number; per: 'day' | 'week' | 'total' } | null
}

export interface Metas {
  /** Meta contínua: bateu, a pessoa sai na hora, de qualquer passo. */
  goals: {
    id: string
    label: string
    event: string
    sameSubject: boolean
    /**
     * Janela de conversão (P1, 16/11: Customer.io, Intercom, Braze): a meta conta
     * se acontecer até N dias depois da última mensagem da jornada, mesmo que a
     * pessoa já tenha saído. `null` = só enquanto ela estiver dentro.
     */
    windowDays?: number | null
  }[]
  /** Saídas automáticas: o assunto passou (ex.: o agendamento já aconteceu), opt-out, humano assumiu… */
  exitIf: { id: string; label: string; event: string }[]
  /** Prazo máximo de uma inscrição (padrão 30, teto do plano 90). */
  ttlDays: number
  /**
   * Teto mensal de créditos de IA desta jornada. Bateu: os passos de IA seguem
   * pelo caminho de reserva ("incerto" / "não concluiu") e a jornada não para.
   * `null` = sem teto próprio (vale o do plano).
   */
  aiMonthlyCap?: number | null
}

/**
 * Regras de envio da jornada (P1 do benchmark: HubSpot "Timing", Braze "Quiet
 * hours", Klaviyo "Smart sending"). Valem para os passos que mandam mensagem.
 */
export interface RegrasDeEnvio {
  /** Janela de envio. Fora dela, a mensagem espera a próxima abertura (`wait`) ou o passo é pulado (`skip`). */
  window?: {
    /** Dias da semana (0 = domingo … 6 = sábado). */
    days: number[]
    /** "08:00" */
    from: string
    /** "20:00" */
    to: string
    /** Datas sem envio (feriados), "2026-12-25". */
    blockedDates: string[]
    outside: 'wait' | 'skip'
  } | null
  /** No máximo N mensagens por pessoa a cada M dias, somando esta jornada. Passou: a mensagem é pulada e fica no registro. */
  frequencyCap?: { maxMessages: number; perDays: number } | null
}

// ── catálogo (GET /v1/journeys/catalog) ──────────────────────────────────────

export type GrupoDoPasso = 'mensagem' | 'conversa' | 'crm' | 'integracao' | 'controle' | 'ia'

export type TipoDeCampo =
  | 'text'
  | 'longtext'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'template'
  | 'whatsapp_number'
  | 'tag'
  | 'stage'
  | 'user'
  | 'department'
  | 'duration'
  | 'time_of_day'
  | 'events'
  | 'conditions'
  | 'template_variables'
  | 'connector_operation'
  | 'list'
  | 'boolean'
  | 'custom_field'
  | 'event'
  | 'date_variable'
  | 'offset_days'
  /** Um passo de mensagem do próprio desenho ("Ramificar pelo status da mensagem"). */
  | 'message_step'
  /**
   * Escolha numa lista padronizada do catálogo (`list`), com "Outro" para um nome livre
   * (17/11). O código vai em `codeKey` (ex.: `reasonCode`); o rótulo, no próprio campo.
   */
  | 'standard_choice'
  /** As escolhas do tipo de missão (`missionTypes[tipo].options`), num objeto `{ chave: valor }`. */
  | 'mission_options'
  /** As restrições marcáveis da missão (códigos de `missionRestrictions`). */
  | 'mission_restrictions'
  /** Uma etapa do funil de negócios (`apoio.dealStages`). */
  | 'deal_stage'
  /** Texto com sugestões prontas (`options`, o valor é o próprio texto) e "Outro". */
  | 'preset_text'

export interface CampoDoPasso {
  key: string
  label: string
  type: TipoDeCampo
  required?: boolean
  help?: string
  placeholder?: string
  default?: unknown
  /** Opções de um `select`. Com `hint`, a tela mostra cartões com a explicação. */
  options?: { value: string; label: string; hint?: string }[]
  /** Só mostra o campo quando outro campo tem este valor. */
  showIf?: { key: string; equals: unknown }
  /** `standard_choice`: de qual lista do catálogo vêm as opções. */
  list?: ListaPadrao
  /** `standard_choice`: o parâmetro que guarda o código (ex.: `reasonCode`). */
  codeKey?: string
}

/** As listas padronizadas do catálogo (17/11): os códigos que o motor e os Resultados entendem. */
export type ListaPadrao = 'goalTypes' | 'exitReasons' | 'handoffReasons'

export interface ItemPadrao {
  code: string
  label: string
  hint?: string
  /** Metas: o evento que também conta como esta meta (ex.: `appointment_confirmed`). */
  event?: string
}

/** Uma escolha do tipo de missão: uma opção (`one`), várias (`many`) ou uma etapa do funil. */
export interface OpcaoDaMissao {
  key: string
  label: string
  kind: 'one' | 'many' | 'deal_stage'
  options?: { value: string; label: string }[]
  default: string | string[]
}

/**
 * Um tipo de missão (decisão de 16/11; detalhado em 17/11): a instrução que o agente
 * recebe fica no agent-server, versionada e TESTADA por tipo, por opção e por restrição.
 * A tela mostra o que o agente faz e deixa escolher só o que foi testado.
 */
export interface TipoDeMissao {
  label: string
  hint: string
  successEvent: string
  /** A meta que a conclusão costuma significar (sugestão do "Meta atingida" depois de "Concluiu"). */
  goalCode: string
  /** O que o agente faz, em passos curtos (o resumo da instrução testada). */
  steps: string[]
  /** As restrições que valem para este tipo e as que já vêm marcadas. */
  restrictions: string[]
  defaultRestrictions: string[]
  options: OpcaoDaMissao[]
  deadline: { amount: number; unit: string }
  maxReplies: number
}

export interface PassoDoCatalogo {
  type: string
  group: GrupoDoPasso
  label: string
  description: string
  /** Nome do ícone (lucide). A tela mapeia para o componente. */
  icon: string
  /**
   * Saídas: `single` (uma, "próximo"), `none` (fim) ou `dynamic` (vêm dos
   * parâmetros: eventos aguardados, condições, categorias…).
   */
  outputs: 'single' | 'none' | 'dynamic'
  params: CampoDoPasso[]
  /** Custo mostrado na tela. */
  cost: { credits: number; label: string }
  /** O que o passo exige: conversa aberta, linha, janela de 24 h. */
  requires: ('conversation' | 'whatsapp_number' | 'window_24h' | 'connector')[]
  /** Disponível neste épico? Os do próximo épico aparecem como "em breve". */
  availability: 'available' | 'soon'
  /**
   * Passo que pode falhar (envio, CRM, sistema, IA) traz a política padrão de
   * erro; a tela deixa mudar por passo. Sem valor: o passo não falha (esperas, ramos).
   */
  onError?: PoliticaDeErro
}

export interface EventoDoCatalogo {
  key: string
  label: string
  producer: 'plataforma' | 'agente' | 'externo'
  /** Variáveis que o evento traz (`evento.data`…). */
  variables: string[]
}

export interface OperacaoDeConector {
  key: string
  label: string
  connector: string
  /** `list` devolve uma lista (porta "agenda + lista"). */
  kind: 'list' | 'action'
  /** Variáveis de cada item ou do resultado. */
  variables: string[]
  writes: boolean
}

export interface Catalogo {
  version: string
  steps: PassoDoCatalogo[]
  events: EventoDoCatalogo[]
  connectorOperations: OperacaoDeConector[]
  /** Campos que as condições podem usar. */
  conditionFields: { key: string; label: string; type: 'text' | 'number' | 'list' | 'boolean' | 'date' }[]
  /** Listas padronizadas (17/11): nome da meta, motivo de saída e motivo da entrega à equipe. */
  goalTypes: ItemPadrao[]
  exitReasons: ItemPadrao[]
  handoffReasons: ItemPadrao[]
  /** O que a equipe deve fazer com um aviso ("Avisar a equipe"). */
  teamActions: ItemPadrao[]
  /** Os tipos de missão e as restrições marcáveis (o texto testado fica no agent-server). */
  missionTypes: Record<string, TipoDeMissao>
  missionRestrictions: ItemPadrao[]
}

// ── apoio: modelos, linhas, etiquetas, equipe ────────────────────────────────

export interface ModeloDoWhatsApp {
  id: string
  name: string
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  whatsappNumberId: string | null
  body: string
  variableCount: number
  buttons: string[]
}

export interface LinhaDoWhatsApp {
  id: string
  name: string
  phoneMasked: string
}

export interface ApoioDoEditor {
  templates: ModeloDoWhatsApp[]
  whatsappNumbers: LinhaDoWhatsApp[]
  tags: { id: string; name: string }[]
  stages: { id: string; name: string }[]
  /** As etapas do funil de negócios (passo "Negócio" e "mover o negócio" da missão), na ordem do funil. */
  dealStages: { id: string; name: string }[]
  users: { id: string; name: string }[]
  departments: { id: string; name: string }[]
  /** Campos personalizados do contato (passo "Mudar campo" e condições). */
  customFields: { id: string; name: string; type: 'text' | 'number' | 'date' | 'list'; options?: string[] }[]
  /** Segmentos salvos (os mesmos das campanhas), para a porta "Segmento". */
  segments: { id: string; name: string; size: number }[]
  /**
   * O sistema do cliente (o conector ligado): nome e logo, para o selo dos passos
   * "Sistema do cliente" e da porta "Agenda do sistema". Sem logo, fica só o ícone.
   */
  connector?: { name: string; logoUrl?: string | null } | null
  /**
   * O segmento da empresa (17/11): as sugestões dos campos de texto livre começam por ele.
   * Sem valor, começam pelas de "qualquer negócio". Nunca limita o que dá para escrever.
   */
  segment?: SegmentoDaReceita
}

// ── validar, simular, testar e publicar ──────────────────────────────────────

export interface ProblemaDoDesenho {
  severity: 'error' | 'warning'
  code: string
  message: string
  nodeId?: string
  /** Para `required`: a chave do campo (`CampoDoPasso.key`), para a tela marcar o campo. */
  field?: string
}

/** Um contato mostrado só com o primeiro nome, a inicial e o telefone mascarado (LGPD). */
export interface ContatoMascarado {
  name: string
  phoneMasked: string
  /** Ex.: "agendamento 18/11 às 09:30". */
  detail?: string
}

export interface ResultadoDaSimulacao {
  /** Quantos entrariam hoje, se a jornada estivesse publicada. */
  wouldEnterToday: number
  /** Uma amostra mascarada de quem entraria (até 10; P1, 16/11, como o Klaviyo). */
  enteringSample?: ContatoMascarado[]
  /** Barrados pelo filtro, por motivo, com uma amostra mascarada de cada motivo. */
  filteredOut: { reason: string; count: number; sample?: ContatoMascarado[] }[]
  messagesPerDay: number
  creditsPerDay: number
  /** Tarifa estimada da Meta por dia (R$), só para referência. */
  metaCostPerDayBrl: number
  byLine: { whatsappNumberId: string; messages: number }[]
  /**
   * O período pedido (P2, 16/11): 1 = hoje; 7 = os próximos 7 dias. Os campos
   * acima continuam sendo de UM dia (hoje); com 7, vêm também `byDay` e `totals`.
   */
  days?: number
  /** Dia a dia (data AAAA-MM-DD), só com `dias: 7`. */
  byDay?: { date: string; wouldEnter: number; messages: number }[]
  /** A soma do período, só com `dias: 7`. */
  totals?: { wouldEnter: number; messages: number; credits: number; metaCostBrl: number }
  /**
   * A conta das mensagens de um dia (P2, 16/11, "explica a conta"): cada passo
   * que manda mensagem, quantos % de quem entra chegam até ele e por qual ramo.
   * A soma dos que não são `internal` é `messagesPerDay`. As porcentagens vêm
   * dos últimos 30 dias desta jornada (ou de jornadas parecidas, se é nova).
   * Aviso à equipe juntado numa lista do dia: `messages` = 1 e `groupedPeople`
   * = quantas pessoas vão na lista.
   */
  math?: { nodeId: string; title: string; reachPct: number; messages: number; via?: string; internal?: boolean; groupedPeople?: number }[]
  /**
   * A automação que já faz isso hoje (ex.: o lembrete automático), para comparar
   * antes de trocar (P2, 16/11). Média por dia dos últimos 7 dias. Sem
   * automação equivalente: null.
   */
  current?: { name: string; wouldEnterToday: number; messagesPerDay: number; note?: string } | null
}

export interface PreviaDaPublicacao {
  mode: 'shadow' | 'active'
  fromVersion: number | null
  toVersion: number
  wouldEnterToday: number
  messagesPerDay: number
  whatsappNumbers: string[]
  estimatedCreditsPerEnrollment: number
  /** O que muda em relação à versão anterior. */
  changes: string[]
  /** Quem já está dentro continua na versão em que entrou. */
  enrolledInPreviousVersions: number
  warnings: string[]
  /**
   * Porta de segmento ou de evento: quem JÁ se encaixa hoje pode entrar na
   * publicação (P1: HubSpot, Customer.io, Klaviyo "Add past profiles"). Sem
   * valor: a porta não permite (lista agendada, webhook, manual).
   */
  backfill?: { eligible: number; description: string } | null
}

/** Primeira chamada: 422 `confirmation_required` com a prévia e o token (duas etapas do ORY-11). */
export interface ConfirmacaoNecessaria {
  preview: PreviaDaPublicacao
  confirmationToken: string
  expiresAt: string
}

// ── testar com um contato de verdade (P1, 16/11) ─────────────────────────────

/** Quem testa e com que dados: o contato de teste ou um contato de verdade (mascarado). */
export interface EntradaDoTeste {
  /** `null` = o contato de teste. */
  contactId?: string | null
  /** Os dados do evento e do contato, editáveis na tela (`conector.agenda.data` → "18/11"). */
  valores?: Record<string, string>
}

/** Uma checagem "entraria?" antes de testar (HubSpot "Start checks", Braze "Test Results"). */
export interface ChecagemDeEntrada {
  regra: string
  ok: boolean
  detalhe: string
}

/** O resultado de rodar UM passo, em ensaio (nada grava no sistema do cliente). */
export interface ResultadoDoPasso {
  ok: boolean
  titulo: string
  detalhe: string
  /** Por qual saída seguiria (`next`, `encontrou`, `confirmar`…). */
  saida: string | null
  /**
   * Passo de IA: quantos testes ainda dá para fazer hoje. Decisão do João
   * (16/11): o teste de IA NÃO gasta crédito; vale um limite diário por empresa.
   */
  testesDeIaRestantesHoje?: number
}

// ── inscrever manualmente (duas etapas, como publicar) ───────────────────────

export interface ContatoParaInscrever {
  id: string
  name: string
  phoneMasked: string
}

export interface PreviaDaInscricao {
  journeyId: string
  contacts: number
  /** Quantos entram de fato, depois do filtro, da reentrada e das supressões. */
  willEnter: number
  blocked: { reason: string; count: number }[]
  /** A jornada envia mensagem? Então inscrever exige confirmação. */
  sendsMessages: boolean
}

export interface ConfirmacaoDeInscricao {
  preview: PreviaDaInscricao
  confirmationToken: string
  expiresAt: string
}

// ── inscrições, linha do tempo, por que não entrou, resultados ───────────────

export type StatusDaInscricao = 'active' | 'waiting' | 'completed' | 'exited' | 'failed' | 'cancelled'

export interface Inscricao {
  id: string
  journeyId: string
  version: number
  contact: { id: string; name: string; phoneMasked: string }
  /** O assunto: "agendamento 48213 · 14/11 às 14h". */
  subjectLabel: string
  status: StatusDaInscricao
  shadow: boolean
  currentNodeId: string | null
  nextWakeAt: string | null
  enteredAt: string
  finishedAt: string | null
  exitReason: 'goal' | 'exit_if' | 'end' | 'manual' | 'ttl' | 'opt_out' | 'error' | 'superseded' | null
}

/** Uma página da lista de inscrições (GET /v1/journeys/{id}/enrollments?status=&page=). */
export interface PaginaDeInscricoes {
  itens: Inscricao[]
  /** Total do filtro pedido. */
  total: number
  /** Totais por situação, para as abas. */
  totais: { dentro: number; encerradas: number }
  pagina: number
  porPagina: number
}

export type SituacaoDaInscricao = 'dentro' | 'encerradas' | 'todas'

/** Os filtros de Pessoas (P1, 16/11: passo, situação, versão e busca, como a HubSpot). */
export interface FiltroDeInscricoes {
  situacao?: SituacaoDaInscricao
  pagina?: number
  porPagina?: number
  /** Nome ou final do telefone. */
  busca?: string
  /** Onde está agora. */
  passo?: string | null
  versao?: number | null
  status?: StatusDaInscricao | null
}

/**
 * Uma linha do registro de ações da jornada inteira (P1, 16/11: HubSpot "Action
 * logs", Braze, Klaviyo, Twilio). Cada passo que rodou para alguém, com o erro
 * e se dá para tentar de novo.
 */
export interface ItemDoRegistro {
  id: string
  at: string
  enrollmentId: string
  contact: { name: string; phoneMasked: string }
  nodeId: string | null
  nodeType: string
  title: string
  detail: string
  status: 'ok' | 'failed' | 'skipped' | 'shadow' | 'waiting'
  error?: { code: string; message: string; retryable: boolean; attempts: number }
}

export interface PaginaDoRegistro {
  itens: ItemDoRegistro[]
  total: number
  /** Quantas falhas no filtro (para o selo "Só erros"). */
  erros: number
  pagina: number
  porPagina: number
}

export interface ItemDaLinhaDoTempo {
  at: string
  nodeId: string | null
  nodeType: string
  title: string
  detail: string
  status: 'ok' | 'failed' | 'skipped' | 'waiting' | 'shadow'
  /** Por que pulou, esperou ou foi barrado. */
  reason?: string
  credits?: number
  /** No teste: a resposta que quem testa escolheu (P2, 16/11: vira a bolha do contato no celular). */
  choice?: { key: string; label: string }
  /** No teste: até quando o relógio foi adiantado (ISO). */
  clockTo?: string
}

export interface VerificacaoDeEntrada {
  doorId: string
  doorLabel: string
  at: string
  result: 'entered' | 'filtered' | 'reentry_blocked' | 'suppressed' | 'no_contact' | 'journey_paused'
  reason: string
}

export interface ResultadosDaJornada {
  period: { from: string; to: string }
  entered: number
  completedGoal: number
  exited: number
  failed: number
  /** Funil por passo: quantos chegaram e quantos estão ali agora. */
  byNode: { nodeId: string; reached: number; now: number }[]
  exitReasons: { reason: string; count: number }[]
  /** Comparação entre versões. */
  byVersion: { version: number; entered: number; goalRate: number }[]
  /** Por saída de ramo (ex.: confirmou × cancelou × silêncio). */
  byBranch: { nodeId: string; output: string; label: string; count: number }[]
  /**
   * Nos passos de mensagem: enviadas → entregues → lidas → respondidas, e as
   * que não chegaram (número inválido, recusa da Meta). Vem dos status do
   * WhatsApp que a plataforma já recebe; opcional enquanto o backend não envia.
   */
  byMessage?: {
    nodeId: string
    sent: number
    delivered: number
    read: number
    replied: number
    failed: number
    /** Por que não chegou, com o motivo da Meta (P1, 16/11). */
    failedReasons?: { reason: string; count: number }[]
    /** Tarifa estimada da Meta no período, em R$ (modelos; texto na janela de 24 h é grátis). */
    costBrl?: number
  }[]
  /** O mesmo período imediatamente antes, para comparar (P1, 16/11, HubSpot Performance). */
  previous?: { entered: number; completedGoal: number; exited: number; failed: number }
  /** A série por dia: entradas, metas batidas e saídas. */
  series?: { date: string; entered: number; completed: number; exited: number }[]
  /**
   * Quem não entrou, pulou uma mensagem ou teve a mensagem adiada, por motivo
   * PADRONIZADO (P2, 16/11, como o Braze e o Iterable). O motor grava o código;
   * a tela agrupa, conta e explica (`services/jornadas/motivos.ts`).
   */
  skipped?: { code: CodigoDePulo; count: number }[]
  /**
   * A receita atribuída pelo funil do CRM (P2, 16/11): negócios de quem entrou
   * na jornada, ganhos até `windowDays` dias depois de entrar. Sem negócio no
   * período (ou sem funil): null.
   */
  attribution?: { pipelineName: string; windowDays: number; deals: number; won: number; revenueBrl: number; previousRevenueBrl?: number } | null
}

/** Os códigos padronizados de pulo (P2, 16/11). Os textos ficam em `motivos.ts`. */
export type CodigoDePulo =
  | 'filter' | 'reentry' | 'other_journey' | 'opt_out' | 'invalid_phone' | 'entry_limit'
  | 'recheck_failed' | 'no_whatsapp' | 'meta_marketing_limit' | 'window_closed' | 'frequency_cap'
  | 'quiet_hours' | 'paused'

/**
 * Um número de Resultados que se abre para ver as pessoas por trás (P2, 16/11,
 * drill-down como a HubSpot): quem passou por um passo, seguiu por um ramo,
 * saiu por um motivo, bateu a meta ou pulou por um motivo padronizado.
 */
export type RecorteDosResultados =
  | { tipo: 'passo'; nodeId: string }
  | { tipo: 'ramo'; nodeId: string; output: string }
  | { tipo: 'saida'; reason: string }
  | { tipo: 'meta' }
  | { tipo: 'pulo'; code: CodigoDePulo }

/** Uma pessoa de um recorte, mascarada (LGPD). Quem não chegou a entrar não tem inscrição. */
export interface PessoaDoRecorte {
  contact: { name: string; phoneMasked: string }
  subjectLabel?: string
  /** Quando aconteceu o que o recorte conta (ISO). */
  at: string
  detail?: string
  enrollmentId?: string
  /** O caminho da inscrição, para "Ver no desenho". */
  nodeIds?: string[]
}

export interface PaginaDoRecorte {
  /** Até 50, das mais recentes. */
  itens: PessoaDoRecorte[]
  /** Quantas são no período (o número que foi clicado). */
  total: number
}

/** Os segmentos da Oryon (os mesmos da landing) e `geral`, para qualquer negócio. */
/**
 * O que a IA propõe (P2, 16/11, "Criar com IA" do Copiloto v2): um desenho
 * inteiro, NUNCA aplicado sozinho. A tela mostra a prévia (numa jornada que já
 * existe, o que muda) e a pessoa decide. Nasce desligado: vira rascunho, não publica.
 */
export interface PropostaDaIa {
  name: string
  description: string
  /** O desenho proposto (numa jornada que existe: o rascunho dela com a mudança). */
  version: VersaoDaJornada
  /** Por que montou assim, em frases curtas. */
  explanation: string[]
  /** O que conferir antes de testar (linha, modelo, setor). */
  checks: string[]
}

/** O que a receita resolve (P2, 16/11: filtro da galeria por objetivo). */
export type ObjetivoDaReceita = 'confirmar' | 'recuperar' | 'atender' | 'ouvir' | 'cobrar' | 'avisar'

/** Por onde uma jornada age (P2, 16/11). Os textos ficam em `canais.ts`. */
export type CanalDaJornada = 'whatsapp' | 'equipe' | 'agente' | 'sistema' | 'ia' | 'crm'

/**
 * A saúde de cada jornada ligada (P2, 16/11, como o "Health" da HubSpot): um
 * semáforo e o porquê, com onde resolver.
 */
export interface SaudeDaJornada {
  journeyId: string
  name: string
  status: StatusDaJornada
  /** ok = nada a fazer; atencao = olhar hoje; grave = está deixando de enviar ou de atender. */
  level: 'ok' | 'atencao' | 'grave'
  /** Do mais grave ao mais leve. `target` diz onde a tela abre para resolver. */
  issues: { level: 'atencao' | 'grave'; text: string; target: 'alertas' | 'erros' | 'desenho' | 'pessoas' | 'config' }[]
  /** Entregues ÷ enviadas nos últimos 7 dias (%); sem envio: null. */
  deliveryRate7d: number | null
  errors24h: number
  /** Inscrições que passaram do horário de acordar. */
  stuck: number
  lastSendAt: string | null
}

/**
 * O mapa de conexões entre as jornadas (P2, 16/11): o mesmo evento faz uma
 * jornada começar, outra bater a meta e outra tirar a pessoa; e várias jornadas
 * dividem a mesma linha de WhatsApp.
 */
export interface ConexoesDasJornadas {
  /** Eventos usados por 2 jornadas ou mais. Quem entra vem na ordem em que o motor avalia (a publicada há mais tempo primeiro). */
  byEvent: {
    event: string
    label: string
    uses: { journeyId: string; name: string; status: StatusDaJornada; role: 'entra' | 'meta' | 'sai'; order?: number; skipsIfInOther?: boolean }[]
  }[]
  /** As linhas de WhatsApp e as jornadas que mandam por cada uma, com o volume do mês. */
  byLine: { whatsappNumberId: string; name: string; totalMessagesThisMonth: number; journeys: { journeyId: string; name: string; status: StatusDaJornada; messagesThisMonth: number }[] }[]
}

export type SegmentoDaReceita = 'clinica' | 'imobiliaria' | 'loja' | 'contabilidade' | 'juridico' | 'geral'

export interface Receita {
  id: string
  /** Nomeada pelo RESULTADO: "Reduzir faltas (confirmação)". */
  name: string
  outcome: string
  description: string
  /** Para que segmento a receita foi pensada; `geral` serve a qualquer negócio. */
  segment: SegmentoDaReceita
  /** O que ela resolve (P2, 16/11: filtro por objetivo). */
  goal?: ObjetivoDaReceita
  usesAi: boolean
  /** Ícone (lucide). */
  icon: string
  /** O desenho que a receita cria. */
  version: Omit<VersaoDaJornada, 'version' | 'status' | 'publishedAt' | 'publishedBy'>
}
