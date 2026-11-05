// ─── Chaves da API pública (SCRUM-1219) ─────────────────────────────────────
// Backend: /api-keys (JWT, admin ou dono). O segredo completo só vem na
// resposta de criação — nunca é listado de novo.
import api from './api'
import { apiBaseUrl } from '@/config/env'

export type ApiKeyScope = 'contacts:read' | 'contacts:write' | 'deals:read' | 'deals:write'

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  pipelineIds: string[] | null
  createdByUserId: string | null
  createdByName: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  status: 'active' | 'revoked'
}

export interface CreateApiKeyPayload {
  name: string
  scopes: ApiKeyScope[]
  pipelineIds?: string[] | null
}

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    const { data } = await api.get<ApiKey[]>('/api-keys')
    return data
  },
  async create(payload: CreateApiKeyPayload): Promise<{ key: ApiKey; secret: string }> {
    const { data } = await api.post<{ key: ApiKey; secret: string }>('/api-keys', payload)
    return data
  },
  async revoke(id: string): Promise<ApiKey> {
    const { data } = await api.post<ApiKey>(`/api-keys/${id}/revoke`)
    return data
  },
}

/** Página pública da documentação (Scalar), servida pelo backend. */
export function apiDocsUrl(): string {
  return `${apiBaseUrl().replace(/\/$/, '')}/v1/docs`
}
