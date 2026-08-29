// ─── Anthropic Service — sugestão de etapas por IA ────────────────────────────
// Toda chamada de IA passa pelo Agent Server. Este arquivo é o cliente fino.
// Até a F13 quem usava era o wizard de onboarding (via `useOnboarding`), que
// gerava a configuração inteira do CRM às escondidas. Agora quem usa é o
// "Sugerir etapas com IA" do modal de Novo funil (F13-904): mesma rota do
// agent-server, mas o resultado vira rascunho editável de UM funil.

import axios from 'axios'

const AGENT_SERVER_URL = import.meta.env.VITE_AGENT_SERVER_URL as string | undefined
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000/api'

/** Short-lived Bearer token from the backend for agent-server calls */
let _agentTokenCache: { token: string; expiresAt: number } | null = null
async function getAgentToken(): Promise<string> {
  if (_agentTokenCache && Date.now() < _agentTokenCache.expiresAt - 3000) return _agentTokenCache.token
  const res = await axios.get<{ token: string }>(`${API_URL}/auth/ws-token`)
  _agentTokenCache = { token: res.data.token, expiresAt: Date.now() + 25_000 }
  return res.data.token
}

export interface BusinessContext {
  companyName: string
  industry: string
  companyDescription: string
  productsServices: string
  teamSize: string
  experienceLevel: ExperienceLevel | string
  crmExperience: CRMExperience | string
  businessType: string[]
  revenueRange: string
  productDescription: string
  acquisitionChannels: string[]
  salesCycleDuration: string
  averageTicket: string
  salesChallenges: string[]
  salesProcessDescription: string
  trackingPriorities: string[]
  crmGoals: string[]
  additionalContext: string
  kbSummary?: string
  [key: string]: unknown
}

/** Campos do `BusinessContext` que o Hub da empresa não coleta. Ficam vazios —
 *  o agent-server trata ausência, e inventar valor aqui enviesaria a sugestão. */
const EMPTY_CONTEXT_FIELDS = {
  experienceLevel: '',
  crmExperience: '',
  revenueRange: '',
  productDescription: '',
  acquisitionChannels: [] as string[],
  salesCycleDuration: '',
  averageTicket: '',
  salesChallenges: [] as string[],
  salesProcessDescription: '',
  trackingPriorities: [] as string[],
  crmGoals: [] as string[],
  additionalContext: '',
}

/**
 * Traduz o Hub da empresa (o que o wizard coleta hoje) para o contexto que o
 * agent-server espera. Função pura de propósito: é o único ponto onde os dois
 * formatos se encontram, e dá para testar sem rede.
 */
export function businessContextFromHub(
  hub: {
    companyName: string; industry: string; businessType: string[]
    teamSize: string; description: string; productsServices: string
  },
  fallbackName = '',
): BusinessContext {
  return {
    ...EMPTY_CONTEXT_FIELDS,
    companyName: hub.companyName?.trim() || fallbackName.trim(),
    industry: hub.industry ?? '',
    businessType: hub.businessType ?? [],
    teamSize: hub.teamSize ?? '',
    companyDescription: hub.description ?? '',
    productsServices: hub.productsServices ?? '',
  }
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type CRMExperience = 'never' | 'tried' | 'active' | 'manager'

export interface CRMConfigStage {
  label: string
  color: string
  order: number
  isTerminal: boolean
}
export interface CRMConfigField {
  label: string
  type: string
  placeholder?: string
  required: boolean
  order: number
  options?: string[]
}
export interface CRMConfigResult {
  stages: CRMConfigStage[]
  customFields: CRMConfigField[]
}

/**
 * Calls the agent-server to generate a personalized CRM setup from the user's
 * onboarding context. Returns an AsyncGenerator to preserve the existing
 * streaming-style API used by `parseStreamResult` — though today the
 * agent-server returns the full JSON in a single response (not streamed).
 */
export async function* generateCRMConfig(context: BusinessContext): AsyncGenerator<string> {
  if (!AGENT_SERVER_URL) {
    throw new Error('VITE_AGENT_SERVER_URL is not set — cannot generate CRM setup')
  }

  const token = await getAgentToken()
  const res = await fetch(`${AGENT_SERVER_URL}/agents/insights/crm-onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(context),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[onboarding] crm-onboarding failed:', res.status, body.slice(0, 300))
    throw new Error(`Agent Server returned ${res.status} when generating CRM setup`)
  }

  const data = await res.json()
  yield JSON.stringify(data)
}

export async function parseStreamResult(stream: AsyncGenerator<string>): Promise<CRMConfigResult> {
  let result = ''
  for await (const chunk of stream) result += chunk
  try {
    const match = result.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : { stages: [], customFields: [] }
    return {
      stages: Array.isArray(parsed.stages) ? parsed.stages : [],
      customFields: Array.isArray(parsed.customFields) ? parsed.customFields : [],
    }
  } catch (err) {
    console.error('[onboarding] parseStreamResult failed:', err)
    return { stages: [], customFields: [] }
  }
}
