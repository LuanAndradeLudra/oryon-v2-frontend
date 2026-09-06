// ─── Campaigns V2 — tipos do contrato (BE.1/BE.2/BE.3/BE.4/BE.5/BE.8) ──────
// Fonte: design-system/fluxos-src/coord/CONTRATOS.md (Solda, BE.0/SCRUM-993).
// Ajustado aos shapes finais publicados lá — não são mais chutes do plano.
//
// Blocos por história — na Onda 1, cada dono edita só o seu bloco.

// ── [D6] segments (BE.3) ────────────────────────────────────────────────

// Campos permitidos por condição — tabela confirmada contra
// campaign-segment.service.ts (CONTRATOS.md § BE.3). `custom:<key>` é
// aberto (chave de customField), por isso o template literal.
export type SegmentField =
  | 'tags' | 'stage' | 'source' | 'intent' | 'sentiment' | 'optIn'
  | 'lastActivityAt' | 'search' | 'hasConversations'
  | `custom:${string}`

export type SegmentOperator =
  | 'includes_any' | 'includes_all' | 'excludes'
  | 'eq' | 'in' | 'not_in'
  | 'before' | 'after' | 'within_days'
  | 'contains'

export interface SegmentCondition {
  field: SegmentField
  operator: SegmentOperator
  value: unknown
}

export interface SegmentGroup {
  op: 'and' | 'or'
  conditions: SegmentCondition[]
}

// `optOut:true` trata `optIn IS NULL` como opt-out (conservador/LGPD —
// Decisão D6, pendente de confirmação do PO antes de codar o backend; o
// contrato de tipos aqui já reflete a decisão proposta).
export interface SegmentExclusions {
  optOut?: boolean
  campaignedWithinDays?: number
  activeAiConversation?: boolean
}

export interface SegmentEvaluateRequest {
  groups: SegmentGroup[]
  exclude?: SegmentExclusions
  sample?: number
}

export interface SegmentSampleContact {
  id: string
  displayName: string
  waId: string
  stage: string | null
}

export interface SegmentEvaluateResult {
  matched: number
  eligible: number
  /** Contagens independentes por motivo, NÃO uma partição — um contato pode
   *  contar em mais de um motivo ao mesmo tempo (Decisão D5). Não montar
   *  gráfico de pizza assumindo que somam `matched - eligible`. */
  excluded: { optOut: number; recentlyCampaigned: number; activeAi: number }
  /** Contagem parcial por condição, na MESMA ordem e no MESMO comprimento do
   *  `groups[].conditions` que foi enviado (Decisão D38). Condição sem valor
   *  é ignorada na avaliação mas MANTÉM a posição e volta `null` — a lista
   *  nunca colapsa, então o alinhamento posicional continua valendo sem o
   *  cliente filtrar nem reindexar. `null` vira travessão na tela: um número
   *  ali seria indistinguível de um filtro real muito permissivo, e número
   *  indistinguível de dado verdadeiro é pior que ausência declarada. */
  perCondition: (number | null)[][]
  within24h: number
  sample: SegmentSampleContact[]
}

// POST /campaigns/segments/preview (Decisão D26) — paginação real ("ver os
// N" navegável), separado do `evaluate` (que fica com `sample` pequeno).
export interface SegmentPreviewRequest {
  groups: SegmentGroup[]
  exclude?: SegmentExclusions
  page?: number
  limit?: number
}

export interface SegmentPreviewResponse {
  data: SegmentSampleContact[]
  /** = `eligible` (pós-exclusões), não `matched`. */
  total: number
  page: number
  limit: number
}

export interface CampaignSegmentDefinition {
  groups: SegmentGroup[]
  exclude?: SegmentExclusions
}

