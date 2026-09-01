// A1 (SCRUM-153) — a aritmética do editor de itens, isolada do React.
// O espelho R$↔% e a serialização são o contrato que a A3 (SCRUM-925) consome.
import { describe, it, expect } from 'vitest'
import {
  discountCentsFromPercent,
  discountPercentOf,
  draftFromLineItem,
  emptyCatalogItem,
  emptyCustomItem,
  itemsTotalCents,
  lineTotalCents,
  reapplyDiscount,
  toLineItemPayload,
  validateItems,
  type DealItemDraft,
} from './dealItems'

const draft = (over: Partial<DealItemDraft> = {}): DealItemDraft => ({
  _uid: 'u1',
  kind: 'catalog',
  productId: 'prod-1',
  productName: 'Plano',
  variationLabel: null,
  unitPriceCents: 10000,
  quantity: 1,
  discountCents: 0,
  ...over,
})

const custom = (over: Partial<DealItemDraft> = {}) =>
  draft({ kind: 'custom', productId: null, productName: 'Instalação no local', unitPriceCents: 320000, ...over })

describe('total da linha', () => {
  it('é preço × quantidade menos o desconto', () => {
    expect(lineTotalCents(draft({ unitPriceCents: 10000, quantity: 3, discountCents: 5000 }))).toBe(25000)
  })

  it('nunca fica negativo — desconto maior que o bruto zera a linha', () => {
    expect(lineTotalCents(draft({ unitPriceCents: 10000, quantity: 1, discountCents: 99999 }))).toBe(0)
  })

  it('soma os dois tipos de item no mesmo total', () => {
    expect(itemsTotalCents([draft({ quantity: 2 }), custom()])).toBe(20000 + 320000)
  })
})

describe('desconto espelhado R$ ↔ % (D0-6, padrão Moskit)', () => {
  it('R$ digitado vira % sobre preço × quantidade', () => {
    expect(discountPercentOf(draft({ unitPriceCents: 10000, quantity: 2, discountCents: 2000 }))).toBe(10)
  })

  it('% digitado vira R$ sobre a mesma base', () => {
    expect(discountCentsFromPercent(draft({ unitPriceCents: 10000, quantity: 2 }), 10)).toBe(2000)
  })

  it('ida e volta preserva o valor — os dois campos são o mesmo desconto', () => {
    const it = draft({ unitPriceCents: 33300, quantity: 3, discountCents: 9990 })
    expect(discountCentsFromPercent(it, discountPercentOf(it))).toBe(9990)
  })

  it('sem base (preço 0) o percentual é 0, nunca NaN nem Infinity', () => {
    expect(discountPercentOf(draft({ unitPriceCents: 0, discountCents: 5000 }))).toBe(0)
    expect(discountCentsFromPercent(draft({ unitPriceCents: 0 }), 50)).toBe(0)
  })

  it('limita o percentual a 100% — 120% de desconto é erro de digitação, não troco', () => {
    expect(discountCentsFromPercent(draft({ unitPriceCents: 10000, quantity: 1 }), 120)).toBe(10000)
    expect(discountCentsFromPercent(draft({ unitPriceCents: 10000, quantity: 1 }), -5)).toBe(0)
  })

  it('mudar a QUANTIDADE preserva o percentual, não o valor congelado', () => {
    // 10% de R$ 100 = R$ 10; ao dobrar a quantidade, 10% de R$ 200 = R$ 20.
    const antes = draft({ unitPriceCents: 10000, quantity: 1, discountCents: 1000 })
    const depois = { ...antes, quantity: 2 }
    expect(reapplyDiscount(antes, depois)).toBe(2000)
  })

  it('mudar o PREÇO preserva o percentual', () => {
    const antes = draft({ unitPriceCents: 10000, quantity: 1, discountCents: 2500 }) // 25%
    const depois = { ...antes, unitPriceCents: 40000 }
    expect(reapplyDiscount(antes, depois)).toBe(10000)
  })

  it('sem desconto, mexer no preço não inventa desconto nenhum', () => {
    const antes = draft({ discountCents: 0 })
    expect(reapplyDiscount(antes, { ...antes, unitPriceCents: 99000 })).toBe(0)
  })
})

describe('semente a partir de um negócio salvo', () => {
  it('item sem `kind` (anterior a esta história) é do catálogo', () => {
    expect(draftFromLineItem({ id: 'li-1', productId: 'p1', productName: 'Plano', unitPriceCents: 100 }).kind).toBe(
      'catalog',
    )
  })

  it('item personalizado volta sem produto e com o nome digitado', () => {
    const d = draftFromLineItem({
      id: 'li-2',
      kind: 'custom',
      productId: null,
      productName: 'Instalação',
      unitPriceCents: 320000,
    })
    expect(d).toMatchObject({ kind: 'custom', productId: null, productName: 'Instalação', quantity: 1 })
  })
})

describe('validação (espelha o que o backend recusa)', () => {
  it('lista vazia é válida — não exigimos ≥ 1 item (o valor digitado existe desde a A2)', () => {
    expect(validateItems([])).toBeNull()
  })

  it('item de catálogo sem produto escolhido é erro', () => {
    expect(validateItems([emptyCatalogItem()])).toMatch(/produto/i)
  })

  it('item personalizado sem nome é erro', () => {
    expect(validateItems([custom({ productName: '   ' })])).toMatch(/nome/i)
  })

  it('item personalizado com preço 0 é erro (D0-6)', () => {
    expect(validateItems([custom({ unitPriceCents: 0 })])).toMatch(/maior que zero/i)
  })

  it('item de CATÁLOGO com preço 0 continua válido — "sem preço, confirmar com humano"', () => {
    expect(validateItems([draft({ unitPriceCents: 0 })])).toBeNull()
  })

  it('os dois tipos válidos juntos passam', () => {
    expect(validateItems([draft(), custom()])).toBeNull()
  })

  it('item personalizado recém-criado só falta preencher — nasce sem nome e sem preço', () => {
    const novo = emptyCustomItem()
    expect(novo).toMatchObject({ kind: 'custom', productId: null, productName: '', quantity: 1 })
  })
})

describe('serialização para a API', () => {
  it('item de catálogo envia produto e NÃO envia nome — o snapshot é do catálogo', () => {
    const [payload] = toLineItemPayload([draft()])
    expect(payload).toMatchObject({ kind: 'catalog', productId: 'prod-1', order: 0 })
    expect(payload.productName).toBeUndefined()
  })

  it('item personalizado envia o nome e NENHUM produto', () => {
    const [payload] = toLineItemPayload([custom()])
    expect(payload).toMatchObject({ kind: 'custom', productName: 'Instalação no local' })
    expect(payload.productId).toBeUndefined()
  })

  it('o nome digitado vai sem espaços nas pontas', () => {
    expect(toLineItemPayload([custom({ productName: '  Instalação  ' })])[0].productName).toBe('Instalação')
  })

  it('a ordem segue a posição na lista e o id sobrevive à edição', () => {
    const payload = toLineItemPayload([draft({ id: 'li-1' }), custom({ _uid: 'u2' })])
    expect(payload.map((p) => p.order)).toEqual([0, 1])
    expect(payload[0].id).toBe('li-1')
    expect(payload[1].id).toBeUndefined()
  })

  it('variação vazia não é enviada como string vazia', () => {
    expect(toLineItemPayload([draft({ variationLabel: null })])[0].variationLabel).toBeUndefined()
    expect(toLineItemPayload([draft({ variationLabel: 'Particular' })])[0].variationLabel).toBe('Particular')
  })
})
