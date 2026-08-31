import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { appLogger } from '@/services/appLogger'
import type {
  AdAccount,
  AdCampaignMetrics,
  AdCreativeMetrics,
  AdPlatform,
  AdSetMetrics,
  AdAttributionTouchpoint,
  Automation,
  AutomationRun,
  AutomationStatus,
  Campaign,
  CampaignSegment,
  CampaignVariableMapping,
  CannedResponse,
  Contact,
  ContactCustomFieldDef,
  ContactFilters,
  ContactHistoryEvent,
  Conversation,
  ConversationAnalysisResult,
  ConversationFilters,
  ConversationListResponse,
  HomeStats,
  MarketingFunnelTotals,
  MetaCapiEvent,
  Message,
  MetaAdsReferral,
  PaginatedResponse,
  Product,
  Practitioner,
  Deal,
  DealStatus,
  Pipeline,
  PipelineStage,
  PipelineChannelRouting,
  ContactDealsSummary,
  SendMessageDto,
  Department,
  Tag,
  TenantStage,
  User,
  WhatsAppNumber,
  WhatsAppTemplate,
  TemplateHeaderTypeInput,
} from '@/types'

import { apiBaseUrl, isNativePlatform } from '@/config/env'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth-storage'

const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000, // 30 seconds
  withCredentials: true, // Send httpOnly cookies with every request (web)
})

// Re-exported so peripheral services (admin tools, internal utilities) can
// reuse the configured axios instance — same baseURL, same cookie behavior,
// same audit interceptors — without repeating the setup or going around it.
export { api }

// ─── Copilot turn context ─────────────────────────────────────────────────────
// OrchestratorAgent sets this when a copilot turn is active so the interceptor
// can mark writes as source='copilot' and attach the turn_id.

let _copilotTurnId: string | null = null
export function setCopilotTurnId(id: string | null): void {
  _copilotTurnId = id
}

// ─── Correlation ID helpers ───────────────────────────────────────────────────
// One UUID per HTTP request, generated client-side and echoed by the server in
// the response header. Used to drill the same request across frontend logs,
// backend Winston, agent-server logs, and downstream HMAC calls.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function newCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for very old browsers — log analytics-only, not security-sensitive.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

let _lastCorrelationId: string | null = null

export function getLastCorrelationId(): string | null {
  return _lastCorrelationId
}

// ─── Audit logging helpers ────────────────────────────────────────────────────

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function readSession(): { userId: string | null; tenantId: string | null; actorName: string | null } {
  try {
    const raw = localStorage.getItem('oryon:session')
    if (!raw) return { userId: null, tenantId: null, actorName: null }
    const s = JSON.parse(raw) as { user?: { id?: string; tenantId?: string; firstName?: string; lastName?: string } }
    return {
      userId:    s.user?.id       ?? null,
      tenantId:  s.user?.tenantId ?? null,
      actorName: s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || null : null,
    }
  } catch { return { userId: null, tenantId: null, actorName: null } }
}

const SENSITIVE_FIELDS = new Set([
  'password', 'currentPassword', 'newPassword', 'confirmPassword',
  'token', 'refreshToken', 'accessToken', 'secret', 'apiKey',
  'passwordHash', 'creditCard', 'cvv',
])

