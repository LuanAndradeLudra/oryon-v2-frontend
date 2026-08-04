import type { KpiUnit } from '@/types/dashboard'

export function formatKpiValue(value: number | null, unit: KpiUnit): string {
  if (value === null) return '—'
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
    case 'currency':
      return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return String(value)
  }
}

// Heatmap color interpolation between 5 stops:
// 0 → surface-800, 0.25 → brand-900, 0.5 → brand-600, 0.75 → brand-400, 1 → brand-200
const HEATMAP_STOPS: [number, number, number][] = [
  [10,  26,  38],   // #0a1a26 surface-800
  [38,  30, 122],   // #261e7a brand-900
  [79,  64, 238],   // #4f40ee brand-600
  [128, 128, 255],  // #8080ff brand-400
  [195, 200, 255],  // #c3c8ff brand-200
]

export function heatmapColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity))
  const seg = t * (HEATMAP_STOPS.length - 1)
  const lo = Math.floor(seg)
  const hi = Math.min(HEATMAP_STOPS.length - 1, lo + 1)
  const f = seg - lo
  const [r1, g1, b1] = HEATMAP_STOPS[lo]
  const [r2, g2, b2] = HEATMAP_STOPS[hi]
  const r = Math.round(r1 + (r2 - r1) * f)
  const g = Math.round(g1 + (g2 - g1) * f)
  const b = Math.round(b1 + (b2 - b1) * f)
  return `rgb(${r},${g},${b})`
}

// Recharts-safe hex colors (CSS vars don't work inside SVG)
export const C = {
  brand:    '#6366f1',
  online:   '#10b981',
  away:     '#f59e0b',
  danger:   '#ef4444',
  purple:   '#8b5cf6',
  cyan:     '#06b6d4',
  grid:     '#112a3a',
  axis:     '#5588b0',
  surface8: '#0a1a26',
  meta:     '#1877f2',
  google:   '#EA4335',
}
