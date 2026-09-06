// ─── Geometria do funil de entrega (D3 / SCRUM-1022) ────────────────────────
// Puro, sem React e sem DOM: dá para testar a regra de forma sem montar SVG.
//
// A regra que o mockup comunica é "largura proporcional ao volume" — é ela que
// faz o funil valer mais que quatro números numa linha. Cada faixa é um
// trapézio centrado, com a largura do topo proporcional ao primeiro valor
// (enviadas) e um afunilamento constante para baixo, que dá a sensação de
// fluxo.
//
// Os polígonos do mockup (`p3-disparos.html` §D3) são desenhados à mão e não
// seguem a proporção ao pixel — 340/520 daria 314px de topo e lá está 300. O
// que reproduzimos aqui é a REGRA, não os pixels: proporcionalidade, centro
// fixo e afunilamento. Conferido contra o mockup, a maior divergência é de
// ~14px numa faixa de 480, invisível em tela e correta onde o desenho não é.

export interface FunnelBand {
  /** `points` pronto para o <polygon> do SVG. */
  points: string
  topWidth: number
  /** y do topo da faixa, no sistema do viewBox. */
  y: number
  /**
   * `false` quando a faixa é estreita demais para o rótulo caber dentro —
   * é o caso de "Responderam" no mockup, onde o texto sai para a direita.
   */
  labelInside: boolean
  /**
   * Percentual sobre o PRIMEIRO valor (enviadas), que é a base de leitura do
   * funil. `null` na primeira faixa (100% de si mesma não informa nada) e
   * quando a base é zero.
   */
  pct: number | null
}

export interface FunnelGeometryOptions {
  /** Largura da faixa mais larga, no sistema do viewBox. */
  maxWidth?: number
  bandHeight?: number
  gap?: number
  /** Quanto cada lado do trapézio recolhe do topo para a base. */
  inset?: number
  /** Piso de largura, para uma faixa de valor 0 continuar visível. */
  minWidth?: number
  /** Abaixo disto o rótulo não cabe dentro da faixa. */
  labelInsideMinWidth?: number
  /** Centro horizontal das faixas. Default: `maxWidth / 2 + 40`, o do mockup. */
  centerX?: number
  /** y da primeira faixa. */
  startY?: number
}

const DEFAULTS = {
  maxWidth: 480,
  bandHeight: 42,
  gap: 8,
  inset: 12,
  minWidth: 8,
  labelInsideMinWidth: 160,
  startY: 10,
} as const

export function funnelGeometry(values: number[], opts: FunnelGeometryOptions = {}): FunnelBand[] {
  const maxWidth = opts.maxWidth ?? DEFAULTS.maxWidth
  const bandHeight = opts.bandHeight ?? DEFAULTS.bandHeight
  const gap = opts.gap ?? DEFAULTS.gap
  const baseInset = opts.inset ?? DEFAULTS.inset
  const minWidth = opts.minWidth ?? DEFAULTS.minWidth
  const labelInsideMinWidth = opts.labelInsideMinWidth ?? DEFAULTS.labelInsideMinWidth
  const startY = opts.startY ?? DEFAULTS.startY
  const centerX = opts.centerX ?? maxWidth / 2 + 40

  const base = values[0] ?? 0

  return values.map((raw, i) => {
    const value = Number.isFinite(raw) && raw > 0 ? raw : 0

    // Base zero (campanha sem nenhum envio) colapsaria tudo numa divisão por
    // zero. Nesse caso toda faixa vai para a largura mínima e nenhum
    // percentual é afirmado — "0 de 0" não é 0%, é ausência de dado.
    const ratio = base > 0 ? Math.min(1, value / base) : 0
    const topWidth = Math.max(minWidth, ratio * maxWidth)

    // Uma faixa muito estreita não tem de onde recolher o inset sem inverter
    // o trapézio (base mais larga que o topo, que leria como funil ao contrário).
    const inset = Math.min(baseInset, Math.max(0, (topWidth - minWidth) / 2))
    const bottomWidth = topWidth - inset * 2

    const y = startY + i * (bandHeight + gap)
    const yBottom = y + bandHeight
    const topLeft = centerX - topWidth / 2
    const topRight = centerX + topWidth / 2
    const bottomLeft = centerX - bottomWidth / 2
    const bottomRight = centerX + bottomWidth / 2

    return {
      points: `${r(topLeft)},${r(y)} ${r(topRight)},${r(y)} ${r(bottomRight)},${r(yBottom)} ${r(bottomLeft)},${r(yBottom)}`,
      topWidth: r(topWidth),
      y,
      labelInside: topWidth >= labelInsideMinWidth,
      // Uma casa decimal, como no mockup ("95,8%"). Arredondar aqui e não na
      // formatação evita que a soma das etapas exibidas contradiga o desenho.
      pct: i === 0 || base <= 0 ? null : Math.round((value / base) * 1000) / 10,
    }
  })
}

/** Duas casas no SVG bastam e evitam `0.30000000000000004` no atributo. */
function r(n: number): number {
  return Math.round(n * 100) / 100
}

/** Altura total ocupada por N faixas — usada para o `viewBox` do SVG. */
export function funnelHeight(count: number, opts: FunnelGeometryOptions = {}): number {
  const bandHeight = opts.bandHeight ?? DEFAULTS.bandHeight
  const gap = opts.gap ?? DEFAULTS.gap
  const startY = opts.startY ?? DEFAULTS.startY
  if (count <= 0) return startY
  return startY + count * bandHeight + (count - 1) * gap
}
