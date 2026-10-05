export type RetanguloFoco = { x: number; y: number; w: number; h: number }
export type RaioCanto = { x: number; y: number }
export type RaiosFoco = { tl: RaioCanto; tr: RaioCanto; br: RaioCanto; bl: RaioCanto }

export const SEM_RAIOS: RaiosFoco = {
  tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, br: { x: 0, y: 0 }, bl: { x: 0, y: 0 },
}

/** Apenas a parte do elemento dentro da sua tela, sem margem artificial. */
export function recortarAlvo(alvo: RetanguloFoco, corte: RetanguloFoco): RetanguloFoco {
  const x = Math.max(alvo.x, corte.x)
  const y = Math.max(alvo.y, corte.y)
  return {
    x, y,
    w: Math.max(0, Math.min(alvo.x + alvo.w, corte.x + corte.w) - x),
    h: Math.max(0, Math.min(alvo.y + alvo.h, corte.y + corte.h) - y),
  }
}

/** Lê a forma real do componente, inclusive cantos assimétricos das bolhas. */
export function raiosDoElemento(el: HTMLElement): RaiosFoco {
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  const baseW = el.offsetWidth || r.width || 1
  const baseH = el.offsetHeight || r.height || 1
  const comprimento = (v: string, tamanho: number) => v.endsWith('%')
    ? (parseFloat(v) || 0) * tamanho / 100
    : parseFloat(v) || 0
  const ler = (valor: string): RaioCanto => {
    const [horizontal = '0', vertical = horizontal] = valor.trim().split(/\s+/)
    return {
      x: comprimento(horizontal, baseW) * r.width / baseW,
      y: comprimento(vertical, baseH) * r.height / baseH,
    }
  }
  return {
    tl: ler(cs.borderTopLeftRadius), tr: ler(cs.borderTopRightRadius),
    br: ler(cs.borderBottomRightRadius), bl: ler(cs.borderBottomLeftRadius),
  }
}

export function escalarRaios(raios: RaiosFoco, escala: number): RaiosFoco {
  const s = (r: RaioCanto) => ({ x: r.x * escala, y: r.y * escala })
  return { tl: s(raios.tl), tr: s(raios.tr), br: s(raios.br), bl: s(raios.bl) }
}

/** Cortes por rolagem ou moldura deixam retos apenas os cantos cortados. */
export function recortarForma(alvo: RetanguloFoco, corte: RetanguloFoco, raios: RaiosFoco) {
  const rect = recortarAlvo(alvo, corte)
  const esquerda = rect.x > alvo.x + 0.5
  const topo = rect.y > alvo.y + 0.5
  const direita = rect.x + rect.w < alvo.x + alvo.w - 0.5
  const baixo = rect.y + rect.h < alvo.y + alvo.h - 0.5
  const limitar = (r: RaioCanto) => ({ x: Math.min(r.x, rect.w / 2), y: Math.min(r.y, rect.h / 2) })
  return {
    rect,
    raios: {
      tl: esquerda || topo ? SEM_RAIOS.tl : limitar(raios.tl),
      tr: direita || topo ? SEM_RAIOS.tr : limitar(raios.tr),
      br: direita || baixo ? SEM_RAIOS.br : limitar(raios.br),
      bl: esquerda || baixo ? SEM_RAIOS.bl : limitar(raios.bl),
    } satisfies RaiosFoco,
  }
}

export function borderRadiusDoFoco(raios: RaiosFoco): string {
  const { tl, tr, br, bl } = raios
  return `${tl.x}px ${tr.x}px ${br.x}px ${bl.x}px / ${tl.y}px ${tr.y}px ${br.y}px ${bl.y}px`
}

/** Viewport measurements must be drawn once, even inside nested CSS zoom/scale. */
export function planoDoFoco(w: number, h: number, larguraLocal: number, alturaLocal: number) {
  return { w, h, inversaX: larguraLocal / w, inversaY: alturaLocal / h }
}

/**
 * RESPIRO do holofote (30/09, PO: "muito quadrado e delimitado" — relatório e
 * etiquetas). O furo copiava a caixa exata do elemento: quando ele não tem
 * cantos arredondados (um bloco do relatório, a linha da etiqueta na linha do
 * tempo), o recorte saía reto e colado no conteúdo. Agora:
 *  • elemento SEM raio → 4 px de folga em volta e cantos de 8 px;
 *  • elemento COM raio → 2 px de folga e o raio cresce junto (concêntrico).
 * (30/09: 8/4 px ficou grande demais — PO pediu menos.)
 * O recorte pela tela (`recortarForma`) continua depois, então a folga nunca
 * vaza para fora da janela do app.
 */
export function comRespiro(alvo: RetanguloFoco, raios: RaiosFoco): { alvo: RetanguloFoco; raios: RaiosFoco } {
  const cantos = [raios.tl, raios.tr, raios.br, raios.bl]
  const semRaio = cantos.every((r) => r.x < 2 && r.y < 2)
  const folga = semRaio ? 4 : 2
  const crescer = (r: RaioCanto): RaioCanto => semRaio ? { x: 8, y: 8 } : { x: r.x + folga, y: r.y + folga }
  return {
    alvo: { x: alvo.x - folga, y: alvo.y - folga, w: alvo.w + 2 * folga, h: alvo.h + 2 * folga },
    raios: { tl: crescer(raios.tl), tr: crescer(raios.tr), br: crescer(raios.br), bl: crescer(raios.bl) },
  }
}
