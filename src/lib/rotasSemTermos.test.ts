import { describe, it, expect } from 'vitest'
import { rotaSemPedidoDeTermos } from './rotasSemTermos'

describe('rotaSemPedidoDeTermos', () => {
  it('entrada e páginas públicas: sem o pedido', () => {
    for (const p of ['/', '/login', '/first-access', '/activate', '/plataforma/conversas', '/solucoes', '/perguntas', '/demonstracao', '/canva/callback']) {
      expect(rotaSemPedidoDeTermos(p)).toBe(true)
    }
  })

  it('telas da plataforma: com o pedido', () => {
    for (const p of ['/home', '/conversations', '/settings/billing', '/setup', '/admin/billing']) {
      expect(rotaSemPedidoDeTermos(p)).toBe(false)
    }
  })
})
