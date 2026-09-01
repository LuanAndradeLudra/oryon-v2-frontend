import type { DealLineItem, DealLineItemKind, Product } from '@/types'

/**
 * Modelo do item no FORMULÁRIO — A1 (SCRUM-153).
 *
 * Separado do `DealLineItem` da API de propósito: aqui todo campo é obrigatório
 * e já normalizado (o formulário não tem "quantidade indefinida"), e existe um
 * `_uid` estável para a lista do React — o `id` só existe depois de salvo, e
 * uma linha nova precisa de chave antes disso.
 *
 * `discountPercent` NÃO vai para a API: o desconto é gravado em centavos. O
 * percentual é a outra face do mesmo número (espelho R$↔%, padrão Moskit) e
 * vive só enquanto o operador edita — guardar os dois convidaria a divergirem.
 */
export interface DealItemDraft {
  /** Chave estável da linha no formulário. Não é o id do banco. */
  _uid: string
  /** Presente só em item já salvo (reconciliação por id no backend). */
  id?: string
  kind: DealLineItemKind
  /** `null` em item personalizado — não há produto para apontar. */
  productId: string | null
  /** Snapshot do catálogo (somente leitura) ou o nome digitado (personalizado). */
  productName: string
  variationLabel: string | null
  unitPriceCents: number
  quantity: number
  discountCents: number
}

/** Corpo de um item no `POST`/`PATCH /deals`. */
export interface DealLineItemPayload {
  id?: string
  kind: DealLineItemKind
  productId?: string
  productName?: string
  variationLabel?: string
  unitPriceCents: number
  quantity: number
  discountCents: number
  order: number
}

let uidSeq = 0
export const makeItemUid = () => `dli-${uidSeq++}`

/** Linha nova do catálogo: o produto ainda não foi escolhido. */
export function emptyCatalogItem(): DealItemDraft {
  return {
    _uid: makeItemUid(),
    kind: 'catalog',
    productId: null,
    productName: '',
    variationLabel: null,
    unitPriceCents: 0,
    quantity: 1,
    discountCents: 0,
  }
}

/** Linha nova sob medida: nome e preço são digitados. */
export function emptyCustomItem(): DealItemDraft {
  return {
    _uid: makeItemUid(),
    kind: 'custom',
    productId: null,
    productName: '',
    variationLabel: null,
    unitPriceCents: 0,
    quantity: 1,
    discountCents: 0,
  }
}

/** Semeia o formulário a partir de um negócio salvo. */
export function draftFromLineItem(li: DealLineItem): DealItemDraft {
  return {
    _uid: li.id ?? makeItemUid(),
    id: li.id,
    // Item gravado antes desta história não tem `kind` — é do catálogo.
    kind: li.kind ?? 'catalog',
    productId: li.productId ?? null,
    productName: li.productName ?? '',
    variationLabel: li.variationLabel ?? null,
    unitPriceCents: li.unitPriceCents,
    quantity: li.quantity ?? 1,
    discountCents: li.discountCents ?? 0,
  }
}

/** Total da linha em centavos: `max(0, unit × qtd − desconto)` — a mesma conta do backend. */
export function lineTotalCents(it: Pick<DealItemDraft, 'unitPriceCents' | 'quantity' | 'discountCents'>): number {
  return Math.max(0, it.unitPriceCents * it.quantity - it.discountCents)
}

/** Σ das linhas — é o valor que o negócio assume quando o operador manda recalcular. */
export function itemsTotalCents(items: DealItemDraft[]): number {
  return items.reduce((sum, it) => sum + lineTotalCents(it), 0)
}

/** Base sobre a qual o desconto percentual é calculado: preço × quantidade. */
export function grossCents(it: Pick<DealItemDraft, 'unitPriceCents' | 'quantity'>): number {
  return it.unitPriceCents * it.quantity
}

/**
 * Desconto em % a partir do valor em centavos — a face percentual do espelho.
 * Sem base (preço 0), não existe percentual: devolve 0 em vez de `NaN`/`Infinity`.
 * Duas casas, que é a precisão que o campo aceita digitar.
 */
export function discountPercentOf(it: Pick<DealItemDraft, 'unitPriceCents' | 'quantity' | 'discountCents'>): number {
  const base = grossCents(it)
  if (base <= 0) return 0
  return Math.round((it.discountCents / base) * 10000) / 100
}

/**
 * Desconto em centavos a partir do %. Limitado à base: 120% de desconto não é
 * "o cliente recebe troco", é erro de digitação — e o backend rejeitaria o
 * desconto acima do total de qualquer forma.
 */
export function discountCentsFromPercent(
  it: Pick<DealItemDraft, 'unitPriceCents' | 'quantity'>,
  percent: number,
): number {
  const base = grossCents(it)
  if (base <= 0) return 0
  const clamped = Math.min(Math.max(percent, 0), 100)
  return Math.min(Math.round((base * clamped) / 100), base)
}

