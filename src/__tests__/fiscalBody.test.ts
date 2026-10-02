// ─── PUT /organizations/current/fiscal — limpar opcionais (SCRUM-1212, F5) ─────
import { describe, it, expect } from 'vitest'
import { EMPTY_FISCAL, fiscalBody, pickFiscal, type FiscalData } from '@/services/firstAccessApi'

describe('fiscalBody', () => {
  it('opcional esvaziado vai como null; obrigatório vazio não vai', () => {
    const body = fiscalBody({
      ...EMPTY_FISCAL, taxId: '12345678000190', legalName: 'ACME', billingEmail: 'fin@acme.com',
      stateRegistration: '', billingPhone: '  ', addressComplement: null, addressIbgeCode: null, addressStreet: '',
    })
    expect(body.taxId).toBe('12345678000190')
    expect(body.stateRegistration).toBeNull()
    expect(body.billingPhone).toBeNull()
    expect(body.addressComplement).toBeNull()
    expect(body.addressIbgeCode).toBeNull()
    expect(body.municipalRegistration).toBeNull()
    expect(body.billingContact).toBeNull()
    expect('addressStreet' in body).toBe(false)
    expect('addressCity' in body).toBe(false)
  })

  it('CL1 — chaves fora do formulário (complete/confirmedAt do GET) nunca vão no corpo', () => {
    const fromGet = { ...EMPTY_FISCAL, taxId: '12345678000190', complete: true, confirmedAt: '2026-10-01T12:00:00Z' }
    const body = fiscalBody(fromGet as unknown as FiscalData)
    expect(body).not.toHaveProperty('complete')
    expect(body).not.toHaveProperty('confirmedAt')
    expect(body.taxId).toBe('12345678000190')
  })

  it('CL1 — pickFiscal guarda só os campos do formulário', () => {
    const f = pickFiscal({ ...EMPTY_FISCAL, documentType: null, legalName: 'ACME', complete: true, confirmedAt: 'x' } as unknown as FiscalData)
    expect(f).not.toHaveProperty('complete')
    expect(f).not.toHaveProperty('confirmedAt')
    expect(f.legalName).toBe('ACME')
    expect(f.documentType).toBe('cnpj')
    expect(Object.keys(f).sort()).toEqual(Object.keys(EMPTY_FISCAL).sort())
  })
})
