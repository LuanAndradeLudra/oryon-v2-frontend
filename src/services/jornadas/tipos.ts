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
  /** Versão do catálogo com que o desenho foi validado. */
  catalogVersion: string
  publishedAt: string | null
  publishedBy: string | null
}

// ── o desenho (graph jsonb) ──────────────────────────────────────────────────

export interface Grafo {
  /** Id do primeiro passo depois da entrada. */
  start: string | null
  nodes: Record<string, NoDoGrafo>
  /** Posição no canvas. Não muda o comportamento. */
  layout: Record<string, { x: number; y: number }>
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
  /** O que fazer se o passo falhar. Padrão: parar a inscrição com motivo. */
  onError?: 'stop' | 'continue' | { goTo: string }
}

// ── entrada, metas e saídas ──────────────────────────────────────────────────

export type TipoDePorta = 'schedule_list' | 'event' | 'segment' | 'webhook' | 'manual'

export interface Porta {
  id: string
  type: TipoDePorta
  params: Record<string, unknown>
}

export interface Condicao {
  /** Campo: `contato.etiquetas`, `conversa.posse`, `evento.especialidade`… */
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
    /** `por_assunto` = uma inscrição por consulta (chave do assunto). */
    mode: 'per_subject' | 'once' | 'cooldown' | 'always'
    cooldownDays?: number
    subjectKey?: string
  }
}

export interface Metas {
  /** Meta contínua: bateu, a pessoa sai na hora, de qualquer passo. */
  goals: { id: string; label: string; event: string; sameSubject: boolean }[]
  /** Saídas automáticas: a consulta passou, opt-out, humano assumiu… */
  exitIf: { id: string; label: string; event: string }[]
  /** Prazo máximo de uma inscrição. */
  ttlDays: number
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

export interface CampoDoPasso {
  key: string
  label: string
  type: TipoDeCampo
  required?: boolean
  help?: string
  placeholder?: string
  default?: unknown
  options?: { value: string; label: string }[]
  /** Só mostra o campo quando outro campo tem este valor. */
  showIf?: { key: string; equals: unknown }
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
}

export interface EventoDoCatalogo {
  key: string
  label: string
  producer: 'plataforma' | 'agente' | 'externo'
  /** Variáveis que o evento traz (`evento.data_consulta`…). */
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
  users: { id: string; name: string }[]
  departments: { id: string; name: string }[]
}

// ── validar, simular, testar e publicar ──────────────────────────────────────

export interface ProblemaDoDesenho {
  severity: 'error' | 'warning'
  code: string
  message: string
  nodeId?: string
}

export interface ResultadoDaSimulacao {
  /** Quantos entrariam hoje, se a jornada estivesse publicada. */
  wouldEnterToday: number
  /** Barrados pelo filtro, por motivo. */
  filteredOut: { reason: string; count: number }[]
  messagesPerDay: number
  creditsPerDay: number
  /** Tarifa estimada da Meta por dia (R$), só para referência. */
  metaCostPerDayBrl: number
  byLine: { whatsappNumberId: string; messages: number }[]
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
}

/** Primeira chamada: 422 `confirmation_required` com a prévia e o token (duas etapas do ORY-11). */
export interface ConfirmacaoNecessaria {
  preview: PreviaDaPublicacao
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
  /** O assunto: "consulta 48213 · 14/11 às 14h". */
  subjectLabel: string
  status: StatusDaInscricao
  shadow: boolean
  currentNodeId: string | null
  nextWakeAt: string | null
  enteredAt: string
  finishedAt: string | null
  exitReason: 'goal' | 'exit_if' | 'end' | 'manual' | 'ttl' | 'opt_out' | 'error' | 'superseded' | null
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
}

export interface Receita {
  id: string
  /** Nomeada pelo RESULTADO: "Reduzir faltas (confirmação)". */
  name: string
  outcome: string
  description: string
  segment: 'clinica' | 'geral'
  usesAi: boolean
  /** Ícone (lucide). */
  icon: string
  /** O desenho que a receita cria. */
  version: Omit<VersaoDaJornada, 'version' | 'status' | 'publishedAt' | 'publishedBy'>
}
