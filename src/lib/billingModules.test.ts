import { describe, it, expect } from 'vitest'
import { isPathUnder, moduleForPath } from './billingModules'

describe('rotas × módulos (SCRUM-1210)', () => {
  it('segmento exato: /settings/company não libera /settings/company-brain', () => {
    expect(isPathUnder('/settings/company', '/settings/company')).toBe(true)
    expect(isPathUnder('/settings/company/x', '/settings/company')).toBe(true)
    expect(isPathUnder('/settings/company-brain', '/settings/company')).toBe(false)
  })
  it('mapeia a rota (e subrotas) para o módulo', () => {
    expect(moduleForPath('/copilot')).toBe('copilot')
    expect(moduleForPath('/campaigns/123')).toBe('campaigns')
    expect(moduleForPath('/campaigns?tab=templates')).toBe('campaigns')
    expect(moduleForPath('/team')).toBe('nexus')
    expect(moduleForPath('/teams')).toBeNull()
    expect(moduleForPath('/conversations')).toBeNull()
  })
})
