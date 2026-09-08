import { useRef, useState } from 'react'
import { X, Package, PenLine } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { formatBRL } from '@/utils/money'
import {
  applyProduct,
  applyVariation,
  discountCentsFromPercent,
  discountPercentOf,
  emptyCatalogItem,
  emptyCustomItem,
  grossCents,
  lineTotalCents,
  reapplyDiscount,
  type DealItemDraft,
} from './dealItems'

interface DealItemsEditorProps {
  /** Itens do negócio. Componente CONTROLADO: nunca guarda estado próprio. */
  value: DealItemDraft[]
  onChange: (items: DealItemDraft[]) => void
  /** Mensagem de erro da lista (use `validateItems` do módulo irmão). */
  error?: string
  disabled?: boolean
  /** Rótulo do total ao pé da lista. `false` esconde (quando o pai já mostra o seu). */
  showTotal?: boolean
}

interface PercentInputProps {
  /** Percentual DERIVADO do desconto em centavos (`discountPercentOf`). */
  value: number
  /** Recebe o percentual parseado, já clampado a 0..100. */
  onCommit: (percent: number) => void
  id?: string
  disabled?: boolean
}

/**
 * Campo de percentual com estado local de TEXTO durante a edição.
 *
 * Um `input[type=number]` controlado pelo valor derivado comia a digitação:
 * '12.' é inválido para o DOM, que reporta `''` → `parseFloat('')` → 0 →
 * desconto zerado → campo limpo, e o decimal ficava impossível de digitar.
 * Aqui o input é `type="text"` (com `inputMode="decimal"`) e o texto digitado é
 * dono do campo enquanto ele está em edição: o commit só acontece quando o
 * parse é um número finito (aceita '.' ou ',' como separador), e o blur
 * ressincroniza a exibição com o derivado — os dois lados do espelho R$↔%
 * nunca divergem por mais de um foco.
 */
function PercentInput({ value, onCommit, id, disabled }: PercentInputProps) {
  // `null` = fora de edição: o campo exibe o percentual derivado.
  const [text, setText] = useState<string | null>(null)

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label="Desconto em porcentagem"
      placeholder="0"
      value={text ?? (value ? String(value) : '')}
      onFocus={() => setText(value ? String(value) : '')}
      onBlur={() => setText(null)}
      onChange={(e) => {
        const raw = e.target.value
        // Só dígitos e um separador decimal: tecla perdida não entra, e o que
        // entra continua visível mesmo incompleto ('12.').
        if (!/^\d*[.,]?\d*$/.test(raw)) return
        setText(raw)
        const parsed = parseFloat(raw.replace(',', '.'))
        if (Number.isFinite(parsed)) onCommit(Math.min(Math.max(parsed, 0), 100))
        else if (raw === '') onCommit(0) // campo limpo de propósito = sem desconto
      }}
      disabled={disabled}
    />
  )
}

/**
 * Editor dos itens de um negócio — A1 (SCRUM-153), decisões D0-3 e D0-6.
 *
 * **Componente autônomo e controlado** (`value`/`onChange`): serve tanto o
 * `DealModal` quanto o passo 2 do "Novo negócio" (A3 · SCRUM-925), que ainda não
 * tem negócio salvo — por isso ele não fala com a API, não conhece `dealId` e
 * não valida sozinho. Serializar (`toLineItemPayload`), somar
 * (`itemsTotalCents`) e validar (`validateItems`) são funções puras no módulo
 * `dealItems.ts`, que o pai chama na hora de salvar.
 *
 * **Dois botões, não um seletor por linha** (D0-6). "Do catálogo" e
 * "Personalizado" são decisões diferentes sobre a mesma proposta — a do
 * catálogo tem lastro de preço e alimenta a IA; a sob medida é negociada e não
 * alimenta. Um seletor por linha empurraria a escolha para depois de a linha
 * existir, quando os campos já estão errados.
 *
 * **Desconto espelhado R$ ↔ %** (padrão Moskit): os dois campos mostram o mesmo
 * desconto de duas maneiras, e mexer em um atualiza o outro. Só o valor em
 * centavos é gravado — o percentual é derivado (`discountPercentOf`), nunca
 * armazenado, para os dois não divergirem. Mudar preço ou quantidade preserva a
 * PROPORÇÃO: quem deu 10% continua com 10% ao dobrar a quantidade.
 *
 * **Só em funil de venda.** O gate é do chamador (em funil de processo não há
 * valor nem composição — F8/SCRUM-873, e o backend rejeita itens em `process`);
 * este componente não sabe o que é funil.
 */
