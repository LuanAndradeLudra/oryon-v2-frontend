/**
 * A ferramenta do canvas (16/11), como no Figma e no Miro:
 * - `selecionar` (seta, V): arrastar no fundo desenha a caixa e escolhe os passos que ela encosta,
 *   como na área de trabalho do Windows e no n8n;
 * - `mao` (H): arrastar no fundo move a vista, para quem usa só o touchpad ou um mouse sem o botão do meio.
 * Nas duas, a roda (ou dois dedos) move a vista, Ctrl + roda (ou pinça) dá zoom e Espaço + arrastar
 * ou o botão do meio também movem a vista. A escolha fica guardada neste navegador.
 */
export type FerramentaDoCanvas = 'selecionar' | 'mao'

const CHAVE = 'jornadas:ferramenta-do-canvas'

export function lerFerramenta(): FerramentaDoCanvas {
  try { return localStorage.getItem(CHAVE) === 'mao' ? 'mao' : 'selecionar' } catch { return 'selecionar' }
}

export function gravarFerramenta(f: FerramentaDoCanvas) {
  try { localStorage.setItem(CHAVE, f) } catch { /* sem armazenamento: vale só nesta sessão */ }
}

/** Quanto as setas empurram os passos escolhidos (com Shift, o passo grande). */
export const EMPURRAO = 8
export const EMPURRAO_GRANDE = 40

/** "3 passos e 1 nota escolhidos", para a barra da seleção. */
export function rotuloDaSelecao(passos: number, notas: number): string {
  const partes = [
    passos ? (passos === 1 ? '1 passo' : `${passos} passos`) : '',
    notas ? (notas === 1 ? '1 nota' : `${notas} notas`) : '',
  ].filter(Boolean)
  const soNotas = !passos && notas > 0
  const total = passos + notas
  return `${partes.join(' e ')} ${soNotas ? (total === 1 ? 'escolhida' : 'escolhidas') : total === 1 ? 'escolhido' : 'escolhidos'}`
}
