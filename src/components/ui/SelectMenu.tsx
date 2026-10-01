import {
  Children, Fragment, isValidElement, useId, useLayoutEffect, useRef, useState,
  type FocusEvent, type ReactNode, type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayer } from '@/contexts/LayerContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Select } from './Select'
import { mergeFieldAria, useFormFieldAria } from './formField.context'
import { usePosicaoFlutuante } from './posicaoFlutuante'
import { useListaSelecao, type OrigemDaEscolha } from './useListaSelecao'

/**
 * SELECT DE VIDRO (01/10, PO): o mesmo campo do `Select`, mas a lista aberta é
 * do app — o painel translúcido dos menus (`.overlay-vidro`), com a opção
 * escolhida marcada — no lugar da lista do sistema, que não aceita estilo.
 *
 * Substituto direto do `Select`: recebe os mesmos `<option>` (e `<optgroup>`)
 * como filhos e chama `onChange` com `e.target.value`, só quando o valor muda.
 * O campo fechado é idêntico ao do `Select` (tamanhos, erro, desabilitado) e,
 * dentro de um `FormField`, o rótulo, o erro e o obrigatório vêm por contexto.
 * Valor sem opção correspondente mostra a primeira opção habilitada, como o
 * `<select>`; sem largura definida, o campo fica da largura da maior opção.
 *
 * Por baixo: um botão com papel de combobox (o foco fica nele; a opção ativa
 * vai por `aria-activedescendant`) e a lista num portal no body, posicionada
 * pela régua do Dropdown (`posicaoFlutuante.ts`) e empilhada pelo
 * LayerContext — abre acima de modais e gavetas, e o Esc fecha só a lista.
 * Clique fora só fecha, sem acionar o que está embaixo, como a lista nativa.
 * Teclado e busca por letra: `useListaSelecao`.
 *
 * Em tela de toque (`pointer: coarse`) renderiza o `Select` nativo: no dedo, o
 * seletor do aparelho é melhor (decisão do PO, 01/10).
 *
 * Testes: o botão tem `value` (como o select) e cada opção tem `data-valor`;
 * `escolherOpcao` e `valoresDasOpcoes` (src/test/escolherOpcao.ts) servem aos
 * dois campos.
 */

/** O que o `onChange` recebe: o bastante para `e.target.value` (e `name`). */
export interface SelectMenuChangeEvent {
  target: { value: string; name: string }
  currentTarget: { value: string; name: string }
}

