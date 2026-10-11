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
  /** Dica ao passar o mouse (title). */
  title?: string
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
        'inline-flex items-stretch border border-surface-700 rounded-[6px] overflow-hidden',
        // SCRUM-1253 (PO, 06–07/10): no claro o "ink" e o "subtle" viram TRILHO cinza (papel
        // "controle" da escala de neutros) com o selecionado em branco e sombra
        // leve — padrão iOS/Linear. O escuro segue com a tinta invertida.
        (variant === 'ink' || variant === 'subtle') && '[[data-theme=light]_&]:bg-[#EAEEF3] [[data-theme=light]_&]:border-transparent [[data-theme=light]_&]:p-0.5 [[data-theme=light]_&]:gap-0.5 [[data-theme=light]_&]:rounded-[8px]',
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
            title={opt.title}
            onClick={() => onChange(opt.value)}
            style={active && solid ? ({ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties) : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer whitespace-nowrap',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : size === '32' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
              i > 0 && 'border-l border-surface-700',
              // ELEV-02 (spec 1a): sem sombra fora de overlay.
              (variant === 'ink' || variant === 'subtle') && cn(
                '[[data-theme=light]_&]:border-l-0 [[data-theme=light]_&]:rounded-[6px]',
                size === 'sm' ? '[[data-theme=light]_&]:h-6' : size === '32' ? '[[data-theme=light]_&]:h-7' : '[[data-theme=light]_&]:h-8',
                active
                  ? '[[data-theme=light]_&]:bg-white [[data-theme=light]_&]:hover:bg-white [[data-theme=light]_&]:text-surface-100 [[data-theme=light]_&]:shadow-[0_1px_2px_rgba(15,23,42,.14),0_0_0_1px_rgba(15,23,42,.05)]'
                  : '[[data-theme=light]_&]:bg-transparent [[data-theme=light]_&]:text-[#4B5563] [[data-theme=light]_&]:hover:bg-transparent [[data-theme=light]_&]:hover:text-surface-100',
              ),
              variant === 'ink'
                ? active
                  ? 'bg-[var(--ink-bg)] bg-(image:--ink-grad) text-[var(--ink-fg)] hover:bg-[var(--ink-bg-hover)] hover:bg-(image:--ink-grad-hover)'
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
