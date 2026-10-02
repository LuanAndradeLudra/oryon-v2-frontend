// 2ª revisão do SCRUM-1200 — regras puras do console de cobrança (itens AD).
import { describe, it, expect } from 'vitest'
import {
  companyFromCnpjLookup, defaultInstallments, defaultOnNextInvoice, isOverdueBrt, paidAtForPayDate,
  parsePercent, pickProvisionCompany, termMonthsOf,
} from './adminBillingForm'

describe('AD7 — vencida só a partir do dia seguinte (dia civil de Brasília)', () => {
  // Vencimento gravado como no backend: 12:00 de Brasília = 15:00 UTC.
  const due = '2026-10-10T15:00:00.000Z'

  it('no próprio dia do vencimento, de manhã e à tarde, não está vencida', () => {
    expect(isOverdueBrt(due, new Date('2026-10-10T12:00:00.000Z'))).toBe(false) // 09:00 BRT
    expect(isOverdueBrt(due, new Date('2026-10-10T19:00:00.000Z'))).toBe(false) // 16:00 BRT
    expect(isOverdueBrt(due, new Date('2026-10-11T02:59:00.000Z'))).toBe(false) // 23:59 BRT
  })

  it('vira vencida à meia-noite de Brasília do dia seguinte e segue vencida nos meses seguintes', () => {
    expect(isOverdueBrt(due, new Date('2026-10-11T03:00:00.000Z'))).toBe(true) // 00:00 BRT de 11/10
    for (let m = 0; m < 4; m++) {
      expect(isOverdueBrt(due, new Date(Date.UTC(2026, 10 + m, 5, 12)))).toBe(true)
    }
  })

  it('sem vencimento não está vencida', () => {
    expect(isOverdueBrt(null)).toBe(false)
  })
})

describe('AD2 — data da baixa', () => {
  const now = new Date(2026, 9, 2, 9, 30) // 02/10 09:30 (relógio local)

  it('hoje (antes do meio-dia): omite paidAt — o backend usa o instante dele', () => {
    expect(paidAtForPayDate('2026-10-02', now)).toBeUndefined()
  })

  it('outro dia: meio-dia local daquele dia', () => {
    expect(paidAtForPayDate('2026-09-28', now)).toBe(new Date(2026, 8, 28, 12).toISOString())
  })
})

describe('AD1 — empresa só com os campos do DTO', () => {
  it('Buscar CNPJ mapeia phone→billingPhone, email→billingEmail e descarta tradeName', () => {
    const c = companyFromCnpjLookup({}, {
      legalName: 'Clínica X LTDA', tradeName: 'Clínica X', email: 'fin@x.com', phone: '1133334444',
      addressZip: '01310100', addressCity: 'São Paulo', addressState: 'SP', addressIbgeCode: '3550308',
    })
    expect(c).not.toHaveProperty('tradeName')
    expect(c).not.toHaveProperty('email')
    expect(c).not.toHaveProperty('phone')
    expect(c.billingPhone).toBe('1133334444')
    expect(c.billingEmail).toBe('fin@x.com')
    expect(c.legalName).toBe('Clínica X LTDA')
  })

  it('não sobrescreve e-mail/telefone já digitados', () => {
    const c = companyFromCnpjLookup({ billingEmail: 'eu@x.com', billingPhone: '11999990000' }, { email: 'rf@x.com', phone: '1100000000' })
    expect(c.billingEmail).toBe('eu@x.com')
    expect(c.billingPhone).toBe('11999990000')
  })

  it('pickProvisionCompany remove campo desconhecido e vazios', () => {
    expect(pickProvisionCompany({ legalName: 'A', tradeName: 'B', email: 'e', billingPhone: '', addressCity: null }))
      .toEqual({ legalName: 'A' })
  })
})

describe('AD5/AD4 — parcelas e excedente na fatura Pix', () => {
  it('parcelas padrão = meses do prazo; à vista = 1', () => {
    expect(defaultInstallments('monthly', termMonthsOf('annual'))).toBe(12)
    expect(defaultInstallments('installments', termMonthsOf('semiannual'))).toBe(6)
    expect(defaultInstallments('upfront', termMonthsOf('annual'))).toBe(1)
  })

  it('excedente na fatura seguinte por padrão só com fatura todo mês (como o backend)', () => {
    expect(defaultOnNextInvoice('pix_invoice', 12, 12)).toBe(true)
    expect(defaultOnNextInvoice('pix_invoice', 3, 12)).toBe(false)
    expect(defaultOnNextInvoice('card_monthly', 12, 12)).toBe(false)
  })
})

describe('AD9 — percentual com decimal', () => {
  it('"7,5" e "7.5" viram 7.5 (não 75)', () => {
    expect(parsePercent('7,5')).toBe(7.5)
    expect(parsePercent('7.5')).toBe(7.5)
    expect(parsePercent('10')).toBe(10)
  })
  it('vazio = null; texto incompleto = NaN', () => {
    expect(parsePercent('')).toBeNull()
    expect(parsePercent('7,')).toBeNaN()
  })
})
