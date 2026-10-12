/** A tela do app no desktop: altura entre o mínimo e o máximo. */
export const APP_H = { max: 720, min: 560 }
/** A tela do app de celular (o palco antigo do Hero no celular). */
export const APP_CELULAR = { w: 390, h: { max: 760, min: 560 } }
/** A largura do palco do desktop (âncora + janelas satélite). */
export const PALCO_W = 1560
/** O que o palco tem além da tela do app (barra de título e folgas). */
export const EXTRA_H = 92
/** A ampliação desejada e o piso, antes de a tela do app encolher. */
export const FIT = { alvo: 0.8, piso: 0.58 }

/**
 * O ENQUADRAMENTO — escala e altura da tela do app para um viewport.
 * `largura`: a coluna do palco; `altura`: o que sobra da tela abaixo do topo
 * do palco, já descontados os controles de baixo.
 */
export function enquadrar(largura: number, altura: number, celular: boolean, corredor: number) {
  if (celular) {
    // No celular manda a leitura: a largura define a escala e só a altura da
    // tela do app se ajusta (nunca o texto).
    const fit = Math.min(1, largura / (APP_CELULAR.w + 12))
    const h = Math.round(Math.min(APP_CELULAR.h.max, Math.max(APP_CELULAR.h.min, altura / fit - 36)))
    return { fit, h }
  }
  const fitW = Math.min(1, (largura - 2 * corredor) / PALCO_W)
  let fit = Math.min(fitW, FIT.alvo)
  const h = Math.round(Math.min(APP_H.max, Math.max(APP_H.min, altura / fit - EXTRA_H)))
  // Tela alta: a tela do app já está inteira — o palco pode crescer até a largura.
  if (h === APP_H.max) fit = Math.min(fitW, altura / (APP_H.max + EXTRA_H))
  // Tela baixa: a tela do app já está no mínimo — só então o texto encolhe, até o piso.
  else if (h === APP_H.min) fit = Math.min(fitW, Math.max(FIT.piso, altura / (APP_H.min + EXTRA_H)))
  return { fit: Math.round(fit * 1000) / 1000, h }
}
