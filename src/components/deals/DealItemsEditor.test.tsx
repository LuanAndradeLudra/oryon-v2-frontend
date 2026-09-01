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
// Segundo produto (mais barato) — para o rebase do desconto na TROCA de produto.
const PRODUTO_2: Product = {
  id: 'prod-2',
  name: 'Plano Básico',
  active: true,
  order: 1,
  priceVariations: [{ id: 'v3', label: 'Único', amountCents: 5000, order: 0 }],
}

vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ products: [PRODUTO, PRODUTO_2], pipelines: [], stages: [] }),
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
    expect(screen.getByTestId('deal-item-catalog-0')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Produto do catálogo' })).toBeInTheDocument()
    expect(dump()[0]).toMatchObject({ kind: 'catalog', productId: null })
  })

  it('"Adicionar personalizado" cria linha com NOME digitável e sem produto', () => {
    render(<Harness />)
    addCustom()
    expect(screen.getByTestId('deal-item-custom-0')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome do item personalizado' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Produto do catálogo' })).not.toBeInTheDocument()
    expect(dump()[0]).toMatchObject({ kind: 'custom', productId: null })
  })

  it('os dois tipos convivem na mesma lista', () => {
    render(<Harness />)
    addCatalog()
    addCustom()
    expect(screen.getByTestId('deal-item-catalog-0')).toBeInTheDocument()
    expect(screen.getByTestId('deal-item-custom-1')).toBeInTheDocument()
    expect(dump().map((i) => i.kind)).toEqual(['catalog', 'custom'])
  })

  it('a linha sob medida é marcada "Negociado" — preço fora do catálogo', () => {
    render(<Harness />)
    addCustom()
    expect(within(screen.getByTestId('deal-item-custom-0')).getByText('Negociado')).toBeInTheDocument()
  })

  it('remover tira a linha certa', () => {
    render(<Harness />)
    addCatalog()
    addCustom()
    fireEvent.click(within(screen.getByTestId('deal-item-catalog-0')).getByRole('button', { name: 'Remover item' }))
    expect(dump().map((i) => i.kind)).toEqual(['custom'])
  })

  it('duas linhas do MESMO tipo têm testids e ids únicos', () => {
    render(<Harness />)
    addCatalog()
    addCatalog()
    expect(screen.getByTestId('deal-item-catalog-0')).toBeInTheDocument()
    expect(screen.getByTestId('deal-item-catalog-1')).toBeInTheDocument()
    // Cada linha tem os próprios ids (htmlFor funcionando), nenhum duplicado.
    expect(screen.getAllByLabelText('Qtd')).toHaveLength(2)
    const ids = Array.from(document.querySelectorAll('input, select'))
      .map((el) => el.id)
      .filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
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

  it('o nome respeita o limite do backend — maxlength 255 (@MaxLength no DTO)', () => {
    render(<Harness />)
    addCustom()
    expect(screen.getByRole('textbox', { name: 'Nome do item personalizado' })).toHaveAttribute('maxlength', '255')
  })

  it('preço e quantidade compõem o subtotal exibido', () => {
    render(<Harness />)
    addCustom()
    fireEvent.change(screen.getByRole('textbox', { name: 'Desconto em reais' }), { target: { value: '' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Preço unitário' }), { target: { value: '320000' } })
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '2' } })
    expect(dump()[0]).toMatchObject({ unitPriceCents: 320000, quantity: 2 })
    expect(within(screen.getByTestId('deal-item-custom-0')).getByText(/6\.400,00/)).toBeInTheDocument()
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
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue('10')
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
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue('10')
  })

  it('o espelho também vale no item personalizado', () => {
    render(<Harness initial={[seed({ kind: 'custom', productId: null, productName: 'Instalação', unitPriceCents: 320000, quantity: 1 })]} />)
    fireEvent.change(screen.getByLabelText('Desconto em porcentagem'), { target: { value: '10' } })
    expect(dump()[0].discountCents).toBe(32000)
  })

  it('sem preço não há percentual — o campo fica vazio em vez de NaN', () => {
    render(<Harness initial={[seed({ unitPriceCents: 0, discountCents: 0 })]} />)
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue('')
  })

  it('REDIGITAR o preço tecla a tecla não corrompe o desconto — a âncora é o item no FOCO', () => {
    // R$ 100 com 10% de desconto. O MoneyInput acumula por tecla (2 → 20 →
    // 200…): reaplicar a proporção contra a última tecla zerava o desconto na
    // primeira (base de 2 centavos → 0) e o congelava em 0 para sempre.
    render(<Harness initial={[seed({ quantity: 1, discountCents: 1000 })]} />)
    const preco = screen.getByRole('textbox', { name: 'Preço unitário' })
    fireEvent.focus(preco)
    for (const teclas of ['2', '20', '200', '2000', '20000']) {
      fireEvent.change(preco, { target: { value: teclas } })
    }
    // 10% de R$ 200,00 = R$ 20,00 — como se o preço tivesse sido editado de uma vez.
    expect(dump()[0]).toMatchObject({ unitPriceCents: 20000, discountCents: 2000 })
    expect(screen.getByLabelText('Desconto em porcentagem')).toHaveValue('10')
  })

  it('quantidade 4 → 3 devolve o desconto original — razão exata, sem deriva', () => {
    // Base 30000 / desconto 500: o % em 2 casas fazia a volta dar 501.
    render(<Harness initial={[seed({ unitPriceCents: 10000, quantity: 3, discountCents: 500 })]} />)
    const qtd = screen.getByLabelText('Qtd')
    fireEvent.focus(qtd)
    fireEvent.change(qtd, { target: { value: '4' } })
    expect(dump()[0].discountCents).toBe(667)
    fireEvent.blur(qtd)
    fireEvent.focus(qtd)
    fireEvent.change(qtd, { target: { value: '3' } })
    expect(dump()[0].discountCents).toBe(500)
  })

  it('o campo % aceita decimal durante a digitação — "12." não zera o desconto', () => {
    render(<Harness initial={[seed({ quantity: 1 })]} />) // base R$ 100
    const pct = screen.getByLabelText('Desconto em porcentagem')
    fireEvent.focus(pct)
    fireEvent.change(pct, { target: { value: '1' } })
    expect(dump()[0].discountCents).toBe(100)
    fireEvent.change(pct, { target: { value: '12.' } })
    expect(pct).toHaveValue('12.') // o texto sobrevive à digitação incompleta
    expect(dump()[0].discountCents).toBe(1200)
    fireEvent.change(pct, { target: { value: '12.5' } })
    expect(dump()[0].discountCents).toBe(1250)
    fireEvent.blur(pct)
    expect(pct).toHaveValue('12.5') // ressincronizado com o derivado
  })

  it('% acima de 100 clampa no teto', () => {
    render(<Harness initial={[seed({ quantity: 1 })]} />)
    fireEvent.change(screen.getByLabelText('Desconto em porcentagem'), { target: { value: '150' } })
    expect(dump()[0].discountCents).toBe(10000)
  })

  it('desconto em R$ clampa no subtotal da linha', () => {
    render(<Harness initial={[seed({ quantity: 1 })]} />) // base R$ 100
    fireEvent.change(screen.getByRole('textbox', { name: 'Desconto em reais' }), { target: { value: '99999' } })
    expect(dump()[0].discountCents).toBe(10000)
  })

  it('trocar o PRODUTO rebaseia o desconto — nada de valor pendurado do preço antigo', () => {
    // R$ 20 de desconto (20%) no produto de R$ 100 → no de R$ 50, vira R$ 10.
    render(<Harness initial={[seed({ quantity: 1, discountCents: 2000 })]} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Produto do catálogo' }), { target: { value: 'prod-2' } })
    expect(dump()[0]).toMatchObject({ productId: 'prod-2', unitPriceCents: 5000, discountCents: 1000 })
  })

  it('voltar para "— produto —" zera preço e desconto juntos', () => {
    render(<Harness initial={[seed({ quantity: 1, discountCents: 2000 })]} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Produto do catálogo' }), { target: { value: '' } })
    expect(dump()[0]).toMatchObject({ productId: null, unitPriceCents: 0, discountCents: 0 })
  })
})
