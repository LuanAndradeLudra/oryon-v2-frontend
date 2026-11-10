import { describe, expect, it } from 'vitest'
import { retomadasEnabled, TENANT_FLAG_RETOMADAS } from './featureFlags'

// FF_RETOMADAS (07/11): a tela "Planos de ação" só existe na unidade com a flag ligada.
describe('retomadasEnabled', () => {
  it('liga só com a flag listada pelo /auth/me', () => {
    expect(TENANT_FLAG_RETOMADAS).toBe('FF_RETOMADAS')
    expect(retomadasEnabled(['FF_RETOMADAS'])).toBe(true)
    expect(retomadasEnabled(['FF_MULTI_PIPELINE', 'FF_RETOMADAS'])).toBe(true)
  })
  it('desligada sem a flag, sem o campo ou antes da hidratação', () => {
    expect(retomadasEnabled(['FF_MULTI_PIPELINE'])).toBe(false)
    expect(retomadasEnabled([])).toBe(false)
    expect(retomadasEnabled(undefined)).toBe(false)
    expect(retomadasEnabled(null)).toBe(false)
  })
})
