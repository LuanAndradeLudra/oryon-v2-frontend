import { useState, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'

export interface OpcaoSeletor {
  value: string
  label: string
  /** Texto discreto à direita — preço da variação, "(inativo)", etc. */
  detalhe?: ReactNode
  disabled?: boolean
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<OpcaoSeletor>
  /** Texto quando nada está escolhido. */
  placeholder?: string
  ariaLabel: string
  disabled?: boolean
  className?: string
}

/**
 * Seletor com MENU próprio, no lugar de um `<select>` nativo.
 *
 * O `<select>` estiliza a caixa e não a LISTA: quem desenha as `<option>` é o
 * sistema operacional. Na prática isso significa que, no tema escuro, escolher
 * um produto abre um menu branco do Windows por cima da tela inteira escura — e
 * que nenhuma informação secundária cabe ali, porque `<option>` só aceita texto
 * puro. Era por isso que o preço da variação ficava concatenado no meio do
 * rótulo.
 *
 * Aqui o menu é o `Dropdown` do design system, então herda tema, animação, Esc,
 * clique fora, navegação por teclado e devolução de foco ao gatilho. Cada opção
 * pode ter um `detalhe` alinhado à direita, e a escolhida ganha ✓ — sem cor,
 * porque a cor dentro deste menu não significa "selecionado".
 *
 * Não substitui o `Select` global: este é o caso em que a lista precisa mostrar
 * mais do que uma palavra. Onde o `<select>` basta, ele continua sendo o certo
 * (é nativo, acessível e leve).
 */
export function CampoSeletor({ value, onChange, options, placeholder, ariaLabel, disabled, className }: Props) {
  const [aberto, setAberto] = useState(false)
  const escolhida = options.find((o) => o.value === value) ?? null

  return (
    <Dropdown
      open={aberto}
      onClose={() => setAberto(false)}
      align="left"
      /* Sem `max-h`/`overflow` aqui: quem limita a altura é o próprio
         `Dropdown`, pelo espaço que existe na janela — um teto fixo em rem
         voltaria a vazar numa tela baixa e sobraria espaço numa alta. */
      className="w-64"
      anchor={
        <button
          type="button"
          onClick={() => !disabled && setAberto((v) => !v)}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-label={ariaLabel}
          className={cn(
            'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
            'bg-surface-900 border-surface-700 text-surface-100',
            'hover:border-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
        >
          <span className={cn('flex-1 min-w-0 truncate text-left', !escolhida && 'text-surface-500')}>
            {escolhida?.label ?? placeholder ?? '—'}
          </span>
          {escolhida?.detalhe && (
            <span className="text-xs text-surface-500 shrink-0">{escolhida.detalhe}</span>
          )}
          <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
        </button>
      }
    >
      <div className="px-1 py-1 flex flex-col gap-0.5">
        {options.map((o) => {
          const atual = o.value === value
          return (
            <DropdownItem
              key={o.value || '__vazio__'}
              disabled={o.disabled}
              onClick={() => { setAberto(false); if (!atual) onChange(o.value) }}
            >
              <span className="flex-1 min-w-0 truncate">{o.label}</span>
              {o.detalhe && <span className="text-xs text-surface-500 shrink-0">{o.detalhe}</span>}
              {atual && <Check className="w-3.5 h-3.5 shrink-0 text-surface-400" />}
            </DropdownItem>
          )
        })}
      </div>
    </Dropdown>
  )
}
