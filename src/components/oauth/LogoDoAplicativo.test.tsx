import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LogoDoAplicativo } from './LogoDoAplicativo'
import { marcaDoAplicativo } from './marcaDoAplicativo'

describe('LogoDoAplicativo — a marca do Claude e do ChatGPT (18/11)', () => {
  it('reconhece pelo endereço conferido do aplicativo', () => {
    expect(marcaDoAplicativo('Claude', 'https://claude.ai/oauth/mcp-oauth-client-metadata')).toBe('claude')
    expect(marcaDoAplicativo('Qualquer', 'https://chatgpt.com/oauth/client.json')).toBe('chatgpt')
    expect(marcaDoAplicativo('Qualquer', 'platform.openai.com')).toBe('chatgpt')
    expect(marcaDoAplicativo('Qualquer', 'claude.ai.golpe.com')).toBeNull()
    expect(marcaDoAplicativo('Parceiro', 'https://parceiro.com.br/app.json')).toBeNull()
  })

  it('sem endereço, pelo nome da lista da Oryon', () => {
    expect(marcaDoAplicativo('Claude')).toBe('claude')
    expect(marcaDoAplicativo('ChatGPT')).toBe('chatgpt')
    expect(marcaDoAplicativo('Zapier')).toBeNull()
  })

  it('desenha a marca embutida (sem imagem de fora) ou a inicial', () => {
    const { container: a } = render(<LogoDoAplicativo nome="Claude" endereco="https://claude.ai/x" />)
    expect(a.querySelector('[data-marca="claude"] svg path')).not.toBeNull()
    expect(a.querySelector('img')).toBeNull()
    const { container: b } = render(<LogoDoAplicativo nome="Zapier" />)
    expect(b.querySelector('[data-marca="inicial"]')?.textContent).toBe('Z')
  })
})
