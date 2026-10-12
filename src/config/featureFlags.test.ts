import { describe, it, expect } from 'vitest'
import { multiPipelineEnabled, TENANT_FLAG_MULTI_PIPELINE, cobrancaOcultaPara, TENANT_FLAG_OCULTAR_COBRANCA } from './featureFlags'

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

// PO 12/10 — cobrança fora do Oryon: ligar ESCONDE; sem a linha, nada muda.
describe('cobrancaOcultaPara', () => {
  it('é false sem campo, com lista vazia ou com outras chaves', () => {
    expect(cobrancaOcultaPara(undefined)).toBe(false)
    expect(cobrancaOcultaPara([])).toBe(false)
    expect(cobrancaOcultaPara([TENANT_FLAG_MULTI_PIPELINE])).toBe(false)
  })

  it('é true quando FF_OCULTAR_COBRANCA está na lista', () => {
    expect(cobrancaOcultaPara([TENANT_FLAG_OCULTAR_COBRANCA])).toBe(true)
  })
})
