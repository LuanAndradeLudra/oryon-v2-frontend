// Este bloco existe para NÃO fazer nada: ele é o slot onde o `AudienceBlock`
// do Crivo entra quando a pilha D6 mesclar. O teste que importa é o que
// impede alguém de "resolver" a ausência com um stub que finge funcionar —
// e o do resumo, que não pode transformar "ainda não sei" em "0 contatos".
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockPublico } from './BlockPublico'
import { publicoSummary } from './summaries'

describe('BlockPublico', () => {
  it('sem o componente do Crivo, explica o que falta em vez de fingir uma lista', () => {
    render(<BlockPublico />)
    expect(screen.getByText(/construtor de público chega com a D6/i)).toBeInTheDocument()
    // O que não pode existir é um construtor de mentira: nenhum controle de
    // segmento sai daqui.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('com o componente, some da frente e entrega o slot inteiro', () => {
    render(<BlockPublico><div data-testid="audience-block">público real</div></BlockPublico>)
    expect(screen.getByTestId('audience-block')).toBeInTheDocument()
    expect(screen.queryByText(/chega com a D6/i)).not.toBeInTheDocument()
  })
})

describe('publicoSummary', () => {
  it('"ainda não sei" NÃO vira "0 contatos"', () => {
    // `null` chega durante o debounce do evaluate e no modo fallback (§9.3);
    // virar zero faria o bloco piscar de verde para vermelho a cada tecla.
    expect(publicoSummary(null)).toBe('Escolha quem vai receber este disparo.')
  })

  it('zero de verdade é zero', () => {
    expect(publicoSummary(0)).toBe('0 contatos vão receber')
  })

  it('concorda no singular', () => {
    expect(publicoSummary(1)).toBe('1 contato vão receber')
  })

  it('formata milhar em pt-BR, como o mockup', () => {
    expect(publicoSummary(1226)).toBe('1.226 contatos vão receber')
  })

  it('segmento salvo aparece pelo nome, não pela contagem', () => {
    expect(publicoSummary(1226, 'Clientes VIP')).toBe('Clientes VIP')
  })
})
