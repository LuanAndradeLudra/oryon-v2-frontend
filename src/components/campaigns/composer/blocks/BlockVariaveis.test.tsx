// Dois riscos aqui. O primeiro é de acessibilidade: as três origens são uma
// escolha entre si, não três ações, e sem `radiogroup` o leitor de tela não
// diz qual está valendo. O segundo é o resumo mentir — "2 variáveis mapeadas"
// num rascunho onde falta preencher um valor fixo.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BlockVariaveis } from './BlockVariaveis'
import { variaveisSummary } from './summaries'
import type { CampaignVariableMapping, ContactCustomFieldDef } from '@/types'

const MAP = (over: Partial<CampaignVariableMapping> = {}): CampaignVariableMapping => ({
  position: 1, variableName: 'nome', source: 'contact_field', contactField: 'displayName', ...over,
} as CampaignVariableMapping)

const FIELD_DEFS: ContactCustomFieldDef[] = [
  { key: 'plano', label: 'Plano', type: 'text' } as ContactCustomFieldDef,
]

function setup(over: Partial<React.ComponentProps<typeof BlockVariaveis>> = {}) {
  const props = {
    mappings: [MAP()], onUpdate: vi.fn(), fieldDefs: FIELD_DEFS, ...over,
  }
  render(<BlockVariaveis {...props} />)
  return props
}

describe('BlockVariaveis', () => {
  it('template sem variáveis não manda clicar em "Próximo": não há próximo', () => {
    setup({ mappings: [] })
    expect(screen.getByText('Este template não possui variáveis')).toBeInTheDocument()
    expect(screen.queryByText(/próximo/i)).not.toBeInTheDocument()
  })

  it('as três origens são uma escolha única, com o estado marcado', () => {
    setup()
    const opcoes = screen.getAllByRole('radio')
    expect(opcoes).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Campo do contato' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Valor fixo' })).not.toBeChecked()
  })

  it('trocar a origem avisa quem monta a página', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('radio', { name: 'Valor fixo' }))
    expect(props.onUpdate).toHaveBeenCalledWith(1, { source: 'literal' })
  })

  it('sem campos personalizados cadastrados, a opção nem aparece', () => {
    setup({ fieldDefs: [] })
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.queryByRole('radio', { name: 'Campo personalizado' })).not.toBeInTheDocument()
  })

  it('cada controle é rotulado pela variável que edita', () => {
    // Com 2 variáveis, "Valor fixo" apareceria duas vezes sem o rótulo —
    // ambiguidade no teste é sintoma de marcação ambígua.
    setup({
      mappings: [MAP({ source: 'literal', literal: 'x' }), MAP({ position: 2, source: 'literal', literal: 'y' })],
    })
    expect(screen.getByLabelText('Valor fixo da variável 1')).toHaveValue('x')
    expect(screen.getByLabelText('Valor fixo da variável 2')).toHaveValue('y')
  })
})

describe('variaveisSummary', () => {
  it('sem variáveis, diz isso', () => {
    expect(variaveisSummary([], true)).toBe('Este template não tem variáveis.')
  })

  it('incompleto aponta quantas faltam, em vez de dizer "mapeadas"', () => {
    const mappings = [MAP({ source: 'literal', literal: '' }), MAP({ position: 2 })]
    expect(variaveisSummary(mappings, false)).toBe('1 de 2 ainda sem valor')
  })

  it('completo concorda no singular', () => {
    expect(variaveisSummary([MAP()], true)).toBe('1 variável mapeada')
  })

  it('completo concorda no plural', () => {
    expect(variaveisSummary([MAP(), MAP({ position: 2 })], true)).toBe('2 variáveis mapeadas')
  })
})
