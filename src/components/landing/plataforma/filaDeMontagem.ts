/**
 * FILA DE MONTAGEM das demos da Plataforma.
 *
 * Cada recorte é o app inteiro num iframe da MESMA origem — ele monta na
 * thread da landing. Duas montagens sobrepostas travavam a página em máquina
 * fraca (medido no build de produção com a CPU 4× mais lenta: quadros de até
 * 1,1 s no meio da rolagem). Regras:
 *
 *  • uma montagem por vez: a próxima só começa quando a anterior avisa que
 *    ficou pronta (ou no teto de 2,5 s);
 *  • o que já está NA tela passa na frente da pré-carga.
 *
 * Testado e descartado (26/09): segurar a pré-carga até a rolagem parar. Na
 * rolagem de leitor (rajada + pausa, CPU 4×) piorou o spinner (até 1,6 s) sem
 * ganho claro de quadros; sem a espera, o pior quadro caiu de 1,1 s para 0,3 s.
 */

type Pedido = { id: number; visivel: boolean; montar: () => void }

const TETO_MS = 2500

let fila: Pedido[] = []
let emCurso: number | null = null
let tetoTimer = 0
let seq = 0

function proximo() {
  if (emCurso !== null || fila.length === 0) return
  // Visíveis primeiro.
  fila.sort((a, b) => Number(b.visivel) - Number(a.visivel))
  const p = fila.shift()!
  emCurso = p.id
  tetoTimer = window.setTimeout(() => liberar(p.id), TETO_MS)
  p.montar()
}

/** Pede a vez para montar. Devolve o id do pedido (para cancelar ou liberar). */
export function pedirMontagem(visivel: boolean, montar: () => void): number {
  const id = ++seq
  fila.push({ id, visivel, montar })
  proximo()
  return id
}

/** O pedido ficou visível enquanto esperava: sobe de prioridade. */
export function tornarVisivel(id: number) {
  const p = fila.find((x) => x.id === id)
  if (p && !p.visivel) { p.visivel = true; proximo() }
}

/** Desistiu antes de montar (saiu da área de pré-carga). */
export function cancelarMontagem(id: number) {
  fila = fila.filter((x) => x.id !== id)
  if (emCurso === id) liberar(id)
}

/** A montagem terminou (a demo avisou que está pronta). */
export function liberar(id: number) {
  if (emCurso !== id) return
  clearTimeout(tetoTimer)
  emCurso = null
  proximo()
}
