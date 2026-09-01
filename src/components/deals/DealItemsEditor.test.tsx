// A1 (SCRUM-153) — o editor de itens: DOIS BOTÕES (catálogo × personalizado),
// item sob medida sem produto nenhum, e o desconto espelhado R$↔%.
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DealItemsEditor } from './DealItemsEditor'
import { validateItems, type DealItemDraft } from './dealItems'
import type { Product } from '@/types'

const PRODUTO: Product = {
  id: 'prod-1',
  name: 'Plano Essencial',
  active: true,
  order: 0,
  priceVariations: [
    { id: 'v1', label: 'Particular', amountCents: 10000, order: 0 },
    { id: 'v2', label: 'Convênio', amountCents: 8000, order: 1 },
  ],
}

vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ products: [PRODUTO], pipelines: [], stages: [] }),
}))

/** Casca controlada — o componente não guarda estado próprio, o pai guarda. */
function Harness({ initial = [], onItems }: { initial?: DealItemDraft[]; onItems?: (i: DealItemDraft[]) => void }) {
  const [items, setItems] = useState<DealItemDraft[]>(initial)
  return (
    <>
      <DealItemsEditor
        value={items}
        onChange={(next) => {
          setItems(next)
          onItems?.(next)
        }}
      />
      <output data-testid="dump">{JSON.stringify(items)}</output>
    </>
  )
}

const dump = (): DealItemDraft[] => JSON.parse(screen.getByTestId('dump').textContent || '[]')
const addCatalog = () => fireEvent.click(screen.getByRole('button', { name: /adicionar do catálogo/i }))
const addCustom = () => fireEvent.click(screen.getByRole('button', { name: /adicionar personalizado/i }))

describe('DealItemsEditor — dois botões (D0-6)', () => {
  it('oferece as duas entradas lado a lado, não um seletor por linha', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: /adicionar do catálogo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adicionar personalizado/i })).toBeInTheDocument()
    // Nenhuma linha ⇒ nenhum seletor de tipo em lugar nenhum.
    expect(screen.queryAllByTestId(/^deal-item-/)).toHaveLength(0)
  })

  it('"Adicionar do catálogo" cria linha com seletor de produto', () => {
    render(<Harness />)
    addCatalog()
    expect(screen.getByTestId('deal-item-catalog')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Produto do catálogo' })).toBeInTheDocument()
    expect(dump()[0]).toMatchObject({ kind: 'catalog', productId: null })
  })

  it('"Adicionar personalizado" cria linha com NOME digitável e sem produto', () => {
    render(<Harness />)
    addCustom()
    expect(screen.getByTestId('deal-item-custom')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome do item personalizado' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Produto do catálogo' })).not.toBeInTheDocument()
    expect(dump()[0]).toMatchObject({ kind: 'custom', productId: null })
  })

  it('os dois tipos convivem na mesma lista', () => {
    render(<Harness />)
    addCatalog()
    addCustom()
    expect(screen.getByTestId('deal-item-catalog')).toBeInTheDocument()
    expect(screen.getByTestId('deal-item-custom')).toBeInTheDocument()
    expect(dump().map((i) => i.kind)).toEqual(['catalog', 'custom'])
  })

  it('a linha sob medida é marcada "Negociado" — preço fora do catálogo', () => {
    render(<Harness />)
    addCustom()
    expect(within(screen.getByTestId('deal-item-custom')).getByText('Negociado')).toBeInTheDocument()
  })

  it('remover tira a linha certa', () => {
    render(<Harness />)
    addCatalog()
    addCustom()
    fireEvent.click(within(screen.getByTestId('deal-item-catalog')).getByRole('button', { name: 'Remover item' }))
    expect(dump().map((i) => i.kind)).toEqual(['custom'])
  })
})

