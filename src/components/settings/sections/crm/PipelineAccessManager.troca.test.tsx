// Revisão 03/10: trocar de funil rápido não pode deixar o acesso do funil A
// preencher (e ser salvo) no funil B.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

const pendentes: Record<string, (v: unknown) => void> = {}
vi.mock('@/services/api', () => ({
  departmentsApi: { list: vi.fn(async () => ({ data: [{ id: 'd1', name: 'Recepção' }, { id: 'd2', name: 'Comercial' }] })) },
  pipelinesApi: { getAccess: vi.fn((id: string) => new Promise((r) => { pendentes[id] = r })), updateAccess: vi.fn() },
}))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }))

import { PipelineAccessManager } from './PipelineAccessManager'

const funil = (id: string) => ({ id, name: id, stages: [] }) as never

describe('PipelineAccessManager · troca de funil', () => {
  it('resposta atrasada do funil A não preenche os setores do funil B', async () => {
    const { rerender } = render(<PipelineAccessManager pipeline={funil('A')} onChanged={vi.fn()} />)
    rerender(<PipelineAccessManager pipeline={funil('B')} onChanged={vi.fn()} />)
    await act(async () => { pendentes.B({ data: { implicitAll: false, departmentIds: ['d2'] } }) })
    await act(async () => { pendentes.A({ data: { implicitAll: false, departmentIds: ['d1'] } }) })
    const recepcao = screen.getByText('Recepção').closest('label')!.querySelector('input') as HTMLInputElement
    const comercial = screen.getByText('Comercial').closest('label')!.querySelector('input') as HTMLInputElement
    expect(comercial.checked).toBe(true)
    expect(recepcao.checked).toBe(false)
  })
})
