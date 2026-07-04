import { useEffect, useState } from 'react'
import { getChartColors, type ChartColors } from '@/components/dashboard/utils'

/**
 * Paleta de gráficos resolvida a partir dos tokens do design system.
 * Recharts/SVG não aceitam var() em atributos, então os tokens são lidos
 * via getComputedStyle e re-resolvidos automaticamente ao trocar o tema
 * (observa mudanças em data-theme no <html>).
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(getChartColors)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(getChartColors()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return colors
}
