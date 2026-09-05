// ─── Agents Ops & Handoffs — tipos do contrato (BE.6/BE.7/AS.1/AS.2/AS.3) ──
// Fonte: design-system/fluxos-src/coord/CONTRATOS.md (Solda, BE.0/SCRUM-993).
// Ajustado aos shapes finais publicados lá — não são mais chutes do plano.
//
// Blocos por história — na Onda 1, cada dono edita só o seu bloco.

// ── [A6] handoffs (BE.6) ────────────────────────────────────────────────

export type HandoffStatus = 'waiting' | 'claimed' | 'resolved'

export interface HandoffContact {
  id: string
  name: string
  phoneMasked: string
}

export interface HandoffAgentRef {
  id: string
  name: string
}

// `id`/`label` ficam NULL em quase todo evento real hoje — não existe
// matcher de keywords em runtime (Decisão D9 do CONTRATOS.md). A6 mostra
// "—" quando nulo; isso não é um bug do endpoint.
export interface HandoffRuleRef {
  id: string | null
  label: string | null
}

export interface HandoffTarget {
  type: 'queue' | 'user' | null
  id: string | null
  label: string | null
}

export interface HandoffItem {
  id: string
  conversationId: string
  contact: HandoffContact
  agent: HandoffAgentRef
  rule: HandoffRuleRef
  target: HandoffTarget
  intent: string | null
  summary: string | null
  waitingSeconds: number
  slaSeconds: number
  createdAt: string
}

export interface HandoffListResponse {
  items: HandoffItem[]
  total: number
}

export interface HandoffListParams {
  status?: HandoffStatus
  queue?: string
  page?: number
  limit?: number
}

export interface HandoffTopReason {
  label: string
  count: number
  /** Total de eventos no período — denominador de `count/total`, repetido em
   *  cada linha por conveniência do frontend (evita recalcular). */
  total: number
}

export interface HandoffSummary {
  waiting: number
  claimed: number
  avgWaitSeconds: number
  slaBreached: number
  topReasons7d: HandoffTopReason[]
  returnedToAiPct: number
}

/** Resposta de claim/return — CONTRATOS.md só descreve "HandoffEvent
 *  atualizado" em texto, sem exemplo de JSON. Ajustar quando A6 (Tecelã)
 *  confirmar contra a resposta real do backend. */
export type HandoffEventUpdated = Record<string, unknown>

// ── [A1][A2][A4] agents-ops (BE.7) ──────────────────────────────────────

export interface AgentLiveLatest {
  conversationId: string
  contactName: string
  snippet: string
  at: string
  lastAction: string
}

export interface AgentLiveInfo {
  count: number
  latest: AgentLiveLatest | null
}

export type AgentsLiveResponse = Record<string, AgentLiveInfo>

export interface AgentsPulse {
  resolvedByAiPct: number
  conversations: number
  goal: number
  transferred: number
}

// 3 valores confirmados (Decisão D22) — cada um lastreado por uma coluna já
// existente, sem "resolved" (cortado do v1, ver CONTRATOS.md § BE.7).
export type AgentFeedItemKind = 'replied' | 'handoff_requested' | 'handoff_returned'

export interface AgentFeedItem {
  agentId: string
  agentName: string
  kind: AgentFeedItemKind
  text: string
  at: string
}

export interface AgentMetricsIntent {
  name: string
  volume: number
  resolutionPct: number
}

export interface AgentMetrics {
  started: number
  resolvedByAi: number
  transferred: number
  /** Aproximação via `conversation_analyses.outcome='converted'` (Decisão
   *  D14) — não é uma atribuição real de vendas. Não tratar como número
   *  auditável. */
  assistedSales: number
  avgResponseSec: number
  intents: AgentMetricsIntent[]
  deltaPct: number
}

export type AgentMetricsRange = '7d' | '30d' | string

// ── [A2][AS.2] rascunho/publicação de agente — extensões reutilizáveis ────
// (o shape completo de "config" nas respostas de publish/GET :id depende de
// AgentConfigWithTools, que mora em services/agentsApi.ts — congelado. Os
// tipos que dependem dele ficam compostos no service, não aqui, pra não
// inverter a direção de dependência types→services.)

/** Campos que `GET /configs/:id`, `PATCH .../draft` e `POST .../publish`
 *  passam a incluir junto do `AgentConfigWithTools` de sempre — snake_case,
 *  convenção do agent-server. */
export interface AgentDraftExtension {
  draft: Record<string, unknown> | null
  changed_fields: string[]
}

export interface AgentPromptVersion {
  id: string
  agent_id: string
  version: number
  system_prompt: string
  wizard_config: Record<string, unknown>
  handoff_rules: Record<string, unknown>
  published_by: string
  created_at: string
}

export type AgentToolWarningKind = 'token_expiring' | 'token_expired'

export interface AgentToolWarning {
  tool_id: string
  kind: AgentToolWarningKind
  expires_at: string
}

export interface AgentHealth {
  last_test_at: string | null
  prompt_version: number | null
  knowledge_count: number
  tool_warnings: AgentToolWarning[]
}
