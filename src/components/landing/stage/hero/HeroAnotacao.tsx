/**
 * O ANEL DE FOCO — só o anel, dentro do palco.
 *
 * Decisão do PO (24/09): o TEXTO do que acontece saiu de dentro das telas
 * (o rótulo preso ao anel poluía a cena) e foi para a pílula de narração entre
 * os títulos e o palco (`HeroNarracao`). Aqui fica apenas o anel de luz sobre o
 * elemento que acabou de mudar — o "para onde olhar", sem palavras.
 */

export interface FocoAnotado {
  id: number
  rect: { x: number; y: number; w: number; h: number }
  raio: number
}

const DURACAO = 2.8

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

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {/* Animação em CSS: a sequência "aparece → fica → some" em Framer Motion
          terminava na hora dentro do palco. */}
      <style>{'@keyframes hero-anel { 0% { opacity: 0; transform: scale(1.08) } 16% { opacity: 1; transform: scale(1) } 80% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1.01) } }'}</style>
      <div className="absolute" style={{ left: origem.x, top: origem.y, width: area.w, height: area.h }}>
        <div
          className="absolute"
          style={{
            left: rect.x - 5, top: topo - 5, width: rect.w + 10, height: altura + 10,
            borderRadius: foco.raio + 5,
            boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-brand-400) 90%, transparent), 0 0 28px 6px color-mix(in srgb, var(--color-brand-500) 34%, transparent)',
            animation: `hero-anel ${DURACAO}s cubic-bezier(.16,1,.3,1) both`,
          }}
        />
      </div>
    </div>
  )
}
