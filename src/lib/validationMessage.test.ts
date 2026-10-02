import { describe, it, expect } from 'vitest'
import { humanizeValidationMessage } from './validationMessage'
import { localIsoDate } from './localDate'

describe('humanizeValidationMessage (SCRUM-1205, F10)', () => {
  const labels = { installments: 'Parcelas', 'overage.ceilingPct': 'Teto do excedente', adminEmail: 'E-mail do administrador' }
  it('traduz as mensagens padrão do class-validator com o rótulo da tela', () => {
    expect(humanizeValidationMessage('installments must not be greater than 12', labels)).toBe('Parcelas: no máximo 12.')
    expect(humanizeValidationMessage('overage.ceilingPct must not be less than 0', labels)).toBe('Teto do excedente: no mínimo 0.')
    expect(humanizeValidationMessage('adminEmail must be an email', labels)).toBe('E-mail do administrador: e-mail inválido.')
    expect(humanizeValidationMessage('property foo should not exist', labels)).toBe('Campo não aceito: foo.')
  })
  it('mensagem de negócio (já em português) passa intacta', () => {
    expect(humanizeValidationMessage('Combinação de prazo e cobrança não vendável', labels)).toBe('Combinação de prazo e cobrança não vendável')
  })
})

describe('localIsoDate (F11)', () => {
  it('início de vigência padrão é a data local', () => {
    expect(localIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})
