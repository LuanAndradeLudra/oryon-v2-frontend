// D2 (SCRUM-935) — a entrada "Funis" da navegação aponta pra cá, que decide
// pra qual funil ir sem a navegação precisar pré-carregar a lista.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PipelinesIndexPage } from './PipelinesIndexPage'
import { pipelinesApi } from '@/services/api'
import type { Pipeline } from '@/types'

vi.mock('@/services/api', () => ({
  pipelinesApi: { list: vi.fn() },
}))

const pipeline = (over: Partial<Pipeline>): Pipeline => ({
  id: 'p1', tenantId: 't', name: 'Vendas', color: '#14b8a6', order: 0, isDefault: false, isArchived: false, stages: [], openDealsCount: 0,
  ...over,
} as Pipeline)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/pipelines" element={<PipelinesIndexPage />} />
        <Route path="/pipelines/:id" element={<div data-testid="pipeline-page">chegou em pipelines/:id</div>} />
        <Route path="/contacts" element={<div data-testid="contacts-page">fallback contatos</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => { vi.mocked(pipelinesApi.list).mockReset() })

describe('PipelinesIndexPage', () => {
  it('redireciona pro funil PADRÃO do tenant', async () => {
    vi.mocked(pipelinesApi.list).mockResolvedValue({
      data: [pipeline({ id: 'p1', isDefault: false }), pipeline({ id: 'p2', isDefault: true })],
    } as never)
    renderAt('/pipelines')
    await waitFor(() => expect(screen.getByTestId('pipeline-page')).toBeInTheDocument())
  })

  it('sem nenhum funil disponível, cai para /contacts em vez de travar', async () => {
    vi.mocked(pipelinesApi.list).mockResolvedValue({ data: [] } as never)
    renderAt('/pipelines')
    await waitFor(() => expect(screen.getByTestId('contacts-page')).toBeInTheDocument())
  })
})
