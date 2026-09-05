// ─── SegmentGroup ──────────────────────────────────────────────────────────
// Uma caixa de condições — o `.grpbox` do mockup. Duas variantes:
//   `include` — borda neutra, alterna E/OU entre as condições, aceita novas.
//   `exclude` — borda rosa, "Excluir sempre", conteúdo fixo (os 3 motivos de
//               exclusão do contrato), contagens negativas.
import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tint } from '@/components/ui/accentColor'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

interface SegmentGroupProps {
  variant?: 'include' | 'exclude'
  /** "Incluir quem atende a todas" / "Incluir também" / "Excluir sempre". */
  title: ReactNode
  /** Texto pequeno à direita do título (só na caixa de exclusão). */
  hint?: string
  op?: 'and' | 'or'
  onOpChange?: (op: 'and' | 'or') => void
  onAddCondition?: () => void
  onRemove?: () => void
  /** Rótulo acessível de "remover grupo" — precisa dizer qual grupo. */
  removeLabel?: string
  children: ReactNode
  className?: string
}

export function SegmentGroup({
  variant = 'include', title, hint, op, onOpChange, onAddCondition, onRemove, removeLabel,
  children, className,
}: SegmentGroupProps) {
  const isExclude = variant === 'exclude'

  return (
    <div
      className={cn('rounded-[18px] border bg-surface-800 px-4 py-3.5 relative', !isExclude && 'border-surface-700', className)}
      style={isExclude ? { borderColor: tint('rose', 30) } : undefined}
    >
      <div className="flex items-center justify-between mb-2.5 gap-3">
        <span
          className={cn('text-[10px] font-bold tracking-[0.12em] uppercase', !isExclude && 'text-surface-400')}
          style={isExclude ? { color: tint('rose', 70) } : undefined}
        >
          {title}
        </span>

        <span className="flex items-center gap-2">
          {hint && <span className="text-[9.5px] text-surface-500">{hint}</span>}

          {op && onOpChange && (
            <SegmentedControl
              label="Como combinar as condições deste grupo"
              value={op}
              onChange={onOpChange}
              options={[{ value: 'and', label: 'E' }, { value: 'or', label: 'OU' }]}
            />
          )}

          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={removeLabel ?? 'Remover grupo de condições'}
              className="text-surface-500 hover:text-surface-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      </div>

      {children}

      {onAddCondition && (
        <button
          type="button"
          onClick={onAddCondition}
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Condição
        </button>
      )}
    </div>
  )
}

/** O `.orj` do mockup: a palavra "OU" entre duas caixas, com um filete de cada
 *  lado. Grupos são sempre OR'd entre si — é rótulo, não controle. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-2.5 my-2.5 text-[10px] font-bold tracking-[0.14em] text-surface-500">
      <span className="flex-1 h-px bg-surface-800" />
      OU
      <span className="flex-1 h-px bg-surface-800" />
    </div>
  )
}
