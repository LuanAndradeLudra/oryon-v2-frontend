import { describe, it, expect } from 'vitest'
import { summarizeCatalogChange } from './billingCatalog'
import { explicitModules, isModuleOn } from './billingModules'
import { formatBRL } from '@/services/adminBillingApi'

describe('módulos do contrato (B21)', () => {
  it('ausente = ligado; só false explícito desliga', () => {
    expect(isModuleOn({}, 'copilot')).toBe(true)
    expect(isModuleOn(undefined, 'copilot')).toBe(true)
    expect(isModuleOn({ copilot: false }, 'copilot')).toBe(false)
  })
  it('explicitModules devolve os 8 módulos com valor explícito', () => {
    const m = explicitModules({ marketing: false })
    expect(Object.keys(m)).toHaveLength(8)
    expect(m.marketing).toBe(false)
    expect(m.copilot).toBe(true)
  })
})

describe('summarizeCatalogChange (SCRUM-1211)', () => {
  const plan = {
    displayName: 'Pro', priceMonthlyCents: 10000, monthlyCredits: 100, active: true,
    features: { overagePriceCents: 5, entitlements: { users: 5 }, modules: {} },
  }

  it('lista cada campo do plano que mudou', () => {
    const after = {
      ...plan, displayName: 'Profissional', priceMonthlyCents: 12000, monthlyCredits: null, active: false,
      features: { overagePriceCents: 6, entitlements: { users: 10, agents: 2 }, modules: { marketing: false } },
    }
    const s = summarizeCatalogChange('plan', plan, after)
    expect(s).toContain('nome "Pro" → "Profissional"')
    expect(s).toContain(`preço ${formatBRL(10000)} → ${formatBRL(12000)}`)
    expect(s).toContain('créditos/mês 100 → ilimitado')
    expect(s).toContain(`excedente ${formatBRL(5)} → ${formatBRL(6)} por crédito`)
    expect(s).toContain('desativado')
    expect(s).toContain('Usuários 5 → 10')
    expect(s).toContain('Agentes de IA ilimitado → 2')
    expect(s).toContain('módulo Marketing e atribuição desligado')
  })

  it('módulo ausente → true explícito não conta como mudança', () => {
    const after = { ...plan, features: { ...plan.features, modules: { copilot: true } } }
    expect(summarizeCatalogChange('plan', plan, after)).toEqual(['salvo sem mudança de valores'])
  })

  it('pacote: valor e ativo', () => {
    const s = summarizeCatalogChange('pack', { valueCents: 1000, active: true }, { valueCents: 1500, active: false })
    expect(s).toEqual([`valor ${formatBRL(1000)} → ${formatBRL(1500)}`, 'desativado'])
  })

  it('criação (sem before)', () => {
    expect(summarizeCatalogChange('pack', null, { valueCents: 1000 })).toEqual([`criado — ${formatBRL(1000)}`])
  })
})
