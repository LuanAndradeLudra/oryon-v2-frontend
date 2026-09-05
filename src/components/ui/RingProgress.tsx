// ─── RingProgress ──────────────────────────────────────────────────────────
// Anel de progresso circular (SVG) — extraído do mockup aprovado do redesign
// de Agentes/Disparos (`design-system/fluxos-src/p1b-extra.html` `.ring`,
// usado no Pulso do Command Deck e no checklist de Onboarding de Disparos).
// Geometria fixa (viewBox 64×64, raio 27, espessura 6) independente de
// `size` — só o tamanho renderizado muda, igual ao mockup (o anel do
// Onboarding é maior mas com a mesma espessura relativa mais fina).
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { accentColor, type Accent } from './accentColor'

const RADIUS = 27
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 169.6, igual ao mockup

interface RingProgressProps {
  value: number
  max?: number
  size?: 56 | 64 | 72
  color?: Accent
  label?: ReactNode
  children?: ReactNode
  className?: string
}

export function RingProgress({
  value,
  max = 100,
  size = 64,
  color = 'brand',
  label,
  children,
  className,
}: RingProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const offset = CIRCUMFERENCE * (1 - pct / 100)
  const centerContent = children ?? (max === 100 ? `${Math.round(value)}%` : value.toLocaleString('pt-BR'))
  const ariaLabel = typeof label === 'string' ? label : 'Progresso'

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel}
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 64 64" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={32} cy={32} r={RADIUS} fill="none" stroke="var(--color-surface-700)" strokeWidth={6} />
          <circle
            cx={32}
            cy={32}
            r={RADIUS}
            fill="none"
            stroke={accentColor(color)}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-surface-50 font-display tabular-nums"
          aria-hidden="true"
        >
          {centerContent}
        </div>
      </div>
      {label && <div className="text-3xs text-surface-400 mt-1.5 text-center">{label}</div>}
    </div>
  )
}
