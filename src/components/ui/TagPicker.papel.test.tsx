// Revisão final 04/10: criar/excluir etiqueta só para administrador, e excluir
// (global) pede confirmação; falha aparece em vez de sumir calada.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const quem = vi.hoisted(() => ({ role: 'admin' }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: quem.role } }) }))

import { TagPickerContent } from './TagPicker'
import type { Tag } from '@/types'

const TAG = { id: 't1', name: 'VIP', color: '#0F766E' } as Tag

beforeEach(() => { quem.role = 'admin' })

describe('TagPickerContent · papel e confirmação', () => {
  it('atendente não vê criar nem excluir', () => {
    quem.role = 'agent'
    render(<TagPickerContent allTags={[TAG]} selectedTags={[]} onAdd={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByTitle('Nova etiqueta')).toBeNull()
    fireEvent.mouseEnter(screen.getByText('VIP').closest('div')!.parentElement!)
    expect(screen.queryByLabelText(/Excluir etiqueta/)).toBeNull()
  })

  it('admin: o 1º clique na lixeira pede confirmação; só o 2º exclui', async () => {
    const onDelete = vi.fn(async () => {})
    render(<TagPickerContent allTags={[TAG]} selectedTags={[]} onAdd={vi.fn()} onRemove={vi.fn()} onDelete={onDelete} />)
    fireEvent.mouseEnter(screen.getByText('VIP').closest('div')!.parentElement!)
    fireEvent.click(screen.getByLabelText('Excluir etiqueta VIP'))
    expect(onDelete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Confirmar exclusão da etiqueta VIP'))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('t1'))
  })

  it('falha ao criar aparece para o usuário', async () => {
    const onCreate = vi.fn(async () => { throw new Error('sem permissão') })
    render(<TagPickerContent allTags={[]} selectedTags={[]} onAdd={vi.fn()} onRemove={vi.fn()} onCreate={onCreate} />)
    fireEvent.click(screen.getByTitle('Nova etiqueta'))
    fireEvent.change(screen.getByPlaceholderText('Nome da etiqueta...'), { target: { value: 'Retorno' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar/ }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
