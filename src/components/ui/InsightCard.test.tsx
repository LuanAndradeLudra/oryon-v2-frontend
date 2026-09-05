import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InsightCard } from './InsightCard'

describe('InsightCard', () => {
  it('renderiza ícone, título e descrição', () => {
    render(
      <InsightCard
        icon={<span data-testid="icon" />}
        title="Rafa pausado há 2 dias"
        description="14 conversas de cobrança esperando na fila."
      />,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Rafa pausado há 2 dias')).toBeInTheDocument()
    expect(screen.getByText('14 conversas de cobrança esperando na fila.')).toBeInTheDocument()
  })

  it('sem `actions`, não renderiza a linha de ações', () => {
    const { container } = render(
      <InsightCard icon={<span />} title="Título" description="Descrição" />,
    )
    // A linha de ações só existe quando `actions` é passado.
    expect(container.querySelectorAll('.mt-2').length).toBe(0)
  })

  it('com `actions`, renderiza o conteúdo passado', () => {
    render(
      <InsightCard
        icon={<span />}
        title="Título"
        description="Descrição"
        actions={<button>Reativar</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Reativar' })).toBeInTheDocument()
  })

  it('tone="dashed" usa borda tracejada e fundo transparente (padrão "Sugestão da IA")', () => {
    const { container } = render(
      <InsightCard icon={<span />} title="Título" description="Descrição" tone="dashed" />,
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('border-dashed')
    expect(card.className).toContain('bg-transparent')
  })

  it('tone="default" (padrão) usa fundo sólido, sem borda tracejada', () => {
    const { container } = render(<InsightCard icon={<span />} title="Título" description="Descrição" />)
    const card = container.firstChild as HTMLElement
    expect(card.className).not.toContain('border-dashed')
    expect(card.className).toContain('bg-surface-800')
  })

  it('accent (default "brand") tinge o quadrado do ícone via cor de acento', () => {
    const { container } = render(
      <InsightCard icon={<span />} title="Título" description="Descrição" accent="rose" />,
    )
    const iconWrapper = container.querySelector('span.w-8') as HTMLElement
    expect(iconWrapper.style.color).toBe('var(--color-accent-rose)')
  })
})
