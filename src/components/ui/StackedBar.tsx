// ─── StackedBar ────────────────────────────────────────────────────────────
// Barra de proporção empilhada — unifica `.bar` (`p1-head.html`, base
// compartilhada dos mockups, altura 6px) e `.stack` (`p1b-extra.html`,
// altura 10px): no mockup são a mesma mecânica (linha flex com filhos de
// largura % + cor sólida), só com nomes/alturas diferentes por serem
// fragmentos HTML separados. Usos: funil por linha de disparo (D1),
// breakdown de público (D6), métricas do workspace de agente (A2).
import { cn } from '@/lib/utils'
import { accentColor, type Accent } from './accentColor'

export interface StackedBarSegment {
  value: number
  color: Accent | 'muted'
  label?: string
  dimmed?: boolean
}

interface StackedBarProps {
  segments: StackedBarSegment[]
  height?: 6 | 8 | 10 | 14
  legend?: boolean
  total?: number
  className?: string
}

function segmentColor(color: StackedBarSegment['color']): string {
  return color === 'muted' ? 'var(--color-surface-500)' : accentColor(color)
}

export function StackedBar({ segments, height = 10, legend = false, total, className }: StackedBarProps) {
  const sum = segments.reduce((acc, s) => acc + s.value, 0)
  const effectiveTotal = total ?? sum
  const remainder = Math.max(0, effectiveTotal - sum)

  return (
    <div className={className}>
      <div
        className="flex overflow-hidden"
        style={{ height, borderRadius: height / 2 }}
        role="img"
        aria-label={segments.map((s) => `${s.label ?? 'segmento'}: ${s.value}`).join(', ')}
      >
        {segments.map((s, i) => (
          <div
            key={i}
            style={{
              width: effectiveTotal > 0 ? `${(s.value / effectiveTotal) * 100}%` : 0,
              backgroundColor: segmentColor(s.color),
              opacity: s.dimmed ? 0.7 : 1,
            }}
          />
        ))}
        {remainder > 0 && (
          <div
            style={{
              width: `${(remainder / effectiveTotal) * 100}%`,
              backgroundColor: 'var(--color-surface-700)',
            }}
          />
        )}
      </div>
      {legend && (
        <div className="flex flex-col gap-1 mt-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-surface-300">
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0 inline-block"
                  style={{ backgroundColor: segmentColor(s.color), opacity: s.dimmed ? 0.7 : 1 }}
                />
                {s.label}
              </span>
              <b className={cn('font-mono tabular-nums', 'text-surface-100')}>
                {s.value.toLocaleString('pt-BR')}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
