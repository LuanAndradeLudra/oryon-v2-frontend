/**
 * 29/09 (PO): a matriz de 11 permissões "Em breve" (que o sistema não aplica)
 * saiu do formulário de setor. Fica uma pergunta só — "Este setor atende
 * conversas?" —, que liga o grupo Atendimento (o que decide se o setor precisa
 * de linha). Com uma linha só, ela é escolhida sozinha e aparece em texto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Departments } from './Departments'

const create = vi.fn(async (d: unknown) => ({ data: { id: 'd1', ...(d as object) } }))
const linhas = vi.hoisted(() => ({ atual: [{ id: 'n1', displayPhoneNumber: '+55 11 90000-0000', status: 'connected' }] as unknown[] }))

vi.mock('@/services/api', () => ({
  departmentsApi: {
    list: vi.fn(async () => ({ data: [] })),
    create: (d: unknown) => create(d),
    update: vi.fn(),
    remove: vi.fn(),
  },
  whatsappNumbersApi: { list: vi.fn(async () => ({ data: linhas.atual })) },
}))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'admin' } }) }))

async function abrirNovoSetor() {
  render(<MemoryRouter><Departments /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: /Novo setor/ }))
}

describe('Setores · "Este setor atende conversas?"', () => {
  beforeEach(() => { create.mockClear() })

  it('não mostra mais a matriz de permissões', async () => {
    await abrirNovoSetor()
    expect(screen.queryByText('Selecionar todas')).toBeNull()
    expect(screen.getByRole('switch', { name: 'Este setor atende conversas' })).toHaveAttribute('aria-checked', 'false')
  })

  it('com uma linha só: ligar escolhe a linha, mostra em texto e salva com o grupo Atendimento', async () => {
    await abrirNovoSetor()
    fireEvent.change(screen.getByPlaceholderText('Ex: Suporte, Marketing'), { target: { value: 'Recepção' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Este setor atende conversas' }))
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByText(/\+55 11 90000-0000/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }))
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const enviado = create.mock.calls[0][0] as { whatsappNumberId: string; permissions: string[] }
    expect(enviado.whatsappNumberId).toBe('n1')
    expect(enviado.permissions).toEqual(expect.arrayContaining(['read_conversations', 'reply_conversations']))
  })
})