function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = '[REDACTED]'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForLogging(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function safeParseBody(data: unknown): Record<string, unknown> | null {
  let parsed: Record<string, unknown> | null = null
  if (!data) return null
  if (typeof data === 'object') parsed = data as Record<string, unknown>
  else if (typeof data === 'string') {
    try { parsed = JSON.parse(data) as Record<string, unknown> } catch { return null }
  }
  if (!parsed) return null
  return sanitizeForLogging(parsed)
}

function methodToOperation(method: string): 'create' | 'update' | 'delete' {
  if (method === 'POST')   return 'create'
  if (method === 'DELETE') return 'delete'
  return 'update'
}

// Extract the best display name from API response data
function extractEntityName(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  return (d.displayName ?? d.name ?? d.label ?? null) as string | null
}

// ─── Semantic action mapper ───────────────────────────────────────────────────
// Maps HTTP method + URL pattern + request payload → semantic ActivityLog entry.

interface SemanticEvent {
  action:       string
  entity_type:  string
  entity_id:    string | null
  description:  string
  details:      Record<string, unknown>
}

function resolveSemanticEvent(
  method: string,
  url: string,
  payload: Record<string, unknown> | null,
  responseData: unknown,
): SemanticEvent | null {
  type Handler = (m: RegExpMatchArray, p: Record<string, unknown>) => SemanticEvent

  const rules: Array<{ re: RegExp; method: string; handler: Handler }> = [
    // ── Conversations ─────────────────────────────────────────────────────────
    {
      re: /\/conversations\/([^/]+)\/assign$/,
      method: 'PATCH',
      handler: (m, p) => ({
        action: 'conversation_assigned',
        entity_type: 'conversation', entity_id: m[1],
        description: p.userId
          ? `Conversa atribuída ao usuário ${p.userId}`
          : 'Atribuição de conversa removida',
        details: { assigned_to: p.userId ?? null },
      }),
    },
    {
      re: /\/conversations\/([^/]+)\/transfer$/,
      method: 'PATCH',
      handler: (m, p) => ({
        action: 'conversation_transferred',
        entity_type: 'conversation', entity_id: m[1],
        description: `Conversa transferida para usuário ${p.userId ?? ''}`,
        details: { transferred_to: p.userId ?? null },
      }),
    },
    {
      re: /\/conversations\/([^/]+)\/status$/,
      method: 'PATCH',
      handler: (m, p) => {
        const statusMap: Record<string, string> = {
          resolved: 'resolvida', open: 'aberta',
          pending: 'pendente', abandoned: 'arquivada',
        }
        const st = String(p.status ?? '')
        return {
          action: st === 'abandoned' ? 'conversation_archived' : 'conversation_status_changed',
          entity_type: 'conversation', entity_id: m[1],
          description: `Conversa marcada como ${statusMap[st] ?? st}`,
          details: { new_status: p.status },
        }
      },
    },
    {
      re: /\/conversations\/([^/]+)\/tags\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'conversation_tag_removed',
        entity_type: 'conversation', entity_id: m[1],
        description: 'Etiqueta removida da conversa',
        details: { tag_id: m[2] },
      }),
    },
    {
      re: /\/conversations\/([^/]+)\/tags$/,
      method: 'POST',
      handler: (m, p) => ({
        action: 'conversation_tag_added',
        entity_type: 'conversation', entity_id: m[1],
        description: 'Etiqueta adicionada à conversa',
        details: { tag_id: p.tagId ?? null },
      }),
    },
    {
      re: /\/conversations\/([^/]+)\/messages$/,
      method: 'POST',
      handler: (m, p) => ({
        action: 'message_sent',
        entity_type: 'conversation', entity_id: m[1],
        description: `Mensagem enviada${p.type === 'template' ? ' (template)' : ''}`,
        details: { type: p.type ?? 'text' },
      }),
    },

    // ── Contacts ──────────────────────────────────────────────────────────────
    {
      re: /\/contacts\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => {
        const entityName = extractEntityName(responseData)
        if (p.stage) {
          return {
            action: 'contact_stage_changed',
            entity_type: 'contact', entity_id: m[1],
            description: `Lead${entityName ? ` "${entityName}"` : ''} movido para estágio "${p.stage}"`,
            details: { new_stage: p.stage, contact_name: entityName },
          }
        }
        if (p.leadScore !== undefined) {
          return {
            action: 'contact_score_updated',
            entity_type: 'contact', entity_id: m[1],
            description: `Score do lead${entityName ? ` "${entityName}"` : ''} atualizado para ${p.leadScore}`,
            details: { new_score: p.leadScore, contact_name: entityName },
          }
        }
        const fields = Object.keys(p)
        return {
          action: 'contact_updated',
          entity_type: 'contact', entity_id: m[1],
          description: `Contato${entityName ? ` "${entityName}"` : ''} atualizado (${fields.slice(0, 3).join(', ')}${fields.length > 3 ? '…' : ''})`,
          details: { fields, contact_name: entityName },
        }
      },
    },
    {
      re: /\/contacts\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'contact_deleted',
        entity_type: 'contact', entity_id: m[1],
        description: 'Contato excluído',
        details: {},
      }),
    },
    {
      re: /\/contacts$/,
      method: 'POST',
      handler: (_m, p) => {
        const name = String(p.displayName ?? 'Novo contato')
        return {
          action: 'contact_created',
          entity_type: 'contact', entity_id: extractEntityName(responseData) ? null : null,
          description: `Contato criado: "${name}"`,
          details: { name, wa_id: p.waId ?? null, stage: p.stage ?? null },
        }
      },
    },

    // ── Campaigns ─────────────────────────────────────────────────────────────
    {
      re: /\/campaigns\/([^/]+)\/send$/,
      method: 'POST',
      handler: (m) => {
        const name = extractEntityName(responseData)
        return {
          action: 'campaign_sent',
          entity_type: 'campaign', entity_id: m[1],
          description: `Campanha${name ? ` "${name}"` : ''} disparada`,
          details: { campaign_name: name },
        }
      },
    },
    {
      re: /\/campaigns\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'campaign_deleted',
        entity_type: 'campaign', entity_id: m[1],
        description: 'Campanha excluída',
        details: {},
      }),
    },
    {
      re: /\/campaigns\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => {
        const name = extractEntityName(responseData) ?? String(p.name ?? '')
        return {
          action: 'campaign_updated',
          entity_type: 'campaign', entity_id: m[1],
          description: `Campanha${name ? ` "${name}"` : ''} atualizada`,
          details: { name, fields: Object.keys(p) },
        }
      },
    },
    {
      re: /\/campaigns$/,
      method: 'POST',
      handler: (_m, p) => {
        const name = String(p.name ?? 'Nova campanha')
        return {
          action: 'campaign_created',
          entity_type: 'campaign', entity_id: null,
          description: `Campanha criada: "${name}"`,
          details: { name, scheduled_at: p.scheduledAt ?? null },
        }
      },
    },

    // ── Templates ─────────────────────────────────────────────────────────────
    {
      re: /\/templates\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'template_deleted',
        entity_type: 'template', entity_id: m[1],
        description: 'Template excluído',
        details: {},
      }),
    },
    {
      re: /\/templates\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => {
        const name = extractEntityName(responseData) ?? String(p.name ?? '')
        return {
          action: 'template_updated',
          entity_type: 'template', entity_id: m[1],
          description: `Template${name ? ` "${name}"` : ''} atualizado`,
          details: { name },
        }
      },
    },
    {
      re: /\/templates$/,
      method: 'POST',
      handler: (_m, p) => {
        const name = String(p.name ?? 'Novo template')
        return {
          action: 'template_created',
          entity_type: 'template', entity_id: null,
          description: `Template criado: "${name}"`,
          details: { name, category: p.category ?? null },
        }
      },
    },

    // ── Tags ──────────────────────────────────────────────────────────────────
    {
      re: /\/tags\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'tag_deleted',
        entity_type: 'tag', entity_id: m[1],
        description: 'Etiqueta excluída',
        details: {},
      }),
    },
    {
      re: /\/tags\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => {
        const name = extractEntityName(responseData) ?? String(p.name ?? '')
        return {
          action: 'tag_updated',
          entity_type: 'tag', entity_id: m[1],
          description: `Etiqueta "${name}" atualizada`,
          details: { name, color: p.color ?? null },
        }
      },
    },
    {
      re: /\/tags$/,
      method: 'POST',
      handler: (_m, p) => {
        const name = String(p.name ?? 'Nova etiqueta')
        return {
          action: 'tag_created',
          entity_type: 'tag', entity_id: null,
          description: `Etiqueta criada: "${name}"`,
          details: { name, color: p.color ?? null },
        }
      },
    },

    // ── Automations ───────────────────────────────────────────────────────────
    {
      re: /\/automations\/([^/]+)\/toggle$/,
      method: 'PATCH',
      handler: (m) => {
        const d = responseData as Record<string, unknown> | null
        const isActive = d?.isActive ?? d?.status === 'active'
        const name = extractEntityName(responseData)
        return {
          action: 'automation_toggled',
          entity_type: 'automation', entity_id: m[1],
          description: `Automação${name ? ` "${name}"` : ''} ${isActive ? 'ativada' : 'desativada'}`,
          details: { is_active: isActive, name },
        }
      },
    },
    {
      re: /\/automations\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'automation_deleted',
        entity_type: 'automation', entity_id: m[1],
        description: 'Automação excluída',
        details: {},
      }),
    },
    {
      re: /\/automations\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => {
        const name = extractEntityName(responseData) ?? String(p.name ?? '')
        return {
          action: 'automation_updated',
          entity_type: 'automation', entity_id: m[1],
          description: `Automação${name ? ` "${name}"` : ''} atualizada`,
          details: { name, fields: Object.keys(p) },
        }
      },
    },
    {
      re: /\/automations$/,
      method: 'POST',
      handler: (_m, p) => {
        const name = String(p.name ?? 'Nova automação')
        const trigger = (p.trigger as Record<string, unknown> | undefined)?.type ?? null
        return {
          action: 'automation_created',
          entity_type: 'automation', entity_id: null,
          description: `Automação criada: "${name}"${trigger ? ` (gatilho: ${trigger})` : ''}`,
          details: { name, trigger },
        }
      },
    },

    // ── Settings — Stages ─────────────────────────────────────────────────────
    {
      re: /\/settings\/stages\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'stage_deleted',
        entity_type: 'stage', entity_id: m[1],
        description: 'Estágio excluído',
        details: {},
      }),
    },
    {
      re: /\/settings\/stages\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => ({
        action: 'stage_updated',
        entity_type: 'stage', entity_id: m[1],
        description: `Estágio "${p.label ?? ''}" atualizado`,
        details: { label: p.label, color: p.color, is_terminal: p.isTerminal },
      }),
    },
    {
      re: /\/settings\/stages$/,
      method: 'POST',
      handler: (_m, p) => ({
        action: 'stage_created',
        entity_type: 'stage', entity_id: null,
        description: `Estágio criado: "${p.label ?? 'Novo estágio'}"`,
        details: { label: p.label, color: p.color, is_terminal: p.isTerminal ?? false },
      }),
    },

    // ── Settings — Custom fields ───────────────────────────────────────────────
    {
      re: /\/settings\/custom-fields\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'custom_field_deleted',
        entity_type: 'custom_field', entity_id: m[1],
        description: 'Campo personalizado excluído',
        details: {},
      }),
    },
    {
      re: /\/settings\/custom-fields\/([^/]+)$/,
      method: 'PATCH',
      handler: (m, p) => ({
        action: 'custom_field_updated',
        entity_type: 'custom_field', entity_id: m[1],
        description: `Campo "${p.label ?? m[1]}" atualizado`,
        details: { label: p.label, type: p.type, required: p.required },
      }),
    },
    {
      re: /\/settings\/custom-fields$/,
      method: 'POST',
      handler: (_m, p) => ({
        action: 'custom_field_created',
        entity_type: 'custom_field', entity_id: null,
        description: `Campo personalizado criado: "${p.label ?? 'Novo campo'}" (tipo: ${p.type ?? '?'})`,
        details: { label: p.label, key: p.key, type: p.type, required: p.required ?? false },
      }),
    },

    // ── Settings — Ad accounts ─────────────────────────────────────────────────
    {
      re: /\/settings\/ad-accounts\/([^/]+)$/,
      method: 'DELETE',
      handler: (m) => ({
        action: 'ad_account_disconnected',
        entity_type: 'ad_account', entity_id: m[1],
        description: 'Conta de anúncios desconectada',
        details: {},
      }),
    },
    {
      re: /\/settings\/ad-accounts\/([^/]+)\/sync$/,
      method: 'POST',
      handler: (m) => ({
        action: 'ad_account_synced',
        entity_type: 'ad_account', entity_id: m[1],
        description: 'Conta de anúncios sincronizada',
        details: {},
      }),
    },
  ]

  const p = payload ?? {}
  for (const rule of rules) {
    if (rule.method !== method) continue
    const m = url?.match(rule.re)
    if (m) return rule.handler(m, p)
  }
  return null
}

