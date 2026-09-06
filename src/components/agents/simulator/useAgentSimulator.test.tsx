import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAgentSimulator } from './useAgentSimulator'
import type { AgentConfigWithTools } from '@/services/agentsApi'

const chatWithAgent = vi.fn()
const startTestSession = vi.fn()
const endTestSession = vi.fn()

vi.mock('@/services/agentsApi', () => ({
  chatWithAgent: (...a: unknown[]) => chatWithAgent(...a),
  startTestSession: (...a: unknown[]) => startTestSession(...a),
  endTestSession: (...a: unknown[]) => endTestSession(...a),
}))

const agent = {
  id: 'agent-1',
  system_prompt: 'Você é a Sofia.',
  handoff_rules: { rules: [] },
} as unknown as AgentConfigWithTools

/** Cliente diferido: a promessa só resolve quando o teste manda. É o único
 *  jeito de colocar uma resposta EM VOO e reiniciar por baixo dela — que é
 *  exatamente o estado em que a corrida acontece. Ler o código não prova
 *  (CHECKLIST, "corrida entre resposta em voo e troca de alvo"). */
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('useAgentSimulator — resposta em voo × restart', () => {
  // `reset`, não `clear`: `clearAllMocks` zera o histórico mas NÃO a
  // implementação nem a fila de `mockReturnValueOnce`. Com `clear`, um teste
  // que falha no meio deixa implementação pendurada e o PRÓXIMO teste falha
  // por herança — foi o que a mutação proposital expôs aqui: revertendo a
  // correção caíam os 5 casos, e os 2 últimos passavam sozinhos. Um gate que
  // acusa mais do que o defeito causa mente tanto quanto um que não acusa.
  beforeEach(() => {
    vi.resetAllMocks()
    startTestSession.mockResolvedValue({ id: 'sess-1' })
    endTestSession.mockResolvedValue(undefined)
  })

  it('descarta a resposta do envio antigo quando o restart acontece antes dela', async () => {
    const d = deferred<string>()
    chatWithAgent.mockReturnValue(d.promise)
    const onFirstReply = vi.fn()

    const { result } = renderHook(() => useAgentSimulator(agent, { onFirstReply }))
    await waitFor(() => expect(startTestSession).toHaveBeenCalled())

    act(() => { result.current.setInput('quanto custa o frete?') })
    act(() => { void result.current.send() })

    await waitFor(() => expect(result.current.loading).toBe(true))
    expect(result.current.messages).toHaveLength(1)

    // A pessoa desiste e reinicia com a resposta ainda no ar.
    act(() => { result.current.restart() })
    expect(result.current.messages).toHaveLength(0)
    // 1º sintoma: o loading não pode ficar preso quando o reset acontece.
    expect(result.current.loading).toBe(false)

    // A resposta antiga chega DEPOIS do reset.
    await act(async () => { d.resolve('resposta da pergunta que sumiu') })

    // 2º sintoma: mensagem órfã respondendo pergunta que o usuário não vê mais.
    expect(result.current.messages).toHaveLength(0)
    // 3º sintoma: o loading do envio velho não pode voltar a mexer no estado.
    expect(result.current.loading).toBe(false)
    // 4º sintoma: onFirstReply disparando por uma conversa que não existe mais.
    expect(onFirstReply).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('descarta também o ERRO do envio antigo — o reset limpou o erro de propósito', async () => {
    const d = deferred<string>()
    chatWithAgent.mockReturnValue(d.promise)

    const { result } = renderHook(() => useAgentSimulator(agent))
    await waitFor(() => expect(startTestSession).toHaveBeenCalled())

    act(() => { result.current.setInput('oi') })
    act(() => { void result.current.send() })
    await waitFor(() => expect(result.current.loading).toBe(true))

    act(() => { result.current.restart() })
    await act(async () => { d.reject(new Error('500 do agent-server')) })

    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('o envio NOVO feito depois do reset não é apagado pelo envio velho', async () => {
    const velho = deferred<string>()
    const novo = deferred<string>()
    chatWithAgent.mockReturnValueOnce(velho.promise).mockReturnValueOnce(novo.promise)
    const onFirstReply = vi.fn()

    const { result } = renderHook(() => useAgentSimulator(agent, { onFirstReply }))
    await waitFor(() => expect(startTestSession).toHaveBeenCalled())

    act(() => { result.current.setInput('pergunta velha') })
    act(() => { void result.current.send() })
    await waitFor(() => expect(result.current.loading).toBe(true))

    act(() => { result.current.restart() })
    act(() => { result.current.setInput('pergunta nova') })
    act(() => { void result.current.send() })
    await waitFor(() => expect(result.current.loading).toBe(true))

    // A resposta VELHA chega no meio do envio novo. Não pode desligar o
    // loading do novo nem entrar na conversa.
    await act(async () => { velho.resolve('resposta velha') })
    expect(result.current.loading).toBe(true)
    expect(result.current.messages).toHaveLength(1)

    await act(async () => { novo.resolve('resposta nova') })
    expect(result.current.loading).toBe(false)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].content).toBe('resposta nova')
    expect(onFirstReply).toHaveBeenCalledTimes(1)
  })

  it('sem reset no meio, o caminho feliz continua o mesmo', async () => {
    chatWithAgent.mockResolvedValue('Olá! Como posso ajudar?')
    const onFirstReply = vi.fn()

    const { result } = renderHook(() => useAgentSimulator(agent, { onFirstReply }))
    await waitFor(() => expect(startTestSession).toHaveBeenCalled())

    act(() => { result.current.setInput('oi') })
    await act(async () => { await result.current.send() })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].content).toBe('Olá! Como posso ajudar?')
    expect(result.current.loading).toBe(false)
    expect(onFirstReply).toHaveBeenCalledTimes(1)
  })

  it('restart encerra a sessão antiga e abre uma nova, sem deixar sessão pendurada', async () => {
    chatWithAgent.mockResolvedValue('ok')
    const { result } = renderHook(() => useAgentSimulator(agent))
    await waitFor(() => expect(startTestSession).toHaveBeenCalledTimes(1))

    act(() => { result.current.restart() })

    expect(endTestSession).toHaveBeenCalledWith('agent-1', 'sess-1')
    await waitFor(() => expect(startTestSession).toHaveBeenCalledTimes(2))

    // Segunda chamada de closeSession é no-op: o ref foi limpo.
    act(() => { result.current.closeSession() })
    act(() => { result.current.closeSession() })
    expect(endTestSession).toHaveBeenCalledTimes(2)
  })
})
