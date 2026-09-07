// O que este teste protege são as três decisões da barra que são fáceis de
// regredir sem ninguém notar, porque todas se manifestam como "um controle a
// menos" e não como erro:
//   1. custo ausente SOME, nunca vira "R$ 0,00";
//   2. "Enviar teste" SOME quando o BE.10 não existe, em vez de ficar
//      desabilitado anunciando capacidade que o produto não tem;
//   3. o botão final diz o que vai acontecer — "Enviar agora" dispara na
//      hora, "Agendar disparo" não.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComposerBar } from './ComposerBar'
import type { CampaignCostEstimate } from '@/types/campaignsV2'

const COST: CampaignCostEstimate = {
  perMessage: { category: 'MARKETING', priceCents: 8, currency: 'BRL' },
  estimatedCount: 1226,
  totalCents: 9808,
}

function setup(overrides: Partial<React.ComponentProps<typeof ComposerBar>> = {}) {
  const props: React.ComponentProps<typeof ComposerBar> = {
    cost: COST,
    costLoading: false,
    costAvailable: true,
    firstPending: null,
    scheduleMode: 'later',
    onSubmit: vi.fn(),
    submitting: false,
    testSend: { send: vi.fn(), sending: false, available: true, ready: true },
    ...overrides,
  }
  render(<ComposerBar {...props} />)
  return props
}

describe('ComposerBar — custo', () => {
  it('mostra total e preço unitário formatados em pt-BR', () => {
    setup()
    // 9808 centavos = R$ 98,08; unitário com 3 casas porque é fração de centavo.
    expect(screen.getByText(/R\$\s*98,08/)).toBeInTheDocument()
    expect(screen.getByText(/1\.226/)).toBeInTheDocument()
  })

  it('endpoint ausente ESCONDE o bloco de custo — nunca R$ 0,00', () => {
    setup({ costAvailable: false, cost: null })
    expect(screen.queryByText(/Custo estimado/i)).toBeNull()
    expect(screen.queryByText(/R\$/)).toBeNull()
  })

  it('enquanto calcula, avisa em vez de mostrar número velho', () => {
    setup({ cost: null, costLoading: true })
    expect(screen.getByText(/calculando/i)).toBeInTheDocument()
    expect(screen.queryByText(/R\$/)).toBeNull()
  })
})

describe('ComposerBar — o que falta', () => {
  it('aponta o bloco pendente com frase de ação, não com nome de campo', () => {
    setup({ firstPending: 'envio' })
    expect(screen.getByText('Falta')).toBeInTheDocument()
    expect(screen.getByText('Confirmar linha e horário')).toBeInTheDocument()
  })

  it('cada bloco pendente tem a sua própria frase', () => {
    setup({ firstPending: 'publico' })
    expect(screen.getByText('Definir quem vai receber')).toBeInTheDocument()
  })

  it('com os 4 blocos verdes, diz que está pronto', () => {
    setup({ firstPending: null })
    expect(screen.getByText('Pronto')).toBeInTheDocument()
    expect(screen.queryByText('Falta')).toBeNull()
  })
})

describe('ComposerBar — enviar teste (oculto, não desabilitado)', () => {
  it('BE.10 ausente: o botão SOME', () => {
    setup({ testSend: { send: vi.fn(), sending: false, available: false, ready: false } })
    expect(screen.queryByRole('button', { name: /Enviar teste/i })).toBeNull()
  })

  it('recurso existe mas falta dado do rascunho: fica desabilitado e explica', () => {
    // Aqui desabilitar é certo — a pendência é do usuário, não do produto.
    setup({ testSend: { send: vi.fn(), sending: false, available: true, ready: false } })
    const btn = screen.getByRole('button', { name: /Enviar teste/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('title', expect.stringMatching(/template e uma linha/i))
  })

  it('pronto: dispara o envio de teste', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: /Enviar teste/i }))
    expect(props.testSend.send).toHaveBeenCalledTimes(1)
  })

  it('enviando: bloqueia o clique repetido', () => {
    setup({ testSend: { send: vi.fn(), sending: true, available: true, ready: true } })
    expect(screen.getByRole('button', { name: /Enviar teste/i })).toBeDisabled()
  })
})

describe('ComposerBar — ação final diz o que faz', () => {
  it('modo agora: o rótulo é "Enviar agora", porque dispara na hora', () => {
    setup({ scheduleMode: 'now' })
    expect(screen.getByRole('button', { name: /Enviar agora/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agendar disparo/i })).toBeNull()
  })

  it('modo agendar: o rótulo é "Agendar disparo"', () => {
    setup({ scheduleMode: 'later' })
    expect(screen.getByRole('button', { name: /Agendar disparo/i })).toBeInTheDocument()
  })

  it('bloco pendente trava a ação final', () => {
    setup({ firstPending: 'template' })
    expect(screen.getByRole('button', { name: /Agendar disparo/i })).toBeDisabled()
  })

  it('4 blocos verdes liberam, e o clique submete', () => {
    const props = setup({ firstPending: null })
    const btn = screen.getByRole('button', { name: /Agendar disparo/i })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submetendo: trava para não criar a campanha duas vezes', () => {
    setup({ firstPending: null, submitting: true })
    expect(screen.getByRole('button', { name: /Agendar disparo/i })).toBeDisabled()
  })
})