describe('DealItemsEditor — item personalizado', () => {
  it('o nome digitado vai para o estado, sem tocar em productId', () => {
    render(<Harness />)
    addCustom()
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome do item personalizado' }), {
      target: { value: 'Instalação no local' },
    })
    expect(dump()[0]).toMatchObject({ productName: 'Instalação no local', productId: null, kind: 'custom' })
  })

  it('preço e quantidade compõem o subtotal exibido', () => {
    render(<Harness />)
    addCustom()
    fireEvent.change(screen.getByRole('textbox', { name: 'Desconto em reais' }), { target: { value: '' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Preço unitário' }), { target: { value: '320000' } })
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '2' } })
    expect(dump()[0]).toMatchObject({ unitPriceCents: 320000, quantity: 2 })
    expect(within(screen.getByTestId('deal-item-custom')).getByText(/6\.400,00/)).toBeInTheDocument()
  })

  it('enquanto está incompleto, a validação do módulo acusa — antes do 400 do backend', () => {
    render(<Harness />)
    addCustom()
    expect(validateItems(dump())).toMatch(/nome/i)
  })
})

describe('DealItemsEditor — item de catálogo', () => {
  it('escolher o produto congela nome, rótulo e preço da 1ª variação', () => {
    render(<Harness />)
    addCatalog()
    fireEvent.change(screen.getByRole('combobox', { name: 'Produto do catálogo' }), { target: { value: 'prod-1' } })
    expect(dump()[0]).toMatchObject({
      kind: 'catalog',
      productId: 'prod-1',
      productName: 'Plano Essencial',
      variationLabel: 'Particular',
      unitPriceCents: 10000,
    })
  })

  it('trocar a variação leva o preço junto', () => {
    render(<Harness />)
    addCatalog()
    fireEvent.change(screen.getByRole('combobox', { name: 'Produto do catálogo' }), { target: { value: 'prod-1' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Variação de preço' }), { target: { value: 'Convênio' } })
    expect(dump()[0]).toMatchObject({ variationLabel: 'Convênio', unitPriceCents: 8000 })
  })
})

describe('DealItemsEditor — desconto espelhado R$ ↔ % (padrão Moskit)', () => {
  const seed = (over: Partial<DealItemDraft> = {}): DealItemDraft => ({
    _uid: 'u1',
    kind: 'catalog',
    productId: 'prod-1',
    productName: 'Plano Essencial',
    variationLabel: 'Particular',
    unitPriceCents: 10000,
    quantity: 2,
    discountCents: 0,
    ...over,
  })

  it('digitar em R$ atualiza o campo de % sozinho', () => {
    render(<Harness initial={[seed()]} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Desconto em reais' }), { target: { value: '2000' } })
    expect(dump()[0].discountCents).toBe(2000)
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue(10)
  })

  it('digitar em % atualiza o campo de R$ sozinho', () => {
    render(<Harness initial={[seed()]} />)
    fireEvent.change(screen.getByLabelText('Desconto em porcentagem'), { target: { value: '25' } })
    expect(dump()[0].discountCents).toBe(5000)
    expect(screen.getByRole('textbox', { name: 'Desconto em reais' })).toHaveValue('50,00')
  })

  it('dobrar a quantidade preserva o PERCENTUAL — 10% continua 10%', () => {
    render(<Harness initial={[seed({ discountCents: 2000 })]} />)
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '4' } })
    expect(dump()[0].discountCents).toBe(4000)
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue(10)
  })

  it('o espelho também vale no item personalizado', () => {
    render(<Harness initial={[seed({ kind: 'custom', productId: null, productName: 'Instalação', unitPriceCents: 320000, quantity: 1 })]} />)
    fireEvent.change(screen.getByLabelText('Desconto em porcentagem'), { target: { value: '10' } })
    expect(dump()[0].discountCents).toBe(32000)
  })

  it('sem preço não há percentual — o campo fica vazio em vez de NaN', () => {
    render(<Harness initial={[seed({ unitPriceCents: 0, discountCents: 0 })]} />)
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue(null)
  })
})
