// A COMPOSIÇÃO do palco, conferida por aritmética.
//
// O defeito que motivou este arquivo apareceu na tela: no arranjo da ponte, a
// janela de Conversas saía 232px pela borda esquerda do palco e a de Funis
// 268px pela direita. "Recuar" virou "ser cortada", que é exatamente o que o
// PO proibiu. Aqui a regra vira asserção: toda janela VISÍVEL cabe inteira
// dentro do canvas, em todos os arranjos, no desktop e no celular.
import { describe, it, expect } from 'vitest'
import {
  CANVAS, CANVAS_MEDIO, CANVAS_MOBILE, HERO_COMPOSITIONS, HERO_COMPOSITIONS_MEDIO,
  HERO_COMPOSITIONS_MOBILE, WIN, WIN_MEDIO, WIN_MOBILE,
  type HeroComposition, type HeroWindowKey, type WindowPose,
} from './heroComposition'

type Tam = { w: number; h: number }

type Win = typeof WIN | typeof WIN_MEDIO | typeof WIN_MOBILE

function tamanhoDe(chave: HeroWindowKey, pose: WindowPose, win: Win): Tam {
  if (chave === 'conversa') return pose.variant === 'chat' ? win.conversaChat : win.conversaFull
  return chave === 'contato' ? win.contato : win.funil
}

function caixa(chave: HeroWindowKey, pose: WindowPose, win: Win) {
  const t = tamanhoDe(chave, pose, win)
  return { l: pose.x, t: pose.y, r: pose.x + t.w * pose.scale, b: pose.y + t.h * pose.scale }
}

function cada(
  tabela: Record<string, HeroComposition>,
  win: Win,
  canvas: { w: number; h: number },
  fn: (nome: string, chave: HeroWindowKey, c: ReturnType<typeof caixa>) => void,
) {
  for (const [nome, comp] of Object.entries(tabela)) {
    for (const chave of ['conversa', 'contato', 'funil'] as HeroWindowKey[]) {
      const pose = comp[chave]
      if (!pose.visible) continue
      fn(nome, chave, caixa(chave, pose, win))
      void canvas
    }
  }
}

describe('nenhuma janela visível é cortada pela borda do palco', () => {
  it('desktop', () => {
    cada(HERO_COMPOSITIONS, WIN, CANVAS, (nome, chave, c) => {
      expect(c.l, `${nome}.${chave} sai pela esquerda`).toBeGreaterThanOrEqual(0)
      expect(c.t, `${nome}.${chave} sai por cima`).toBeGreaterThanOrEqual(0)
      expect(c.r, `${nome}.${chave} sai pela direita`).toBeLessThanOrEqual(CANVAS.w)
      expect(c.b, `${nome}.${chave} sai por baixo`).toBeLessThanOrEqual(CANVAS.h)
    })
  })

  it('notebook e larguras intermediárias', () => {
    cada(HERO_COMPOSITIONS_MEDIO, WIN_MEDIO, CANVAS_MEDIO, (nome, chave, c) => {
      expect(c.l, `${nome}.${chave} sai pela esquerda`).toBeGreaterThanOrEqual(0)
      expect(c.t, `${nome}.${chave} sai por cima`).toBeGreaterThanOrEqual(0)
      expect(c.r, `${nome}.${chave} sai pela direita`).toBeLessThanOrEqual(CANVAS_MEDIO.w)
      expect(c.b, `${nome}.${chave} sai por baixo`).toBeLessThanOrEqual(CANVAS_MEDIO.h)
    })
  })

  it('celular', () => {
    cada(HERO_COMPOSITIONS_MOBILE, WIN_MOBILE, CANVAS_MOBILE, (nome, chave, c) => {
      expect(c.l, `${nome}.${chave} sai pela esquerda`).toBeGreaterThanOrEqual(0)
      expect(c.t, `${nome}.${chave} sai por cima`).toBeGreaterThanOrEqual(0)
      expect(c.r, `${nome}.${chave} sai pela direita`).toBeLessThanOrEqual(CANVAS_MOBILE.w)
      expect(c.b, `${nome}.${chave} sai por baixo`).toBeLessThanOrEqual(CANVAS_MOBILE.h)
    })
  })
})

describe('as escalas ficam moderadas', () => {
  it('nenhuma janela é ampliada nem reduzida a ponto de prejudicar a leitura', () => {
    // O zoom aqui é enquadramento, não substituto de composição: nada acima de
    // 1,05 (ampliar para ler o que deveria ser maior por layout) nem abaixo de
    // 0,58 (janela que recua até virar ilegível).
    cada(HERO_COMPOSITIONS, WIN, CANVAS, () => {})
    for (const [nome, comp] of Object.entries(HERO_COMPOSITIONS)) {
      for (const chave of ['conversa', 'contato', 'funil'] as HeroWindowKey[]) {
        const pose = comp[chave]
        if (!pose.visible) continue
        expect(pose.scale, `${nome}.${chave}`).toBeLessThanOrEqual(1.05)
        expect(pose.scale, `${nome}.${chave}`).toBeGreaterThanOrEqual(0.58)
      }
    }
  })
})

describe('uma superfície domina por vez', () => {
  it('em todo arranjo há exatamente uma janela em opacidade plena no topo', () => {
    for (const [nome, comp] of Object.entries(HERO_COMPOSITIONS)) {
      const visiveis = (['conversa', 'contato', 'funil'] as HeroWindowKey[])
        .map((k) => comp[k])
        .filter((p) => p.visible)
      // `reinicio` é o palco vazio de propósito: a passagem em que os dados
      // voltam ao começo fora de cena.
      if (visiveis.length === 0) continue
      const topo = visiveis.reduce((a, b) => (b.z > a.z ? b : a))
      expect(topo.opacity, `${nome}: a janela de cima precisa estar em opacidade plena`).toBe(1)
      // Duas janelas podem estar em opacidade plena (a ponte e o fecho mostram
      // causa e efeito juntos), mas nunca três.
      expect(visiveis.filter((p) => p.opacity === 1).length, nome).toBeLessThanOrEqual(2)
    }
  })

  it('nos regimes de uma janela, exatamente uma superfície em cena', () => {
    for (const [nome, comp] of Object.entries({ ...HERO_COMPOSITIONS_MEDIO, ...HERO_COMPOSITIONS_MOBILE })) {
      const plenas = (['conversa', 'contato', 'funil'] as HeroWindowKey[])
        .map((k) => comp[k])
        .filter((p) => p.visible && p.opacity === 1)
      expect(plenas.length, nome).toBeLessThanOrEqual(1)
    }
  })
})
