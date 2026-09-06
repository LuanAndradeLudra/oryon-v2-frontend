import { useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { getChartColors } from '@/components/dashboard/utils'
import { funnelGeometry, funnelHeight } from './funnelGeometry'
import type { FunnelStep } from './reportModel'

const VIEWBOX_WIDTH = 560
const MAX_WIDTH = 480

interface DeliveryFunnelProps {
  steps: FunnelStep[]
  /** D34. `null` → o texto girado à esquerda não é renderizado (não estimamos). */
  avgTimeToReadMinutes: number | null
}

/**
 * Funil de entrega: a largura de cada faixa é proporcional ao volume.
 *
 * A geometria fica em `funnelGeometry.ts` (puro e testado); aqui só se pinta.
 * As cores saem de `getChartColors()`, ou seja de variáveis CSS — nenhum hex
 * literal, conforme a Carta de Padrões.
 */
export function DeliveryFunnel({ steps, avgTimeToReadMinutes }: DeliveryFunnelProps) {
  const colors = useMemo(() => getChartColors(), [])

  const bands = useMemo(
    () => funnelGeometry(steps.map((s) => s.value ?? 0), { maxWidth: MAX_WIDTH }),
    [steps],
  )

  const paleta = [colors.cyan, colors.online, colors.purple, colors.brand]
  const altura = funnelHeight(steps.length)
  const respondido = steps[steps.length - 1]
  const chip = respondido?.value != null ? bands[bands.length - 1]?.pct : null

  return (
    <Card>
      <CardHeader
        title="Funil de entrega"
        description="Largura proporcional ao volume"
        action={
          chip != null ? (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-brand-500/15 text-brand-300">
              {formatarPct(chip)} responderam
            </span>
          ) : null
        }
      />
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${altura + 8}`}
        width="100%"
        height={altura + 8}
        role="img"
        aria-label={resumoAcessivel(steps, bands.map((b) => b.pct))}
      >
        {steps.map((step, i) => {
          const band = bands[i]
          if (!band) return null
          const semDado = step.value == null
          const centro = MAX_WIDTH / 2 + 40
          const meioY = band.y + 21

          return (
            <g key={step.key}>
              <polygon
                points={band.points}
                fill={paleta[i % paleta.length]}
                // A faixa sem dado fica esmaecida em vez de sumir: o degrau
                // continua existindo no funil, é a medição que falta.
                opacity={semDado ? 0.25 : 0.85}
              />
              {band.labelInside ? (
                <>
                  <text
                    x={centro - band.topWidth / 2 + 12}
                    y={meioY + 4}
                    fontSize={13}
                    fontWeight={700}
                    fill={colors.surface8}
                  >
                    {step.label}
                  </text>
                  <text
                    x={centro + band.topWidth / 2 - 12}
                    y={meioY + 4}
                    textAnchor="end"
                    fontSize={13}
                    fontWeight={700}
                    fill={colors.surface8}
                    className="font-mono"
                  >
                    {formatarValor(step.value, band.pct)}
                  </text>
                </>
              ) : (
                <>
                  {/* Faixa estreita: o número fica dentro e o rótulo sai para
                      a direita, como no mockup. */}
                  <text
                    x={centro}
                    y={meioY + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={colors.surface8}
                    className="font-mono"
                  >
                    {step.value ?? '—'}
                  </text>
                  <text x={centro + band.topWidth / 2 + 12} y={meioY + 4} fontSize={11} fill={colors.text}>
                    {step.label}
                    {band.pct != null && step.value != null ? ` · ${formatarPct(band.pct)}` : ''}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {avgTimeToReadMinutes != null && (
          <text
            x={20}
            y={altura / 2}
            fontSize={10}
            fill={colors.axis}
            transform={`rotate(-90 20 ${altura / 2})`}
          >
            tempo médio até ler: {formatarDuracao(avgTimeToReadMinutes)}
          </text>
        )}
      </svg>
    </Card>
  )
}

/** `null` vira travessão, nunca zero — "não medimos" não é "ninguém leu". */
function formatarValor(value: number | null, pct: number | null): string {
  if (value == null) return '—'
  const n = value.toLocaleString('pt-BR')
  return pct == null ? n : `${n} · ${formatarPct(pct)}`
}

function formatarPct(pct: number): string {
  return `${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${Math.round(minutos)} min`
  const h = Math.floor(minutos / 60)
  const m = Math.round(minutos % 60)
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/**
 * O SVG é a única forma do dado nesta caixa, então o leitor de tela precisa da
 * mesma informação em texto — sem isso o bloco inteiro é invisível para quem
 * não vê o desenho.
 */
function resumoAcessivel(steps: FunnelStep[], pcts: (number | null)[]): string {
  const partes = steps.map((s, i) => {
    if (s.value == null) return `${s.label}: não apurado`
    const pct = pcts[i]
    return pct == null ? `${s.label}: ${s.value}` : `${s.label}: ${s.value} (${formatarPct(pct)})`
  })
  return `Funil de entrega. ${partes.join('. ')}.`
}
