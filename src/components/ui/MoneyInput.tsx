import { Input } from '@/components/ui/Input'
import { formatCents } from '@/utils/money'

/** Teto do `integer` do Postgres em centavos (~R$ 21,4 mi por preço). */
const MAX_CENTS = 2_147_483_647

interface MoneyInputProps {
  /** Valor em centavos. */
  value: number
  /** Recebe o novo valor em centavos. */
  onChange: (cents: number) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /**
   * Identificação e estado do campo. Fora de um `FormField` (vários por linha,
   * como no editor de itens do negócio) o rótulo é um `<label htmlFor>` próprio
   * e o nome acessível precisa vir daqui — sem isto o leitor de tela anunciava
   * quatro campos "R$" sem nome na mesma linha.
   */
  id?: string
  'aria-label'?: string
  disabled?: boolean
}

/**
 * Campo monetário que opera em CENTAVOS inteiros. A digitação é interpretada da
 * direita para a esquerda (acumulador): só dígitos contam, então não há parsing de
 * separador de milhar/locale — elimina na raiz o bug do `R$1.500` → `1.50`.
 *
 * Ao focar, o texto é todo selecionado, então editar um valor existente reescreve
 * limpo (evita o erro de digitar no meio e gerar um valor 10x errado).
 */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
  id,
  'aria-label': ariaLabel,
  disabled,
}: MoneyInputProps) {
  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    const cents = digits ? parseInt(digits, 10) : 0
    onChange(Math.min(cents, MAX_CENTS))
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm pointer-events-none">
        R$
      </span>
      <Input
        id={id}
        aria-label={ariaLabel}
        disabled={disabled}
        value={formatCents(value)}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={placeholder ?? '0,00'}
        autoFocus={autoFocus}
        inputMode="numeric"
        className={`pl-9 text-right tabular-nums ${className ?? ''}`}
      />
    </div>
  )
}