// ─── Request interceptor — add request timestamp ──────────────────────────────
// Auth is handled via httpOnly cookies (withCredentials: true)

api.interceptors.request.use((config) => {
  config.headers['x-req-t0'] = String(Date.now())
  config.headers['x-retry-count'] = '0'
  // Generate a fresh correlationId per request unless the caller pinned one
  // (e.g. retries reuse the original). Server may echo or replace it.
  const existing = config.headers['x-correlation-id']
  if (!existing || (typeof existing === 'string' && !UUID_REGEX.test(existing))) {
    config.headers['x-correlation-id'] = newCorrelationId()
  }
  // Sprint 5.3 — em mobile, anexa Authorization Bearer com o token salvo em
  // auth-storage. Em web continua via cookies httpOnly (withCredentials).
  if (isNativePlatform()) {
    const token = getAccessToken()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

// Mesmo interceptor de Bearer no axios global. Varios contexts (InternalChat,
// useNotifications, hooks de paginas) usam `import axios from 'axios'` direto
// em vez do `api` instance. No web isso funciona via cookie, mas em mobile
// os requests saem sem Authorization e batem 401. Aqui aplicamos o token tanto
// no `api` (acima) quanto no axios global para cobrir os call-sites legados.
axios.interceptors.request.use((config) => {
  if (isNativePlatform()) {
    const token = getAccessToken()
    if (token && !config.headers?.['Authorization']) {
      config.headers = config.headers ?? {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

// ─── Retry interceptor — exponential backoff for transient failures ───────────
// Retries 5xx and network errors up to 2 times with 500ms, 1000ms delays.

const RETRY_MAX = 2
const RETRY_STATUS_CODES = new Set([502, 503, 504, 408, 429])

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config
  if (!config) return Promise.reject(error)

  const retryCount = parseInt(config.headers?.['x-retry-count'] ?? '0', 10)
  const status = error.response?.status

  // Only retry on transient errors (network failures or specific status codes)
  const isTransient = !status || RETRY_STATUS_CODES.has(status)
  if (!isTransient || retryCount >= RETRY_MAX) return Promise.reject(error)

  config.headers['x-retry-count'] = String(retryCount + 1)
  const delay = 500 * Math.pow(2, retryCount) // 500ms, 1000ms
  await new Promise((r) => setTimeout(r, delay))
  return api.request(config)
})

// ─── Response interceptor — log all write operations with semantic context ─────

api.interceptors.response.use(
  (res) => {
    // Capture correlationId echoed by the server (or from the request header
    // we sent if server didn't echo). Stored module-wide so consumers like
    // AuthContext can attach it to non-axios logs (login, logout).
    const responseCid = res.headers?.['x-correlation-id']
    const requestCid  = res.config.headers?.['x-correlation-id']
    const correlationId = (typeof responseCid === 'string' ? responseCid : null)
                       ?? (typeof requestCid  === 'string' ? requestCid  : null)
    if (correlationId) _lastCorrelationId = correlationId

    const method = (res.config.method ?? '').toUpperCase()
    if (!WRITE_METHODS.has(method)) return res

    const t0 = parseInt(res.config.headers?.['x-req-t0'] as string ?? '0', 10)
    const url = res.config.url ?? ''
    const payload = safeParseBody(res.config.data)
    const { userId, tenantId, actorName } = readSession()
    const source = _copilotTurnId ? 'copilot' : 'ui'
    const turnId = _copilotTurnId

    // 1. Raw HTTP audit (always)
    appLogger.logUserAction({
      tenant_id:   tenantId,
      user_id:     userId,
      turn_id:     turnId,
      source,
      method,
      endpoint:    url,
      payload,
      status_code: res.status,
      latency_ms:  t0 ? Date.now() - t0 : null,
      correlation_id: correlationId,
    })

    // 2. Field diff (entity_changelog)
    const entityMatch = url.match(/\/(contacts|conversations|campaigns|tags|automations|templates|agents)\/?([a-z0-9-]+)?/)
    if (entityMatch) {
      const entityType = entityMatch[1]
      const rawId      = entityMatch[2]
      const resolvedId = rawId ?? (res.data as Record<string, string> | undefined)?.id ?? null
      if (entityType && (resolvedId || method === 'POST')) {
        appLogger.logEntityChange({
          tenant_id:   tenantId,
          user_id:     userId,
          source,
          turn_id:     turnId,
          entity_type: entityType,
          entity_id:   resolvedId ?? '',
          operation:   methodToOperation(method),
          changes:     payload,
          correlation_id: correlationId,
        })
      }
    }

    // 3. Semantic activity log
    const semantic = resolveSemanticEvent(method, url, payload, res.data)
    if (semantic) {
      const entityName = semantic.entity_id
        ? (extractEntityName(res.data) ?? undefined)
        : (extractEntityName(res.data) ?? undefined)

      appLogger.logActivity({
        tenant_id:   tenantId,
        actor_id:    userId,
        actor_name:  actorName,
        action:      semantic.action,
        entity_type: semantic.entity_type,
        entity_id:   semantic.entity_id ?? (res.data as Record<string,unknown> | undefined)?.id as string ?? null,
        entity_name: entityName ?? null,
        description: semantic.description,
        details:     semantic.details,
        source,
        turn_id:     turnId,
        correlation_id: correlationId,
      })
    }

    return res
  },
  (err) => {
    const responseCid = err.response?.headers?.['x-correlation-id']
    const requestCid  = err.config?.headers?.['x-correlation-id']
    const correlationId = (typeof responseCid === 'string' ? responseCid : null)
                       ?? (typeof requestCid  === 'string' ? requestCid  : null)
    if (correlationId) _lastCorrelationId = correlationId

    const method = (err.config?.method ?? '').toUpperCase()
    if (WRITE_METHODS.has(method)) {
      const t0 = parseInt(err.config?.headers?.['x-req-t0'] as string ?? '0', 10)
      const { userId, tenantId } = readSession()
      appLogger.logUserAction({
        tenant_id:   tenantId,
        user_id:     userId,
        method,
        endpoint:    err.config?.url ?? '',
        payload:     safeParseBody(err.config?.data),
        status_code: err.response?.status ?? null,
        latency_ms:  t0 ? Date.now() - t0 : null,
        source:      _copilotTurnId ? 'copilot' : 'ui',
        turn_id:     _copilotTurnId,
        correlation_id: correlationId,
      })
    }
    // 401 handling lives in the refresh interceptor below — don't clear
    // the session here. Letting both interceptors fight over the same 401
    // is what made the app log everyone out every 15 minutes (the access
    // token TTL): this logging interceptor would redirect to /login before
    // the refresh interceptor (registered on `axios` global) could even
    // attempt to renew the cookie. Now there's a single owner for 401s.
    return Promise.reject(err)
  }
)

// ─── Refresh interceptor — try to refresh on 401 before giving up ────────────
// Registered on BOTH `api` and `axios` global because legacy call-sites
// (login, internal chat, push registration) use `import axios from 'axios'`
// directly and would otherwise bypass any interceptor we put only on `api`.
//
// Single shared `isRefreshing` guard so that 30 requests failing at once
// (typical when the access cookie expires mid-page-load) result in ONE
// /auth/refresh call, not 30.

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/activate']
const SESSION_KEY = 'oryon:session'

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/** Requests that carry this flag bypass the 401→refresh interceptor.
 *  Required on /auth/refresh itself — otherwise a dead refresh cookie
 *  re-enters the interceptor and deadlocks waiting on its own promise. */
export const SKIP_AUTH_REFRESH = { _skipAuthRefresh: true } as const

/** Exported so useSocket can renew the HTTP session before reconnecting
 *  the websocket after an `auth:expired` event. */
export async function attemptRefresh(): Promise<boolean> {
  try {
    if (isNativePlatform()) {
      const refreshToken = getRefreshToken()
      if (!refreshToken) return false
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${apiBaseUrl()}/auth/mobile-refresh`,
        { refreshToken },
        { withCredentials: false, ...SKIP_AUTH_REFRESH },
      )
      setTokens(res.data.accessToken, res.data.refreshToken)
      return true
    }
    // Web — refresh cookie is sent automatically (withCredentials).
    // Backend may echo back a fresh `user` payload; mirror it onto the
    // localStorage session so role/tenant changes propagate without a
    // full reload. The React side picks it up on next render via
    // loadSession() in AuthContext.
    const res = await axios.post<{ user?: Record<string, unknown> }>(
      `${apiBaseUrl()}/auth/refresh`,
      {},
      { withCredentials: true, ...SKIP_AUTH_REFRESH },
    )
    if (res.data?.user) {
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) {
          const s = JSON.parse(raw) as Record<string, unknown>
          s.user = res.data.user
          localStorage.setItem(SESSION_KEY, JSON.stringify(s))
        }
      } catch { /* ignore — corrupt session, will be cleared below if next req fails */ }
    }
    return true
  } catch {
    return false
  }
}

/** Exported so useSocket can force a re-login when the websocket's
 *  auth:expired can't be recovered by a session refresh. */
export function clearSessionAndRedirect() {
  localStorage.removeItem(SESSION_KEY)
  clearTokens()
  if (!PUBLIC_PATHS.includes(window.location.pathname)) {
    window.location.href = '/login'
  }
}

/** AxiosRequestConfig augmented with our retry-once marker. Stored on the
 *  config object itself so the same interceptor doesn't re-trigger when
 *  the retried request fails again with 401 (refresh truly failed). */
type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _skipAuthRefresh?: boolean
}

const AUTH_NO_REFRESH_RE = /\/auth\/(refresh|mobile-refresh|logout|login|mobile-login)(?:\/|$|\?)/

function isAuthNoRefreshRequest(config: RetryableRequestConfig): boolean {
  if (config._skipAuthRefresh) return true
  const url = config.url ?? ''
  return AUTH_NO_REFRESH_RE.test(url)
}

function makeRefreshInterceptor(client: typeof axios | typeof api) {
  return async (error: AxiosError) => {
    const original = error.config as RetryableRequestConfig | undefined
    if (error.response?.status !== 401 || !original) {
      return Promise.reject(error)
    }

    const hasSession = !!localStorage.getItem(SESSION_KEY)

    // Second 401 after a refresh retry, or an auth endpoint itself failed
    // (e.g. expired refresh cookie) — session is dead, send user to login.
    if (original._retry || isAuthNoRefreshRequest(original)) {
      if (hasSession) clearSessionAndRedirect()
      return Promise.reject(error)
    }

    // No session = public page (wrong password on /login, etc.) — don't redirect.
    if (!hasSession) {
      return Promise.reject(error)
    }

    original._retry = true

    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = attemptRefresh().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }
    const ok = await refreshPromise
    if (!ok) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    // Drop any stale Authorization header so the request interceptor
    // reapplies the freshly-rotated mobile token. On web the cookie is
    // already set by the refresh response.
    if (original.headers) delete original.headers.Authorization
    return client.request(original)
  }
}

api.interceptors.response.use(undefined, makeRefreshInterceptor(api))
axios.interceptors.response.use(undefined, makeRefreshInterceptor(axios))

export const conversationsApi = {
  list(filters: ConversationFilters = {}, page = 1, limit = 30) {
    return api.get<ConversationListResponse>('/conversations', {
      params: { ...filters, page, limit },
    })
  },

  get(id: string) {
    return api.get<Conversation>(`/conversations/${id}`)
  },

  updateStatus(id: string, status: 'resolved' | 'open' | 'pending') {
    return api.patch<Conversation>(`/conversations/${id}/status`, { status })
  },

  assign(id: string, userId: string | null) {
    return api.patch<Conversation>(`/conversations/${id}/assign`, { userId })
  },

  transfer(id: string, userId: string) {
    return api.patch<Conversation>(`/conversations/${id}/transfer`, { userId })
  },

  addTag(id: string, tagId: string) {
    return api.post<Conversation>(`/conversations/${id}/tags`, { tagId })
  },

  removeTag(id: string, tagId: string) {
    return api.delete<Conversation>(`/conversations/${id}/tags/${tagId}`)
  },

  archive(id: string) {
    return api.patch<Conversation>(`/conversations/${id}/status`, { status: 'abandoned' })
  },

  markAsRead(id: string) {
    return api.post(`/conversations/${id}/read`)
  },

  unreadTotal() {
    return api.get<{ totalUnread: number }>('/conversations/unread-total')
  },

  /**
   * Phase 27 — manual pause/resume of the WhatsApp AI agent for a
   * conversation. Pass `null` to resume immediately; pass a future ISO
   * timestamp to pause until that instant. The "indefinite" pause is
   * sent as the maximum supported timestamp by callers (see
   * INDEFINITE_PAUSE_ISO in the conversations UI).
   */
  setAiPause(id: string, pauseUntil: string | null) {
    return api.patch<Conversation>(`/conversations/${id}/ai-pause`, { pauseUntil })
  },
  /**
   * "Intervir agora" — pause the AI using the agent's configured handoff
   * window (Phase 34). The backend computes the duration from
   * ai_handoff_pause_minutes (agent → org → default), so the frontend no
   * longer hardcodes a value. Returns the conversation with the resolved
   * aiPausedUntil.
   */
  interveneAiDefault(id: string) {
    return api.patch<Conversation>(`/conversations/${id}/ai-pause`, { useDefaultDuration: true })
  },
  /**
   * Phase 34 — bust the backend's per-agent behavior cache after the Agent
   * Builder saves ai_handoff_pause_minutes / ai_inbound_debounce_seconds, so
   * the new value takes effect immediately (otherwise it lags up to 60s).
   */
  refreshAgentBehaviorCache(agentId: string) {
    return api.post(`/conversations/agent-behavior/${agentId}/refresh`)
  },
  /**
   * SCRUM-806 — "Marcar como verificada": reconhece a verificação pendente
   * (phantom-confirmation) da conversa. O badge da linha e a contagem do
   * cabeçalho limpam via socket (ai-pause-updated com hasRecentAnomaly:false).
   * Semântica de timestamp, não dismiss permanente: uma NOVA anomalia depois
   * disto volta a sinalizar a conversa.
   */
  resolveReview(id: string) {
    return api.post<Conversation>(`/conversations/${id}/review/resolve`)
  },
}

export const messagesApi = {
  list(conversationId: string, page = 1, limit = 50) {
    return api.get<PaginatedResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      { params: { page, limit } }
    )
  },

  send(conversationId: string, dto: SendMessageDto) {
    if (dto.file) {
      const formData = new FormData()
      formData.append('file', dto.file)
      if (dto.body) formData.append('body', dto.body)
      if (dto.mediaCaption) formData.append('mediaCaption', dto.mediaCaption)
      if (dto.replyToWamid) formData.append('replyToWamid', dto.replyToWamid)

      return api.post<Message>(`/conversations/${conversationId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }

    return api.post<Message>(`/conversations/${conversationId}/messages`, dto)
  },
}

export const tagsApi = {
  async list() {
    const res = await api.get<{ data: Tag[] } | Tag[]>('/tags')
    // Support both paginated { data } and legacy array responses
    return { ...res, data: Array.isArray(res.data) ? res.data : res.data.data }
  },
  create(name: string, color: string) {
    return api.post<Tag>('/tags', { name, color })
  },
  update(id: string, patch: Partial<Tag>) {
    return api.patch<Tag>(`/tags/${id}`, patch)
  },
  delete(id: string) {
    return api.delete(`/tags/${id}`)
  },
}

export const usersApi = {
  list() {
    return api.get<User[]>('/users')
  },
}

export const contactsApi = {
  list(filters: ContactFilters = {}, page = 1, limit = 50) {
    return api.get<PaginatedResponse<Contact>>('/contacts', {
      params: { ...filters, page, limit },
    })
  },

  get(id: string) {
    return api.get<Contact>(`/contacts/${id}`)
  },

  update(id: string, patch: Partial<Contact> & { addTagIds?: string[]; removeTagIds?: string[] }) {
    // Whitelist fields accepted by backend UpdateContactDto — prevents
    // "property X should not exist" validation errors when the caller
    // passes through read-only fields (id, tenantId, waId, createdAt, etc.)
    const ALLOWED_FIELDS = [
      'displayName', 'email', 'phone', 'company', 'jobTitle', 'industry',
      'city', 'state', 'country', 'stage', 'leadScore', 'intent', 'source', 'optIn',
      'aiSummary', 'aiSentiment', 'aiPainPoints', 'aiInterests', 'aiObjections',
      'aiNextBestAction', 'aiLastInteractionSummary', 'addTagIds', 'removeTagIds',
    ] as const
    const body: Record<string, unknown> = {}
    const src = patch as Record<string, unknown>
    for (const key of ALLOWED_FIELDS) {
      if (key in src) body[key] = src[key]
    }
    return api.patch<Contact>(`/contacts/${id}`, body)
  },

  updateCustomFields(id: string, fields: Array<{ key: string; value: string }>) {
    return api.patch<Contact>(`/contacts/${id}/custom-fields`, { fields })
  },

  bulkUpdateStage(ids: string[], stage: string) {
    return api.patch<{ updated: number }>('/contacts/bulk/stage', { ids, stage })
  },

  bulkDelete(ids: string[]) {
    return api.post<{ deleted: number }>('/contacts/bulk/delete', { ids })
  },

  bulkUpdateTags(ids: string[], patch: { addTagIds?: string[]; removeTagIds?: string[] }) {
    return api.patch<{ updated: number; added: number; removed: number }>(
      '/contacts/bulk/tags',
      { ids, ...patch },
    )
  },

  bulkSetOptIn(ids: string[], optIn: boolean) {
    return api.patch<{ updated: number }>('/contacts/bulk/opt-in', { ids, optIn })
  },

  delete(id: string) {
    return api.delete(`/contacts/${id}`)
  },

  create(dto: Partial<Contact> & { displayName: string; waId: string }) {
    // Map frontend fields to backend DTO fields
    const { tags, customFields, ...rest } = dto as Record<string, unknown>
    const payload = {
      ...rest,
      tagIds: Array.isArray(tags) ? (tags as Array<{ id: string }>).map((t) => t.id) : undefined,
    }
    return api.post<Contact>('/contacts', payload)
  },

  /** Pre-check whether a contact with this phone (digits) already exists.
   *  Returns the contact (frontend shape) or null. Used by the "add shared
   *  WhatsApp contact" flow to offer "open contact" instead of a duplicate. */
  lookup(phone: string) {
    return api.get<Contact | null>('/contacts/lookup', { params: { phone } })
  },

  getHistory(id: string, page = 1, limit = 30) {
    return api.get<PaginatedResponse<ContactHistoryEvent>>(`/contacts/${id}/history`, {
      params: { page, limit },
    })
  },

  getConversations(id: string) {
    return api.get<PaginatedResponse<Conversation>>(`/contacts/${id}/conversations`)
  },

  generateAiProfile(id: string) {
    return api.post<{
      contact: Contact
      suggestions: {
        qualification: Record<string, unknown>
        info: Record<string, string>
        customFields: Record<string, string>
      } | null
      meta: {
        stages: Array<{ key: string; label: string }>
        customFieldDefs: Array<{ key: string; label: string; type: string; options?: string[] }>
      } | null
    }>(`/contacts/${id}/ai-profile`)
  },

  applyAiSuggestions(id: string, approved: {
    qualification?: Record<string, unknown>
    info?: Record<string, string>
    customFields?: Record<string, string>
  }) {
    return api.post<Contact>(`/contacts/${id}/ai-profile/apply`, approved)
  },

  getStats(id: string) {
    return api.get<{
      conversations: { total: number; byStatus: Record<string, number> }
      messages: { totalInbound: number; totalOutbound: number; total: number; readCount: number; failedCount: number; byType: Record<string, number> }
      avgResponseTimeSeconds: number | null
      lastAnalysis: {
        outcome: string; confidence: number; sentiment: string
        keyTopics: string[]; conversionSignals: string[]
        status: string; dealValue: number | null
        analyzedAt: string; confirmedAt: string | null
      } | null
      assignedTo: string | null
    }>(`/contacts/${id}/stats`)
  },

  sendTemplate(id: string, templateName: string, language: string) {
    return api.post<{ conversationId: string; messageId: string }>(`/contacts/${id}/send-template`, { templateName, language })
  },

  async getCustomFieldDefs() {
    const res = await api.get<{ data: ContactCustomFieldDef[] } | ContactCustomFieldDef[]>('/settings/custom-fields')
    return { ...res, data: Array.isArray(res.data) ? res.data : res.data.data }
  },
}

export const stagesApi = {
  async list() {
    const res = await api.get<{ data: TenantStage[] } | TenantStage[]>('/settings/stages')
    return { ...res, data: Array.isArray(res.data) ? res.data : res.data.data }
  },
  create(dto: { label: string; color: string; isTerminal?: boolean; key?: string }) {
    return api.post<TenantStage>('/settings/stages', dto)
  },
  update(id: string, patch: Partial<TenantStage>) {
    return api.patch<TenantStage>(`/settings/stages/${id}`, patch)
  },
  delete(id: string) {
    return api.delete(`/settings/stages/${id}`)
  },
  reorder(ids: string[]) {
    return api.patch<TenantStage[]>('/settings/stages/reorder', { ids })
  },
}

export const customFieldsApi = {
  async list() {
    const res = await api.get<{ data: ContactCustomFieldDef[] } | ContactCustomFieldDef[]>('/settings/custom-fields')
    return { ...res, data: Array.isArray(res.data) ? res.data : res.data.data }
  },
  create(dto: Omit<ContactCustomFieldDef, 'order'> & { key?: string }) {
    return api.post<ContactCustomFieldDef>('/settings/custom-fields', dto)
  },
  update(key: string, patch: Partial<ContactCustomFieldDef>) {
    return api.patch<ContactCustomFieldDef>(`/settings/custom-fields/${key}`, patch)
  },
  delete(key: string) {
    return api.delete(`/settings/custom-fields/${key}`)
  },
}

/** Resposta paginada de /products (backend SCRUM-133): página de itens + metadados. */
interface PaginatedProducts {
  data: Product[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export const productsApi = {
  // O catálogo é a fonte única de preços (UI + IA), então a lista não pode truncar nos 50 do
  // backend: paginamos por trás e juntamos TODAS as páginas. Na maioria dos tenants é 1 request.
  async list() {
    const limit = 100
    const all: Product[] = []
    let res = await api.get<PaginatedProducts | Product[]>(`/products?page=1&limit=${limit}`)
    for (let page = 1; ; page++) {
      const body = res.data
      if (Array.isArray(body)) return { ...res, data: body } // compat: backend sem paginação
      all.push(...body.data)
      if (!body.hasMore || page >= 100) break
      res = await api.get<PaginatedProducts | Product[]>(`/products?page=${page + 1}&limit=${limit}`)
    }
    return { ...res, data: all }
  },
  get(id: string) {
    return api.get<Product>(`/products/${id}`)
  },
  create(dto: Partial<Product>) {
    return api.post<Product>('/products', dto)
  },
  update(id: string, patch: Partial<Product>) {
    return api.patch<Product>(`/products/${id}`, patch)
  },
  remove(id: string) {
    return api.delete(`/products/${id}`)
  },
}

/** Catálogo por agente (SCRUM-221): quais produtos do tenant um agente de IA pode usar. */
export const agentCatalogApi = {
  get(agentId: string) {
    return api.get<Product[]>(`/agent-catalog/${agentId}`)
  },
  set(agentId: string, productIds: string[]) {
    return api.put<Product[]>(`/agent-catalog/${agentId}`, { productIds })
  },
}

/** Resposta paginada de /practitioners — mesmo shape de PaginatedProducts. */
interface PaginatedPractitioners {
  data: Practitioner[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export const practitionersApi = {
  // Mesmo motivo de productsApi.list: o registro é a fonte única pro portão
  // de médico (UI + IA), então junta todas as páginas por trás.
  async list() {
    const limit = 100
    const all: Practitioner[] = []
    let res = await api.get<PaginatedPractitioners | Practitioner[]>(`/practitioners?page=1&limit=${limit}`)
    for (let page = 1; ; page++) {
      const body = res.data
      if (Array.isArray(body)) return { ...res, data: body } // compat: backend sem paginação
      all.push(...body.data)
      if (!body.hasMore || page >= 100) break
      res = await api.get<PaginatedPractitioners | Practitioner[]>(`/practitioners?page=${page + 1}&limit=${limit}`)
    }
    return { ...res, data: all }
  },
  get(id: string) {
    return api.get<Practitioner>(`/practitioners/${id}`)
  },
  create(dto: Partial<Practitioner>) {
    return api.post<Practitioner>('/practitioners', dto)
  },
  update(id: string, patch: Partial<Practitioner>) {
    return api.patch<Practitioner>(`/practitioners/${id}`, patch)
  },
  remove(id: string) {
    return api.delete(`/practitioners/${id}`)
  },
}

/** Pipelines de negócio (múltiplos pipelines, Fase 2). Lista já vem com os estágios embutidos. */
export const pipelinesApi = {
  list() {
    return api.get<Pipeline[]>('/settings/pipelines')
  },
  create(dto: { name: string; description?: string; color?: string }) {
    return api.post<Pipeline>('/settings/pipelines', dto)
  },
  update(id: string, dto: { name?: string; description?: string; color?: string; isArchived?: boolean }) {
    return api.patch<Pipeline>(`/settings/pipelines/${id}`, dto)
  },
  remove(id: string) {
    return api.delete(`/settings/pipelines/${id}`)
  },
  setDefault(id: string) {
    return api.patch<Pipeline>(`/settings/pipelines/${id}/default`)
  },
  createStage(pipelineId: string, dto: { label: string; key?: string; color?: string; isWon?: boolean; isLost?: boolean }) {
    return api.post<PipelineStage>(`/settings/pipelines/${pipelineId}/stages`, dto)
  },
  listStages(pipelineId: string) {
    return api.get<PipelineStage[]>(`/settings/pipelines/${pipelineId}/stages`)
  },
  updateStage(pipelineId: string, id: string, dto: { label?: string; color?: string; isWon?: boolean; isLost?: boolean }) {
    return api.patch<PipelineStage>(`/settings/pipelines/${pipelineId}/stages/${id}`, dto)
  },
  removeStage(pipelineId: string, id: string) {
    return api.delete(`/settings/pipelines/${pipelineId}/stages/${id}`)
  },
  reorderStages(pipelineId: string, ids: string[]) {
    return api.patch<PipelineStage[]>(`/settings/pipelines/${pipelineId}/stages/reorder`, { ids })
  },
}

/** Roteamento por canal (Fase 4): linha WhatsApp → pipeline. Leitura livre, escrita admin. */
export const pipelineRoutingApi = {
  list() {
    return api.get<PipelineChannelRouting[]>('/settings/pipeline-routing')
  },
  upsert(whatsappNumberId: string, dto: Partial<Omit<PipelineChannelRouting, 'id' | 'tenantId' | 'whatsappNumberId'>>) {
    return api.put<PipelineChannelRouting>(`/settings/pipeline-routing/${whatsappNumberId}`, dto)
  },
  remove(whatsappNumberId: string) {
    return api.delete(`/settings/pipeline-routing/${whatsappNumberId}`)
  },
}

export const dealsApi = {
  list(contactId: string) {
    return api.get<Deal[]>('/deals', { params: { contactId } })
  },
  /** Negócios de um pipeline (board). Um card por deal; agrupar por stageId no cliente. */
  /** `filters` espelha o card de filtros da tabela de Contatos (busca, fonte,
   *  etiqueta, intenção, sentimento, opt-in) — agora também filtra o board de
   *  qualquer funil, não só a tabela. */
  board(pipelineId: string, filters?: Pick<ContactFilters, 'search' | 'intent' | 'sentiment' | 'source' | 'tagId' | 'optIn'>) {
    return api.get<Deal[]>('/deals', { params: { pipelineId, ...filters } })
  },
  /** Move o negócio para um estágio do seu pipeline (deriva status no backend). */
  moveStage(id: string, stageId: string) {
    return api.patch<Deal>(`/deals/${id}/stage`, { stageId })
  },
  /** Move o negócio ABERTO pra outro funil — nasce lá no 1º estágio não-terminal.
   *  409 se o contato já tem um negócio aberto no funil de destino. */
  movePipeline(id: string, pipelineId: string) {
    return api.patch<Deal>(`/deals/${id}/pipeline`, { pipelineId })
  },
  get(id: string) {
    return api.get<Deal>(`/deals/${id}`)
  },
  create(dto: Partial<Deal>) {
    return api.post<Deal>('/deals', dto)
  },
  update(id: string, patch: Partial<Deal>) {
    return api.patch<Deal>(`/deals/${id}`, patch)
  },
  setStatus(id: string, body: { status: DealStatus; moveContactToStageKey?: string }) {
    return api.patch<Deal>(`/deals/${id}/status`, body)
  },
  /** Agregados por contato (batch), p/ o card do Kanban. Só retorna contatos que têm negócios. */
  summary(contactIds: string[]) {
    return api.get<(ContactDealsSummary & { contactId: string })[]>('/deals/summary', {
      params: { contactIds: contactIds.join(',') },
    })
  },
  remove(id: string) {
    return api.delete(`/deals/${id}`)
  },
}

export const onboardingApi = {
  complete() {
    return api.post<{ success: boolean }>('/onboarding/complete')
  },
}

export type MetaTemplateListResponse = {
  ok: boolean
  templates: Array<{
    metaId: string
    name: string
    language: string
    status: string
    category: string
    rejectionReason?: string
    whatsappNumberId: string
  }>
  error?: string
}

export type PullTemplatesFromMetaResponse = {
  metaFetched: number
  imported: number
  updated: number
  errors: string[]
}

type WhatsAppTemplateCreate = Omit<
  WhatsAppTemplate,
  'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt' | 'headerType'
> & { headerType?: TemplateHeaderTypeInput }

type WhatsAppTemplateUpdate = Partial<Omit<WhatsAppTemplate, 'headerType'>> & {
  headerType?: TemplateHeaderTypeInput
}

export const templatesApi = {
  list(status?: string) {
    return api.get<WhatsAppTemplate[]>('/templates', { params: status ? { status } : {} })
  },
  /** Read-only probe — lists templates as Meta returns them. */
  listFromMeta(whatsappNumberId?: string) {
    return api.get<MetaTemplateListResponse>('/templates/from-meta', {
      params: whatsappNumberId ? { whatsappNumberId } : {},
    })
  },
  /** Import missing rows and refresh statuses from Meta. */
  pullFromMeta() {
    return api.post<PullTemplatesFromMetaResponse>('/templates/pull-from-meta')
  },
  /** Best-effort sync before listing — never throws. */
  async ensureFromMeta() {
    try {
      await templatesApi.pullFromMeta()
    } catch {
      /* local list still works */
    }
  },
  create(dto: WhatsAppTemplateCreate) {
    return api.post<WhatsAppTemplate>('/templates', dto)
  },
  update(id: string, patch: WhatsAppTemplateUpdate) {
    return api.patch<WhatsAppTemplate>(`/templates/${id}`, patch)
  },
  delete(id: string) {
    return api.delete(`/templates/${id}`)
  },
  sync() {
    return api.post<{ synced: number; updated: number; imported?: number }>('/templates/sync')
  },
  // Clone this template onto another WhatsApp line — the cloned copy
  // enters PENDING and gets submitted to the target line's WABA for
  // approval. Optional `newName` overrides the auto-generated suffix.
  duplicateToLine(id: string, whatsappNumberId: string, newName?: string) {
    return api.post<WhatsAppTemplate>(`/templates/${id}/duplicate-to-line`, {
      whatsappNumberId,
      ...(newName ? { newName } : {}),
    })
  },
}

export const campaignsApi = {
  list(status?: string) {
    return api.get<{ data: Campaign[] } | Campaign[]>('/campaigns', { params: status ? { status } : {} })
      .then((r) => {
        // Backend returns {data, total, page, limit} — extract array for backward compat
        const body = r.data
        return { ...r, data: Array.isArray(body) ? body : (body as { data: Campaign[] }).data ?? [] }
      })
  },
  create(dto: {
    name: string
    templateId: string
    segment: CampaignSegment
    variableMappings: CampaignVariableMapping[]
    scheduledAt?: string
  }) {
    return api.post<Campaign>('/campaigns', dto)
  },
  countSegment(segment: CampaignSegment) {
    return api.post<{ count: number }>('/campaigns/segment-count', { segment })
  },
  previewSegment(segment: CampaignSegment, page = 1, limit = 50) {
    return api.post<{
      data: Array<{ id: string; displayName: string; waId: string; stage: string | null }>
      total: number
      page: number
      limit: number
    }>('/campaigns/segment-preview', { segment, page, limit })
  },
  update(id: string, patch: Partial<Campaign>) {
    return api.patch<Campaign>(`/campaigns/${id}`, patch)
  },
  send(id: string) {
    return api.post<Campaign>(`/campaigns/${id}/send`)
  },
  delete(id: string) {
    return api.delete(`/campaigns/${id}`)
  },
  getAnalytics(id: string) {
    return api.get<import('@/types').CampaignAnalytics>(`/campaigns/${id}/analytics`)
  },
  getConversations(id: string) {
    return api.get<import('@/types').CampaignConversationSummary[]>(`/campaigns/${id}/conversations`)
  },
}

export const activityApi = {
  getFeed(params: { limit?: number; since?: string; type?: string } = {}) {
    return api.get<{ total: number; data: unknown[]; generatedAt: string }>('/activity-feed', { params })
  },
}

export const homeApi = {
  getStats: () => api.get<HomeStats>('/home/stats'),
}

// ── Ad Accounts & Attribution ─────────────────────────────────────────────────

export const adAccountsApi = {
  list() {
    return api.get<AdAccount[]>('/settings/ad-accounts')
  },
  connectMeta(dto: { accessToken: string; accountId: string }) {
    return api.post<AdAccount>('/settings/ad-accounts/meta', dto)
  },
  disconnect(id: string) {
    return api.delete(`/settings/ad-accounts/${id}`)
  },
  sync(id: string) {
    return api.post<{ syncedAt: string }>(`/settings/ad-accounts/${id}/sync`)
  },
  getCampaigns(accountId: string) {
    return api.get<AdCampaignMetrics[]>(`/settings/ad-accounts/${accountId}/campaigns`)
  },
}

export const automationsApi = {
  list(status?: AutomationStatus) {
    return api.get<Automation[]>('/automations', { params: status ? { status } : {} })
  },
  create(dto: Omit<Automation, 'id' | 'tenantId' | 'executionCount' | 'lastExecutedAt' | 'createdAt' | 'updatedAt'>) {
    return api.post<Automation>('/automations', dto)
  },
  update(id: string, patch: Partial<Automation>) {
    return api.patch<Automation>(`/automations/${id}`, patch)
  },
  toggle(id: string) {
    return api.patch<Automation>(`/automations/${id}/toggle`)
  },
  delete(id: string) {
    return api.delete(`/automations/${id}`)
  },
  // Histórico de execuções de UMA automação — GET /automations/:id/runs
  // (ADMIN/BUSINESS_ADMIN, os mesmos papéis que veem a lista). Paginação por
  // cursor via `before`; `failedOnly` filtra só incidentes. O backend já grava
  // tudo isto (Phase B.2) — aqui apenas passamos a consumir.
  runs(id: string, query: { before?: string; failedOnly?: boolean; limit?: number } = {}) {
    return api.get<{ data: AutomationRun[]; nextCursor: string | null }>(
      `/automations/${id}/runs`,
      { params: query },
    )
  },
}

export const adSetsApi = {
  list(campaignId: string) {
    return api.get<AdSetMetrics[]>(`/analytics/campaigns/${campaignId}/ad-sets`)
  },
  getCreatives(adSetId: string) {
    return api.get<AdCreativeMetrics[]>(`/analytics/ad-sets/${adSetId}/creatives`)
  },
}

export const attributionApi = {
  getMarketingFunnel(params: { range: string; platform?: AdPlatform }) {
    return api.get<{ funnel: AdCampaignMetrics[]; totals: MarketingFunnelTotals }>(
      '/analytics/marketing-funnel',
      { params }
    )
  },
  getContactAttribution(contactId: string) {
    return api.get<{
      metaAdsReferral?: MetaAdsReferral
      touchpoints: AdAttributionTouchpoint[]
    }>(`/contacts/${contactId}/attribution`)
  },
  getLeadsOverTime(params: { range: string; platform?: AdPlatform }) {
    return api.get<Array<{ date: string; meta: number; google: number }>>(
      '/analytics/ad-leads-over-time',
      { params }
    )
  },
  getPerformanceOverTime(params: { range: string; platform?: AdPlatform }) {
    return api.get<Array<{
      date: string
      meta_spend: number
      meta_leads: number
    }>>('/analytics/performance-over-time', { params })
  },
  getCampaignLeads(campaignId: string) {
    return api.get<import('@/types').CampaignLeadSummary[]>(`/analytics/campaigns/${campaignId}/leads`)
  },
}

export const conversionApi = {
  getAnalysis(conversationId: string) {
    return api.get<ConversationAnalysisResult>(`/conversations/${conversationId}/analysis`)
  },
  triggerAnalysis(conversationId: string) {
    return api.post<ConversationAnalysisResult>(`/conversations/${conversationId}/analyze`)
  },
  confirmAnalysis(
    conversationId: string,
    dto: { status: 'confirmed' | 'rejected'; dealValue?: number; stageKey?: string }
  ) {
    return api.patch<ConversationAnalysisResult>(
      `/conversations/${conversationId}/analysis/confirm`,
      dto
    )
  },
  getCapiEvents() {
    return api.get<MetaCapiEvent[]>('/analytics/capi-events')
  },
  sendCapiEvent(dto: { contactId: string; conversationId: string; value?: number }) {
    return api.post<MetaCapiEvent>('/analytics/capi-events', dto)
  },
}

export const departmentsApi = {
  async list() {
    const res = await api.get<{ data: Department[] } | Department[]>('/departments')
    return { ...res, data: Array.isArray(res.data) ? res.data : res.data.data }
  },
  get(id: string) { return api.get<Department>(`/departments/${id}`) },
  create(data: Partial<Department>) { return api.post<Department>('/departments', data) },
  update(id: string, data: Partial<Department>) { return api.patch<Department>(`/departments/${id}`, data) },
  remove(id: string) { return api.delete(`/departments/${id}`) },
}

export const whatsappNumbersApi = {
  list() { return api.get<WhatsAppNumber[]>('/meta/numbers') },
  update(id: string, data: { label?: string }) { return api.patch<WhatsAppNumber>(`/meta/numbers/${id}`, data) },
  // Desconectar (soft) — pausa o atendimento, mantém a row e permite
  // reconectar pelo OAuth ressuscitando o mesmo registro.
  remove(id: string) { return api.delete(`/meta/numbers/${id}`) },
  // Excluir permanentemente — vira tombstone no backend e libera o slot
  // para reconexão limpa do mesmo phoneNumberId. Bloqueia (HTTP 409) se
  // ainda houver templates / campanhas / automações / setores vinculados.
  permanentDelete(id: string) { return api.delete(`/meta/numbers/${id}/permanent`) },

  // Admin-only: aggregated health view of every line + orphan counts.
  health() { return api.get<WhatsappLinesHealth>('/meta/health') },
  // Admin-only: promote one line to primary (clears the others atomically).
  setPrimary(id: string) { return api.patch<{ id: string; isPrimary: boolean; displayPhoneNumber: string; label?: string | null }>(`/meta/numbers/${id}/primary`, {}) },
  // Pre-flight before showing a delete confirmation — surfaces how many
  // resources would be orphaned by the removal.
  dependencies(id: string) { return api.get<WhatsappLineDependencies>(`/meta/numbers/${id}/dependencies`) },
  resubscribeWaba(wabaId: string) { return api.post<{ message: string }>(`/meta/waba/${wabaId}/resubscribe`) },
}

export interface WhatsappLineHealth {
  id: string
  displayPhoneNumber: string
  label: string | null
  verifiedName: string | null
  status: string
  qualityRating: string
  isActive: boolean
  isPrimary: boolean
  hasSystemUserToken: boolean
  agentId: string | null
  wabaId: string | null
  wabaName: string | null
  departments: Array<{ id: string; name: string; color: string }>
  templates: { total: number; approved: number; pending: number; rejected: number; needsAssignment: number }
  campaigns: { total: number; draft: number; scheduled: number; sending: number; sent: number; needsAssignment: number }
  automations: { total: number; active: number; inactive: number; draft: number; needsAssignment: number }
}

export interface WhatsappLinesHealth {
  lines: WhatsappLineHealth[]
  orphans: { templates: number; campaigns: number; automations: number }
}

export interface WhatsappLineDependencies {
  templates: number
  templatesApproved: number
  campaigns: number
  campaignsScheduled: number
  automations: number
  automationsActive: number
  departments: Array<{ id: string; name: string; color: string }>
}

export const cannedResponsesApi = {
  async fetchAll(): Promise<CannedResponse[]> {
    const limit = 100
    let page = 1
    const all: CannedResponse[] = []
    while (true) {
      const { data } = await api.get<{ data: CannedResponse[]; hasMore: boolean } | CannedResponse[]>(
        `/canned-responses?page=${page}&limit=${limit}`,
      )
      const items = Array.isArray(data) ? data : data.data
      all.push(...items)
      const hasMore = !Array.isArray(data) && data.hasMore
      if (!hasMore) break
      page++
    }
    return all
  },
}

/** Short-lived JWT for static /uploads (same as ws-token); cached ~3m server-side TTL. */
let _uploadsAuthTokenCache: { token: string; expiresAt: number } | null = null
const UPLOADS_AUTH_TOKEN_TTL_MS = 170_000

export async function getUploadsAuthToken(): Promise<string> {
  const skew = 5000
  if (_uploadsAuthTokenCache && Date.now() < _uploadsAuthTokenCache.expiresAt - skew) {
    return _uploadsAuthTokenCache.token
  }
  const { data } = await api.get<{ token: string }>('/auth/ws-token')
  _uploadsAuthTokenCache = {
    token: data.token,
    expiresAt: Date.now() + UPLOADS_AUTH_TOKEN_TTL_MS,
  }
  return data.token
}

export default api
