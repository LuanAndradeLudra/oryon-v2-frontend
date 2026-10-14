/**
 * Frontend adapter that streams Copilot responses from the Agent Server (Servidor 2).
 * Connects via SSE to POST /agents/copilot/stream.
 */

import axios from 'axios'
import { CopilotBlockedError, type CopilotBlockKind } from '@/lib/copilotBlock'
import type { CopilotAttachment, CopilotMessage } from '@/contexts/CopilotContext'
import type { TaskPlan, PlanStepStatus } from '@/types/agent-events'

const AGENT_SERVER_URL = import.meta.env.VITE_AGENT_SERVER_URL as string | undefined
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/** Get a short-lived Bearer token from the backend (which accepts httpOnly cookies) for agent-server calls */
const WS_TOKEN_CLIENT_TTL_MS = 170_000 // slightly under backend `signShortLivedToken` (3m) so we refresh before expiry

let _agentTokenCache: { token: string; expiresAt: number } | null = null
async function getAgentToken(): Promise<string> {
  if (_agentTokenCache && Date.now() < _agentTokenCache.expiresAt - 5000) {
    return _agentTokenCache.token
  }
  const res = await axios.get<{ token: string }>(`${API_URL}/auth/ws-token`, { withCredentials: true })
  _agentTokenCache = { token: res.data.token, expiresAt: Date.now() + WS_TOKEN_CLIENT_TTL_MS }
  return res.data.token
}

/**
 * Small auth helper used by approval preview components that need to read
 * agent-server state directly (e.g. replace_* previews fetching the current
 * system prompt to show a match count). Throws if VITE_AGENT_SERVER_URL isn't
 * set — callers should handle the rejection gracefully (no hint shown).
 */
export async function getAgentServerAuth(): Promise<{ token: string; baseUrl: string }> {
  if (!AGENT_SERVER_URL) throw new Error('VITE_AGENT_SERVER_URL is not set')
  const token = await getAgentToken()
  return { token, baseUrl: AGENT_SERVER_URL }
}

export type AgentSSEEvent =
  | { type: 'token'; text: string; agentId: string }
  | { type: 'tool_call'; name: string; input: unknown; agentId: string }
  | { type: 'tool_result'; name: string; input: unknown; result: unknown; agentId: string }
  | { type: 'agent_start'; agentId: string; intent: string }
  | { type: 'agent_done'; agentId: string; tokensUsed: number }
  | { type: 'approval_request'; batchId: string; turnId: string; items: Array<{ id: string; name: string; input: unknown }>; expiresAt?: number }
  | { type: 'setup_required'; reason: string; message: string; cta: { href: string; label: string } }
  | { type: 'plan_created'; plan: TaskPlan }
  | { type: 'plan_step_update'; stepId: string; status: PlanStepStatus; result?: string; error?: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'done' }

export interface CopilotStreamCallbacks {
  onToolCall: (name: string, input: unknown) => void
  onToolResult: (name: string, input: unknown, result: unknown) => void
  onAgentStart?: (agentId: string, intent: string) => void
  onAgentDone?: (agentId: string, tokensUsed: number) => void
  onApprovalRequest?: (batchId: string, turnId: string, items: Array<{ id: string; name: string; input: unknown }>, expiresAt?: number) => void
  onSetupRequired?: (reason: string, message: string, cta: { href: string; label: string }) => void
  onPlanCreated?: (plan: TaskPlan) => void
  onPlanStepUpdate?: (update: { stepId: string; status: PlanStepStatus; result?: string; error?: string }) => void
}

