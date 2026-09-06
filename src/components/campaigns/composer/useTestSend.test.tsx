// O que este teste protege: a desambiguação do 404 do BE.10. O contrato usa
// 404 tanto para "endpoint não implantado" quanto para "Template não
// encontrado" / "Linha WhatsApp não encontrada" (coord/CONTRATOS.md §BE.10).
// Confundir os dois desliga o botão "Enviar teste" pelo resto da sessão só
// porque alguém apagou um template — por isso cada lado tem caso próprio.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { CampaignVariableMapping } from '@/types'

const testSend = vi.fn()

vi.mock('@/services/campaignsV2Api', () => ({
  campaignComposerApi: { testSend: (...args: unknown[]) => testSend(...args) },
}))

const { useTestSend } = await import('./useTestSend')

const MAPPINGS: CampaignVariableMapping[] = [
  { position: 1, variableName: 'nome', source: 'literal', literal: 'Teste' },
]

const PARAMS = { templateId: 'tpl_9', variableMappings: MAPPINGS, whatsappNumberId: 'wa_1' }

/** Erro no formato que o axios entrega (`err.response.status/data.message`). */
function httpError(status: number, message?: string) {
  return { response: { status, data: message === undefined ? {} : { message } } }
}

beforeEach(() => { testSend.mockReset() })

describe('useTestSend — sucesso', () => {
  it('manda o corpo do contrato e devolve o resultado', async () => {
    const sent = { messageId: 'msg_1', to: '5511988887777', sentAt: '2026-09-05T14:00:00Z' }
    testSend.mockResolvedValue({ data: sent })
    const { result } = renderHook(() => useTestSend(PARAMS))

    await act(async () => { await result.current.send() })

    expect(testSend).toHaveBeenCalledWith({
      templateId: 'tpl_9', variableMappings: MAPPINGS, whatsappNumberId: 'wa_1',
    })
    expect(result.current.result).toEqual(sent)
    expect(result.current.error).toBe('')
    expect(result.current.available).toBe(true)
  })

  it('inclui `to` só quando informado', async () => {
    testSend.mockResolvedValue({ data: { messageId: 'm', to: 't', sentAt: 's' } })
    const { result } = renderHook(() => useTestSend(PARAMS))

    await act(async () => { await result.current.send('5511999998888') })
    expect(testSend).toHaveBeenCalledWith(expect.objectContaining({ to: '5511999998888' }))
  })

  it('não chama o backend sem template ou sem linha', async () => {
    const { result } = renderHook(() => useTestSend({ ...PARAMS, whatsappNumberId: undefined }))
    await act(async () => { await result.current.send() })
    expect(testSend).not.toHaveBeenCalled()
    expect(result.current.ready).toBe(false)
  })
})

describe('useTestSend — os dois lados do 404', () => {
  it('rota inexistente desliga o recurso, sem mensagem de erro', async () => {
    // É assim que o Nest responde quando a rota não existe.
    testSend.mockRejectedValue(httpError(404, 'Cannot POST /api/campaigns/test-send'))
    const { result } = renderHook(() => useTestSend(PARAMS))

    await act(async () => { await result.current.send() })

    expect(result.current.available).toBe(false)
    expect(result.current.ready).toBe(false)
    // Recurso ausente não é erro do usuário: quem mostra o botão explica
    // pelo rótulo, não por uma mensagem vermelha.
    expect(result.current.error).toBe('')
  })

  it('404 sem corpo também conta como rota inexistente', async () => {
    testSend.mockRejectedValue(httpError(404))
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.available).toBe(false)
  })

  it('404 de domínio mostra a mensagem e MANTÉM o recurso disponível', async () => {
    testSend.mockRejectedValue(httpError(404, 'Template não encontrado'))
    const { result } = renderHook(() => useTestSend(PARAMS))

    await act(async () => { await result.current.send() })

    expect(result.current.available).toBe(true)
    expect(result.current.error).toBe('Template não encontrado')
  })

  it('404 de linha não encontrada também mantém o recurso', async () => {
    testSend.mockRejectedValue(httpError(404, 'Linha WhatsApp não encontrada'))
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.available).toBe(true)
    expect(result.current.error).toBe('Linha WhatsApp não encontrada')
  })
})

describe('useTestSend — demais erros do contrato', () => {
  it('409 (template não aprovado) mostra a mensagem do backend', async () => {
    testSend.mockRejectedValue(httpError(409, 'Template "boas_vindas" não está aprovado (status: PENDING)'))
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.error).toBe('Template "boas_vindas" não está aprovado (status: PENDING)')
    expect(result.current.available).toBe(true)
  })

  it('422 sem telefone cai no texto do contrato quando o backend não manda mensagem', async () => {
    testSend.mockRejectedValue(httpError(422))
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.error).toMatch(/telefone/i)
  })

  it('429 (limite por usuário) não desliga o recurso', async () => {
    testSend.mockRejectedValue(httpError(429, 'Limite de testes atingido, tente novamente em instantes'))
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.error).toMatch(/limite/i)
    expect(result.current.available).toBe(true)
  })

  it('erro de rede sem status cai na mensagem genérica', async () => {
    testSend.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.error).toMatch(/não foi possível enviar o teste/i)
    expect(result.current.available).toBe(true)
  })

  it('lista de mensagens do Nest vira uma linha só', async () => {
    testSend.mockRejectedValue({ response: { status: 409, data: { message: ['a', 'b'] } } })
    const { result } = renderHook(() => useTestSend(PARAMS))
    await act(async () => { await result.current.send() })
    expect(result.current.error).toBe('a; b')
  })
})