export interface CampaignSegmentSaved {
  id: string
  tenantId: string
  name: string
  definition: CampaignSegmentDefinition
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Decisão D25 — POST/PATCH /campaigns aceitam o público por EXATAMENTE uma
// destas 3 formas. Estende o body dos endpoints já existentes em
// campaignsApi.create/update (services/api.ts, congelado) — D2/D6 espalham
// isso no próprio body em vez de eu duplicar create/update aqui.
export type CampaignAudienceFields =
  | { segmentId: string; audience?: never; segment?: never }
  | { audience: CampaignSegmentDefinition; segmentId?: never; segment?: never }
  | { segment: import('./index').CampaignSegment; segmentId?: never; audience?: never }

// ── [D2] enviar teste (Composer "Enviar teste") — BE.10/SCRUM-1025 ───────
// Envia UMA mensagem avulsa (sem criar Campaign/campaign_recipients) —
// "testar antes de agendar de verdade". `to` ausente usa o telefone do
// usuário logado (Decisão D27).
export interface CampaignTestSendRequest {
  templateId: string
  variableMappings: import('./index').CampaignVariableMapping[]
  whatsappNumberId: string
  /** Opcional — ausente usa `User.phone` do usuário logado. */
  to?: string
}

export interface CampaignTestSendResult {
  messageId: string
  to: string
  sentAt: string
}

// ── [D3] analytics estendido (BE.1) ─────────────────────────────────────

export interface CampaignFunnel {
  sent: number
  delivered: number
  read: number
  replied: number
}

export interface CampaignReadHeatmapPoint {
  dayOffset: number
  hour: number
  count: number
}

export interface CampaignFailureReason {
  code: string
  reason: string
  count: number
}

export interface CampaignReply {
  contactId: string
  name: string
  text: string
  at: string
  /** Ambos `null` até BE.9 (classificação de resposta) rodar. */
  score: number | null
  class: string | null
}

export interface CampaignAnalyticsV2Extra {
  funnel: CampaignFunnel
  readHeatmap: CampaignReadHeatmapPoint[]
  failures: CampaignFailureReason[]
  replies: CampaignReply[]
}

// ── [D1][D1b][D3] recipients (BE.1) ─────────────────────────────────────

export type CampaignRecipientStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled'

export type CampaignReplyClass = 'promoter' | 'neutral' | 'detractor' | 'question' | 'optout' | 'other'

export interface CampaignRecipient {
  id: string
  contactId: string
  contactName: string
  status: CampaignRecipientStatus
  errorCode: string | null
  replyText: string | null
  /** `null` até BE.9 classificar a resposta. */
  replyClass: CampaignReplyClass | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
}

export interface CampaignRecipientsParams {
  status?: CampaignRecipientStatus
  page?: number
  limit?: number
}

export interface CampaignRecipientsResponse {
  data: CampaignRecipient[]
  total: number
  page: number
  limit: number
}

// ── [D1][D1b] status/lifecycle (BE.2) ───────────────────────────────────

// 7 valores confirmados (Decisão D3) — `stopped` migra para `failed`. O
// enum visual/labels vive em campaignStatus.ts (W0.4/Alavanca); este tipo é
// só o contrato de API.
export type CampaignStatusV2 = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'paused'

// A Agenda (D1) precisa da janela por DATA DE EXECUÇÃO, mas `GET /campaigns`
// ordena por `createdAt DESC`, pagina em 50 (máx. 100) e não aceita recorte
// por data — os dois eixos não coincidem, então uma campanha criada há meses
// e agendada para o mês que vem cai fora da página 1. Decisão do Maestro
// (coord/D1-decisoes.md, decisão 2): paginar no cliente AGORA, com o limite
// declarado na tela, e pedir `?from=&to=` + `order=scheduledAt` na Onda 2.
// Estes dois tipos existem porque `campaignsApi.list()` (services/api.ts,
// congelado) descarta o `total` ao normalizar para array — e sem `total`
// não dá para saber quando parar de paginar.
export interface CampaignsPageParams {
  page?: number
  limit?: number
  status?: string
}

export interface CampaignsPageResponse {
  // `import(...)` inline em vez de um import no topo: o cabeçalho do arquivo
  // é área comum, e este bloco é o único lugar onde eu escrevo. Mesmo padrão
  // de services/api.ts:1603.
  data: import('@/types').Campaign[]
  total: number
  page: number
  limit: number
}

// ── [D2][D1] recorrência (BE.4) + cota/custo (BE.5) ─────────────────────

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'

export interface CampaignRecurrence {
  freq: RecurrenceFreq
  interval: number
  /** 0=domingo..6=sábado. Obrigatório quando `freq:'weekly'`. */
  byWeekday?: number[]
  hour: number
  /** IANA, ex.: "America/Sao_Paulo". */
  timezone: string
  /** Data ISO, inclusive. */
  until?: string
}

export interface WhatsAppNumberUsage {
  dailyQuota: number | null
  usedToday: number
  remaining: number | null
  resetsAt: string
  qualityRating: string
}

// Decisão D8 — POST (não GET), corpo estruturado. Por segmento salvo OU
// inline (mesmo shape do evaluate), nunca os dois.
export type CampaignCostEstimateRequest =
  | { segmentId: string; templateId: string }
  | { groups: SegmentGroup[]; exclude?: SegmentExclusions; templateId: string }

export interface CampaignCostEstimate {
  /** Valores monetários em CENTAVOS inteiros, nunca float (Decisão D20). */
  perMessage: { category: string; priceCents: number; currency: string }
  estimatedCount: number
  totalCents: number
}

// ── [D4] templates (BE.8) ───────────────────────────────────────────────

export interface TemplateUsageInfo {
  usageCount: number
  lastUsedAt: string | null
}

export interface TemplateRewriteRequest {
  instructions?: string
}

export interface TemplateRewriteResult {
  body: string
  buttons?: unknown[]
  rationale: string
}
