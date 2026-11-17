/**
 * Os painéis do editor (o do passo e a lista de passos) ENCAIXADOS ao lado do
 * desenho, desde 16/11: o canvas encolhe para dar lugar a eles, em vez de o
 * painel flutuar por cima. A largura é ajustável e a coluna da prévia no
 * celular, recolhível; as duas escolhas ficam guardadas neste navegador.
 */

export const LARGURA_PADRAO = 440
export const LARGURA_MINIMA = 380
export const LARGURA_MAXIMA = 640
/** A coluna da prévia no celular, ao lado da configuração (passos de mensagem). */
export const LARGURA_DO_CELULAR = 300
/** O desenho nunca fica mais estreito que isto por causa do painel. */
export const CANVAS_MINIMO = 420

const CHAVE_DA_LARGURA = 'jornadas:painel-largura'
const CHAVE_DO_CELULAR = 'jornadas:painel-celular'

export function lerLargura(): number {
  try {
    const v = Number(localStorage.getItem(CHAVE_DA_LARGURA))
    return v >= LARGURA_MINIMA && v <= LARGURA_MAXIMA ? v : LARGURA_PADRAO
  } catch { return LARGURA_PADRAO }
}

export function gravarLargura(v: number) {
  try { localStorage.setItem(CHAVE_DA_LARGURA, String(Math.round(v))) } catch { /* sem armazenamento: vale só nesta sessão */ }
}

/**
 * A prévia no celular começa aberta se, com ela, o desenho ainda fica com pelo
 * menos 640 px; senão começa recolhida. Depois vale o que a pessoa escolheu.
 */
export function lerCelularAberto(largura: number): boolean {
  try {
    const v = localStorage.getItem(CHAVE_DO_CELULAR)
    if (v === '1' || v === '0') return v === '1'
  } catch { /* segue a regra da largura */ }
  return typeof window === 'undefined' || window.innerWidth - largura - LARGURA_DO_CELULAR >= 640
}

export function gravarCelularAberto(v: boolean) {
  try { localStorage.setItem(CHAVE_DO_CELULAR, v ? '1' : '0') } catch { /* idem */ }
}

/**
 * Encaixado, um painel substitui o outro na mesma vaga: só fade, sem deslizar. A saída é bem
 * mais curta que a entrada, para a vaga quase não ficar vazia entre os dois (o vazio também pisca).
 */
export const TROCA_ENCAIXADA = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.14, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.06, ease: 'easeIn' } },
} as const
