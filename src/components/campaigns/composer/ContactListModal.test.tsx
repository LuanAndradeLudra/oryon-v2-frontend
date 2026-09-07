import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactListModal, type ContactListItem } from './ContactListModal'

const item = (n: number): ContactListItem => ({
  id: `c${n}`, displayName: `Contato ${n}`, waId: `551199999000${n}`, stage: null,
})

const PAGINA = [item(1), item(2), item(3)]

function renderModal(over: Partial<Parameters<typeof ContactListModal>[0]> = {}) {
  const onPageChange = vi.fn()
  const onClose = vi.fn()
  const view = render(
    <ContactListModal
      open
      items={PAGINA}
      total={PAGINA.length}
      page={1}
      limit={50}
      onPageChange={onPageChange}
      onClose={onClose}
      {...over}
    />,
  )
  return { ...view, onPageChange, onClose }
}

describe('ContactListModal — lista paginada por props', () => {
  it('lista os contatos da página recebida', () => {
    renderModal()
    expect(screen.getByText('Contato 1')).toBeInTheDocument()
    expect(screen.getByText('Contato 3')).toBeInTheDocument()
    expect(screen.getByText('3 contatos nesta lista')).toBeInTheDocument()
  })

  it('fechado não renderiza nada', () => {
    renderModal({ open: false })
    expect(screen.queryByText('Contato 1')).not.toBeInTheDocument()
  })

  it('navega entre páginas e informa qual está aberta', () => {
    const { onPageChange } = renderModal({ total: 130, page: 2, limit: 50 })
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('não oferece página anterior na primeira nem próxima na última', () => {
    const { unmount } = renderModal({ total: 130, page: 1, limit: 50 })
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    unmount()

    renderModal({ total: 130, page: 3, limit: 50 })
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })

  it('lista que cabe numa página não mostra paginação', () => {
    renderModal({ total: 3, limit: 50 })
    expect(screen.queryByRole('button', { name: 'Próxima página' })).not.toBeInTheDocument()
  })

  it('a busca só aparece quando a lista inteira está aqui', () => {
    // Paginado, um campo que filtra em memória responderia "não encontrado"
    // sobre uma base que nunca olhou, e o operador concluiria que o contato
    // ficou de fora do público.
    const { unmount } = renderModal({ total: 130, limit: 50 })
    expect(screen.queryByLabelText('Buscar nesta lista')).not.toBeInTheDocument()
    unmount()

    renderModal({ total: 3, limit: 50 })
    expect(screen.getByLabelText('Buscar nesta lista')).toBeInTheDocument()
  })

  it('com a lista inteira, a busca filtra', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('Buscar nesta lista'), { target: { value: 'Contato 2' } })
    expect(screen.getByText('Contato 2')).toBeInTheDocument()
    expect(screen.queryByText('Contato 1')).not.toBeInTheDocument()
  })

  it('falha de carga não vira "nenhum contato": público desconhecido não é público vazio', () => {
    renderModal({ items: [], total: 0, error: 'Não foi possível carregar os contatos deste público.' })
    expect(screen.getByText(/Não foi possível carregar/)).toBeInTheDocument()
    expect(screen.queryByText('Nenhum contato nesta lista')).not.toBeInTheDocument()
  })

  it('carregando mostra o estado de carga, e não a lista vazia', () => {
    renderModal({ items: [], total: 0, loading: true })
    expect(screen.getByRole('status', { name: 'Carregando contatos' })).toBeInTheDocument()
    expect(screen.queryByText('Nenhum contato nesta lista')).not.toBeInTheDocument()
  })

  it('lista realmente vazia diz que está vazia', () => {
    renderModal({ items: [], total: 0 })
    expect(screen.getByText('Nenhum contato nesta lista')).toBeInTheDocument()
  })

  it('mostra o estágio quando o chamador conhece a tabela', () => {
    renderModal({
      items: [{ ...item(1), stage: 'lead' }],
      total: 1,
      stages: [{ key: 'lead', label: 'Lead', color: '#2DD4BF' }],
    })
    expect(screen.getByText('Lead')).toBeInTheDocument()
  })
})
