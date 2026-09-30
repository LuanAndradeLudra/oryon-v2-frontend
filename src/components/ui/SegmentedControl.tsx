// ─── Segmented Control ───────────────────────────────────────────────────────
// Grupo de filtros/abas usado em toolbars (status de campanhas, tipos de
// automação, Dia/Semana/Lista, Minhas/Fila/Todas). SCRUM-1097 (canvas 1d/2d):
// barra UNIDA — `border 1px --bd`, raio 7, overflow hidden — com segmentos
// colados de 28px, `12px/600`, divisor de 1px (border-left) entre eles; ativo
// = fundo --sf2 + texto --tx, inativo = --tx2; contagem em texto simples
// (`margin-left:5px`, --tx2), não em pílula. (Antes: pílula dentro de pílula.)

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
  size?: 'sm' | '32' | 'md'
  className?: string
  /**
   * Estilo do estado ativo:
   * - `subtle` (default): segmento ativo em --sf2 + texto --tx (canvas 1d/2d,
   *   CONV-LIST-02..05). Usado em toolbars/abas por todo o app.
   * - `solid`: pílula saturada teal + texto/ícone brancos (padrão .color-chip
   *   dos badges de tags); o contador do item ativo fica branco com número
   *   preto para contraste. Para filtros de destaque.
   */
  /** `ink` (PO, 23/09): selecionado em "tinta" invertida (`--ink-bg/--ink-fg`,
   *  máximo contraste sem cor) e não selecionado com fundo neutro — o mesmo
   *  vocabulário dos chips de filtro da inbox, para um único estado
   *  "selecionado" na linha. */
  variant?: 'subtle' | 'solid' | 'ink'
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
        'inline-flex items-stretch border border-surface-700 rounded-sm overflow-hidden',
        className,
      )}
    >
      {options.map((opt, i) => {
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
              'inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer whitespace-nowrap',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : size === '32' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
              i > 0 && 'border-l border-surface-700',
              // ELEV-02 (spec 1a): sem sombra fora de overlay.
              variant === 'ink'
                ? active
                  ? 'bg-[var(--ink-bg)] text-[var(--ink-fg)] hover:bg-[var(--ink-bg-hover)]'
                  : 'bg-surface-800 text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-100'
                : active
                  ? solid
                    ? 'color-chip'
                    : 'bg-[var(--sf2)] text-surface-100'
                  : 'text-surface-400 hover:text-surface-100',
            )}
          >
            {Icon && <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className={cn('ml-0.5 tabular-nums', active && solid ? 'text-white' : 'text-surface-400')}>
                {opt.count > 99 ? '99+' : opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
