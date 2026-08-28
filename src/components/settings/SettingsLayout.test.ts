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
    expect(sections).toContain('pipeline-routing')
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
