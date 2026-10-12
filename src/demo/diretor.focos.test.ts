import { describe, expect, it } from 'vitest'
import { FOCOS } from './diretor'
import { heroMessages } from '@/components/landing/stage/hero/heroRealData'
import type { HeroState } from '@/components/landing/stage/hero/heroStory'

/**
 * Cada legenda do palco aponta para o que acabou de acontecer. Se o trecho do
 * foco não existir na mensagem daquele passo, a legenda passa sem destaque —
 * foi o que aconteceu com o pedido da Marina quando a história mudou (30/09).
 */
describe('focos do diretor', () => {
  for (const [estado, alvo] of Object.entries(FOCOS)) {
    if (!alvo?.mensagem) continue
    it(`${estado}: o trecho existe na mensagem ${alvo.mensagem}`, () => {
      const m = heroMessages(estado as HeroState).find((x) => x.id === alvo.mensagem)
      expect(m, `mensagem ${alvo.mensagem} ausente em ${estado}`).toBeTruthy()
      expect(m!.body).toContain(alvo.texto)
    })
  }
})
