import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { renderHighlightedSnippet } from './searchHighlight'

const START = '\u0001'
const END = '\u0002'

describe('renderHighlightedSnippet', () => {
  it('sem marcadores: devolve o texto como veio', () => {
    const { container } = render(<div>{renderHighlightedSnippet('Confirmado para quinta às 14h.')}</div>)
    expect(container.textContent).toBe('Confirmado para quinta às 14h.')
    expect(container.querySelector('mark')).toBeNull()
  })

  it('envolve o trecho marcado em <mark>, preserva o resto como texto', () => {
    const snippet = `${START}confirmar${END} essa informação antes`
    const { container } = render(<div>{renderHighlightedSnippet(snippet)}</div>)
    expect(container.textContent).toBe('confirmar essa informação antes')
    const mark = container.querySelector('mark')
    expect(mark?.textContent).toBe('confirmar')
  })

  it('usa os tokens dedicados de destaque (não a cor de hover do Button)', () => {
    // Opção "D" do comparativo — tokens PRÓPRIOS (search-highlight-bg/fg), não
    // --color-accent-soft (compartilhado com o hover do Button): reutilizar
    // aquele mudaria hover de botão junto se alguém ajustasse o alpha aqui.
    const snippet = `${START}confirmar${END} amanhã`
    const { container } = render(<div>{renderHighlightedSnippet(snippet)}</div>)
    const mark = container.querySelector('mark') as HTMLElement
    expect(mark.style.backgroundColor).toBe('var(--color-search-highlight-bg)')
    expect(mark.style.color).toBe('var(--color-search-highlight-fg)')
  })

  it('vários marcadores no mesmo snippet', () => {
    const snippet = `Vou ${START}confirmar${END} sua ${START}consulta${END} amanhã`
    const { container } = render(<div>{renderHighlightedSnippet(snippet)}</div>)
    expect(container.textContent).toBe('Vou confirmar sua consulta amanhã')
    expect(container.querySelectorAll('mark')).toHaveLength(2)
  })

  it('nunca produz HTML a partir do conteúdo — símbolos < e > do cliente aparecem como texto, não como tag', () => {
    const snippet = `${START}confirmar${END} <script>alert(1)</script>`
    const { container } = render(<div>{renderHighlightedSnippet(snippet)}</div>)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })
})
