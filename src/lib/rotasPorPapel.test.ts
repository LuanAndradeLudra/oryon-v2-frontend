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
  it('Qualidade do suporte (SCRUM-1391) só para a gestão, com o suporte ligado', () => {
    const com = (role: string) => ({ role, multiPipeline: false, suporte: true })
    expect(rotaPermitida('/support/qualidade', com('admin'))).toBe(true)
    expect(rotaPermitida('/support/qualidade?periodo=2026-09', com('business_admin'))).toBe(true)
    expect(rotaPermitida('/support/qualidade', com('agent'))).toBe(false)
    expect(rotaPermitida('/support/qualidade', com('supervisor'))).toBe(false)
    expect(rotaPermitida('/support/qualidade', com('oryon_support'))).toBe(false)
    expect(rotaPermitida('/support/qualidade', { role: 'admin', multiPipeline: false, suporte: false })).toBe(false)
    expect(rotaPermitida('/support', com('agent'))).toBe(true)
  })
  it('demais rotas livres', () => {
    expect(rotaPermitida('/conversations', { role: 'agent', multiPipeline: false })).toBe(true)
  })
})
