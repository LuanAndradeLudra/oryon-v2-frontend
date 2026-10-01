import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mergeFieldAria, useFormFieldAria } from '@/components/ui/formField.context'
import { useListaSelecao } from '@/components/ui/useListaSelecao'

/**
 * LISTA SUSPENSA da landing (formulário de demonstração, 01/10, PO): no lugar
 * do <select> nativo — cuja lista aberta é a do sistema e não aceita estilo —
 * um menu de VIDRO: painel translúcido com desfoque do que está atrás, borda
 * clara fina e um brilho teal no topo (utilitário `landing-vidro`, index.css).
 *
 * Semântica do padrão "select-only combobox" do WAI-ARIA: o botão é o
 * combobox (o foco fica nele, a opção ativa vai por aria-activedescendant) e
 * o menu é um listbox. Teclado e busca por letra são os do SelectMenu do app
 * (`useListaSelecao`): ↓/↑ abrem e andam, Home/End, Enter/Espaço escolhem, Esc
 * fecha sem mudar, Tab escolhe a ativa e segue, e uma letra leva à opção que
 * começa com ela (sem acento: "e" acha "Educação"; repetir anda entre elas).
 * Dentro de um FormField, o rótulo, o erro e o obrigatório vêm por contexto.
 * Quando não cabe embaixo, abre para cima.
 */

export interface OpcaoLista {
  valor: string
  rotulo: string
  /** Ícone à esquerda da opção (e no botão, quando escolhida). */
  icone?: ReactNode
}

/** Altura de uma opção + o respiro do painel: estima o menu antes de abrir. */
const ALTURA_OPCAO = 44
const RESPIRO_PAINEL = 12
const MENU_FIXO = 64

