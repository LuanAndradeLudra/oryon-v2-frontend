import { describe, it, expect } from 'vitest'
import { multiPipelineEnabled, TENANT_FLAG_MULTI_PIPELINE } from './featureFlags'

// SCRUM-498 — o gate de múltiplos funis é "desligado por padrão": qualquer
// ausência (campo, chave, sessão) tem de resolver para `false`.
describe('multiPipelineEnabled', () => {
  it('é false quando o backend não manda o campo (main sem o módulo)', () => {
    expect(multiPipelineEnabled(undefined)).toBe(false)
    expect(multiPipelineEnabled(null)).toBe(false)
  })

  it('é false com lista vazia (módulo em produção, flag desligado p/ o tenant)', () => {
    expect(multiPipelineEnabled([])).toBe(false)
  })

  it('é false quando só outras chaves estão ligadas', () => {
    expect(multiPipelineEnabled(['FF_OUTRA_COISA'])).toBe(false)
  })

  it('é true quando FF_MULTI_PIPELINE está na lista', () => {
    expect(multiPipelineEnabled([TENANT_FLAG_MULTI_PIPELINE])).toBe(true)
    expect(multiPipelineEnabled(['FF_OUTRA_COISA', 'FF_MULTI_PIPELINE'])).toBe(true)
  })

  it('não faz match parcial nem case-insensitive (chave é exata)', () => {
    expect(multiPipelineEnabled(['ff_multi_pipeline'])).toBe(false)
    expect(multiPipelineEnabled(['FF_MULTI_PIPELINE_V2'])).toBe(false)
  })
})
