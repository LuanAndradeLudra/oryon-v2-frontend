import { describe, it, expect } from 'vitest'
import { planLimitMessage, billingWarningOf } from './planLimit'

describe('planLimitMessage (SCRUM-1207)', () => {
  it('devolve a mensagem do limite do plano', () => {
    const err = { response: { status: 403, data: { code: 'entitlement_exceeded', message: 'Seu plano permite 2 números de WhatsApp.' } } }
    expect(planLimitMessage(err)).toBe('Seu plano permite 2 números de WhatsApp.')
  })
  it('reconhece conta suspensa', () => {
    const err = { response: { data: { code: 'account_suspended', message: 'Conta suspensa' } } }
    expect(planLimitMessage(err)).toBe('Conta suspensa')
  })
  it('B31 — reconhece módulo não contratado e contrato encerrado', () => {
    expect(planLimitMessage({ response: { data: { code: 'module_not_contracted', message: 'Automações não faz parte do contrato' } } })).toBe('Automações não faz parte do contrato')
    expect(planLimitMessage({ response: { data: { code: 'account_ended', message: 'Contrato encerrado' } } })).toBe('Contrato encerrado')
  })
  it('ignora outros erros', () => {
    expect(planLimitMessage({ response: { data: { message: 'outra coisa' } } })).toBeNull()
    expect(planLimitMessage(new Error('x'))).toBeNull()
  })
  it('lê o aviso de franquia medida', () => {
    expect(billingWarningOf({ id: 'c1', billingWarning: { message: 'franquia atingida' } })).toBe('franquia atingida')
    expect(billingWarningOf({ id: 'c1' })).toBeNull()
  })
})
