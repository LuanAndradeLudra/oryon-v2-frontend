/**
 * SCRUM-1219 — tela "API e integrações": sem o flag mostra o card de
 * liberação; com o flag lista, cria (segredo exibido uma vez) e revoga.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ApiKeysSettings } from './ApiKeysSettings'

const SECRET = `oryon_live_abcdefghijkl_${'A'.repeat(43)}`
const auth = vi.hoisted(() => ({ atual: { user: { id: 'u1', role: 'admin' }, featureFlags: ['FF_PUBLIC_API'] as string[] } }))
const keysApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.atual }))
vi.mock('@/services/api', () => ({
  pipelinesApi: { list: vi.fn(async () => ({ data: [{ id: 'p1', name: 'Vendas' }] })) },
}))
vi.mock('@/services/apiKeysApi', () => ({
  apiKeysApi: keysApi,
  apiDocsUrl: () => 'http://localhost:3000/api/v1/docs',
}))

const key = (over: Record<string, unknown> = {}) => ({
  id: 'k1', name: 'n8n', prefix: 'abcdefghijkl', scopes: ['contacts:read'], pipelineIds: null,
  createdByUserId: 'u1', createdByName: 'João', lastUsedAt: null, revokedAt: null,
  createdAt: '2026-10-03T12:00:00.000Z', status: 'active', ...over,
})

const renderTela = () => render(<MemoryRouter><ApiKeysSettings /></MemoryRouter>)

describe('API e integrações', () => {
  beforeEach(() => {
    auth.atual = { user: { id: 'u1', role: 'admin' }, featureFlags: ['FF_PUBLIC_API'] }
    keysApi.list.mockReset().mockResolvedValue([key()])
    keysApi.create.mockReset()
    keysApi.revoke.mockReset()
  })

  it('sem FF_PUBLIC_API explica a liberação e não chama a API', async () => {
    auth.atual = { user: { id: 'u1', role: 'admin' }, featureFlags: [] }
    renderTela()
    expect(await screen.findByTestId('api-keys-disabled')).toBeInTheDocument()
    expect(keysApi.list).not.toHaveBeenCalled()
    expect(screen.queryByTestId('api-keys-new')).toBeNull()
  })

  it('atendente não gerencia chaves', async () => {
    auth.atual = { user: { id: 'u1', role: 'agent' }, featureFlags: ['FF_PUBLIC_API'] }
    renderTela()
    expect(await screen.findByText(/Só administradores/)).toBeInTheDocument()
    expect(keysApi.list).not.toHaveBeenCalled()
  })

  it('lista com prefixo mascarado, escopos e criador', async () => {
    renderTela()
    expect(await screen.findByText('oryon_live_abcdefghijkl…')).toBeInTheDocument()
    expect(screen.getByText(/Ler contatos/)).toBeInTheDocument()
    expect(screen.getByText(/Criada por João/)).toBeInTheDocument()
    expect(screen.getByText(/Último uso: nunca/)).toBeInTheDocument()
  })

  it('chaves ativas aparecem antes das revogadas (revisão D15)', async () => {
    keysApi.list.mockResolvedValue([
      key({ id: 'r1', name: 'Revogada nova', status: 'revoked', revokedAt: '2026-10-03T13:00:00.000Z', createdAt: '2026-10-03T13:00:00.000Z' }),
      key({ id: 'a1', name: 'Ativa antiga', createdAt: '2026-10-01T12:00:00.000Z' }),
    ])
    renderTela()
    const ativa = await screen.findByText('Ativa antiga')
    const revogada = screen.getByText('Revogada nova')
    expect(ativa.compareDocumentPosition(revogada) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ao voltar para a aba atualiza o "último uso" sem recarregar a página (revisão D15)', async () => {
    renderTela()
    await screen.findByText(/Último uso: nunca/)
    keysApi.list.mockResolvedValue([key({ lastUsedAt: '2026-10-03T12:30:00.000Z' })])
    fireEvent(window, new Event('focus'))
    await waitFor(() => expect(screen.queryByText(/Último uso: nunca/)).toBeNull())
    expect(keysApi.list).toHaveBeenCalledTimes(2)
  })

  it('cria e mostra o segredo uma única vez', async () => {
    keysApi.create.mockResolvedValue({ key: key({ id: 'k2', name: 'ERP' }), secret: SECRET })
    renderTela()
    fireEvent.click(await screen.findByTestId('api-keys-new'))
    fireEvent.change(screen.getByPlaceholderText('Ex.: n8n'), { target: { value: 'ERP' } })
    fireEvent.click(screen.getByTestId('api-keys-create'))
    await waitFor(() => expect(keysApi.create).toHaveBeenCalledWith({
      name: 'ERP', scopes: ['contacts:read', 'contacts:write'], pipelineIds: null,
    }))
    expect(await screen.findByTestId('api-key-secret')).toHaveTextContent(SECRET)
    expect(screen.getByText(/não será exibida de novo/)).toBeInTheDocument()
    // Revisão D: Esc não fecha (a chave se perderia para sempre).
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyDown(screen.getByTestId('api-key-secret'), { key: 'Escape' })
    expect(screen.getByTestId('api-key-secret')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Já guardei a chave' }))
    await waitFor(() => expect(screen.queryByTestId('api-key-secret')).toBeNull())
    expect(screen.queryByText(SECRET)).toBeNull()
  })

  it('falha ao carregar os funis avisa que a chave valerá para todos (revisão D)', async () => {
    const { pipelinesApi } = await import('@/services/api')
    vi.mocked(pipelinesApi.list).mockRejectedValueOnce(new Error('rede'))
    renderTela()
    fireEvent.click(await screen.findByTestId('api-keys-new'))
    expect(await screen.findByTestId('api-keys-pipelines-error')).toHaveTextContent(/todos os funis/)
  })

  it('não oferece metrics:read', async () => {
    renderTela()
    fireEvent.click(await screen.findByTestId('api-keys-new'))
    expect(screen.queryByText(/métricas/i)).toBeNull()
  })

  it('revogar pede confirmação', async () => {
    keysApi.revoke.mockResolvedValue(key({ status: 'revoked', revokedAt: '2026-10-03T13:00:00.000Z' }))
    renderTela()
    fireEvent.click(await screen.findByRole('button', { name: 'Revogar' }))
    expect(keysApi.revoke).not.toHaveBeenCalled()
    const confirmar = screen.getAllByRole('button', { name: 'Revogar' }).at(-1)!
    fireEvent.click(confirmar)
    await waitFor(() => expect(keysApi.revoke).toHaveBeenCalledWith('k1'))
    expect(await screen.findByText(/Revogada em/)).toBeInTheDocument()
  })
})
