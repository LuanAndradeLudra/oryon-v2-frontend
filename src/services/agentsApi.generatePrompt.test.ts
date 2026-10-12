import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Auditoria de arquitetura dos agentes (onda 1, A2): quando a geração pela IA
 * falhava, o frontend devolvia um template local como se fosse o prompt da IA
 * — o agente podia ser publicado com texto de exemplo sem ninguém saber.
 * Agora a origem vem junto e a tela avisa.
 */

vi.mock('axios', () => ({ default: { get: vi.fn(async () => ({ data: { token: 't' } })) } }))
vi.mock('@/services/appLogger', () => ({
  appLogger: { logAIGeneration: vi.fn(), logAIExecution: vi.fn(), logActivity: vi.fn() },
}))

import { generateAgentPrompt, type AgentPromptRequest } from './agentsApi'

const REQUEST: AgentPromptRequest = {
  identity: { name: 'Serrinha', emoji: '', sector: 'Saúde', objective: 'Agendar consultas' },
  personality: { persona_name: 'Serrinha', tone: 'amigável', language: 'pt-BR', response_style: [] },
  scope: { can_do: ['Agendar'], cannot_do: [] },
  business: { company_name: 'Clínica', company_description: '', products_services: '', faqs: [], extra_context: '' },
  deployment: { escalation_keywords: [], escalation_conditions: [], escalation_department: '', channels: ['WhatsApp'] },
}

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('generateAgentPrompt', () => {
  it('resposta da IA → source ai', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      JSON.stringify({ data: { prompt: 'Você é a Serrinha.', usage: { input_tokens: 1, output_tokens: 1 } } }),
      { status: 200 },
    )) as unknown as typeof fetch
    await expect(generateAgentPrompt(REQUEST)).resolves.toEqual({ prompt: 'Você é a Serrinha.', source: 'ai' })
  })

  it('IA fora do ar → modelo local, marcado como local_fallback e com o motivo', async () => {
    globalThis.fetch = vi.fn(async () => new Response(
      JSON.stringify({ error: 'Erro ao gerar prompt' }),
      { status: 503 },
    )) as unknown as typeof fetch
    const r = await generateAgentPrompt(REQUEST)
    expect(r.source).toBe('local_fallback')
    expect(r.failureReason).toBe('Erro ao gerar prompt')
    expect(r.prompt).toContain('Serrinha')
  })
})
