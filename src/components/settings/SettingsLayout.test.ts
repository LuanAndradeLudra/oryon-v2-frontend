import { describe, it, expect } from 'vitest'
import { visibleSettingsNav, firstVisibleSection, MULTI_PIPELINE_SECTIONS } from './SettingsLayout'

const sectionsOf = (role: string, opts?: { multiPipeline?: boolean }) =>
  visibleSettingsNav(role, opts).flatMap((d) => d.clusters.flatMap((c) => c.items.map((i) => i.section)))

// SCRUM-498 — seções de múltiplos funis só aparecem com o flag do tenant.
describe('visibleSettingsNav · gate de múltiplos funis', () => {
  it('identifica as seções gateadas a partir da própria navegação', () => {
    expect([...MULTI_PIPELINE_SECTIONS].sort()).toEqual(['pipeline-routing', 'pipeline-stages'])
  })

  it('esconde as seções de funil por padrão (sem opts) — desligado é o default', () => {
    const sections = sectionsOf('admin')
    expect(sections).not.toContain('pipeline-stages')
    expect(sections).not.toContain('pipeline-routing')
    // O resto do cluster CRM continua lá.
    expect(sections).toContain('crm-products')
    expect(sections).toContain('crm-practitioners')
  })

  it('esconde as seções de funil com multiPipeline=false explícito', () => {
    const sections = sectionsOf('admin', { multiPipeline: false })
    expect(sections).not.toContain('pipeline-stages')
    expect(sections).not.toContain('pipeline-routing')
  })

  it('mostra as seções de funil para admin com multiPipeline=true', () => {
    const sections = sectionsOf('admin', { multiPipeline: true })
    expect(sections).toContain('pipeline-stages')
    // F11-888: o roteamento saiu do menu (rota direta mantida), mas 'Estágios do funil' segue.
    expect(sections).not.toContain('pipeline-routing')
    expect(sections).toContain('pipeline-stages')
  })

  it('o flag não sobrepõe o papel: agente não vê seções adminOnly mesmo com o flag', () => {
    const sections = sectionsOf('agent', { multiPipeline: true })
    expect(sections).not.toContain('pipeline-stages')
    expect(sections).not.toContain('pipeline-routing')
  })

  it('firstVisibleSection continua estável com e sem o flag', () => {
    expect(firstVisibleSection('admin')).toBe(firstVisibleSection('admin', { multiPipeline: true }))
  })
})

// F13-903 — a situação do contato ganhou seção própria em Configurações → CRM.
// Não é do módulo de funis: vale com ou sem FF_MULTI_PIPELINE.
describe('visibleSettingsNav · situação do contato (F13-903)', () => {
  it('aparece para admin mesmo sem o flag de múltiplos funis', () => {
    expect(sectionsOf('admin')).toContain('stages')
    expect(sectionsOf('admin', { multiPipeline: false })).toContain('stages')
    expect(sectionsOf('admin', { multiPipeline: true })).toContain('stages')
  })

  it('não entrou por engano na lista de seções gateadas pelo flag', () => {
    expect(MULTI_PIPELINE_SECTIONS.has('stages')).toBe(false)
  })

  it('fica ao lado de "Estágios do funil" — os dois eixos, lado a lado, com o flag ligado', () => {
    const crm = sectionsOf('admin', { multiPipeline: true })
    expect(crm.indexOf('stages')).toBeLessThan(crm.indexOf('pipeline-stages'))
  })

  it('é só para admin (mesma regra do resto do cluster CRM)', () => {
    expect(sectionsOf('agent')).not.toContain('stages')
  })
})