export async function* runCopilotTurnBackend(
  userMessage: string,
  history: CopilotMessage[],
  pageContext: { currentPage: string },
  callbacks: CopilotStreamCallbacks,
  signal?: AbortSignal,
  attachments?: CopilotAttachment[],
  turnId?: string,
  sessionId?: string,
): AsyncGenerator<string> {
  const baseUrl = AGENT_SERVER_URL
  if (!baseUrl) throw new Error('VITE_AGENT_SERVER_URL is not set')

  const agentToken = await getAgentToken()
  const response = await fetch(`${baseUrl}/agents/copilot/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`,
    },
    signal,
    body: JSON.stringify({
      userMessage,
      history: history.map((m) => ({ role: m.role, content: m.content, toolCalls: m.toolCalls })),
      pageContext,
      attachments: attachments?.length ? attachments : undefined,
      turnId,
      sessionId,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    // 402 e bloqueio de cobranca, e desde a SCRUM-804 vem com a causa tipada no
    // corpo. Erro proprio para a UI ramificar por classe em vez de adivinhar
    // pela mensagem — que era o que fazia contrato vencido virar "sem credito".
    if (response.status === 402) {
      let parsed: { error?: string; kind?: CopilotBlockKind; reason?: string; code?: string } = {}
      try { parsed = JSON.parse(body) } catch { /* agent antigo: corpo nao-JSON */ }
      // SCRUM-1210: o agent manda o motivo em `code` (desde a mudança da 7.3.2).
      throw new CopilotBlockedError(parsed.error ?? '', parsed.kind, parsed.reason ?? parsed.code)
    }
    throw erroDoAgente(response.status, body)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body from Agent Server')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''

      for (const chunk of chunks) {
        const line = chunk.trim()
        if (!line.startsWith('data: ')) continue
        let event: AgentSSEEvent
        try { event = JSON.parse(line.slice(6)) } catch { continue }

        switch (event.type) {
          case 'token':
            yield event.text
            break
          case 'tool_call':
            callbacks.onToolCall(event.name, event.input)
            break
          case 'tool_result':
            callbacks.onToolResult(event.name, event.input, event.result)
            break
          case 'agent_start':
            callbacks.onAgentStart?.(event.agentId, event.intent)
            break
          case 'agent_done':
            callbacks.onAgentDone?.(event.agentId, event.tokensUsed)
            break
          case 'approval_request':
            callbacks.onApprovalRequest?.(event.batchId, event.turnId, event.items, event.expiresAt)
            break
          case 'setup_required':
            callbacks.onSetupRequired?.(event.reason, event.message, event.cta)
            break
          case 'plan_created':
            callbacks.onPlanCreated?.(event.plan)
            break
          case 'plan_step_update':
            callbacks.onPlanStepUpdate?.({ stepId: event.stepId, status: event.status, result: event.result, error: event.error })
            break
          case 'error':
            throw new Error(event.message)
          case 'done':
            return
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Send approval decision back to Agent Server.
 * Called when user approves/denies write operations in the UI.
 */
export async function sendApprovalDecision(
  turnId: string,
  batchId: string,
  approvedItemIds: string[],
  editedInputs?: Record<string, Record<string, unknown>>,
): Promise<void> {
  const baseUrl = AGENT_SERVER_URL
  if (!baseUrl) return

  const agentToken = await getAgentToken()
  const res = await fetch(`${baseUrl}/agents/copilot/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${agentToken}`,
    },
    body: JSON.stringify({ turnId, batchId, approvedItemIds, editedInputs }),
  })
  // `fetch` only rejects on network failure — HTTP 4xx/5xx resolves, so we
  // have to turn non-2xx into a throw ourselves. Without this, the previous
  // `.catch(() => {})` in useCopilot silently swallowed every server-side
  // rejection (expired turn, tenant mismatch, template collision) and the
  // operator never saw the error.
  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as { message?: string | string[]; error?: string }
      detail = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? body?.error ?? '')
    } catch {
      detail = await res.text().catch(() => '')
    }
    // 404 is a UX-friendly failure: the approval window expired (auto-deny
    // fired) OR the turn stream already closed. Either way there is no
    // live gate waiting for this POST. Surface a human message so the
    // operator knows to just ask the copilot to retry instead of staring
    // at "HTTP 404 Turn not found or already completed".
    if (res.status === 404) {
      throw new Error(
        'Esta aprovação expirou — o tempo de revisão ou a sessão terminaram. Peça ao copiloto para refazer a operação e um novo card será emitido.'
      )
    }
    // Revisão 11/10: nada de "HTTP 500" na tela — o detalhe vai para o erro.
    throw Object.assign(new Error('Não foi possível enviar sua aprovação agora. Tente de novo em instantes.'), { status: res.status, detalhe: detail })
  }
}

