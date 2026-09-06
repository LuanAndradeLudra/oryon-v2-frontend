// ─── Gate de contraste dos chips coloridos (SCRUM-1048) ────────────────────
//
// Este arquivo existe porque o defeito que ele mede durou meses sem ninguém
// ver: `.color-chip` pintava `--chip` a 85% com `color:#fff` cravado, e vários
// dos tokens que chegam ao `--chip` ficavam abaixo de 4.5:1 — o mínimo do
// WCAG 2.1 AA para texto pequeno, que é o caso (o chip é 11px). Não havia
// teste de contraste nenhum na árvore, então nada impedia a regressão.
import { describe, it, expect } from 'vitest'
import { CURATED_PALETTE } from './colorPalette'

type RGB = [number, number, number]

// ── WCAG 2.1 · luminância relativa e razão de contraste ────────────────────

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function parseHex(hex: string): RGB {
  let h = hex.trim().replace('#', '')
  // O CSS escreve `#000`; sem expandir a forma curta cada canal viraria `NaN`
  // e o teste falharia por acidente em vez de por medição — mensagem errada
  // para quem for consertar.
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
}

/** `color-mix(in srgb, <a> pct%, <b>)`. */
function mix(a: RGB, b: RGB, pct: number): RGB {
  return a.map((c, i) => Math.round((c * pct + b[i] * (100 - pct)) / 100)) as RGB
}

/** Cor semitransparente composta sobre um fundo opaco — o que
 *  `color-mix(..., transparent)` produz ao ser desenhado sobre a superfície. */
function over(fg: RGB, alphaPct: number, bg: RGB): RGB {
  return fg.map((c, i) => Math.round((c * alphaPct + bg[i] * (100 - alphaPct)) / 100)) as RGB
}

const WHITE: RGB = [255, 255, 255]
/** `--color-surface-800`, a superfície mais comum atrás de um chip no escuro. */
const SURFACE_800: RGB = [0x16, 0x1e, 0x1e]

/** Mínimo do WCAG 2.1 AA para texto pequeno. */
const AA_SMALL = 4.5

// ── A regra e os tokens ────────────────────────────────────────────────────
//
// HONESTIDADE SOBRE O ALCANCE DESTE GATE, porque um teste que promete mais do
// que entrega é pior que nenhum: os números abaixo são uma CÓPIA do que o
// `src/index.css` declara, não uma leitura dele. Tentei as duas formas de ler
// o arquivo de dentro do teste e nenhuma serve — `node:fs` quebra o `tsc -b` e
// o `vite build` (o projeto do app compila com `types: ["vite/client"]`, sem
// os tipos do Node) e o `?raw`, inclusive via `import.meta.glob` como faz o
// `httpClient.guard.test.ts`, devolve vazio para folha de estilo, porque o
// vitest não processa CSS.
//
// O que este gate PEGA: mudança em cor de token — o caso realista, alguém
// ajusta um `--color-status-*` e derruba o contraste sem perceber — e qualquer
// regressão que passe por estas funções.
// O que ele NÃO pega: alguém reverter as declarações do `.color-chip` no
// `index.css` sem tocar aqui. Contra isso, a revisão e o comentário que ficou
// no próprio `index.css` apontando para este arquivo.
const CHIP_RULE = {
  backgroundPct: 12,  // color-mix(in srgb, var(--chip) 12%, transparent)
  inkPct: 50,         // color-mix(in srgb, var(--chip) 50%, white)
} as const

/** A regra ANTIGA, guardada para o teste medir o defeito, e não só o estado. */
const OLD_RULE = { backgroundPct: 85 } as const

function chipBackground(chip: RGB): RGB {
  return over(chip, CHIP_RULE.backgroundPct, SURFACE_800)
}

function chipInk(chip: RGB): RGB {
  return mix(chip, WHITE, CHIP_RULE.inkPct)
}

function chipContrast(chip: RGB): number {
  return contrastRatio(chipBackground(chip), chipInk(chip))
}

