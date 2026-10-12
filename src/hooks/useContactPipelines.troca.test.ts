// Revisão 03/10: trocar de conversa (J/K) não pode deixar os negócios do
// contato anterior na tela nem deixar a resposta atrasada deles voltar.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const pendentes: Record<string, (v: unknown) => void> = {}
vi.mock('@/services/api', () => ({ dealsApi: { list: vi.fn((id: string) => new Promise((r) => { pendentes[id] = r })) } }))
vi.mock('@/services/socket', () => ({ connectSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@/contexts/CRMConfigContext', () => ({ useCRMConfig: () => ({ pipelines: [] }) }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => true }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

import { useContactPipelines } from './useContactPipelines'

const negocio = (id: string, contactId: string) => ({ id, contactId, status: 'open', pipelineId: 'p', stageId: 's' })

describe('useContactPipelines · troca de contato', () => {
  it('zera ao trocar e descarta a resposta atrasada do contato anterior', async () => {
    const { result, rerender } = renderHook(({ id }) => useContactPipelines(id, 'Nome'), { initialProps: { id: 'A' } })
    await act(async () => { pendentes.A({ data: [negocio('dA', 'A')] }) })
    expect(result.current.deals?.map((d) => d.id)).toEqual(['dA'])
    rerender({ id: 'B' })
    expect(result.current.deals).toBeNull()
    await act(async () => { pendentes.B({ data: [negocio('dB', 'B')] }) })
    // uma recarga atrasada de A (ex.: evento) chegando depois não toma a tela
    expect(result.current.deals?.map((d) => d.id)).toEqual(['dB'])
  })
})