// ─── Session Management API ──────────────────────────────────────────────────

function getSessionBaseUrl(): string {
  if (!AGENT_SERVER_URL) throw new Error('VITE_AGENT_SERVER_URL is not set')
  return AGENT_SERVER_URL
}

async function agentHeaders(): Promise<Record<string, string>> {
  const token = await getAgentToken()
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

export async function createCopilotSession(title: string): Promise<{ id: string } | null> {
  try {
    const baseUrl = getSessionBaseUrl()
    const res = await fetch(`${baseUrl}/agents/sessions`, {
      method: 'POST', headers: await agentHeaders(), body: JSON.stringify({ title }),
    })
    if (!res.ok) { console.error('[copilot] createSession failed:', res.status); return null }
    return await res.json()
  } catch (err) { console.error('[copilot] createSession error:', err); return null }
}

export async function listCopilotSessions(): Promise<Array<{ id: string; title: string; messageCount: number; lastMessageAt: string; createdAt: string }>> {
  try {
    const baseUrl = getSessionBaseUrl()
    // SCRUM-1253 (PO, 08/10): sem o teto artificial de 30 — as 100 mais recentes
    // (máximo do servidor; paginação/busca das antigas pedida no SCRUM-1161).
    const res = await fetch(`${baseUrl}/agents/sessions?limit=100`, { headers: await agentHeaders() })
    if (!res.ok) { console.error('[copilot] listSessions failed:', res.status); return [] }
    return await res.json()
  } catch (err) { console.error('[copilot] listSessions error:', err); return [] }
}

export interface SessaoDoCopilotApi {
  id: string
  title: string
  messageCount?: number
  lastMessageAt?: string | null
  createdAt: string
  /** Agent-server novo: a lista é ordenada por updatedAt DESC, id DESC. */
  updatedAt?: string
}

/**
 * Página da lista de conversas (agent-server novo, SCRUM-1253 11/10):
 * `before`/`beforeId` = cursor do último item; `q` = busca no título e no
 * conteúdo. Servidor antigo ignora os parâmetros (quem chama detecta).
 * Devolve `null` em erro — diferente de "nenhuma conversa".
 */
export async function buscarSessoesDoCopilot(opts: { before?: string; beforeId?: string; q?: string; limit?: number } = {}): Promise<SessaoDoCopilotApi[] | null> {
  try {
    const baseUrl = getSessionBaseUrl()
    const qs = new URLSearchParams({ limit: String(opts.limit ?? 100) })
    if (opts.before) qs.set('before', opts.before)
    if (opts.beforeId) qs.set('beforeId', opts.beforeId)
    if (opts.q) qs.set('q', opts.q)
    const res = await fetch(`${baseUrl}/agents/sessions?${qs.toString()}`, { headers: await agentHeaders() })
    if (!res.ok) { console.error('[copilot] buscarSessoes failed:', res.status); return null }
    const data = await res.json()
    return Array.isArray(data) ? data : null
  } catch (err) { console.error('[copilot] buscarSessoes error:', err); return null }
}

export type ResultadoDaSessao =
  | { status: 'ok'; sessao: SessaoDoCopilotApi }
  | { status: 'nao-encontrada' }
  | { status: 'erro' }

/**
 * Uma conversa pelo id (agent-server novo: GET /agents/sessions/:id, 404 se
 * não for do usuário). Servidor antigo não tem a rota (também 404): cai para
 * as mensagens — se houver mensagens, a conversa existe.
 */
export async function obterSessaoDoCopilot(sessionId: string): Promise<ResultadoDaSessao> {
  try {
    const baseUrl = getSessionBaseUrl()
    const id = encodeURIComponent(sessionId)
    const res = await fetch(`${baseUrl}/agents/sessions/${id}`, { headers: await agentHeaders() })
    if (res.ok) {
      const data = await res.json().catch(() => null) as SessaoDoCopilotApi | null
      if (data && typeof data === 'object' && data.id) return { status: 'ok', sessao: data }
    } else if (res.status !== 404 && res.status !== 400) {
      return { status: 'erro' }
    }
    const msgsRes = await fetch(`${baseUrl}/agents/sessions/${id}/messages`, { headers: await agentHeaders() })
    if (msgsRes.status === 404 || msgsRes.status === 400 || msgsRes.status === 403) return { status: 'nao-encontrada' }
    if (!msgsRes.ok) return { status: 'erro' }
    const msgs = await msgsRes.json().catch(() => []) as Array<{ role?: string; content?: string; createdAt?: string }>
    if (!Array.isArray(msgs) || msgs.length === 0) return { status: 'nao-encontrada' }
    const primeira = msgs.find((m) => m.role === 'user')
    const titulo = (primeira?.content ?? 'Conversa').slice(0, 60)
    return { status: 'ok', sessao: { id: sessionId, title: titulo, createdAt: msgs[0].createdAt ?? new Date().toISOString(), lastMessageAt: msgs[msgs.length - 1].createdAt ?? null } }
  } catch (err) {
    console.error('[copilot] obterSessao error:', err)
    return { status: 'erro' }
  }
}

export async function getCopilotMessages(sessionId: string): Promise<Array<{ id: string; role: string; content: string; toolCalls: unknown; plan: unknown; createdAt: string }>> {
  try {
    const baseUrl = getSessionBaseUrl()
    const res = await fetch(`${baseUrl}/agents/sessions/${sessionId}/messages`, { headers: await agentHeaders() })
    if (!res.ok) { console.error('[copilot] getMessages failed:', res.status); return [] }
    return await res.json()
  } catch (err) { console.error('[copilot] getMessages error:', err); return [] }
}

export async function deleteCopilotSession(sessionId: string): Promise<void> {
  try {
    const baseUrl = getSessionBaseUrl()
    const res = await fetch(`${baseUrl}/agents/sessions/${sessionId}`, { method: 'DELETE', headers: await agentHeaders() })
    if (!res.ok) console.error('[copilot] deleteSession failed:', res.status)
  } catch (err) { console.error('[copilot] deleteSession error:', err) }
}

export async function updateCopilotSessionTitle(sessionId: string, title: string): Promise<void> {
  try {
    const baseUrl = getSessionBaseUrl()
    const res = await fetch(`${baseUrl}/agents/sessions/${sessionId}`, {
      method: 'PATCH', headers: await agentHeaders(), body: JSON.stringify({ title }),
    })
    if (!res.ok) console.error('[copilot] updateTitle failed:', res.status)
  } catch (err) { console.error('[copilot] updateTitle error:', err) }
}

/**
 * Erro do agent-server em texto para a pessoa (SCRUM-1253, revisão 11/10):
 * antes ia para a tela "Agent Server error 402: {json…}". Nunca mostra
 * status nem JSON — usa a mensagem amigável do corpo (`error`/`message`) e
 * textos próprios para os casos conhecidos. `status` e `code` ficam no erro
 * para quem precisa decidir (ex.: 429).
 */
export function erroDoAgente(status: number, corpo: string): Error & { status: number; code?: string } {
  let code: string | undefined
  let mensagem: string | undefined
  try {
    const j = JSON.parse(corpo) as { error?: unknown; message?: unknown; code?: unknown }
    if (typeof j.code === 'string') code = j.code
    if (typeof j.error === 'string') mensagem = j.error
    else if (typeof j.message === 'string') mensagem = j.message
  } catch { /* corpo não é JSON */ }

  let texto: string
  if (code === 'not_provisioned' || status === 402) {
    texto = 'O Copilot não está liberado no plano desta empresa. Fale com o administrador.'
  } else if (status === 429) {
    texto = mensagem || 'Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo.'
  } else if (status === 401 || status === 403) {
    texto = mensagem || 'Sua sessão não tem acesso ao Copilot agora. Entre de novo ou fale com o administrador.'
  } else if (status >= 500) {
    texto = 'O Copilot está indisponível no momento. Tente de novo em instantes.'
  } else {
    texto = mensagem || 'Não foi possível falar com o Copilot agora. Tente de novo.'
  }
  return Object.assign(new Error(texto), { status, code })
}
