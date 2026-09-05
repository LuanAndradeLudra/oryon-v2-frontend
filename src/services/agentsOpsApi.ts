// ─── Agents Ops API ──────────────────────────────────────────────────────
// Contratos do redesign (SCRUM-992 — Command Deck/Workspace/Transferências),
// shapes finais em design-system/fluxos-src/coord/CONTRATOS.md (BE.6/BE.7/
// AS.1/AS.2/AS.3). agents-ops e handoffs vivem no backend NestJS (mesma
// instância axios `api` de services/api.ts — congelado, não editar).
// duplicate/draft/publish/health vivem no agent-server, mesmo padrão de
// services/agentsApi.ts (fetch + Bearer token), também congelado — por isso
// este arquivo tem seu PRÓPRIO fetch helper (agentServerFetch), que difere
// do `apiFetch` de agentsApi.ts em um ponto importante: preserva o status
// HTTP no erro lançado, porque withFallback() precisa dele pra distinguir
// 404/501 (endpoint ainda não existe) de erro real (401/403/500).
//
// Blocos por história — na Onda 1, cada dono edita só o seu bloco.

import { api } from '@/services/api'
import { AGENT_SERVER_BASE, getAgentToken } from '@/services/agentsApi'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import type {
  HandoffListParams,
  HandoffListResponse,
  HandoffSummary,
  HandoffEventUpdated,
  AgentsLiveResponse,
  AgentsPulse,
  AgentFeedItem,
  AgentMetrics,
  AgentMetricsRange,
  AgentDraftExtension,
  AgentPromptVersion,
  AgentHealth,
} from '@/types/agentsOps'

// ── fetch helper pro agent-server (preserva status, diferente do apiFetch de agentsApi.ts) ──

export class AgentServerHttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AgentServerHttpError'
    this.status = status
  }
}

async function agentServerFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getAgentToken()
  let res: Response
  try {
    res = await fetch(`${AGENT_SERVER_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      ...opts,
    })
  } catch {
    throw new AgentServerHttpError('Backend indisponível — verifique se o servidor está rodando', 0)
  }
  const text = await res.text()
  let json: { data?: T; error?: string }
  try {
    json = text ? (JSON.parse(text) as { data?: T; error?: string }) : {}
  } catch {
    throw new AgentServerHttpError(
      res.ok ? 'Resposta inválida do servidor' : `Servidor indisponível (${res.status})`,
      res.status,
    )
  }
  if (!res.ok) throw new AgentServerHttpError(json.error ?? `Erro ${res.status}`, res.status)
  return json.data as T
}

// ── [A6] handoffs (BE.6) ──────────────────────────────────────────────────

export const handoffsApi = {
  list(params: HandoffListParams = {}) {
    return api.get<HandoffListResponse>('/handoffs', { params })
  },
  summary() {
    return api.get<HandoffSummary>('/handoffs/summary')
  },
  claim(id: string) {
    return api.post<HandoffEventUpdated>(`/handoffs/${id}/claim`)
  },
  return(id: string) {
    return api.post<HandoffEventUpdated>(`/handoffs/${id}/return`)
  },
}

// ── [A1][A2][A4] agents-ops (BE.7) ────────────────────────────────────────

export const agentsOpsApi = {
  live(agentIds: string[]) {
    return api.get<AgentsLiveResponse>('/agents-ops/live', { params: { agentIds: agentIds.join(',') } })
  },
  pulse() {
    return api.get<AgentsPulse>('/agents-ops/pulse')
  },
  feed(limit = 20) {
    return api.get<AgentFeedItem[]>('/agents-ops/feed', { params: { limit } })
  },
  metrics(agentId: string, range: AgentMetricsRange = '7d') {
    return api.get<AgentMetrics>(`/agents-ops/${agentId}/metrics`, { params: { range } })
  },
}

// ── [AS.1] agent-server duplicate ─────────────────────────────────────────

/** Resposta = mesmo shape de `getAgent()` (AgentConfigWithTools), sempre com
 *  `status:'draft'` na cópia. Não copia `agent_secrets`/base de conhecimento
 *  (Decisão D16 do CONTRATOS.md). */
export function duplicateAgentConfig(id: string, name?: string) {
  return agentServerFetch<AgentConfigWithTools>(`/agents/builder/configs/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(name ? { name } : {}),
  })
}

// ── [A2][AS.2] agent-server draft/publish/prompt-versions/health ──────────

export type AgentDraftPatchResult = AgentDraftExtension

export interface AgentPublishResult {
  config: AgentConfigWithTools & AgentDraftExtension
  version: AgentPromptVersion
}

export const agentDraftApi = {
  patch(id: string, draft: Record<string, unknown>) {
    return agentServerFetch<AgentDraftPatchResult>(`/agents/builder/configs/${id}/draft`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
  },
  publish(id: string) {
    return agentServerFetch<AgentPublishResult>(`/agents/builder/configs/${id}/publish`, { method: 'POST' })
  },
  discard(id: string) {
    return agentServerFetch<{ ok: true }>(`/agents/builder/configs/${id}/discard-draft`, { method: 'POST' })
  },
  promptVersions(id: string, limit = 20) {
    return agentServerFetch<AgentPromptVersion[]>(`/agents/builder/configs/${id}/prompt-versions?limit=${limit}`)
  },
  health(id: string) {
    return agentServerFetch<AgentHealth>(`/agents/builder/configs/${id}/health`)
  },
}
