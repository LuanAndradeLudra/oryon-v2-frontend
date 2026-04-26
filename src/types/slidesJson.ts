// ─── Slides JSON schema ────────────────────────────────────────────────────────
// Structured slide format output by ArtifactAgent.
// Converted to native pptxgenjs elements in canvaService (fully editable in Canva).
// Also rendered as HTML preview via slidesRenderer.

export interface SlidesJSON {
  /** Document / presentation title */
  title: string
  theme: {
    primary:   string  // hex accent e.g. "#6366f1"
    secondary: string  // hex secondary e.g. "#f59e0b"
    bg:        string  // default slide background hex e.g. "#0f172a"
    text:      string  // default text color hex e.g. "#f8fafc"
    font:      string  // Google Font name e.g. "Inter"
  }
  slides: SlideData[]
}

export interface SlideData {
  /** Override the theme bg. Hex string = solid color; GradientBg = gradient. */
  bg?: string | GradientBg
  elements: SlideElement[]
}

export interface GradientBg {
  type:   'gradient'
  from:   string   // hex start color
  to:     string   // hex end color
  angle?: number   // degrees: 0=→ 90=↓ 135=↘  default 135
}

export type SlideElement = TextEl | RectEl | CircleEl | LineEl | IconEl

// ── Positioning: all x, y, w, h in % of slide dimensions (0-100) ───────────────
interface BaseEl {
  x: number  // % of slide width — left edge
  y: number  // % of slide height — top edge
  w: number  // % of slide width
  h: number  // % of slide height
}

export interface TextEl extends BaseEl {
  type:    'text'
  text:    string
  size?:   number            // font size in pt, default 14
  color?:  string            // hex, default theme.text
  bold?:   boolean
  italic?: boolean
  align?:  'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  font?:   string            // override theme.font (Google Font name)
}

export interface RectEl extends BaseEl {
  type:         'rect'
  fill?:        string   // hex fill color, or 'transparent'
  stroke?:      string   // hex border color (no border if omitted)
  strokeWidth?: number   // border width in pt, default 1
  radius?:      number   // corner radius in pt, default 0
  opacity?:     number   // 0 = fully opaque, 100 = fully transparent
}

export interface CircleEl extends BaseEl {
  type:         'circle'
  fill?:        string
  stroke?:      string
  strokeWidth?: number
  opacity?:     number
}

export interface LineEl {
  type:   'line'
  x1:     number   // start x in % of slide width
  y1:     number   // start y in % of slide height
  x2:     number   // end x in % of slide width
  y2:     number   // end y in % of slide height
  color?: string   // hex
  width?: number   // stroke width in pt, default 1
  dash?:  boolean
}

export interface IconEl extends BaseEl {
  type:   'icon'
  /** Emoji or Unicode symbol: "🚀" "★" "✓" "→" "◆" */
  char:   string
  color?: string  // hex (for colorable chars; emoji colors are fixed)
  size?:  number  // pt, default 24
}
