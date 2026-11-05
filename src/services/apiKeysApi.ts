// ─── Chaves da API pública (SCRUM-1219) ─────────────────────────────────────
// Backend: /api-keys (JWT, admin ou dono). O segredo completo só vem na
// resposta de criação ou de troca — nunca é listado de novo.
import api from './api'
import { apiBaseUrl } from '@/config/env'

export type ApiKeyScope = 'contacts:read' | 'contacts:write' | 'deals:read' | 'deals:write' | 'metrics:read'

/** Revogada > vencida > ativa (o backend decide; a tela só mostra). */
export type ApiKeyStatus = 'active' | 'revoked' | 'expired'

export interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  pipelineIds: string[] | null
  /** v1.1: chave "da rede" — lê as métricas de todas as unidades da rede. */
  networkWide: boolean
  createdByUserId: string | null
  createdByName: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  /** Fim da validade (ou da janela de troca); null = sem validade. */
  expiresAt: string | null
  /** Chave que substituiu esta numa troca; enquanto a janela corre, esta continua ativa. */
  replacedByKeyId: string | null
  /** A chave que esta substituiu numa troca, enquanto o vínculo existe. */
  replacesKeyId: string | null
  /** `true` = revogar esta agora desfaz a troca (a anterior volta a valer como antes). */
  revokeUndoesRotation: boolean
  createdAt: string
  status: ApiKeyStatus
}

/** Limites do backend (dto/create-api-key.dto.ts). */
export const MAX_KEY_VALIDITY_DAYS = 730
export const DEFAULT_ROTATION_OVERLAP_DAYS = 7
export const MAX_ROTATION_OVERLAP_DAYS = 30

export interface CreateApiKeyPayload {
  name: string
  scopes: ApiKeyScope[]
  pipelineIds?: string[] | null
  /** Só na conta da rede e só com `metrics:read` (o backend recusa o resto). */
  networkWide?: boolean
  /** 1 a 730; ausente = sem validade. */
  expiresInDays?: number
}

export interface RotateApiKeyPayload {
  /** 0 a 30 (padrão do backend: 7). Quanto tempo a chave antiga ainda vale. */
  overlapDays?: number
  /** Validade da chave nova; ausente = a mesma duração da antiga (ou sem validade). */
  expiresInDays?: number
}

/** O que a revogação desfez: a troca em que esta chave era a substituta. */
export interface RotationUndone {
  /** A chave anterior, que voltou a valer. */
  previousKeyId: string
  /** A validade dela agora (a de antes da troca); null = sem validade. */
  previousExpiresAt: string | null
  /** Troca anterior a 05/11: a anterior sai da troca, mas fica com o fim da janela como validade. */
  legacy: boolean
}

export type RevokedApiKey = ApiKey & { rotationUndone: RotationUndone | null }

/** A rede da conta logada (só a conta "hub" de uma rede tem). */
export interface MinhaRede {
  id: string
  nome: string
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
  /** Cria a chave nova (mesmo nome, escopos e funis) e encurta a validade da antiga. */
  async rotate(id: string, payload: RotateApiKeyPayload): Promise<{ key: ApiKey; secret: string; previous: ApiKey }> {
    const { data } = await api.post<{ key: ApiKey; secret: string; previous: ApiKey }>(`/api-keys/${id}/rotate`, payload)
    return data
  },
  async revoke(id: string): Promise<RevokedApiKey> {
    const { data } = await api.post<RevokedApiKey>(`/api-keys/${id}/revoke`)
    return { ...data, rotationUndone: data.rotationUndone ?? null }
  },
  /** `null` quando a conta não é a de uma rede (o backend responde 403) ou a consulta falha. */
  async myNetwork(): Promise<MinhaRede | null> {
    try {
      const { data } = await api.get<MinhaRede | null>('/networks/me')
      return data?.id ? { id: data.id, nome: data.nome } : null
    } catch {
      return null
    }
  },
}

/** Página pública da documentação (Scalar), servida pelo backend. */
export function apiDocsUrl(): string {
  return `${apiBaseUrl().replace(/\/$/, '')}/v1/docs`
}