export interface SelectMenuProps {
  value?: string | number
  defaultValue?: string | number
  onChange?: (e: SelectMenuChangeEvent) => void
  /** Para código novo: recebe só o valor. */
  onValueChange?: (valor: string) => void
  /** Os `<option>` (e `<optgroup>`), como no `<select>`. */
  children?: ReactNode
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  autoFocus?: boolean
  /** Marca o campo como inválido. Dentro de um `FormField` com `error`, isto já vem por contexto. */
  error?: string
  /** A régua do `Select`: sm 28 · md 36 · lg 44px. */
  size?: 'sm' | 'md' | 'lg'
  /** Classes do campo, como no `Select`. */
  className?: string
  /** Classes da seta (ex.: a cor do estado "ativo" de um filtro). */
  chevronClassName?: string
  title?: string
  onFocus?: (e: FocusEvent<HTMLElement>) => void
  onBlur?: (e: FocusEvent<HTMLElement>) => void
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

export function SelectMenu(props: SelectMenuProps) {
  const toque = useMediaQuery('(pointer: coarse)')
  return toque ? <SelectNativo {...props} /> : <SelectDeVidro {...props} />
}

function SelectNativo({ onChange, onValueChange, children, ...nativas }: SelectMenuProps) {
  return (
    <Select {...nativas} onChange={(e) => { onChange?.(e); onValueChange?.(e.target.value) }}>
      {children}
    </Select>
  )
}

// ── As opções, lidas dos filhos ─────────────────────────────────────────────

interface Opcao {
  valor: string
  rotulo: string
  desabilitado: boolean
  grupo?: string
}

interface PropsDeOpcao {
  value?: string | number | readonly string[]
  label?: string
  disabled?: boolean
  children?: ReactNode
}

function textoDe(no: ReactNode): string {
  if (no == null || typeof no === 'boolean') return ''
  if (typeof no === 'string' || typeof no === 'number') return String(no)
  if (Array.isArray(no)) return no.map(textoDe).join('')
  if (isValidElement<{ children?: ReactNode }>(no)) return textoDe(no.props.children)
  return ''
}

/** `<option>` em qualquer profundidade de Fragment/array; `<optgroup>` vira grupo. */
function lerOpcoes(filhos: ReactNode, grupo?: string, grupoDesabilitado = false, saida: Opcao[] = []): Opcao[] {
  Children.forEach(filhos, (filho) => {
    if (!isValidElement<PropsDeOpcao>(filho)) return
    const p = filho.props
    if (filho.type === Fragment) lerOpcoes(p.children, grupo, grupoDesabilitado, saida)
    else if (filho.type === 'optgroup') lerOpcoes(p.children, p.label, !!p.disabled, saida)
    else if (filho.type === 'option') {
      // Como o `option.text`: espaços juntados e aparados.
      const texto = textoDe(p.children).replace(/\s+/g, ' ').trim()
      saida.push({
        valor: p.value !== undefined ? String(p.value) : texto,
        rotulo: p.label ?? texto,
        desabilitado: grupoDesabilitado || !!p.disabled,
        grupo,
      })
    }
  })
  return saida
}

// ── O campo ─────────────────────────────────────────────────────────────────

// spec/1a-primitivos.md FIELD-03 — os mesmos do `Select`.
const tamanhos = {
  sm: 'h-7 pl-2.5 pr-7 text-xs',
  md: 'h-9 pl-2.5 pr-8 text-[13px]',
  lg: 'h-11 pl-3.5 pr-8 text-sm',
}
// A linha da opção acompanha o campo; no md, a do item de menu (DROP-02).
const linhas = {
  sm: 'min-h-7 py-1 text-xs',
  md: 'min-h-[30px] py-1 text-[13px]',
  lg: 'min-h-9 py-1.5 text-sm',
}

function SelectDeVidro({
  value, defaultValue, onChange, onValueChange, children, id, name, disabled, required, autoFocus,
  error, size = 'md', className, chevronClassName, title, onFocus, onBlur,
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': describedBy,
  ...resto
}: SelectMenuProps) {
  // Ver `Input`: id/aria vêm do `FormField` quando houver um em volta.
  const campo = useFormFieldAria()
  const aria = mergeFieldAria(campo, { id, describedBy, invalid: !!error, required })
  const invalido = !!error || !!campo?.invalid
  const idGerado = useId()
  const idBotao = aria.id ?? `${idGerado}-campo`
  const listaId = `${idGerado}-lista`
  const botaoRef = useRef<HTMLButtonElement>(null)
  const [interno, setInterno] = useState(() => String(defaultValue ?? ''))

  const opcoes = lerOpcoes(children)
  const atual = value !== undefined ? String(value) : interno
  const achado = opcoes.findIndex((o) => o.valor === atual)
  const escolhido = achado >= 0 ? achado : opcoes.findIndex((o) => !o.desabilitado)
  const opcaoEscolhida = escolhido >= 0 ? opcoes[escolhido] : undefined
  const valorEfetivo = opcaoEscolhida?.valor ?? ''

  const lista = useListaSelecao({
    itens: opcoes,
    escolhido,
    desabilitada: !!disabled,
    // Safari e Firefox no Mac não dão foco a um botão clicado: sem isto, o
    // teclado não chegaria à lista aberta pelo mouse.
    aoAbrir: () => botaoRef.current?.focus(),
    aoEscolher: (indice: number, origem: OrigemDaEscolha) => {
      if (origem !== 'tab') botaoRef.current?.focus()
      const novo = opcoes[indice].valor
      if (novo === valorEfetivo) return
      if (value === undefined) setInterno(novo)
      const alvo = { value: novo, name: name ?? '' }
      onChange?.({ target: alvo, currentTarget: alvo })
      onValueChange?.(novo)
    },
  })
  const idOpcao = (i: number) => `${listaId}-${i}`

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        role="combobox"
        {...resto}
        {...aria}
        id={idBotao}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-haspopup="listbox"
        aria-expanded={lista.aberta}
        aria-controls={lista.aberta ? listaId : undefined}
        aria-activedescendant={lista.aberta && lista.ativa >= 0 ? idOpcao(lista.ativa) : undefined}
        value={valorEfetivo}
        title={title}
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={lista.alternar}
        onKeyDown={lista.aoTeclar}
        // O Firefox aciona o botão no keyup do Espaço mesmo com o keydown
        // cancelado: a lista abriria e fecharia na mesma tecla.
        onKeyUp={(e) => { if (e.key === ' ') e.preventDefault() }}
        onFocus={onFocus}
        onBlur={(e) => { lista.fechar(); onBlur?.(e) }}
        className={cn(
          'flex w-full items-center text-left',
          'appearance-none bg-surface-800 border rounded-sm text-surface-100',
          tamanhos[size],
          'focus:outline-none focus:ring-[3px] focus:ring-accent-soft focus:border-brand-500',
          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          'transition-colors duration-150',
          invalido ? 'border-danger' : 'border-[var(--bd2)]',
          className,
        )}
      >
        {/* A opção escolhida e, por baixo, uma medida invisível de cada opção
            (texto em ::after, fora do DOM e da árvore de acessibilidade): sem
            largura definida, o campo fica da largura da maior, como o select. */}
        <span className="grid min-w-0 flex-1">
          <span className="col-start-1 row-start-1 truncate">{opcaoEscolhida?.rotulo || ' '}</span>
          {opcoes.map((o, i) => (
            <span
              key={i}
              aria-hidden
              data-medida={o.rotulo}
              className="invisible col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap after:content-[attr(data-medida)]"
            />
          ))}
        </span>
      </button>
      {/* FIELD-06: chevron 14px em --tx3, como no Select; vira com a lista aberta. */}
      <ChevronDown
        aria-hidden
        className={cn(
          'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500 transition-transform duration-150',
          lista.aberta && 'rotate-180',
          chevronClassName,
        )}
      />
      {name && <input type="hidden" name={name} value={valorEfetivo} />}

      {lista.aberta && typeof document !== 'undefined' && (
        <PainelDaLista
          ancoraRef={botaoRef}
          id={listaId}
          idOpcao={idOpcao}
          rotulo={ariaLabel ? { 'aria-label': ariaLabel } : { 'aria-labelledby': ariaLabelledby ?? idBotao }}
          opcoes={opcoes}
          escolhido={escolhido}
          ativa={lista.ativa}
          size={size}
          aoApontar={lista.apontar}
          aoEscolher={(i) => lista.escolher(i, 'ponteiro')}
          aoFechar={lista.fechar}
        />
      )}
    </div>
  )
}

