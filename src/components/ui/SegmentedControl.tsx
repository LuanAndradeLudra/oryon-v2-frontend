// ─── Segmented Control ───────────────────────────────────────────────────────
// Grupo de filtros/abas em pílula usado em toolbars (status de campanhas,
// tipos de automação, abas de página). Substitui as 4+ reimplementações
// inline que divergiam em padding/radius/estados.
//
// RAIO: o `.seg` do mockup pede 12px no contêiner e 8px no item. A escala
// deste projeto NÃO é a do Tailwind — `rounded-lg` são 16px e `rounded-xl`
// são 20px aqui —, então `rounded-md` (12px) e `rounded-[8px]` são o que
// casa. Achado do Buril no gate de CSS da A4; corrigido junto com a D4 por
// ser primitivo compartilhado.

import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ComponentType<{ className?: string }>
  /** Contagem opcional exibida como badge à direita do label. */
  count?: number
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
  /**
   * Estilo do estado ativo:
   * - `subtle` (default): pílula cinza discreta (bg-surface-700). Usado em
   *   toolbars/abas por todo o app — NÃO alterar sem revisar os callers.
   * - `solid`: pílula saturada teal + texto/ícone brancos (padrão .color-chip
   *   dos badges de tags); o contador do item ativo fica branco com número
   *   preto para contraste. Para filtros de destaque.
   */
  variant?: 'subtle' | 'solid'
  /** aria-label do grupo (obrigatório para leitores de tela). */
  label: string
}

export function SegmentedControl<T extends string>({
  options, value, onChange, size = 'sm', className, label, variant = 'subtle',
}: SegmentedControlProps<T>) {
  const solid = variant === 'solid'
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-md p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={active && solid ? ({ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties) : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[8px] font-medium transition-all cursor-pointer',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active
                ? solid
                  ? 'color-chip border shadow-sm'
                  : 'bg-surface-700 text-surface-100 shadow-sm'
                : 'text-surface-500 hover:text-surface-300',
            )}
          >
            {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={cn(
                  'min-w-[18px] px-1 rounded-full text-[10px] font-semibold text-center tabular-nums',
                  active
                    ? solid
                      ? 'bg-white text-black'
                      : 'bg-surface-600 text-surface-100'
                    : 'bg-surface-700 text-surface-400',
                )}
              >
                {opt.count > 99 ? '99+' : opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
