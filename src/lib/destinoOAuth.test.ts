import { describe, it, expect, beforeEach } from 'vitest'
import { destinoOAuthSeguro, guardarDestinoOAuth, tomarDestinoOAuth } from './destinoOAuth'

// Revisão ORY-94: a tela do OAuth sobrevive ao redirecionamento "duro" para o login.
describe('destino do OAuth guardado na aba', () => {
  beforeEach(() => sessionStorage.clear())

  it('guarda só caminho do próprio app começado por /oauth/, e devolve uma vez só', () => {
    guardarDestinoOAuth('/oauth/authorize?pedido=abc')
    expect(tomarDestinoOAuth()).toBe('/oauth/authorize?pedido=abc')
    expect(tomarDestinoOAuth()).toBeNull()
  })

  it.each(['/conversations', '//evil.example/oauth/', '/oauth/\\evil', 'https://evil.example/oauth/x', 'javascript:alert(1)', '/oauth/a b'])(
    'recusa %s',
    (c) => {
      expect(destinoOAuthSeguro(c)).toBe(false)
      guardarDestinoOAuth(c)
      expect(tomarDestinoOAuth()).toBeNull()
    },
  )

  it('valor adulterado na aba não vira destino', () => {
    sessionStorage.setItem('oryon:destino-oauth', '//evil.example')
    expect(tomarDestinoOAuth()).toBeNull()
  })
})
