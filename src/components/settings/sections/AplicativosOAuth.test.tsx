import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ConexaoOAuth } from '@/services/oauthApi'

const auth = vi.hoisted(() => ({ role: 'admin', featureFlags: ['FF_PUBLIC_API'] as string[] }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: auth.role }, featureFlags: auth.featureFlags }) }))

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useToast', () => ({ showToast: toast }))

const api = vi.hoisted(() => ({ ler: vi.fn(), salvar: vi.fn(), minhas: vi.fn(), workspace: vi.fn(), desconectar: vi.fn() }))
vi.mock('@/services/oauthApi', async (original) => ({
  ...(await original<typeof import('@/services/oauthApi')>()),
  lerPoliticaOAuth: api.ler,
  salvarPoliticaOAuth: api.salvar,
  minhasConexoesOAuth: api.minhas,
  conexoesDoWorkspaceOAuth: api.workspace,
  desconectarOAuth: api.desconectar,
}))

import { AplicativosExternosSettings } from './AplicativosExternosSettings'
import { AplicativosConectadosSettings } from './AplicativosConectadosSettings'

const CLAUDE = 'https://claude.ai/c.json'
const conexao = (extra: Partial<ConexaoOAuth> = {}): ConexaoOAuth => ({
  id: 's1',
  cliente: { clientId: CLAUDE, nome: 'Claude', dominio: 'claude.ai', logoUri: null },
  nivel: 'leitura',
  limitado: false,
  grupos: [{ grupo: 'Contatos', ver: true, alterar: false }],
  conectadoEm: '2026-11-17T12:00:00.000Z',
  ultimaAtividade: null,
  venceEm: '2026-12-17T12:00:00.000Z',
  ...extra,
})

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset())
  toast.mockReset()
  auth.role = 'admin'
  auth.featureFlags = ['FF_PUBLIC_API']
})