export function DealItemsEditor({ value, onChange, error, disabled, showTotal = true }: DealItemsEditorProps) {
  const { products } = useCRMConfig()

  /**
   * Âncora da reaplicação de desconto: o `MoneyInput` dispara `onChange` POR
   * TECLA com valores intermediários (2 → 20 → 200…), e reaplicar a proporção
   * contra o valor da última tecla corrompia o desconto — a primeira tecla
   * derruba a base a centavos, o desconto reescalado arredonda a 0 e morre.
   * O item capturado no FOCO é a base honesta: o `MoneyInput` seleciona tudo ao
   * focar, então a digitação inteira é UMA edição sobre essa âncora. O blur
   * solta a âncora para as edições que não passam por foco de preço/qtd
   * (variação, produto) usarem o item corrente.
   */
  const anchorRef = useRef<{ uid: string; item: DealItemDraft } | null>(null)
  const anchor = (it: DealItemDraft) => {
    anchorRef.current = { uid: it._uid, item: it }
  }
  const releaseAnchor = () => {
    anchorRef.current = null
  }

  const patch = (index: number, next: Partial<DealItemDraft>) =>
    onChange(value.map((it, i) => (i === index ? { ...it, ...next } : it)))

  /**
   * Edições que mexem na BASE do desconto (preço, quantidade, variação,
   * produto) reaplicam a proporção — é o que mantém o espelho honesto quando o
   * outro lado muda. A referência é a âncora de foco quando existe (ver acima).
   */
  const patchWithDiscount = (index: number, next: Partial<DealItemDraft>) =>
    onChange(
      value.map((it, i) => {
        if (i !== index) return it
        const updated = { ...it, ...next }
        const base = anchorRef.current?.uid === it._uid ? anchorRef.current.item : it
        return { ...updated, discountCents: reapplyDiscount(base, updated) }
      }),
    )

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  const total = value.reduce((sum, it) => sum + lineTotalCents(it), 0)

  return (
    <div className="flex flex-col gap-2">
      {value.map((it, i) => {
        const product = products.find((p) => p.id === it.productId)
        const hasVariations = (product?.priceVariations?.length ?? 0) > 0
        const isCustom = it.kind === 'custom'
        const percent = discountPercentOf(it)

        return (
          <div
            key={it._uid}
            // O índice entra no testid: dois itens do mesmo tipo na lista são
            // linhas distintas também para os testes.
            data-testid={`deal-item-${it.kind}-${i}`}
            className="border border-surface-800 rounded-lg p-2.5 flex flex-col gap-2"
          >
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                {isCustom ? (
                  <Input
                    value={it.productName}
                    onChange={(e) => patch(i, { productName: e.target.value })}
                    placeholder="Nome do item (ex.: Instalação no local)"
                    aria-label="Nome do item personalizado"
                    // Limite do backend (`@MaxLength(255)`) — sem ele o excesso
                    // só aparecia como 400 mudo no salvar.
                    maxLength={255}
                    disabled={disabled}
                  />
                ) : (
                  <Select
                    value={it.productId ?? ''}
                    // Trocar o PRODUTO troca a base: rebaseia o desconto na
                    // proporção (como a troca de variação), senão os R$ do
                    // produto antigo ficam pendurados num preço que não existe
                    // mais (R$ 1000 de desconto num produto de R$ 50 = 2000%).
                    onChange={(e) => patchWithDiscount(i, applyProduct(it, products.find((p) => p.id === e.target.value)))}
                    aria-label="Produto do catálogo"
                    disabled={disabled}
                  >
                    <option value="">— produto —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {!p.active ? ' (inativo)' : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              {!isCustom && hasVariations && (
                <div className="w-40 flex-shrink-0">
                  <Select
                    value={it.variationLabel ?? ''}
                    onChange={(e) => patchWithDiscount(i, applyVariation(it, product, e.target.value))}
                    aria-label="Variação de preço"
                    disabled={disabled}
                  >
                    {product!.priceVariations.map((pv) => (
                      <option key={pv.id ?? pv.label} value={pv.label}>
                        {pv.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0 disabled:opacity-50"
                aria-label="Remover item"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 items-end">
              <div>
                <label className="text-[11px] text-surface-500" htmlFor={`item-preco-${it._uid}`}>
                  Preço unit.
                </label>
                <MoneyInput
                  value={it.unitPriceCents}
                  onChange={(cents) => patchWithDiscount(i, { unitPriceCents: cents })}
                  onFocus={() => anchor(it)}
                  onBlur={releaseAnchor}
                  aria-label="Preço unitário"
                  id={`item-preco-${it._uid}`}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="text-[11px] text-surface-500" htmlFor={`item-qtd-${it._uid}`}>
                  Qtd
                </label>
                <Input
                  id={`item-qtd-${it._uid}`}
                  type="number"
                  min={1}
                  // `aria-label` explícito: o `htmlFor` acima já nomeia, mas é o
                  // único campo da linha que dependia SÓ dele — cinto e
                  // suspensório contra qualquer invólucro que mexa nos ids.
                  aria-label="Qtd"
                  value={String(it.quantity)}
                  onFocus={() => anchor(it)}
                  onBlur={releaseAnchor}
                  onChange={(e) =>
                    patchWithDiscount(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  disabled={disabled}
                />
              </div>
              {/* Espelho R$ ↔ %: o mesmo desconto, duas leituras. */}
              <div>
                <label className="text-[11px] text-surface-500" htmlFor={`item-desc-rs-${it._uid}`}>
                  Desconto R$
                </label>
                <MoneyInput
                  value={it.discountCents}
                  // Clampado ao subtotal da linha: desconto maior que o bruto
                  // não é troco, é erro de digitação (validateItems também barra).
                  onChange={(cents) => patch(i, { discountCents: Math.min(cents, grossCents(it)) })}
                  aria-label="Desconto em reais"
                  id={`item-desc-rs-${it._uid}`}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="text-[11px] text-surface-500" htmlFor={`item-desc-pct-${it._uid}`}>
                  Desconto %
                </label>
                <PercentInput
                  id={`item-desc-pct-${it._uid}`}
                  value={percent}
                  onCommit={(pct) => patch(i, { discountCents: discountCentsFromPercent(it, pct) })}
                  disabled={disabled}
                />
              </div>
            </div>

            <p className="text-[11px] text-surface-400 text-right">
              {isCustom && (
                <span
                  className="float-left text-[10px] font-semibold uppercase tracking-wider text-amber-400/90"
                  title="Preço negociado, fora do catálogo — não alimenta a IA."
                >
                  Negociado
                </span>
              )}
              Subtotal: <span className="tabular-nums">{formatBRL(lineTotalCents(it))}</span>
            </p>
          </div>
        )
      })}

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...value, emptyCatalogItem()])}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-surface-200 transition-all disabled:opacity-50"
        >
          <Package className="w-3.5 h-3.5" /> Adicionar do catálogo
        </button>
        <button
          type="button"
          onClick={() => onChange([...value, emptyCustomItem()])}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition-all disabled:opacity-50"
        >
          <PenLine className="w-3.5 h-3.5" /> Adicionar personalizado
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-surface-600">
          Nenhum item. Use o catálogo para preços de tabela, ou um item personalizado para uma
          proposta sob medida.
        </p>
      )}

      {showTotal && value.length > 0 && (
        <p className="text-xs text-surface-300 text-right border-t border-surface-800 pt-2">
          Soma dos itens: <span className="tabular-nums font-semibold">{formatBRL(total)}</span>
        </p>
      )}
    </div>
  )
}
