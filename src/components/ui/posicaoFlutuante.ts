import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * Posição de um painel flutuante ancorado a um gatilho (o menu do Dropdown, a
 * lista do SelectMenu): lado (`align`) + DIREÇÃO e ALTURA, decididas pela
 * janela. Extraído do Dropdown (01/10) para os dois usarem a mesma régua.
 *
 * Antes o menu abria sempre para baixo, com `top: rect.bottom`, e a altura era
 * a do conteúdo. Numa lista longa perto do rodapé — um catálogo de produtos, o
 * caso que expôs isto — ele vazava para fora da tela: as últimas opções ficavam
 * inalcançáveis, sem rolagem que as trouxesse de volta.
 *
 * Agora mede-se o espaço dos dois lados do gatilho. Se não couber embaixo e
 * houver mais espaço em cima, o painel VIRA para cima; de um jeito ou de outro,
 * a altura máxima é o espaço que existe de verdade, e o que passar disso rola
 * dentro do painel.
 *
 * Para cima o painel é ancorado por `bottom`, não por `top`: assim não é
 * preciso medir a altura do conteúdo antes de posicionar (o que exigiria um
 * render intermediário e faria o painel piscar no lugar errado).
 */
export interface PosicaoFlutuante {
  top?: number
  bottom?: number
  left?: number
  right?: number
  maxHeight: number
  /** Largura do gatilho: a lista do SelectMenu abre pelo menos tão larga quanto ele. */
  larguraAncora: number
  /** Espaço na horizontal, da borda alinhada do gatilho até a margem da janela. */
  larguraDisponivel: number
}

const GAP = 6
// Respiro contra a borda da janela — um menu colado no fim da tela parece
// cortado mesmo quando não está.
const MARGEM = 12
// Só vira para cima quando embaixo é apertado E em cima cabe mais. Abrir
// para cima por qualquer motivo desorienta: o menu deve seguir o gatilho.
const MINIMO_UTIL = 180
const ALTURA_MINIMA = 120

const INICIAL: PosicaoFlutuante = { top: 0, left: 0, maxHeight: 320, larguraAncora: 0, larguraDisponivel: 320 }

export function calcularPosicao(rect: DOMRect, align: 'left' | 'right'): PosicaoFlutuante {
  const espacoAbaixo = window.innerHeight - rect.bottom - GAP - MARGEM
  const espacoAcima = rect.top - GAP - MARGEM
  const paraCima = espacoAbaixo < MINIMO_UTIL && espacoAcima > espacoAbaixo
  const lado = align === 'right'
    ? { right: window.innerWidth - rect.right }
    : { left: rect.left }
  const larguras = {
    larguraAncora: rect.width,
    larguraDisponivel: Math.max(align === 'right' ? rect.right - MARGEM : window.innerWidth - rect.left - MARGEM, rect.width),
  }
  return paraCima
    ? { ...lado, ...larguras, bottom: window.innerHeight - rect.top + GAP, maxHeight: Math.max(espacoAcima, ALTURA_MINIMA) }
    : { ...lado, ...larguras, top: rect.bottom + GAP, maxHeight: Math.max(espacoAbaixo, ALTURA_MINIMA) }
}

const mesma = (a: PosicaoFlutuante, b: PosicaoFlutuante) =>
  a.top === b.top && a.bottom === b.bottom && a.left === b.left && a.right === b.right &&
  a.maxHeight === b.maxHeight && a.larguraAncora === b.larguraAncora && a.larguraDisponivel === b.larguraDisponivel

/**
 * Recalcula ao abrir (antes da pintura: sem piscar no lugar antigo), na
 * rolagem de qualquer contêiner e no redimensionamento da janela. A rolagem do
 * PRÓPRIO painel (`painelRef`) não move o gatilho e é ignorada; posição igual
 * à anterior não re-renderiza.
 */
export function usePosicaoFlutuante(
  open: boolean,
  align: 'left' | 'right',
  anchorRef: RefObject<HTMLElement | null>,
  painelRef?: RefObject<HTMLElement | null>,
): PosicaoFlutuante {
  const [pos, setPos] = useState<PosicaoFlutuante>(INICIAL)

  useLayoutEffect(() => {
    if (!open) return
    const atualizar = () => {
      const el = anchorRef.current
      if (!el) return
      const nova = calcularPosicao(el.getBoundingClientRect(), align)
      setPos((atual) => (mesma(atual, nova) ? atual : nova))
    }
    const naRolagem = (e: Event) => {
      const painel = painelRef?.current
      if (painel && e.target instanceof Node && painel.contains(e.target)) return
      atualizar()
    }
    atualizar()
    window.addEventListener('scroll', naRolagem, true)
    window.addEventListener('resize', atualizar)
    return () => {
      window.removeEventListener('scroll', naRolagem, true)
      window.removeEventListener('resize', atualizar)
    }
  }, [open, align, anchorRef, painelRef])

  return pos
}