export function ListaSuspensa({ rotulo, opcoes, valor, onEscolher, placeholder, name, className }: {
  /** O nome do campo — rotula o menu aberto para leitor de tela. */
  rotulo: string
  opcoes: readonly OpcaoLista[]
  valor: string
  onEscolher: (valor: string) => void
  placeholder: string
  name?: string
  className?: string
}) {
  const semMovimento = useReducedMotion()
  const aria = mergeFieldAria(useFormFieldAria(), {})
  const listaId = useId()
  const raizRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const [paraCima, setParaCima] = useState(false)

  const indiceEscolhido = opcoes.findIndex((o) => o.valor === valor)
  const escolhida = indiceEscolhido >= 0 ? opcoes[indiceEscolhido] : null
  const idOpcao = (i: number) => `${listaId}-opcao-${i}`

  const lista = useListaSelecao({
    itens: opcoes,
    escolhido: indiceEscolhido,
    aoAbrir: () => {
      // Para cima quando o menu não cabe entre o botão e o pé da tela e há
      // mais espaço acima (até o menu fixo da landing).
      const r = botaoRef.current?.getBoundingClientRect()
      if (!r) return
      const altura = Math.min(320, opcoes.length * ALTURA_OPCAO + RESPIRO_PAINEL) + 8
      const embaixo = window.innerHeight - r.bottom
      setParaCima(embaixo < altura && r.top - MENU_FIXO > embaixo)
    },
    aoEscolher: (i, origem) => {
      onEscolher(opcoes[i].valor)
      if (origem !== 'tab') botaoRef.current?.focus()
    },
  })
  const { aberta, ativa, fechar } = lista

  // Clique ou toque fora fecha.
  useEffect(() => {
    if (!aberta) return
    const fora = (e: PointerEvent) => { if (!raizRef.current?.contains(e.target as Node)) fechar() }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberta, fechar])

  // A opção ativa sempre à vista quando o menu rola.
  useEffect(() => {
    if (aberta && ativa >= 0) listaRef.current?.querySelector<HTMLElement>(`[data-indice="${ativa}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [aberta, ativa])

  return (
    <div ref={raizRef} className={cn('relative', className)}>
      <button
        ref={botaoRef}
        type="button"
        role="combobox"
        {...aria}
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-controls={listaId}
        aria-activedescendant={aberta && ativa >= 0 ? idOpcao(ativa) : undefined}
        onClick={lista.alternar}
        onKeyDown={lista.aoTeclar}
        // O Firefox aciona o botão no keyup do Espaço mesmo com o keydown
        // cancelado: a lista abriria e fecharia na mesma tecla.
        onKeyUp={(e) => { if (e.key === ' ') e.preventDefault() }}
        className={cn(
          'flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-white/[.09] bg-surface-950 pl-3.5 pr-3 text-left text-[14.5px] outline-none',
          'transition-[border-color,box-shadow] duration-150 hover:border-white/[.18]',
          'focus-visible:border-[var(--landing-destaque)] focus-visible:ring-[3px] focus-visible:ring-brand-500/20',
          'aria-[invalid=true]:border-danger/70',
          aberta && 'border-[var(--landing-destaque)] ring-[3px] ring-brand-500/20',
        )}
      >
        {escolhida?.icone && <span aria-hidden className="flex flex-none text-[var(--landing-destaque)]">{escolhida.icone}</span>}
        <span className={cn('min-w-0 flex-1 truncate', escolhida ? 'text-surface-50' : 'text-surface-500')}>{escolhida?.rotulo ?? placeholder}</span>
        <ChevronDown aria-hidden className={cn('h-4 w-4 flex-none text-surface-500 transition-transform duration-200', aberta && 'rotate-180 text-surface-300')} />
      </button>
      {name && <input type="hidden" name={name} value={valor} />}

      <AnimatePresence>
        {aberta && (
          <motion.ul
            ref={listaRef}
            id={listaId}
            role="listbox"
            aria-label={rotulo}
            tabIndex={-1}
            initial={semMovimento ? { opacity: 0 } : { opacity: 0, y: paraCima ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={semMovimento ? { opacity: 0 } : { opacity: 0, y: paraCima ? 4 : -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={semMovimento ? { duration: 0.1 } : { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 }}
            className={cn(
              'landing-vidro absolute inset-x-0 z-50 max-h-[320px] overflow-y-auto overscroll-contain rounded-xl p-1.5 [scrollbar-width:thin]',
              paraCima ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top',
            )}
          >
            {opcoes.map((o, i) => {
              const escolhidaAqui = i === indiceEscolhido
              const ativaAqui = i === ativa
              return (
                <li
                  key={o.valor}
                  id={idOpcao(i)}
                  role="option"
                  aria-selected={escolhidaAqui}
                  data-indice={i}
                  // O foco fica no botão: o toque na opção não o rouba.
                  onPointerDown={(e) => e.preventDefault()}
                  onPointerMove={() => lista.apontar(i)}
                  onClick={() => lista.escolher(i, 'ponteiro')}
                  className={cn(
                    'flex cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] transition-colors duration-100',
                    ativaAqui ? 'bg-white/[.08] text-surface-50' : escolhidaAqui ? 'bg-brand-500/[.10] text-surface-50' : 'text-surface-200',
                  )}
                >
                  {o.icone && (
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-7 w-7 flex-none items-center justify-center rounded-md ring-1 ring-inset transition-colors duration-100',
                        escolhidaAqui ? 'bg-brand-500/[.18] text-[var(--landing-destaque)] ring-brand-500/30' : 'bg-white/[.04] text-surface-300 ring-white/[.07]',
                      )}
                    >
                      {o.icone}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
                  {escolhidaAqui && <Check aria-hidden className="h-4 w-4 flex-none text-[var(--landing-destaque)]" strokeWidth={2.4} />}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Um medidor de quatro barras (o tamanho da equipe, de "só eu" a "mais de vinte"). */
export function Medidor({ nivel }: { nivel: number }) {
  return (
    <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={cn('w-[3px] rounded-full bg-current', n > nivel && 'opacity-25')} style={{ height: `${n * 25}%` }} />
      ))}
    </span>
  )
}
