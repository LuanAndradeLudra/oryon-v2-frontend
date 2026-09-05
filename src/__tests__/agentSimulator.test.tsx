import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { AgentConfigWithTools, HandoffRule } from '@/services/agentsApi'

// A extração W0.3 tirou o simulador de dentro do AgentTestModal. Estes testes
// travam os dois pontos que o diff de paridade contra o arquivo original
// apontou como fáceis de perder na extração (auto-scroll e refoco do campo)
// e cobrem o `handoffRules?` novo, que não tinha teste nenhum.
type ChatMeta = { sessionId?: string; agentId?: string; handoffRules?: HandoffRule[] }
const chatWithAgent =
  vi.fn<(sp: string, msgs: Array<{ role: string; content: string }>, meta?: ChatMeta) => Promise<string>>(
    async () => 'oi, tudo bem?',
  )
vi.mock('@/services/agentsApi', async importOriginal => {
  const real = await importOriginal<typeof import('@/services/agentsApi')>()
  return {
    ...real,
    chatWithAgent,
    startTestSession: vi.fn(async () => ({ id: 'sess-1' })),
    endTestSession: vi.fn(async () => {}),
  }
})

const { useAgentSimulator } = await import('@/components/agents/simulator/useAgentSimulator')
const { SimulatorPanel } = await import('@/components/agents/simulator/SimulatorPanel')

const agent = {
  id: 'ag-1',
  name: 'Sofia',
  system_prompt: 'Você é a Sofia.',
  handoff_rules: { rules: [] },
} as unknown as AgentConfigWithTools

function Harness({ handoffRules }: { handoffRules?: HandoffRule[] }) {
  const s = useAgentSimulator(agent, { handoffRules })
  return (
    <SimulatorPanel
      agent={agent}
      messages={s.messages} input={s.input} setInput={s.setInput}
      loading={s.loading} error={s.error} dismissError={s.dismissError} send={s.send}
    />
  )
}

async function enviar(texto: string) {
  const campo = screen.getByPlaceholderText('Digite uma mensagem...')
  fireEvent.change(campo, { target: { value: texto } })
  await act(async () => {
    fireEvent.keyDown(campo, { key: 'Enter', shiftKey: false })
  })
  return campo
}

describe('simulador do agente (W0.3)', () => {
  beforeEach(() => {
    chatWithAgent.mockClear()
    // jsdom não implementa scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
    vi.useRealTimers()
  })

  it('envia a mensagem e mostra a resposta do agente', async () => {
    render(<Harness />)
    await enviar('bom dia')
    expect(await screen.findByText('bom dia')).toBeInTheDocument()
    expect(await screen.findByText('oi, tudo bem?')).toBeInTheDocument()
  })

  it('NÃO manda handoff_rules quando o chamador não passa regras', async () => {
    render(<Harness />)
    await enviar('bom dia')
    await waitFor(() => expect(chatWithAgent).toHaveBeenCalled())
    expect(chatWithAgent.mock.calls[0][2]?.handoffRules).toBeUndefined()
  })

  it('repassa handoffRules quando o chamador tem regras de um rascunho', async () => {
    const regras = [{ id: 'r1', enabled: true }] as unknown as HandoffRule[]
    render(<Harness handoffRules={regras} />)
    await enviar('bom dia')
    await waitFor(() => expect(chatWithAgent).toHaveBeenCalled())
    expect(chatWithAgent.mock.calls[0][2]?.handoffRules).toEqual(regras)
  })

  it('mantém a âncora de auto-scroll do fim da lista', async () => {
    render(<Harness />)
    await enviar('bom dia')
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' }))
  })

  it('devolve o foco ao campo depois de enviar', async () => {
    render(<Harness />)
    const campo = await enviar('bom dia')
    await waitFor(() => expect(document.activeElement).toBe(campo), { timeout: 1000 })
  })
})
