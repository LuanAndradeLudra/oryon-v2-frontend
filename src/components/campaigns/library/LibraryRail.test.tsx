import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LibraryRail } from './LibraryRail'
import { EMPTY_FILTERS, type LibraryFilters, type RailGroup } from './libraryFilters'

const GROUPS: RailGroup[] = [
  {
    axis: 'status',
    title: 'Status Meta',
    options: [
      { value: 'all', label: 'Todos', count: 12 },
      { value: 'APPROVED', label: 'Aprovados', count: 8 },
      { value: 'REJECTED', label: 'Rejeitados', count: 2 },
    ],
  },
  {
    axis: 'category',
    title: 'Categoria',
    options: [{ value: 'MARKETING', label: 'Marketing', count: 6 }],
  },
]

function renderRail(filters: LibraryFilters = EMPTY_FILTERS, search = '') {
  const onFilterChange = vi.fn()
  const onSearchChange = vi.fn()
  render(
    <LibraryRail
      groups={GROUPS}
      filters={filters}
      search={search}
      onSearchChange={onSearchChange}
      onFilterChange={onFilterChange}
    />,
  )
  return { onFilterChange, onSearchChange }
}

describe('LibraryRail', () => {
  it('mostra cada grupo com o título e a contagem de cada opção', () => {
    renderRail()
    expect(screen.getByText('Status Meta')).toBeInTheDocument()
    expect(screen.getByText('Categoria')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aprovados/ })).toHaveTextContent('8')
    expect(screen.getByRole('button', { name: /Marketing/ })).toHaveTextContent('6')
  })

  it('marca como pressionada só a opção ativa daquele eixo', () => {
    renderRail({ ...EMPTY_FILTERS, status: 'APPROVED' })
    expect(screen.getByRole('button', { name: /Aprovados/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Todos/ })).toHaveAttribute('aria-pressed', 'false')
    // Outro eixo não é arrastado junto: 'all' de categoria continua solto
    // porque a categoria só tem a opção Marketing, que não está escolhida.
    expect(screen.getByRole('button', { name: /Marketing/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('despacha o eixo junto com o valor — a tela precisa dos dois', () => {
    const { onFilterChange } = renderRail()
    fireEvent.click(screen.getByRole('button', { name: /Rejeitados/ }))
    expect(onFilterChange).toHaveBeenCalledWith('status', 'REJECTED')
  })

  it('a busca é um campo de verdade, não um enfeite do mockup', () => {
    const { onSearchChange } = renderRail(EMPTY_FILTERS, '')
    fireEvent.change(screen.getByRole('searchbox', { name: /Buscar template/ }), { target: { value: 'a' } })
    expect(onSearchChange).toHaveBeenCalledWith('a')
  })

  it('não desenha grupo que o modelo não mandou', () => {
    // Sem BE.8 o `buildRail` não devolve o grupo "Uso"; o rail não pode
    // inventá-lo por conta própria.
    renderRail()
    expect(screen.queryByText('Uso')).not.toBeInTheDocument()
    expect(screen.queryByText('Idioma')).not.toBeInTheDocument()
  })
})
