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
  // Nunca deixa o total efetivo ficar abaixo da soma dos segmentos — um
  // `total` explícito menor que `sum` faria os segmentos somarem >100% de
  // largura (cortados de forma arbitrária pelo `overflow-hidden`, em vez de
  // proporcionais).
  const effectiveTotal = Math.max(total ?? sum, sum)
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
                {/* 2px literal: a escala de raio deste projeto começa em
                    `sm` = 10 nominal, então não há token que caia em 2. Quem
                    escreve `rounded-sm` esperando os 2px do Tailwind recebe
                    10 — a armadilha que originou este card. */}
                <span
                  className="w-2 h-2 rounded-[2px] flex-shrink-0 inline-block"
                  style={{ backgroundColor: segmentColor(s.color), opacity: s.dimmed ? 0.7 : 1 }}
                />
                {s.label}
              </span>
              {/* Só o primeiro valor vem destacado; os demais em `s400`. No
                  mockup (`d6-publico.html`) o primeiro `<b class="mono">` não
                  tem override e os seguintes trazem `color:var(--s400)`. A
                  hierarquia é o ponto: o primeiro segmento é o número que a
                  linha está afirmando, o resto é contexto. */}
              <b className={cn('font-mono tabular-nums', i === 0 ? 'text-surface-100' : 'text-surface-400')}>
                {s.value.toLocaleString('pt-BR')}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
