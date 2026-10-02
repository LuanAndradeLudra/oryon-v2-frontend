import { describe, it, expect } from 'vitest'
import { podeAnexarMcp } from './mcpAnexar'

const manual = { mode: 'manual' as const, authValue: '', templateId: '', name: 'srv', endpointUrl: 'https://mcp.example', riskAccepted: true }

describe('podeAnexarMcp', () => {
  it('manual sem autenticação anexa sem token', () => {
    expect(podeAnexarMcp({ ...manual, authType: 'none' })).toBe(true)
  })
  it('manual com bearer exige token; verificado exige credencial e modelo', () => {
    expect(podeAnexarMcp({ ...manual, authType: 'bearer' })).toBe(false)
    expect(podeAnexarMcp({ ...manual, authType: 'bearer', authValue: 'tok' })).toBe(true)
    expect(podeAnexarMcp({ ...manual, mode: 'verified', authType: 'none', templateId: 't1' })).toBe(false)
    expect(podeAnexarMcp({ ...manual, mode: 'verified', authType: 'none', templateId: 't1', authValue: 'cred' })).toBe(true)
  })
  it('manual exige aceitar o risco', () => {
    expect(podeAnexarMcp({ ...manual, authType: 'none', riskAccepted: false })).toBe(false)
  })
})
