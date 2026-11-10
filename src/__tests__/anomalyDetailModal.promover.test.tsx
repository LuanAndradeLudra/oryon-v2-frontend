// ─── AnomalyDetailModal — "Promover a chamado" (SCRUM-1389) ──────────────────
// Com o suporte ligado, o sinal da fila "Verificar" vira chamado num clique.
// Uma vez só: o backend devolve o mesmo chamado ("Já estava no SUP-…").

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AnomalyDetailModal } from '@/components/conversations/ChatWindow/AnomalyDetailModal'
import { AcoesCtx, DadosCtx, DESLIGADO, type DadosDoSuporte } from '@/components/support/suporteDaConversa'
import { supportApi } from '@/services/supportApi'
import type { Message } from '@/types'

vi.mock('@/services/api', () => ({ conversationsApi: { resolveReview: vi.fn(async () => ({ data: {} })) } }))
vi.mock('@/services/supportApi', () => ({ supportApi: { promoverAnomalia: vi.fn() } }))

type Anomaly = NonNullable<Message['anomaly']>
const sinal = {
  logId: 'log-1', kind: 'handoff', claimType: null, matchedText: null, outcome: 'vg_money_blocked',
  occurredAt: null, requiredSkill: null, skillFailures: [],
} as Anomaly

const irParaChamado = vi.fn()
const recarregar = vi.fn()
const promover = vi.mocked(supportApi.promoverAnomalia)

function comSuporte(ligado: boolean, filho: ReactNode) {
  return (
    <AcoesCtx.Provider value={{ ...DESLIGADO, ligado, irParaChamado }}>
      <DadosCtx.Provider value={{ recarregar } as unknown as DadosDoSuporte}>{filho}</DadosCtx.Provider>
    </AcoesCtx.Provider>
  )
}

describe('Promover a chamado', () => {
  beforeEach(() => {
    irParaChamado.mockClear()
    recarregar.mockClear()
    promover.mockReset()
  })

  it('promove, avisa o número e leva ao chamado', async () => {
    promover.mockResolvedValue({ id: 'c1', numero: 'SUP-0042', jaPromovido: false } as never)
    const onClose = vi.fn()
    render(comSuporte(true, <AnomalyDetailModal open onClose={onClose} anomaly={sinal} conversationId="conv-1" />))
    fireEvent.click(screen.getByRole('button', { name: /Promover a chamado/ }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Promovido a SUP-0042'))
    expect(promover).toHaveBeenCalledWith('log-1')
    expect(recarregar).toHaveBeenCalled()
    // "Marcar como verificada" continua: promover não reconhece a verificação sozinho.
    expect(screen.getByRole('button', { name: /Marcar como verificada/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver chamado' }))
    expect(onClose).toHaveBeenCalled()
    expect(irParaChamado).toHaveBeenCalledWith('c1')
  })

  it('o mesmo sinal de novo: "Já estava no …"', async () => {
    promover.mockResolvedValue({ id: 'c1', numero: 'SUP-0042', jaPromovido: true } as never)
    render(comSuporte(true, <AnomalyDetailModal open onClose={() => {}} anomaly={sinal} conversationId="conv-1" />))
    fireEvent.click(screen.getByRole('button', { name: /Promover a chamado/ }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Já estava no SUP-0042'))
  })

  it('erro da API aparece no rodapé, e dá para tentar de novo', async () => {
    promover.mockRejectedValueOnce({ response: { data: { message: 'Este sinal já virou o chamado SUP-0007.' } } })
    render(comSuporte(true, <AnomalyDetailModal open onClose={() => {}} anomaly={sinal} conversationId="conv-1" />))
    fireEvent.click(screen.getByRole('button', { name: /Promover a chamado/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('SUP-0007'))
    expect(screen.getByRole('button', { name: /Promover a chamado/ })).toBeEnabled()
  })

  it('sem o suporte ligado, ou sem o id do sinal (servidor antigo), não oferece', () => {
    const { unmount } = render(comSuporte(false, <AnomalyDetailModal open onClose={() => {}} anomaly={sinal} conversationId="conv-1" />))
    expect(screen.queryByRole('button', { name: /Promover a chamado/ })).toBeNull()
    unmount()
    render(comSuporte(true, <AnomalyDetailModal open onClose={() => {}} anomaly={{ ...sinal, logId: undefined }} conversationId="conv-1" />))
    expect(screen.queryByRole('button', { name: /Promover a chamado/ })).toBeNull()
  })
})
