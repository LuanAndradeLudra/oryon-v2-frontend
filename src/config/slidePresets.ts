// ─── Slide Design Presets ──────────────────────────────────────────────────────
// Each preset is a named design style injected into ArtifactAgent's system prompt.
// Selected in the Copilot input bar before requesting slides.

export interface SlidePreset {
  id:          string
  emoji:       string
  name:        string
  description: string
  /** Appended to ArtifactAgent's system prompt when this preset is active */
  prompt:      string
}

export const SLIDE_PRESETS: SlidePreset[] = [
  {
    id:          'dark-tech',
    emoji:       '🌑',
    name:        'Dark Tech',
    description: 'Escuro, indigo/violeta, tipografia pesada',
    prompt: `PRESET ATIVO: Dark Tech
Paleta obrigatória:
  theme.bg="#0f172a"  theme.primary="#6366f1"  theme.secondary="#f59e0b"
  theme.text="#f8fafc"  theme.font="Inter"
Estilo:
  • Gradientes de #0f172a → #1e1b4b ou #0f172a → #18103a
  • Barras de accent em primary (#6366f1) com brilho suave
  • Tipografia bold/black para headings, tracking tight
  • Ícones em secondary (#f59e0b) para contraste`,
  },
  {
    id:          'bold-gradient',
    emoji:       '🔥',
    name:        'Bold Gradiente',
    description: 'Gradientes vibrantes, cores quentes, impacto máximo',
    prompt: `PRESET ATIVO: Bold Gradiente
Paleta obrigatória:
  theme.bg="#0d0d0d"  theme.primary="#f97316"  theme.secondary="#ec4899"
  theme.text="#ffffff"  theme.font="Poppins"
Estilo:
  • Todo slide com gradiente de fundo (nunca cor sólida)
    Ex: #1a0a00→#3d1200, #0d0020→#2d0040, #001a2e→#003366
  • Shapes com gradientes primary→secondary (angle:135)
  • Títulos muito grandes (44-52pt) e bold 900
  • Cards com border de gradiente (stroke: primary, strokeWidth:1.5)
  • Ícones grandes como elemento visual principal`,
  },
  {
    id:          'clean-minimal',
    emoji:       '⬜',
    name:        'Clean Minimal',
    description: 'Fundo branco, tipografia clean, elegância corporativa',
    prompt: `PRESET ATIVO: Clean Minimal
Paleta obrigatória:
  theme.bg="#f8fafc"  theme.primary="#1e40af"  theme.secondary="#0ea5e9"
  theme.text="#0f172a"  theme.font="Inter"
Estilo:
  • Fundos: #f8fafc (branco) ou #f1f5f9 (cinza claro) — NUNCA fundos escuros
  • Barras de accent finas e discretas (h:3-4) em primary
  • Tipografia em #0f172a (quase preto), hierarquia clara
  • Formas geométricas simples: rects com stroke, sem fill — só contorno
  • Cards com bg:#ffffff, stroke:#e2e8f0, shadow-like (stroke width fino)
  • Muito espaço em branco — elementos espaçados e respirando`,
  },
  {
    id:          'dark-gold',
    emoji:       '✨',
    name:        'Dark Elegante',
    description: 'Preto profundo, detalhes dourados, sofisticado',
    prompt: `PRESET ATIVO: Dark Elegante
Paleta obrigatória:
  theme.bg="#0a0a0a"  theme.primary="#d4a017"  theme.secondary="#c9a227"
  theme.text="#f5f5f5"  theme.font="Playfair Display"
Estilo:
  • Fundo: quase preto (#0a0a0a ou #111111), nunca colorido
  • Linhas finas douradas (primary) como divisores e destaques
  • Rect decorativos: apenas stroke dourado, sem fill (fill: transparent)
  • Labels em uppercase com letter-spacing: font Playfair Display
  • Ícones dourados simples (★ ◆ → ✦)
  • Cards com borda dourada fina (strokeWidth:0.8)
  • Subtítulos em #9ca3af (cinza médio) para contraste elegante`,
  },
  {
    id:          'saas-pitch',
    emoji:       '🚀',
    name:        'SaaS Pitch',
    description: 'Azul/ciano, visual de startup, tech moderno',
    prompt: `PRESET ATIVO: SaaS Pitch
Paleta obrigatória:
  theme.bg="#020817"  theme.primary="#3b82f6"  theme.secondary="#06b6d4"
  theme.text="#f0f9ff"  theme.font="Poppins"
Estilo:
  • Gradientes de bg: #020817→#0a1628 ou #020817→#001133
  • Accent glow: círculos de primary com opacity:8-12 atrás de conteúdo
  • Labels de seção em secondary (#06b6d4) maiúsculo, size:11
  • Métricas grandes em secondary (#06b6d4), 40-48pt bold
  • Círculos decorativos em cantos com gradiente de primary→secondary (opacity:15)
  • Linhas horizontais com gradiente de transparent→primary→transparent`,
  },
  {
    id:          'warm-story',
    emoji:       '🌅',
    name:        'Warm Story',
    description: 'Tons terrosos, aconchegante, narrativo',
    prompt: `PRESET ATIVO: Warm Story
Paleta obrigatória:
  theme.bg="#1c1007"  theme.primary="#f59e0b"  theme.secondary="#ef4444"
  theme.text="#fef9f0"  theme.font="Poppins"
Estilo:
  • Gradientes quentes: #1c1007→#2d1a00, #1a0a00→#341400
  • Formas orgânicas: círculos grandes em cantos com fill: #f59e0b, opacity:10
  • Tipografia calorosa e narrativa — subtítulos longos e humanos
  • Ícones de emojis expressivos relacionados a emoção/história
  • Cards com fill: #2d1a00, bordas em primary (stroke:#f59e0b)
  • Linhas decorativas horizontais em primary como "respiração" entre blocos`,
  },
]

export function getPresetById(id: string): SlidePreset | undefined {
  return SLIDE_PRESETS.find((p) => p.id === id)
}
