import { describe, it, expect } from 'vitest'
import { motivoDoLoginOAuth } from './destinoOAuth'

// ORY-94 (decisão do João, 23/11): o login sabe por que a pessoa chegou ali.
describe('motivoDoLoginOAuth', () => {
  const PEDIDO = 'Ab_-'.repeat(10) + 'xyz'

  it('conexão: devolve o id do pedido só no formato certo', () => {
    expect(motivoDoLoginOAuth(`/oauth/authorize?pedido=${PEDIDO}`)).toEqual({ tipo: 'conectar', pedido: PEDIDO })
    expect(motivoDoLoginOAuth('/oauth/authorize?pedido=curto')).toEqual({ tipo: 'conectar', pedido: null })
    expect(motivoDoLoginOAuth('/oauth/authorize')).toEqual({ tipo: 'conectar', pedido: null })
  })

  it('aprovação de ação: sem pedido de conexão', () => {
    expect(motivoDoLoginOAuth('/oauth/aprovar/xyz')).toEqual({ tipo: 'aprovar' })
  })

  it('qualquer outro destino (ou inseguro): nada', () => {
    expect(motivoDoLoginOAuth('/conversations')).toBeNull()
    expect(motivoDoLoginOAuth('//outro.site/oauth/authorize?pedido=x')).toBeNull()
    expect(motivoDoLoginOAuth(null)).toBeNull()
    expect(motivoDoLoginOAuth(undefined)).toBeNull()
  })
})
