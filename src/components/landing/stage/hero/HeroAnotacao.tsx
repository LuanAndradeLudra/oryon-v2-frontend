
/**
 * A ANOTAÇÃO — o anel de luz que "fala".
 *
 * Decisão do PO (24/09): nada de legenda fixa roubando espaço do palco. Quando
 * algo importante muda na tela, um anel de luz envolve o elemento e, preso a
 * ele por uma linha fina, surge um rótulo curto dizendo o que aconteceu ("O
 * Agente IA responde na hora, com o preço do catálogo"). Tudo some junto em
 * ~3 s. É o equivalente, no nosso palco, ao tooltip que a Attio faz surgir
 * sobre o gráfico como se alguém apontasse.
 *
 * O rótulo escolhe o lado com mais espaço livre (direita, esquerda, abaixo ou
 * acima do elemento) e fica sempre dentro da tela do app, para não cobrir o
 * que está sendo mostrado nem sair da moldura.
 */

export interface FocoAnotado {
  id: number
  rect: { x: number; y: number; w: number; h: number }
  raio: number
  texto: string
}

const LARGURA_ROTULO = 300
const LINHA = 26
const DURACAO = 3.2

export function HeroAnotacao({ foco, area, origem }: {
  foco: FocoAnotado
  /** Tamanho da tela do app (coordenadas do iframe). */
  area: { w: number; h: number }
  /** Onde a tela do app começa dentro da moldura (bandeja). */
  origem: { x: number; y: number }
}) {
  const { rect } = foco
  const topo = Math.max(0, rect.y)
  const altura = Math.min(rect.h, area.h - topo)
  const livreDir = area.w - (rect.x + rect.w)
  const livreEsq = rect.x
  const livreBaixo = area.h - (topo + altura)

  // Lado do rótulo: onde houver mais espaço, nessa ordem de preferência.
  const lado: 'direita' | 'esquerda' | 'baixo' | 'cima' =
    livreDir >= LARGURA_ROTULO + LINHA + 12 ? 'direita'
      : livreEsq >= LARGURA_ROTULO + LINHA + 12 ? 'esquerda'
        : livreBaixo >= 70 ? 'baixo' : 'cima'

  const cy = Math.min(Math.max(topo + altura / 2, 24), area.h - 24)
  const cx = Math.min(Math.max(rect.x + rect.w / 2, LARGURA_ROTULO / 2 + 10), area.w - LARGURA_ROTULO / 2 - 10)

  // Ponto de saída da linha (na borda do anel) e posição do rótulo.
  let linha: { left: number; top: number; w: number; h: number }
  let rotulo: { left: number; top: number; transform: string }
  let desloca: { x: number; y: number }
  if (lado === 'direita') {
    const x0 = rect.x + rect.w + 5
    linha = { left: x0, top: cy, w: LINHA, h: 1 }
    rotulo = { left: x0 + LINHA, top: cy, transform: 'translateY(-50%)' }
    desloca = { x: -8, y: 0 }
  } else if (lado === 'esquerda') {
    const x0 = rect.x - 5 - LINHA
    linha = { left: x0, top: cy, w: LINHA, h: 1 }
    rotulo = { left: x0 - LARGURA_ROTULO, top: cy, transform: 'translateY(-50%)' }
    desloca = { x: 8, y: 0 }
  } else if (lado === 'baixo') {
    const y0 = topo + altura + 5
    linha = { left: cx, top: y0, w: 1, h: LINHA - 8 }
    rotulo = { left: cx - LARGURA_ROTULO / 2, top: y0 + LINHA - 8, transform: 'none' }
    desloca = { x: 0, y: -8 }
  } else {
    const y0 = topo - 5 - (LINHA - 8)
    linha = { left: cx, top: y0, w: 1, h: LINHA - 8 }
    rotulo = { left: cx - LARGURA_ROTULO / 2, top: y0, transform: 'translateY(-100%)' }
    desloca = { x: 0, y: 8 }
  }

  // Animação em CSS (keyframes), não em Framer Motion: a sequência "aparece →
  // fica → some" com várias etapas terminava na hora dentro do palco, e o
  // rótulo nunca ficava visível. CSS é previsível e roda no compositor.
  const curva = 'cubic-bezier(.16,1,.3,1)'

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      <style>{`
        @keyframes hero-anot-anel { 0% { opacity: 0; transform: scale(1.08) } 14% { opacity: 1; transform: scale(1) } 82% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1.01) } }
        @keyframes hero-anot-linha { 0% { opacity: 0; transform: scale(0) } 18% { opacity: 1; transform: scale(1) } 82% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1) } }
        @keyframes hero-anot-rotulo { 0% { opacity: 0; transform: translate(var(--dx), var(--dy)); filter: blur(4px) } 20% { opacity: 1; transform: translate(0, 0); filter: blur(0) } 82% { opacity: 1; transform: translate(0, 0); filter: blur(0) } 100% { opacity: 0; transform: translate(0, 0); filter: blur(2px) } }
      `}</style>
      <div className="absolute" style={{ left: origem.x, top: origem.y, width: area.w, height: area.h }}>
        {/* O anel */}
        <div
          className="absolute"
          style={{
            left: rect.x - 5, top: topo - 5, width: rect.w + 10, height: altura + 10,
            borderRadius: foco.raio + 5,
            boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-brand-400) 90%, transparent), 0 0 28px 6px color-mix(in srgb, var(--color-brand-500) 36%, transparent)',
            animation: `hero-anot-anel ${DURACAO}s ${curva} both`,
          }}
        />
        {/* A linha que liga o anel ao rótulo */}
        <div
          className="absolute bg-brand-400/80"
          style={{
            left: linha.left, top: linha.top, width: linha.w, height: linha.h,
            transformOrigin: lado === 'esquerda' ? 'right center' : lado === 'cima' ? 'center bottom' : lado === 'baixo' ? 'center top' : 'left center',
            animation: `hero-anot-linha ${DURACAO}s ${curva} 0.15s both`,
          }}
        />
        {/* O rótulo */}
        <div className="absolute" style={{ left: rotulo.left, top: rotulo.top, width: LARGURA_ROTULO, transform: rotulo.transform }}>
          <div
            className="inline-flex items-start gap-2 rounded-xl bg-surface-800 px-3 py-2 ring-1 ring-brand-400/40 shadow-[0_16px_40px_-12px_rgba(0,0,0,.7)] [[data-theme=light]_&]:shadow-[0_10px_30px_-10px_rgba(11,13,24,.25)]"
            style={{
              ['--dx' as string]: `${desloca.x}px`, ['--dy' as string]: `${desloca.y}px`,
              animation: `hero-anot-rotulo ${DURACAO}s ${curva} 0.25s both`,
            }}
          >
            <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
            <span className="text-[13.5px] font-medium leading-snug text-surface-50">{foco.texto}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
