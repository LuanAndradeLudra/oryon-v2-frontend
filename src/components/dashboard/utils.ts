import type { KpiUnit } from '@/types/dashboard'

export function formatKpiValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case 'count':
      return value.toLocaleString('pt-BR')
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'seconds': {
      if (value === 0) return '—'
      if (value < 60) return `${Math.round(value)}s`
      if (value < 3600) {
        const m = Math.floor(value / 60)
        const s = Math.round(value % 60)
        return s > 0 ? `${m}m ${s}s` : `${m}m`
      }
      const h = Math.floor(value / 3600)
      const m = Math.round((value % 3600) / 60)
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    case 'csat_score':
      return value === 0 ? '—' : `${value.toFixed(1)}`
    case 'nps_score':
      return value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`
    case 'currency':
      return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return String(value)
  }
}

// ── Cores de gráfico theme-aware ─────────────────────────────────────────────
// Recharts precisa de valores concretos (attrs SVG não aceitam var()), então
// resolvemos os tokens do design system em runtime. Consumir SEMPRE via
// useChartColors() (hooks/useChartColors.ts), que re-resolve ao trocar o tema.

const readVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

export function getChartColors() {
  return {
    brand:    readVar('--color-brand-500',     '#2DD4BF'),
    online:   readVar('--color-status-active', '#4ADE80'),
    away:     readVar('--color-accent-amber',  '#F59E0B'),
    danger:   readVar('--color-danger',        '#EF4444'),
    purple:   readVar('--color-accent-violet', '#8B5CF6'),
    cyan:     readVar('--color-accent-cyan',   '#06B6D4'),
    grid:     readVar('--color-surface-700',   '#243333'),
    axis:     readVar('--color-surface-400',   '#8FA5A5'),
    surface8: readVar('--color-surface-800',   '#161E1E'),
    text:     readVar('--color-surface-200',   '#D3DDDD'),
    // Cores de marca de terceiros — independem de tema por definição
    meta:     '#1877F2',
    google:   '#EA4335',
  }
}
export type ChartColors = ReturnType<typeof getChartColors>

/** Estilos padrão do Tooltip do Recharts, derivados da paleta ativa. */
export const chartTooltipProps = (c: ChartColors) => ({
  contentStyle: { background: c.surface8, border: `1px solid ${c.grid}`, borderRadius: 10, fontSize: 12 },
  itemStyle:    { color: c.text },
  labelStyle:   { color: c.axis },
  cursor:       { fill: c.surface8, fillOpacity: 0.5 },
})

// Heatmap: interpolação entre 5 stops derivados dos tokens (surface → brand),
// resolvidos em runtime para acompanhar o tema ativo.
const HEATMAP_VARS: [string, string][] = [
  ['--color-surface-800', '#161E1E'],
  ['--color-brand-900',   '#134E4A'],
  ['--color-brand-600',   '#14B8A6'],
  ['--color-brand-400',   '#2DD4BF'],
  ['--color-brand-200',   '#99F6E4'],
]

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function heatmapColor(intensity: number): string {
  const stops = HEATMAP_VARS.map(([name, fb]) => {
    const v = readVar(name, fb)
    return hexToRgb(v.startsWith('#') ? v : fb)
  })
  const t = Math.max(0, Math.min(1, intensity))
  const seg = t * (stops.length - 1)
  const lo = Math.floor(seg)
  const hi = Math.min(stops.length - 1, lo + 1)
  const f = seg - lo
  const [r1, g1, b1] = stops[lo]
  const [r2, g2, b2] = stops[hi]
  const r = Math.round(r1 + (r2 - r1) * f)
  const g = Math.round(g1 + (g2 - g1) * f)
  const b = Math.round(b1 + (b2 - b1) * f)
  return `rgb(${r},${g},${b})`
}
