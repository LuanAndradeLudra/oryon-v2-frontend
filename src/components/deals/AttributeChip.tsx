import { useState, type ReactNode } from 'react'
import { Check, ChevronDown, Plus, type LucideIcon } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { cn } from '@/lib/utils'

/**
 * Ficha de atributo — botão compacto que mostra o VALOR e abre o seletor no
 * clique, no lugar de um bloco rotulado de largura inteira.
 *
 * Serve ao atributo que é (a) escolhido de um conjunto, (b) tem default
 * razoável e (c) cabe em poucas palavras. Texto livre continua sendo campo:
 * uma ficha que abre um popover só para digitar é pior que o campo.
 *
 * Dois estados, e a diferença é informação: **preenchida** (fundo, borda
 * sólida, valor + chevron) diz "isto já está resolvido, clique para trocar";
 * **vazia** (borda tracejada, "+") diz "isto existe e é opcional" sem cobrar
 * a altura de um campo de quem não vai usar.
 *
 * Vive em `deals/` porque nasceu no diálogo de criação de negócio. Não tem
 * nada de negócio na API — quando o segundo consumidor aparecer (Origem e
 * Etiquetas do contato são os candidatos), sobe para `ui/` sem mudar nada.
 */
export interface AttributeChipProps {
  /** Nome do atributo. Aparece SEMPRE na ficha, antes do valor. */
  label: string
  /** Valor atual. Ausente/vazio = ficha vazia. */
  value?: string | null
  /**
   * Uma linha dizendo o que se está escolhendo. Aparece no cabeçalho do
   * popover — no momento da escolha, e não ocupando o formulário para sempre.
   */
  hint?: string
  /** Ícone à esquerda quando há valor. */
  icon?: LucideIcon
  /** Substitui o ícone (ex: avatar do dono). */
  leading?: ReactNode
  disabled?: boolean
  align?: 'left' | 'right'
  /**
   * Ocupa a largura do contêiner, com o valor à esquerda e o chevron colado à
   * direita. É a forma que a ficha assume numa COLUNA de propriedades, onde
   * larguras diferentes por conteúdo viram serrilha.
   */
  full?: boolean
  /** Conteúdo do popover. Recebe `fechar` para encerrar após a escolha. */
  children: (fechar: () => void) => ReactNode
}

export function AttributeChip({
  label,
  value,
  hint,
  icon: Icon,
  leading,
  disabled,
  align = 'left',
  full,
  children,
}: AttributeChipProps) {
  const [open, setOpen] = useState(false)
  const preenchida = !!value

  return (
    <Dropdown
      open={open}
      onClose={() => setOpen(false)}
      align={align}
      // O Dropdown nasce em z-50 e o Modal vive em z-[60]: sem subir a camada,
      // o popover abriria ATRÁS do diálogo que o chamou.
      className="z-[70] p-1 max-h-72 overflow-y-auto"
      anchor={
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={preenchida ? `${label}: ${value}` : `Definir ${label.toLowerCase()}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs leading-tight',
            'min-h-9 sm:min-h-0 transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            full && 'w-full text-left text-[13px]',
            preenchida
              ? 'bg-surface-800 border border-surface-700 text-surface-200 hover:border-surface-600'
              : 'border border-dashed border-surface-700 text-surface-500 hover:text-surface-300 hover:border-surface-600',
          )}
        >
          {leading ?? (preenchida
            ? Icon && <Icon className="w-3.5 h-3.5 text-surface-400 shrink-0" aria-hidden />
            : <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />)}
          {/* Na coluna o nome do atributo já está no rótulo acima — repeti-lo
              dentro da ficha seria a mesma redundância que derrubou as seções
              nomeadas do formulário antigo. Na fila horizontal ele continua,
              porque lá não há rótulo nenhum: "Novo" sozinho não diz de que
              eixo é. */}
          {preenchida && !full && <span className="text-surface-500 shrink-0">{label}</span>}
          <span className={cn('truncate', full ? 'min-w-0' : 'max-w-[13rem]')}>{preenchida ? value : label}</span>
          {preenchida && <ChevronDown className={cn('w-3 h-3 text-surface-500 shrink-0', full && 'ml-auto')} aria-hidden />}
        </button>
      }
    >
      <ChipHeader label={label} hint={hint} />
      {children(() => setOpen(false))}
    </Dropdown>
  )
}

/**
 * Cabeçalho do popover: diz o que está sendo escolhido e, quando o atributo
 * não é óbvio, o que ele significa.
 *
 * É aqui que voltou a didática que o formulário antigo carregava em três
 * linhas de ajuda permanentes ("Coluna em que o negócio nasce", "Você pode
 * deixar sem dono…"). O texto é o mesmo; o que mudou é a hora em que ele
 * aparece — no momento da escolha, e não ocupando altura para sempre.
 */
function ChipHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="px-3 pt-2 pb-2 mb-1 border-b border-surface-800">
      <p className="text-xs font-semibold text-surface-200">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-surface-500">{hint}</p>}
    </div>
  )
}

/**
 * Item do popover de uma ficha. O `role="menuitem"` não é decoração: é por ele
 * que o `Dropdown` encontra o primeiro item para focar na abertura e move o
 * foco com as setas.
 */
export function ChipOption({
  selected,
  onSelect,
  children,
}: {
  selected?: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
        'min-h-11 sm:min-h-9 transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:bg-surface-800',
        selected ? 'bg-surface-800 text-surface-50' : 'text-surface-200 hover:bg-surface-800',
      )}
    >
      <span className="truncate">{children}</span>
      {selected && <Check className="w-3.5 h-3.5 ml-auto shrink-0 text-brand-400" aria-hidden />}
    </button>
  )
}

/**
 * Ficha que não abre popover — liga e desliga um bloco que cresce na própria
 * tela (o valor do negócio). Mesma gramática visual das outras, para a fila de
 * fichas ler como uma fila só.
 */
export function ToggleChip({
  label,
  value,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  value?: string | null
  icon?: LucideIcon
  active: boolean
  onClick: () => void
}) {
  const preenchida = !!value || active
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={value ? `${label}: ${value}` : `Definir ${label.toLowerCase()}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs leading-tight',
        'min-h-9 sm:min-h-0 transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
        preenchida
          ? 'bg-surface-800 border border-surface-700 text-surface-200 hover:border-surface-600'
          : 'border border-dashed border-surface-700 text-surface-500 hover:text-surface-300 hover:border-surface-600',
      )}
    >
      {preenchida
        ? Icon && <Icon className="w-3.5 h-3.5 text-surface-400 shrink-0" aria-hidden />
        : <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      {value && <span className="text-surface-500 shrink-0">{label}</span>}
      <span className="truncate max-w-[13rem]">{value || label}</span>
    </button>
  )
}
