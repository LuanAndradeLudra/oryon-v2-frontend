// Revisão final 04/10: a lista de linhas do workspace vem da rota que serve a
// todos os papéis — /meta/numbers (só admin) deixava supervisor e atendente
// com "sem linha" em tudo.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const { list, listDetailed } = vi.hoisted(() => ({
  list: vi.fn(async () => ({ data: [] })),
  listDetailed: vi.fn(async () => ({ data: [{ id: 'l1', isActive: true, displayPhoneNumber: '+55' }] })),
}))
vi.mock('@/services/api', () => ({ whatsappNumbersApi: { list, listDetailed } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tenantId: 't1', role: 'supervisor' } }) }))

import { WorkspaceNumberProvider, useWorkspaceNumber } from './WorkspaceNumberContext'

describe('WorkspaceNumberContext', () => {
  it('supervisor recebe as linhas (rota que serve a todos os papéis)', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceNumberProvider>{children}</WorkspaceNumberProvider>
    const { result } = renderHook(() => useWorkspaceNumber(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.numbers.map((n) => n.id)).toEqual(['l1'])
    expect(list).not.toHaveBeenCalled()
  })
})