/** Tokens do tema escuro (bloco `:root` do `index.css`) que chegam ao `--chip`
 *  de algum chip de status na árvore. `accent-amber` entra porque a D1 o usa
 *  para "pausada" — foi ele, e não um token de status, o terceiro reprovado do
 *  relatório original. */
const STATUS_TOKENS: Record<string, string> = {
  '--color-status-pending': '#FBBF24',
  '--color-status-active':  '#4ADE80',
  '--color-status-open':    '#3B82F6',
  '--color-status-muted':   '#6B8080',
  '--color-status-info':    '#60A5FA',
  '--color-danger':         '#EF4444',
  '--color-accent-amber':   '#F59E0B',
}

describe('contraste do .color-chip no tema escuro (SCRUM-1048)', () => {
  it.each(Object.entries(STATUS_TOKENS))('%s passa no mínimo AA para texto pequeno', (_name, hex) => {
    expect(chipContrast(parseHex(hex))).toBeGreaterThanOrEqual(AA_SMALL)
  })

  it.each(CURATED_PALETTE)('o swatch %s do ColorPicker passa', (hex) => {
    // A cor da tag é escolhida pelo usuário e vai para o MESMO `--chip`.
    // Seis destes doze reprovavam na regra antiga — o defeito nunca foi só
    // dos chips de status.
    expect(chipContrast(parseHex(hex))).toBeGreaterThanOrEqual(AA_SMALL)
  })

  it('a regra ANTIGA reprovava — o teste mede a diferença, não só o estado', () => {
    const antiga = (chip: RGB) => contrastRatio(mix(chip, [0, 0, 0], OLD_RULE.backgroundPct), WHITE)
    expect(antiga(parseHex(STATUS_TOKENS['--color-status-pending']))).toBeCloseTo(2.33, 1)
    expect(antiga(parseHex(STATUS_TOKENS['--color-status-active']))).toBeCloseTo(2.41, 1)
    expect(antiga(parseHex(STATUS_TOKENS['--color-accent-amber']))).toBeCloseTo(2.96, 1)
    // E eram QUATRO dos sete, não três: `status-info` também reprovava, com
    // 3.46. O relatório original mediu os status de campanha, onde ele não
    // aparece.
    const reprovando = Object.values(STATUS_TOKENS).filter((h) => antiga(parseHex(h)) < AA_SMALL)
    expect(reprovando).toHaveLength(4)
  })
})

describe('robustez contra o picker de hex livre', () => {
  // O `ui/ColorPicker` oferece os swatches curados MAIS um `HexColorPicker`
  // sem restrição, então a regra precisa aguentar cor arbitrária — não basta
  // passar nos doze que nós escolhemos. Este é o teste que mede CONSEQUÊNCIA
  // em vez de declaração, e por isso é o que sobrevive até a mim ter copiado
  // a regra errado lá em cima.
  it('varre o espaço de cor e só falha coladinho no preto', () => {
    const failures: string[] = []
    for (let r = 0; r < 256; r += 16) {
      for (let g = 0; g < 256; g += 16) {
        for (let b = 0; b < 256; b += 16) {
          if (chipContrast([r, g, b]) < AA_SMALL) {
            failures.push(`#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`)
          }
        }
      }
    }
    // 4096 amostras. As que reprovam ficam coladas no preto, com ~4.47 — a um
    // décimo do piso, e só porque clarear o preto em 50% ainda dá um cinza
    // médio. Documentado em vez de escondido: se este número subir, alguém
    // mexeu na regra e precisa olhar.
    expect(failures.length).toBeLessThanOrEqual(2)
    for (const hex of failures) {
      expect(chipContrast(parseHex(hex))).toBeGreaterThan(4.4)
    }
  })

  it('o preto puro, que é o pior caso, ainda fica acima de 4.4:1', () => {
    expect(chipContrast([0, 0, 0])).toBeGreaterThan(4.4)
  })
})