// ── A lista aberta ──────────────────────────────────────────────────────────

/** Teto da lista: ~10 opções; o resto rola dentro dela. */
const ALTURA_MAXIMA = 320
const RESPIRO_ROLAGEM = 4

/**
 * Montada só enquanto a lista está aberta: é ela que entra na pilha de camadas
 * (z-index acima do modal de baixo) e que mede a posição — campos fechados não
 * assinam nada.
 */
function PainelDaLista({ ancoraRef, id, idOpcao, rotulo, opcoes, escolhido, ativa, size, aoApontar, aoEscolher, aoFechar }: {
  ancoraRef: RefObject<HTMLButtonElement | null>
  id: string
  idOpcao: (i: number) => string
  rotulo: { 'aria-label': string } | { 'aria-labelledby': string }
  opcoes: Opcao[]
  escolhido: number
  ativa: number
  size: 'sm' | 'md' | 'lg'
  aoApontar: (i: number) => void
  aoEscolher: (i: number) => void
  aoFechar: () => void
}) {
  const semMovimento = useReducedMotion()
  const listaRef = useRef<HTMLUListElement>(null)
  const primeira = useRef(true)
  const pos = usePosicaoFlutuante(true, 'left', ancoraRef, listaRef)
  const { zIndex } = useLayer(true, aoFechar)
  const paraCima = pos.bottom !== undefined

  // A opção ativa sempre à vista: ao abrir, no meio da lista (como a nativa);
  // depois, só o necessário para ela aparecer.
  useLayoutEffect(() => {
    const ul = listaRef.current
    const el = ul?.querySelector<HTMLElement>(`[data-indice="${ativa}"]`)
    if (!ul || !el) return
    if (primeira.current) {
      primeira.current = false
      ul.scrollTop = el.offsetTop - (ul.clientHeight - el.offsetHeight) / 2
    } else if (el.offsetTop < ul.scrollTop) {
      ul.scrollTop = el.offsetTop - RESPIRO_ROLAGEM
    } else if (el.offsetTop + el.offsetHeight > ul.scrollTop + ul.clientHeight) {
      ul.scrollTop = el.offsetTop + el.offsetHeight - ul.clientHeight + RESPIRO_ROLAGEM
    }
  }, [ativa, pos.maxHeight])

  return createPortal(
    // Camada transparente na tela toda: o clique fora só FECHA (não aciona o
    // que está embaixo, como a lista nativa). O foco fica no campo (mousedown
    // cancelado) e nenhum evento sobe pela árvore do React até quem está em
    // volta do campo — o fundo de um Modal, uma linha clicável, um arrastável.
    <div
      style={{ position: 'fixed', inset: 0, zIndex }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.target === e.currentTarget) aoFechar()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.ul
        ref={listaRef}
        id={id}
        role="listbox"
        {...rotulo}
        // A entrada curta do Dropdown, vinda do lado do campo.
        initial={semMovimento ? false : { opacity: 0, y: paraCima ? 4 : -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.13, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          ...(pos.top !== undefined ? { top: pos.top } : { bottom: pos.bottom }),
          left: pos.left,
          maxHeight: Math.min(pos.maxHeight, ALTURA_MAXIMA),
          minWidth: pos.larguraAncora,
          maxWidth: pos.larguraDisponivel,
        }}
        className={cn(
          // O vidro dos menus (index.css), no raio e respiro do Dropdown.
          'overlay-surface overlay-vidro border rounded-lg p-1',
          'overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]',
        )}
      >
        {opcoes.map((o, i) => {
          const marcada = i === escolhido
          const grupoNovo = o.grupo !== undefined && o.grupo !== opcoes[i - 1]?.grupo
          return (
            <Fragment key={i}>
              {grupoNovo && (
                <li role="presentation" className="select-none px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-surface-500">
                  {o.grupo}
                </li>
              )}
              <li
                id={idOpcao(i)}
                role="option"
                aria-selected={marcada}
                aria-disabled={o.desabilitado || undefined}
                data-indice={i}
                data-valor={o.valor}
                onMouseMove={() => aoApontar(i)}
                onClick={() => aoEscolher(i)}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 rounded-[5px] px-2 whitespace-nowrap',
                  linhas[size],
                  i === ativa && 'bg-[var(--rowhover)]',
                  marcada ? 'font-medium text-surface-50' : 'text-surface-100',
                  o.desabilitado && 'cursor-not-allowed opacity-40',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.rotulo || ' '}</span>
                {/* Sem visto no texto inicial desabilitado ("Selecione…"): é aviso, não escolha. */}
                {marcada && !o.desabilitado && <Check aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-brand-400" />}
              </li>
            </Fragment>
          )
        })}
      </motion.ul>
    </div>,
    document.body,
  )
}