describe('Aplicativos de IA externos (política do workspace)', () => {
  const politica = { ativo: false, clientesPermitidos: [] as string[], nivelMaximo: 'leitura' as const, papeisPermitidos: null }
  const disponiveis = [{ clientId: CLAUDE, nome: 'Claude', dominio: 'claude.ai', logoUri: null }]

  it('desligada: só o interruptor; ligar mostra aplicativos, nível e papéis; salvar manda a política', async () => {
    api.ler.mockResolvedValue({ politica, versao: 'v1', clientesDisponiveis: disponiveis, papeis: ['admin', 'business_admin', 'supervisor', 'agent'] })
    api.salvar.mockImplementation(async (p) => ({ politica: p, versao: 'v2', conexoesEncerradas: 0 }))
    render(<AplicativosExternosSettings />)
    const interruptor = await screen.findByRole('switch')
    expect(screen.queryByText('Aplicativos permitidos')).toBeNull()
    fireEvent.click(interruptor)
    fireEvent.click(screen.getByRole('checkbox', { name: /Claude/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Consultar e fazer alterações/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(api.salvar).toHaveBeenCalledWith({ ativo: true, clientesPermitidos: [CLAUDE], nivelMaximo: 'escrita', papeisPermitidos: null, versao: 'v1' }),
    )
    expect(toast).toHaveBeenCalledWith('Política salva.')
  })

  it('revisão: aplicativo que a Oryon bloqueou depois não vai no salvar (nunca trava)', async () => {
    api.ler.mockResolvedValue({
      politica: { ...politica, ativo: true, clientesPermitidos: [CLAUDE, 'https://bloqueado.example/c.json'] },
      versao: null,
      clientesDisponiveis: disponiveis,
      papeis: ['admin', 'agent'],
    })
    api.salvar.mockImplementation(async (p) => ({ politica: p, versao: 'v2', conexoesEncerradas: 0 }))
    render(<AplicativosExternosSettings />)
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.salvar).toHaveBeenCalledWith(expect.objectContaining({ clientesPermitidos: [CLAUDE] })))
  })

  it('revisão: erro do backend aparece em português (não o texto do axios); 409 recarrega a política', async () => {
    api.ler.mockResolvedValue({ politica: { ...politica, ativo: true }, versao: 'v1', clientesDisponiveis: disponiveis, papeis: ['admin'] })
    const erro = (status: number, code: string, message: string) =>
      Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data: { error: { code, message } } } })
    api.salvar.mockRejectedValueOnce(erro(422, 'invalido_nivelMaximo', 'Escolha "Só consultar" ou "Consultar e fazer alterações".'))
    render(<AplicativosExternosSettings />)
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Escolha "Só consultar" ou "Consultar e fazer alterações".', 'error'))
    expect(JSON.stringify(toast.mock.calls)).not.toContain('Request failed')
    api.salvar.mockRejectedValueOnce(erro(409, 'politica_mudou', 'Outra pessoa mudou esta política agora há pouco.'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.ler).toHaveBeenCalledTimes(2))
  })

  it('só alguns papéis: sem nenhum marcado não salva; conexões encerradas aparecem no aviso', async () => {
    api.ler.mockResolvedValue({ politica: { ...politica, ativo: true, clientesPermitidos: [CLAUDE] }, clientesDisponiveis: disponiveis, papeis: ['admin', 'business_admin', 'supervisor', 'agent'] })
    api.salvar.mockImplementation(async (p) => ({ politica: p, conexoesEncerradas: 2 }))
    render(<AplicativosExternosSettings />)
    fireEvent.click(await screen.findByRole('radio', { name: 'Só alguns papéis' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Administrador' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Dono' }))
    expect(screen.getByText('Escolha ao menos um papel.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    // Revisão ORY-94: os mesmos nomes de papel do resto do app (`roleLabel`).
    fireEvent.click(screen.getByRole('checkbox', { name: 'Agente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(api.salvar).toHaveBeenCalledWith(expect.objectContaining({ papeisPermitidos: ['agent'] })))
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('2 conexão(ões)'))
  })

  it('sem a API liberada: avisa que precisa falar com a Oryon', async () => {
    auth.featureFlags = []
    api.ler.mockResolvedValue({ politica, clientesDisponiveis: [], papeis: [] })
    render(<AplicativosExternosSettings />)
    expect(await screen.findByText(/ainda não está liberada/)).toBeInTheDocument()
  })
})

describe('Aplicativos conectados', () => {
  it('lista as minhas; desconectar pede confirmação e tira da lista', async () => {
    auth.role = 'agent'
    api.minhas.mockResolvedValue([conexao()])
    api.desconectar.mockResolvedValue(undefined)
    render(<AplicativosConectadosSettings />)
    const lista = await screen.findByRole('list', { name: 'Aplicativos conectados' })
    expect(within(lista).getByText('Claude')).toBeInTheDocument()
    expect(within(lista).getByText('Só consulta')).toBeInTheDocument()
    // Atendente não vê a troca para "Do workspace".
    expect(screen.queryByText('Do workspace')).toBeNull()
    fireEvent.click(within(lista).getByRole('button', { name: 'Desconectar' }))
    // O botão do modal de confirmação é o último "Desconectar" da tela.
    const botoes = await screen.findAllByRole('button', { name: 'Desconectar' })
    fireEvent.click(botoes[botoes.length - 1])
    await waitFor(() => expect(api.desconectar).toHaveBeenCalledWith('s1'))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Aplicativos conectados' })).toBeNull())
    expect(toast).toHaveBeenCalledWith('Claude foi desconectado.')
  })

  it('admin troca para "Do workspace" e vê quem conectou', async () => {
    api.minhas.mockResolvedValue([])
    api.workspace.mockResolvedValue([conexao({ id: 's2', pessoa: { id: 'u9', nome: 'Bia Souza' }, nivel: 'escrita' })])
    render(<AplicativosConectadosSettings />)
    expect(await screen.findByText('Nenhum aplicativo conectado')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Do workspace'))
    expect(await screen.findByText(/claude\.ai · Bia Souza/)).toBeInTheDocument()
    expect(screen.getByText('Consulta e altera')).toBeInTheDocument()
  })

  it('revisão: o nível limitado pelo administrador aparece na lista', async () => {
    api.minhas.mockResolvedValue([conexao({ limitado: true })])
    render(<AplicativosConectadosSettings />)
    expect(await screen.findByText('limitado pelo administrador')).toBeInTheDocument()
  })

  it('revisão: trocar rápido de vista não mostra a lista da outra (resposta fora de ordem)', async () => {
    let soltarMinhas: (v: ConexaoOAuth[]) => void = () => undefined
    api.minhas.mockReturnValue(new Promise<ConexaoOAuth[]>((r) => (soltarMinhas = r)))
    api.workspace.mockResolvedValue([conexao({ id: 's2', pessoa: { id: 'u9', nome: 'Bia Souza' } })])
    render(<AplicativosConectadosSettings />)
    fireEvent.click(screen.getByText('Do workspace'))
    expect(await screen.findByText(/claude\.ai · Bia Souza/)).toBeInTheDocument()
    // A resposta das "minhas" chega depois: não pode trocar a lista que está na tela.
    soltarMinhas([conexao({ id: 's-velha', cliente: { clientId: 'x', nome: 'Velha', dominio: 'velha.example', logoUri: null } })])
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText('Velha')).toBeNull()
    expect(screen.getByText(/claude\.ai · Bia Souza/)).toBeInTheDocument()
  })

  it('revisão: desconectar o que já tinha sido encerrado (404) tira da lista e recarrega', async () => {
    auth.role = 'agent'
    api.minhas.mockResolvedValueOnce([conexao()]).mockResolvedValueOnce([])
    api.desconectar.mockRejectedValue(Object.assign(new Error('x'), { response: { status: 404, data: { error: { code: 'nao_encontrado', message: 'Conexão não encontrada.' } } } }))
    render(<AplicativosConectadosSettings />)
    const lista = await screen.findByRole('list', { name: 'Aplicativos conectados' })
    fireEvent.click(within(lista).getByRole('button', { name: 'Desconectar' }))
    const botoes = await screen.findAllByRole('button', { name: 'Desconectar' })
    fireEvent.click(botoes[botoes.length - 1])
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Esta conexão já tinha sido encerrada.'))
    await waitFor(() => expect(api.minhas).toHaveBeenCalledTimes(2))
  })
})
