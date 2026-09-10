import { useRef, useState } from 'react'
import { X, Package, PenLine, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Input } from '@/components/ui/Input'
import { CampoSeletor } from '@/components/deals/CampoSeletor'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { cn } from '@/lib/utils'
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
  const semMovimento = useReducedMotion()

  /**
   * Acordeão de um item só.
   *
   * Cada item aberto é um cartão de edição com sete controles — dois seletores,
   * preço, quantidade, os dois campos de desconto e o subtotal. Três itens
   * empilhados passavam de 500 px, e o diálogo virava uma coluna de rolagem com
   * a coluna de propriedades vazia ao lado.
   *
   * Fechado, o item vira uma linha: nome, variação, quantidade e subtotal — que
   * é exatamente o que se confere depois de preencher. Só um fica aberto por
   * vez: adicionar um novo fecha o anterior, porque é para o novo que o olho
   * vai.
   *
   * Item sem identidade (catálogo sem produto, personalizado sem nome) NUNCA
   * fecha: a linha compacta não teria o que mostrar, e esconder um item pela
   * metade é pior que a altura.
   */
  // `null` = nenhuma linha aberta; string = esta linha está aberta. Eram TRÊS
  // estados enquanto existia um padrão implícito ("item único abre sozinho") —
  // o `undefined` separava "ainda não mexi" de "fechei tudo", senão não dava
  // para fechar o item único na mão. Sem o padrão, os dois viraram a mesma
  // coisa e o terceiro estado saiu junto.
  const [abertoUid, setAbertoUid] = useState<string | null>(null)
  const temIdentidade = (it: DealItemDraft) =>
    it.kind === 'custom' ? !!it.productName.trim() : !!it.productId

  // NENHUM item nasce aberto — a ficha abre com a composição em linhas
  // compactas, que é o que se confere. Havia uma exceção para o item único
  // ("não há o que comparar"), e ela custava caro no lugar mais comum: a
  // maioria dos negócios tem UM item, então a ficha abria justamente com o
  // cartão de sete controles esticado. Comparar não é o único motivo para
  // fechar; ler a ficha inteira de uma vez é o outro.
  const uidAberto = abertoUid

  const adicionar = (novo: DealItemDraft) => {
    setAbertoUid(novo._uid)
    onChange([...value, novo])
  }

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
        // Item sem identidade não fecha — a linha compacta não teria o que
        // mostrar. Fora isso, quem manda é o operador.
        const travadoAberto = !temIdentidade(it)
        const aberto = it._uid === uidAberto || travadoAberto
        const nome = isCustom ? it.productName : (product?.name ?? '')

        return (
          <div
            key={it._uid}
            // O índice entra no testid: dois itens do mesmo tipo na lista são
            // linhas distintas também para os testes.
            data-testid={`deal-item-${it.kind}-${i}`}
            /* O item FECHADO ganhou preenchimento (10/09): era transparente, e
               no drawer invertido (fundo branco no tema claro) ele sumia — a
               borda `surface-800` vira a cor do próprio bloco. Preenchido, a
               linha lê como bloco em qualquer um dos dois arranjos.

               Sem alpha: no drawer invertido o token JÁ é o cinza claro, e
               diluí-lo a 60% sobre o branco devolvia ~#F6F7FA — cinza nenhum.

               A BORDA é quem faz o bloco existir, não o preenchimento. O
               fechado usava `border-surface-800`, a MESMA cor do próprio fundo
               dentro do drawer invertido — ou seja, não tinha borda nenhuma, e
               sobrava um cinza de 1,1:1 contra o branco para se virar sozinho.
               Subir o cinza resolveria pela força bruta e traria o efeito de
               "campo desabilitado"; a aresta resolve com elegância.

               E é a borda que diz qual está ABERTO (`surface-600`, um degrau
               mais forte), o que funciona nos dois temas — diferente de
               "mais claro", que se inverte de um tema para o outro. */
            className={cn(
              'border rounded-lg overflow-hidden transition-all',
              aberto
                ? 'border-surface-600 bg-surface-800/25 bloco-drawer-ativo'
                : 'border-surface-700 bg-surface-800 hover:border-surface-600 bloco-drawer',
            )}
          >
            {/* Cabeçalho SEMPRE presente: é ele o interruptor. Antes o fechar
                era um "Pronto" no pé de um cartão alto — quem abria a linha não
                encontrava o caminho de volta. Aberto ou fechado, o gesto de
                abrir e o de fechar são o mesmo lugar. */}
            <div className="flex items-center gap-1 p-1.5">
              <button
                type="button"
                onClick={() => setAbertoUid(aberto ? null : it._uid)}
                disabled={travadoAberto}
                aria-expanded={aberto}
                aria-label={aberto ? `Recolher ${nome || 'item'}` : `Editar ${nome || 'item'}`}
                className={cn(
                  'flex-1 flex items-center gap-2 min-w-0 rounded-md px-1.5 py-1.5 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
                  travadoAberto ? 'cursor-default' : 'cursor-pointer hover:bg-surface-800/60',
                )}
              >
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 text-surface-500 transition-transform duration-150',
                    aberto && 'rotate-90',
                    travadoAberto && 'opacity-0',
                  )}
                  aria-hidden
                />
                <span className={cn('text-sm truncate', nome ? 'text-surface-100' : 'text-surface-500')}>
                  {nome || (isCustom ? 'Novo item personalizado' : 'Novo item do catálogo')}
                </span>
                {!aberto && !isCustom && it.variationLabel && (
                  <span className="text-xs text-surface-500 truncate shrink-0">· {it.variationLabel}</span>
                )}
                {!aberto && isCustom && (
                  <span className="text-3xs font-semibold uppercase tracking-wider text-amber-400/90 shrink-0">
                    Negociado
                  </span>
                )}
                {!aberto && (
                  <>
                    <span className="ml-auto text-xs text-surface-500 tabular-nums shrink-0">{it.quantity} ×</span>
                    <span className="text-sm font-semibold text-surface-100 tabular-nums shrink-0">
                      {formatBRL(lineTotalCents(it))}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-900/20 transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                aria-label="Remover item"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Só a ABERTURA anima. O fechamento é imediato de propósito: com
                `exit` o Framer mantém a subárvore montada durante a saída, e um
                cartão de sete controles continuaria no DOM — invisível, mas
                alcançável por leitor de tela e por consulta de teste. */}
            {aberto && (
            <motion.div
              initial={semMovimento ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
            <div className="px-2.5 pb-2.5 pt-1 flex flex-col gap-2">
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
                  <CampoSeletor
                    value={it.productId ?? ''}
                    // Trocar o PRODUTO troca a base: rebaseia o desconto na
                    // proporção (como a troca de variação), senão os R$ do
                    // produto antigo ficam pendurados num preço que não existe
                    // mais (R$ 1000 de desconto num produto de R$ 50 = 2000%).
                    onChange={(id) => patchWithDiscount(i, applyProduct(it, products.find((p) => p.id === id)))}
                    ariaLabel="Produto do catálogo"
                    placeholder="— produto —"
                    disabled={disabled}
                    options={[
                      { value: '', label: '— produto —' },
                      ...products.map((p) => ({
                        value: p.id,
                        label: p.name,
                        // "(inativo)" sai do meio do rótulo e vira coluna
                        // própria — no `<option>` não havia onde pôr.
                        detalhe: p.active ? undefined : 'inativo',
                      })),
                    ]}
                  />
                )}
              </div>
              {!isCustom && hasVariations && (
                <div className="w-40 flex-shrink-0">
                  <CampoSeletor
                    value={it.variationLabel ?? ''}
                    onChange={(label) => patchWithDiscount(i, applyVariation(it, product, label))}
                    ariaLabel="Variação de preço"
                    disabled={disabled}
                    options={product!.priceVariations.map((pv) => ({
                      value: pv.label,
                      label: pv.label,
                      detalhe: formatBRL(pv.amountCents),
                    }))}
                  />
                </div>
              )}
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
            </motion.div>
            )}
          </div>
        )
      })}

      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}

      {/* Os dois "adicionar" são AÇÕES PARES — dois caminhos para a mesma coisa,
          e nenhum é secundário do outro. Vinham com dois tratamentos diferentes
          (um cinza cheio, outro com borda), o que sugeria uma hierarquia que não
          existe. Passam a usar o mesmo `neutral` dos botões de criação do resto
          do produto — "Novo negócio", "Nova campanha", "Novo template". */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => adicionar(emptyCatalogItem())}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 hover:bg-surface-50 text-surface-950 transition-all disabled:bg-surface-700 disabled:text-surface-500"
        >
          <Package className="w-3.5 h-3.5" /> Adicionar do catálogo
        </button>
        <button
          type="button"
          onClick={() => adicionar(emptyCustomItem())}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-100 hover:bg-surface-50 text-surface-950 transition-all disabled:bg-surface-700 disabled:text-surface-500"
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
