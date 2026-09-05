import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RingProgress } from './RingProgress'

describe('RingProgress', () => {
  it('renderiza role="progressbar" com aria-valuenow/min/max corretos', () => {
    render(<RingProgress value={80} label="Resolvido pela IA" />)
    const ring = screen.getByRole('progressbar')
    expect(ring).toHaveAttribute('aria-valuenow', '80')
    expect(ring).toHaveAttribute('aria-valuemin', '0')
    expect(ring).toHaveAttribute('aria-valuemax', '100')
    expect(ring).toHaveAttribute('aria-label', 'Resolvido pela IA')
  })

  it('sem max, mostra o valor como porcentagem no centro (caso "80%" do Pulso)', () => {
    render(<RingProgress value={80} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('com max, mostra o valor cru formatado no centro (caso "118" de meta 260)', () => {
    render(<RingProgress value={118} max={260} />)
    expect(screen.getByText('118')).toBeInTheDocument()
    expect(screen.queryByText('118%')).not.toBeInTheDocument()
  })

  it('children sobrescreve o centro (caso "1/3" do Onboarding, não é um número simples)', () => {
    render(
      <RingProgress value={1} max={3}>
        1/3
      </RingProgress>,
    )
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('sem label, usa aria-label genérico "Progresso"', () => {
    render(<RingProgress value={50} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Progresso')
  })

  it('dashoffset bate com o percentual esperado (circunferência ≈169.65, 0% preenchido)', () => {
    const { container } = render(<RingProgress value={0} max={100} />)
    const arc = container.querySelectorAll('circle')[1]
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(2 * Math.PI * 27, 1)
  })

  it('dashoffset bate com o percentual esperado (100% preenchido → offset 0)', () => {
    const { container } = render(<RingProgress value={100} max={100} />)
    const arc = container.querySelectorAll('circle')[1]
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1)
  })

  it('dashoffset bate com o percentual esperado (caso "118" de meta 260, ≈45,4%)', () => {
    const { container } = render(<RingProgress value={118} max={260} />)
    const arc = container.querySelectorAll('circle')[1]
    const circumference = 2 * Math.PI * 27
    const expectedOffset = circumference * (1 - 118 / 260)
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(expectedOffset, 1)
  })

  it('clampa value acima de max em 100% preenchido (não estoura o arco)', () => {
    const { container } = render(<RingProgress value={150} max={100} />)
    const arc = container.querySelectorAll('circle')[1]
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1)
  })

  it('clampa value negativo em 0% preenchido', () => {
    const { container } = render(<RingProgress value={-10} max={100} />)
    const arc = container.querySelectorAll('circle')[1]
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(2 * Math.PI * 27, 1)
  })

  it('aria-valuenow nunca excede aria-valuemax mesmo com value > max', () => {
    render(<RingProgress value={150} max={100} />)
    const ring = screen.getByRole('progressbar')
    expect(ring).toHaveAttribute('aria-valuenow', '100')
    expect(ring).toHaveAttribute('aria-valuemax', '100')
  })

  it('aria-valuenow nunca fica abaixo de aria-valuemin mesmo com value negativo', () => {
    render(<RingProgress value={-10} max={100} />)
    const ring = screen.getByRole('progressbar')
    expect(ring).toHaveAttribute('aria-valuenow', '0')
  })

  it('size muda width/height renderizado sem mudar a geometria interna (viewBox/raio)', () => {
    const { container } = render(<RingProgress value={50} size={72} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '72')
    expect(svg).toHaveAttribute('height', '72')
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
  })
})
