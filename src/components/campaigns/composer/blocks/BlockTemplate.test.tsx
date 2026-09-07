// O risco aqui é a escolha do template parecer uma lista de botões soltos:
// para quem lê por audição, sete botões sem estado marcado não dizem qual
// está escolhido. Por isso é um `radiogroup` com `aria-checked`, e é isso que
// os testes prendem — junto do que o bloco DEIXOU de ter (o campo de nome,
// que no Composer vive no título da página).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BlockTemplate } from './BlockTemplate'
import { templateSummary } from './summaries'
import type { WhatsAppTemplate } from '@/types'

const TPL = (over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({
  id: 't1', name: 'novo_lancamento_v2', body: 'Oi {{1}}, a coleção chegou',
  category: 'MARKETING', language: 'pt_BR', status: 'APPROVED',
  bodyVariables: ['nome'], ...over,
} as WhatsAppTemplate)

const LISTA = [
  TPL(),
  TPL({ id: 't2', name: 'lembrete_consulta', body: 'Sua consulta é amanhã', category: 'UTILITY', bodyVariables: [] }),
]

function setup(over: Partial<React.ComponentProps<typeof BlockTemplate>> = {}) {
  const props = {
    templates: LISTA, loading: false, selected: null, onSelect: vi.fn(), ...over,
  }
  render(<BlockTemplate {...props} />)
  return props
}

describe('BlockTemplate', () => {
  it('NÃO pede o nome da campanha: no Composer ele fica no título da página', () => {
    setup()
    expect(screen.queryByText(/nome da campanha/i)).not.toBeInTheDocument()
  })

  it('cada template é uma opção de escolha única, com o estado marcado', () => {
    setup({ selected: LISTA[0] })
    const opcoes = screen.getAllByRole('radio')
    expect(opcoes).toHaveLength(2)
    expect(opcoes[0]).toBeChecked()
    expect(opcoes[1]).not.toBeChecked()
  })

  it('escolher um template avisa quem monta a página', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('radio', { name: /lembrete_consulta/ }))
    expect(props.onSelect).toHaveBeenCalledWith(LISTA[1])
  })

  it('a busca filtra por nome e por conteúdo', () => {
    setup()
    const busca = screen.getByLabelText(/buscar template/i)

    fireEvent.change(busca, { target: { value: 'lembrete' } })
    expect(screen.getAllByRole('radio')).toHaveLength(1)

    // Conteúdo, não só nome — "coleção" só existe no corpo do primeiro.
    fireEvent.change(busca, { target: { value: 'coleção' } })
    expect(screen.getByRole('radio', { name: /novo_lancamento_v2/ })).toBeInTheDocument()
  })

  it('busca sem resultado explica que é da busca, não da base vazia', () => {
    setup()
    fireEvent.change(screen.getByLabelText(/buscar template/i), { target: { value: 'zzz' } })
    expect(screen.getByText(/Nenhum template bate com a busca/)).toBeInTheDocument()
    // A dica de sincronizar é para base vazia — aqui ela só confundiria.
    expect(screen.queryByText(/Sincronizar/)).not.toBeInTheDocument()
  })

  it('base vazia manda sincronizar com a Meta', () => {
    setup({ templates: [] })
    expect(screen.getByText(/Nenhum template aprovado no Oryon/)).toBeInTheDocument()
    expect(screen.getByText(/Sincronizar/)).toBeInTheDocument()
  })

  it('carregando anuncia o estado em vez de parecer lista vazia', () => {
    setup({ loading: true, templates: [] })
    expect(screen.getByRole('status', { name: /carregando/i })).toBeInTheDocument()
    expect(screen.queryByText(/Nenhum template/)).not.toBeInTheDocument()
  })
})

describe('templateSummary', () => {
  it('sem template, convida a escolher em vez de ficar em branco', () => {
    expect(templateSummary(null)).toBe('Escolha o modelo aprovado que será enviado.')
  })

  it('com template, repete o resumo do mockup', () => {
    expect(templateSummary(TPL()))
      .toBe('novo_lancamento_v2 · MARKETING · aprovado pela Meta · 1 variável')
  })

  it('template sem variáveis não anuncia "0 variáveis"', () => {
    expect(templateSummary(TPL({ bodyVariables: [] })))
      .toBe('novo_lancamento_v2 · MARKETING · aprovado pela Meta')
  })

  it('plural de variáveis concorda', () => {
    expect(templateSummary(TPL({ bodyVariables: ['a', 'b'] }))).toContain('2 variáveis')
  })
})
