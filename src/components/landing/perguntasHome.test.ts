import { describe, expect, it } from 'vitest'
import { perguntas } from './landingCopy'

describe('perguntas da home', () => {
  it('cada pergunta escolhida para a home existe no FAQ', () => {
    const todas = perguntas.grupos.flatMap((g) => g.itens.map((i) => i.pergunta as string))
    for (const p of perguntas.naHome) expect(todas, p).toContain(p)
  })
})
