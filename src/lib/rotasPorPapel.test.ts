import { describe, it, expect } from 'vitest'
import { rotaPermitida } from './rotasPorPapel'

describe('rotaPermitida (revisão final 04/10)', () => {
  it('Disparos só para administradores', () => {
    expect(rotaPermitida('/campaigns', { role: 'supervisor', multiPipeline: true })).toBe(false)
    expect(rotaPermitida('/campaigns', { role: 'agent', multiPipeline: true })).toBe(false)
    expect(rotaPermitida('/campaigns?aba=templates', { role: 'admin', multiPipeline: true })).toBe(true)
  })
  it('Funis só com a flag da empresa', () => {
    expect(rotaPermitida('/pipelines', { role: 'agent', multiPipeline: false })).toBe(false)
    expect(rotaPermitida('/pipelines/abc', { role: 'agent', multiPipeline: true })).toBe(true)
  })
  it('demais rotas livres', () => {
    expect(rotaPermitida('/conversations', { role: 'agent', multiPipeline: false })).toBe(true)
  })
})
