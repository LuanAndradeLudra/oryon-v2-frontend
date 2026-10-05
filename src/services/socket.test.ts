// A costura de injeção do socket.
//
// Ela existe só para o documento de demonstração da landing trocar o tempo
// real por um emissor local, e só faz sentido ANTES de o app pedir o socket.
// O teste cobre a recusa: com a conexão já criada, trocar a fábrica deixaria
// o socket anterior órfão — recebendo eventos e segurando o transporte —
// enquanto o app passaria a falar com outro.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('socket.io-client', () => ({
  io: () => ({ connected: false, on: () => {}, off: () => {}, emit: () => {}, connect: () => {}, disconnect: () => {} }),
}))

describe('setSocketFactory', () => {
  beforeEach(() => { vi.resetModules() })

  it('instala a fábrica quando chamada antes do primeiro getSocket', async () => {
    const { setSocketFactory, getSocket } = await import('./socket')
    const falso = { marca: 'demo', on: () => {}, off: () => {}, emit: () => {} }
    setSocketFactory(() => falso as never)
    expect((getSocket() as unknown as { marca?: string }).marca).toBe('demo')
  })

  it('RECUSA depois que o socket já existe, em vez de deixá-lo órfão', async () => {
    const { setSocketFactory, getSocket } = await import('./socket')
    getSocket()
    expect(() => setSocketFactory(() => ({}) as never)).toThrow(/antes do primeiro getSocket/)
  })
})
