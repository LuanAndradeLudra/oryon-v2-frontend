import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/firstAccessApi', () => ({ firstAccessApi: { status: vi.fn() } }))

import { firstAccessApi } from '@/services/firstAccessApi'
import { firstAccessRequired, invalidateFirstAccessStatus } from './firstAccessGate'

const status = firstAccessApi.status as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  invalidateFirstAccessStatus()
  status.mockReset()
})

describe('firstAccessRequired (SCRUM-1212, F2)', () => {
  it('falha de status não libera: rejeita e não fica em cache', async () => {
    status.mockRejectedValueOnce(new Error('rede'))
    await expect(firstAccessRequired('u1')).rejects.toThrow('rede')
    status.mockResolvedValueOnce({ required: true })
    await expect(firstAccessRequired('u1')).resolves.toBe(true)
    expect(status).toHaveBeenCalledTimes(2)
  })

  it('sucesso fica em cache por usuário', async () => {
    status.mockResolvedValue({ required: false })
    await firstAccessRequired('u1')
    await firstAccessRequired('u1')
    expect(status).toHaveBeenCalledTimes(1)
    await firstAccessRequired('u2')
    expect(status).toHaveBeenCalledTimes(2)
  })
})