/**
 * Reaplica o desconto quando preço ou quantidade mudam, PRESERVANDO a proporção.
 *
 * É o que faz o espelho ser espelho: quem deu "10% de desconto" e depois dobrou a
 * quantidade continua com 10%, não com o valor congelado de antes (que viraria
 * 5% sem ninguém pedir). A escala usa a RAZÃO exata entre as bases
 * (`desconto × baseNova ÷ baseAnterior`), sem quantizar o percentual em 2 casas:
 * derivar via `discountPercentOf` fazia qty 4 → qty 3 devolver 501 em vez de 500
 * (deriva de arredondamento) e zerava descontos legítimos sobre bases pequenas.
 * Sem base anterior (preço 0) não há proporção — o valor fica como está. Clampado
 * a `[0, baseNova]`. Chamado nas edições que mexem na base (preço, quantidade,
 * variação, produto).
 */
export function reapplyDiscount(previous: DealItemDraft, next: DealItemDraft): number {
  const prevBase = grossCents(previous)
  const nextBase = grossCents(next)
  if (prevBase <= 0) return next.discountCents
  const scaled = Math.round((previous.discountCents * nextBase) / prevBase)
  return Math.min(Math.max(scaled, 0), nextBase)
}

/**
 * Pré-preenche a linha do catálogo ao escolher o produto: rótulo e preço da 1ª
 * variação (snapshot congelado, editável depois).
 */
export function applyProduct(it: DealItemDraft, product: Product | undefined): DealItemDraft {
  const firstVariation = product?.priceVariations?.[0]
  return {
    ...it,
    kind: 'catalog',
    productId: product?.id ?? null,
    productName: product?.name ?? '',
    variationLabel: firstVariation?.label ?? null,
    unitPriceCents: firstVariation?.amountCents ?? 0,
  }
}

/** Troca a variação de um item de catálogo: o preço acompanha o rótulo. */
export function applyVariation(it: DealItemDraft, product: Product | undefined, label: string): DealItemDraft {
  const variation = product?.priceVariations?.find((v) => v.label === label)
  return {
    ...it,
    variationLabel: label || null,
    unitPriceCents: variation?.amountCents ?? it.unitPriceCents,
  }
}

/**
 * Erro de preenchimento da lista, ou `null` quando está pronta para salvar.
 *
 * Espelha o que o backend recusa (D0-6), para o operador saber antes do 400:
 * item de catálogo precisa de produto; item personalizado precisa de nome e de
 * preço > 0. Preço 0 no catálogo continua válido — significa "sem preço,
 * confirmar com humano".
 */
export function validateItems(items: DealItemDraft[]): string | null {
  if (items.some((it) => it.kind === 'catalog' && !it.productId)) {
    return 'Selecione um produto em cada item do catálogo (ou remova a linha).'
  }
  if (items.some((it) => it.kind === 'custom' && !it.productName.trim())) {
    return 'Dê um nome a cada item personalizado (ou remova a linha).'
  }
  if (items.some((it) => it.kind === 'custom' && it.unitPriceCents <= 0)) {
    return 'O preço de um item personalizado deve ser maior que zero.'
  }
  // Cinto e suspensório do clamp da UI (o MoneyInput do Desconto R$ já limita
  // ao subtotal): desconto acima do bruto viraria linha negativa no backend.
  if (items.some((it) => it.discountCents > grossCents(it))) {
    return 'O desconto de um item não pode ser maior que o subtotal dele.'
  }
  return null
}

/**
 * Serializa para o corpo da API. O `productName` só é enviado no item
 * personalizado — no de catálogo o nome é snapshot do produto, e mandá-lo daria
 * a impressão (falsa) de que o cliente escolhe esse texto.
 *
 * Item de catálogo SEM produto lança: `validateItems` barra o caso antes de
 * chegar aqui, mas se um chamador futuro (A3 · SCRUM-925 embute o editor no
 * "Novo negócio") esquecer a validação, é melhor um erro descritivo no FE do
 * que `productId: null` virar um 400 mudo no backend.
 */
export function toLineItemPayload(items: DealItemDraft[]): DealLineItemPayload[] {
  return items.map((it, index) => {
    if (it.kind === 'catalog' && !it.productId) {
      throw new Error('Item de catálogo sem produto — chame validateItems antes de serializar.')
    }
    return {
      ...(it.id ? { id: it.id } : {}),
      kind: it.kind,
      ...(it.kind === 'catalog'
        ? { productId: it.productId as string } // o throw acima garante que não é null
        : { productName: it.productName.trim() }),
      ...(it.variationLabel ? { variationLabel: it.variationLabel } : {}),
      unitPriceCents: it.unitPriceCents,
      quantity: it.quantity,
      discountCents: it.discountCents,
      order: index,
    }
  })
}
