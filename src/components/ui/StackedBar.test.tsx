import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StackedBar } from './StackedBar'

describe('StackedBar', () => {
  it('renderiza role="img" com aria-label descrevendo os segmentos', () => {
    render(
      <StackedBar
        segments={[
          { value: 57, color: 'brand', label: 'Elegíveis' },
          { value: 39, color: 'rose', label: 'Recebeu em 7d' },
        ]}
      />,
    )
    const bar = screen.getByRole('img')
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('Elegíveis: 57'))
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('Recebeu em 7d: 39'))
  })

  it('largura de cada segmento é proporcional ao total (soma dos values)', () => {
    const { container } = render(
      <StackedBar
        segments={[
          { value: 25, color: 'brand' },
          { value: 75, color: 'rose' },
        ]}
      />,
    )
    const [track] = container.querySelectorAll('[role="img"]')
    const bars = track.children
    expect(bars).toHaveLength(2)
    expect((bars[0] as HTMLElement).style.width).toBe('25%')
    expect((bars[1] as HTMLElement).style.width).toBe('75%')
  })

  it('com `total` maior que a soma, sobra vira trilho não contabilizado', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 30, color: 'brand', label: 'Feito' }]} total={100} />,
    )
    const track = container.querySelector('[role="img"]')!
    expect(track.children).toHaveLength(2) // segmento + resto do trilho
    expect((track.children[0] as HTMLElement).style.width).toBe('30%')
    expect((track.children[1] as HTMLElement).style.width).toBe('70%')
  })

  it('segmento `dimmed` aplica opacidade reduzida (caso D6: "recebeu em 7d")', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 100, color: 'rose', dimmed: true }]} />,
    )
    const segment = container.querySelector('[role="img"]')!.children[0] as HTMLElement
    expect(segment.style.opacity).toBe('0.7')
  })

  it('legend=true renderiza uma linha por segmento com dot + label + valor', () => {
    render(
      <StackedBar
        legend
        segments={[
          { value: 10, color: 'brand', label: 'Elegíveis' },
          { value: 5, color: 'muted', label: 'Sem opt-in' },
        ]}
      />,
    )
    expect(screen.getByText('Elegíveis')).toBeInTheDocument()
    expect(screen.getByText('Sem opt-in')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('legend=false (default) não renderiza nenhuma legenda', () => {
    render(<StackedBar segments={[{ value: 10, color: 'brand', label: 'Elegíveis' }]} />)
    expect(screen.queryByText('Elegíveis')).not.toBeInTheDocument()
  })

  it('com `total` explícito MENOR que a soma dos segmentos, não estoura 100% de largura', () => {
    const { container } = render(
      <StackedBar
        total={50}
        segments={[
          { value: 60, color: 'brand' },
          { value: 40, color: 'rose' },
        ]}
      />,
    )
    const track = container.querySelector('[role="img"]')!
    // effectiveTotal deve ser clampado pra soma (100), não o `total` informado (50)
    expect(track.children).toHaveLength(2) // sem remainder — soma já preenche tudo
    const widths = Array.from(track.children).map((c) => (c as HTMLElement).style.width)
    expect(widths).toEqual(['60%', '40%'])
  })

  it('height controla a altura renderizada da trilha', () => {
    const { container } = render(<StackedBar segments={[{ value: 1, color: 'brand' }]} height={14} />)
    const track = container.querySelector('[role="img"]') as HTMLElement
    expect(track.style.height).toBe('14px')
  })
})
