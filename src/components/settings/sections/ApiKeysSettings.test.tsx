/**
 * SCRUM-1219 — tela "Chaves de API": sem o flag mostra o card de
 * liberação; com o flag lista, cria (segredo exibido uma vez), troca e revoga.
 * C3 (04/11): validade (`expiresAt`), troca com sobreposição e status `expired`.
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
  rotate: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.atual }))
vi.mock('@/services/api', () => ({
  pipelinesApi: { list: vi.fn(async () => ({ data: [{ id: 'p1', name: 'Vendas' }] })) },
}))
vi.mock('@/services/apiKeysApi', () => ({
  apiKeysApi: keysApi,
  apiDocsUrl: () => 'http://localhost:3000/api/v1/docs',
  DEFAULT_ROTATION_OVERLAP_DAYS: 7,
}))

const key = (over: Record<string, unknown> = {}) => ({
  id: 'k1', name: 'n8n', prefix: 'abcdefghijkl', scopes: ['contacts:read'], pipelineIds: null,
  createdByUserId: 'u1', createdByName: 'João', lastUsedAt: null, revokedAt: null,
  expiresAt: null, replacedByKeyId: null,
  createdAt: '2026-10-03T12:00:00.000Z', status: 'active', ...over,
})

const DAY = 24 * 60 * 60 * 1000
const emDias = (n: number) => new Date(Date.now() + n * DAY).toISOString()

const renderTela = () => render(<MemoryRouter><ApiKeysSettings /></MemoryRouter>)

describe('Chaves de API', () => {
  beforeEach(() => {
    auth.atual = { user: { id: 'u1', role: 'admin' }, featureFlags: ['FF_PUBLIC_API'] }
    keysApi.list.mockReset().mockResolvedValue([key()])
    keysApi.create.mockReset()
    keysApi.rotate.mockReset()
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

  it('lista com prefixo mascarado, escopos, criador e validade', async () => {
    renderTela()
    expect(await screen.findByText('oryon_live_abcdefghijkl…')).toBeInTheDocument()
    expect(screen.getByText(/Ler contatos/)).toBeInTheDocument()
    expect(screen.getByText(/Criada por João/)).toBeInTheDocument()
    expect(screen.getByText(/Último uso: nunca/)).toBeInTheDocument()
    expect(screen.getByText('Sem validade')).toBeInTheDocument()
  })

  it('mostra quando vence e destaca a última semana', async () => {
    keysApi.list.mockResolvedValue([
      key({ id: 'a', name: 'Longe', expiresAt: emDias(60) }),
      // 3 dias e 1 minuto conta como 3 dias (arredondar para cima dizia "4 dias").
      key({ id: 'b', name: 'Perto', expiresAt: emDias(3 + 1 / 1440) }),
      key({ id: 'c', name: 'Hoje', expiresAt: emDias(5 / 24) }),
    ])
    renderTela()
    const linhas = await screen.findAllByTestId('api-key-expiry')
    expect(linhas[0]).toHaveTextContent(/Vence em .*\(60 dias\)$/)
    expect(linhas[1]).toHaveTextContent(/\(3 dias\) — troque a chave antes disso/)
    expect(linhas[2]).toHaveTextContent(/\(menos de 1 dia\) — troque a chave antes disso/)
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

  it('chave expirada: selo, sem ações e depois das ativas', async () => {
    keysApi.list.mockResolvedValue([
      key({ id: 'e1', name: 'Vencida', status: 'expired', expiresAt: '2026-10-04T12:00:00.000Z' }),
      key({ id: 'a1', name: 'Em uso' }),
    ])
    renderTela()
    const ativa = await screen.findByText('Em uso')
    const vencida = screen.getByText('Vencida')
    expect(ativa.compareDocumentPosition(vencida) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText(/^Expirada em/)).toBeInTheDocument()
    expect(screen.getByText(/Parou de funcionar em/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Revogar' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Trocar chave/ })).toHaveLength(1)
  })

  it('chave em troca mostra a substituta e até quando vale, sem oferecer nova troca', async () => {
    keysApi.list.mockResolvedValue([
      key({ id: 'k2', name: 'n8n', prefix: 'novaprefixo1' }),
      key({ id: 'k1', name: 'n8n', replacedByKeyId: 'k2', expiresAt: '2026-11-12T12:00:00.000Z' }),
    ])
    renderTela()
    expect(await screen.findByTestId('api-key-replaced'))
      .toHaveTextContent(/Substituída por "n8n" \(oryon_live_novaprefixo1…\) · vale até 12\/11\/2026/)
    expect(screen.getByText('Em troca')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Trocar chave/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Revogar' })).toHaveLength(2)
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
    // Sem validade escolhida, o campo não vai (o backend entende "sem validade").
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

  it('cria com validade em dias', async () => {
    keysApi.create.mockResolvedValue({ key: key({ id: 'k2', name: 'Site', expiresAt: emDias(90) }), secret: SECRET })
    renderTela()
    fireEvent.click(await screen.findByTestId('api-keys-new'))
    fireEvent.change(screen.getByPlaceholderText('Ex.: n8n'), { target: { value: 'Site' } })
    fireEvent.change(screen.getByTestId('api-keys-validity'), { target: { value: '90' } })
    fireEvent.click(screen.getByTestId('api-keys-create'))
    await waitFor(() => expect(keysApi.create).toHaveBeenCalledWith({
      name: 'Site', scopes: ['contacts:read', 'contacts:write'], pipelineIds: null, expiresInDays: 90,
    }))
    expect(await screen.findByTestId('api-key-secret')).toHaveTextContent(SECRET)
  })

  it('troca: mostra o segredo novo uma vez e até quando a antiga vale', async () => {
    const nova = key({ id: 'k2', prefix: 'novaprefixo1', createdAt: '2026-11-05T12:00:00.000Z' })
    const antiga = key({ replacedByKeyId: 'k2', expiresAt: '2026-11-12T12:00:00.000Z' })
    keysApi.rotate.mockResolvedValue({ key: nova, secret: SECRET, previous: antiga })
    renderTela()
    fireEvent.click(await screen.findByRole('button', { name: /Trocar chave/ }))
    expect(screen.getByTestId('api-keys-overlap')).toHaveValue('7')
    expect(screen.getByTestId('api-keys-rotate-validity')).toHaveDisplayValue('Sem validade (igual à atual)')
    fireEvent.click(screen.getByTestId('api-keys-rotate-confirm'))
    await waitFor(() => expect(keysApi.rotate).toHaveBeenCalledWith('k1', { overlapDays: 7 }))
    expect(await screen.findByTestId('api-key-secret')).toHaveTextContent(SECRET)
    expect(screen.getByText('Chave "n8n" trocada')).toBeInTheDocument()
    expect(screen.getByTestId('api-key-previous-until')).toHaveTextContent(/continua valendo até 12\/11\/2026/)
    fireEvent.click(screen.getByRole('button', { name: 'Já guardei a chave' }))
    await waitFor(() => expect(screen.queryByTestId('api-key-secret')).toBeNull())
    // A lista passa a ter a nova e a antiga "em troca", ligadas.
    expect(screen.getAllByTestId('api-key-row')).toHaveLength(2)
    expect(screen.getByTestId('api-key-replaced')).toHaveTextContent(/oryon_live_novaprefixo1…/)
  })

  it('troca imediata e validade nova escolhida', async () => {
    keysApi.list.mockResolvedValue([key({ expiresAt: emDias(80), createdAt: new Date(Date.now() - 10 * DAY).toISOString() })])
    keysApi.rotate.mockResolvedValue({
      key: key({ id: 'k2', prefix: 'novaprefixo1' }), secret: SECRET,
      previous: key({ status: 'expired', replacedByKeyId: 'k2', expiresAt: new Date().toISOString() }),
    })
    renderTela()
    fireEvent.click(await screen.findByRole('button', { name: /Trocar chave/ }))
    expect(screen.getByTestId('api-keys-rotate-validity')).toHaveDisplayValue('Mesma da atual (90 dias)')
    fireEvent.change(screen.getByTestId('api-keys-overlap'), { target: { value: '0' } })
    expect(screen.getByText(/erro 401 em até 30 segundos/)).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('api-keys-rotate-validity'), { target: { value: '365' } })
    fireEvent.click(screen.getByTestId('api-keys-rotate-confirm'))
    await waitFor(() => expect(keysApi.rotate).toHaveBeenCalledWith('k1', { overlapDays: 0, expiresInDays: 365 }))
    expect(await screen.findByTestId('api-key-previous-until')).toHaveTextContent(/já parou de funcionar/)
  })

  it('erro na troca fica no modal e não mostra segredo', async () => {
    keysApi.rotate.mockRejectedValue(new Error('rede'))
    renderTela()
    fireEvent.click(await screen.findByRole('button', { name: /Trocar chave/ }))
    fireEvent.click(screen.getByTestId('api-keys-rotate-confirm'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByTestId('api-key-secret')).toBeNull()
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
