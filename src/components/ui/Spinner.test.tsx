// Spinner — o "padrão oficial" que a auditoria de tokens visuais assumia já
// existir e não existia (99 arquivos reimplementavam `<Loader2 ...
// animate-spin" />` à mão). Cobre: decorativo por padrão (sem `label`,
// aria-hidden, sem role) e acessível quando `label` é passado (role="status"
// + texto sr-only) — o caso de spinner sozinho, sem texto visível ao lado.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('sem label, é decorativo — aria-hidden, sem role', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('aplica a classe default w-4 h-4 e animate-spin', () => {
    const { container } = render(<Spinner />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('animate-spin')
    expect(svg?.getAttribute('class')).toContain('w-4')
  })

  it('className customizado sobrescreve o tamanho default (twMerge)', () => {
    const { container } = render(<Spinner className="w-6 h-6 text-brand-400" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('w-6')
    expect(svg?.getAttribute('class')).not.toContain('w-4')
    expect(svg?.getAttribute('class')).toContain('text-brand-400')
  })

  it('com label, fica acessível — role="status" + texto sr-only', () => {
    render(<Spinner label="Carregando contatos…" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Carregando contatos…')
  })
})
