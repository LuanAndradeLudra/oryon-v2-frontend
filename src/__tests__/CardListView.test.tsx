import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardListView } from '@/components/common/CardListView'

interface Item {
  id: string
  name: string
}

const items: Item[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
]

describe('CardListView', () => {
  it('renders one card per item using renderCard', () => {
    render(
      <CardListView
        items={items}
        getKey={(i) => i.id}
        renderCard={(i) => <div>card-{i.name}</div>}
      />,
    )
    expect(screen.getByText('card-Alice')).toBeInTheDocument()
    expect(screen.getByText('card-Bob')).toBeInTheDocument()
  })

  it('shows the loading spinner when isLoading is true', () => {
    render(
      <CardListView
        items={items}
        getKey={(i) => i.id}
        renderCard={(i) => <div>card-{i.name}</div>}
        isLoading
      />,
    )
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument()
    expect(screen.queryByText('card-Alice')).not.toBeInTheDocument()
  })

  it('shows the default empty state when items is empty', () => {
    render(
      <CardListView
        items={[]}
        getKey={(i: Item) => i.id}
        renderCard={(i) => <div>card-{i.name}</div>}
      />,
    )
    expect(screen.getByText('Nenhum item')).toBeInTheDocument()
  })

  it('shows a custom emptyState when provided', () => {
    render(
      <CardListView
        items={[]}
        getKey={(i: Item) => i.id}
        renderCard={(i) => <div>card-{i.name}</div>}
        emptyState={<div>Sem contatos cadastrados</div>}
      />,
    )
    expect(screen.getByText('Sem contatos cadastrados')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum item')).not.toBeInTheDocument()
  })
})
