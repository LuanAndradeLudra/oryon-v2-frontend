import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  descartarDestinoOAuth,
  destinoOAuthSeguro,
  guardarDestinoOAuth,
  PRAZO_DO_DESTINO_MS,
  tomarDestinoOAuth,
} from './destinoOAuth'

const sessaoDe = (id: string) => localStorage.setItem('oryon:session', JSON.stringify({ user: { id } }))

// Revisão ORY-94: a tela do OAuth sobrevive ao redirecionamento "duro" para o login — com dono
// e prazo (2ª rodada).
describe('destino do OAuth guardado na aba', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('guarda só caminho do próprio app começado por /oauth/, e devolve uma vez só', () => {
    sessaoDe('u1')
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
    sessionStorage.setItem('oryon:destino-oauth', JSON.stringify({ caminho: '//evil.example', dono: null, em: Date.now() }))
    expect(tomarDestinoOAuth()).toBeNull()
    sessionStorage.setItem('oryon:destino-oauth', 'lixo')
    expect(tomarDestinoOAuth()).toBeNull()
  })

  it('revisão 2: outra pessoa entrando não volta para o pedido de quem saiu', () => {
    sessaoDe('u1')
    guardarDestinoOAuth('/oauth/aprovar/abc')
    sessaoDe('u2')
    expect(tomarDestinoOAuth()).toBeNull()
  })

  it('revisão 2: passado o prazo (o pedido do OAuth já venceu), não volta', () => {
    vi.useFakeTimers()
    sessaoDe('u1')
    guardarDestinoOAuth('/oauth/authorize?pedido=abc')
    vi.advanceTimersByTime(PRAZO_DO_DESTINO_MS + 1000)
    expect(tomarDestinoOAuth()).toBeNull()
  })

  it('revisão 2: o logout descarta o destino', () => {
    sessaoDe('u1')
    guardarDestinoOAuth('/oauth/authorize?pedido=abc')
    descartarDestinoOAuth()
    expect(tomarDestinoOAuth()).toBeNull()
  })
})
