// ─── Checkbox ────────────────────────────────────────────────────────────────
// spec/1a-primitivos.md TABLE-12 / RAD-09 (SCRUM-1097): 14px, raio 4px, borda
// `--bd2` sobre `--sf`; marcado = fundo `--btn` (o mesmo do botão primário,
// por tema) + check de 10px na cor `--btntx`. O visual vive em `.ui-checkbox`
// (index.css) porque o check é um background-image por tema.
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} type="checkbox" className={cn('ui-checkbox cursor-pointer', className)} {...props} />
  ),
)
Checkbox.displayName = 'Checkbox'
