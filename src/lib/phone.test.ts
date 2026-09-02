import { describe, it, expect } from 'vitest'
import { formatPhone, maskPhoneInput, phoneDigits, isValidPhone } from './phone'

// Onda 2 da auditoria de interface. `formatPhone` estava copiado byte a byte em
// quatro componentes e reescrito diferente num quinto — estes testes travam a
// única definição.
describe('formatPhone — exibição', () => {
  it('celular com DDI: +55 11 99988-7766', () => {
    expect(formatPhone('5511999887766')).toBe('+55 11 99988-7766')
  })

  it('fixo com DDI: +55 11 3988-7766', () => {
    expect(formatPhone('551139887766')).toBe('+55 11 3988-7766')
  })

  it('formato desconhecido volta como veio — não inventa máscara para internacional', () => {
    expect(formatPhone('12025550123')).toBe('12025550123')
    expect(formatPhone('abc')).toBe('abc')
  })

  it('vazio/nulo viram string vazia', () => {
    expect(formatPhone('')).toBe('')
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })
})

describe('maskPhoneInput — digitação progressiva', () => {
  it('formata a cada tecla, sem esperar o número completo', () => {
    expect(maskPhoneInput('55')).toBe('+55')
    expect(maskPhoneInput('5511')).toBe('+55 11')
    expect(maskPhoneInput('551199')).toBe('+55 11 99')
    expect(maskPhoneInput('5511999887')).toBe('+55 11 9998-87')
    expect(maskPhoneInput('5511999887766')).toBe('+55 11 99988-7766')
  })

  it('NÃO adivinha o DDI — número internacional colado passa intacto, não vira brasileiro', () => {
    // Prefixar 55 automaticamente transformaria este número dos EUA em outro
    // número. Com 11 dígitos não há como distinguir de um BR sem DDI, e
    // corromper dado do cliente é pior que exigir o código do país.
    expect(maskPhoneInput('12025550123')).toBe('12025550123')
    expect(maskPhoneInput('351912345678')).toBe('351912345678')
  })

  it('fixo (8 dígitos) quebra em 4+4; celular (9) em 5+4', () => {
    expect(maskPhoneInput('551139887766')).toBe('+55 11 3988-7766')
    expect(maskPhoneInput('5511999887766')).toBe('+55 11 99988-7766')
  })

  it('ignora o que o usuário colar com símbolos', () => {
    expect(maskPhoneInput('+55 (11) 99988-7766')).toBe('+55 11 99988-7766')
  })

  it('acima do comprimento brasileiro não vira um BR truncado — corta no máximo do E.164 e mostra cru', () => {
    // Truncar `5511999887766999` em `+55 11 99988-7766` descartaria dígitos em
    // silêncio e apresentaria um número que o usuário não digitou.
    expect(maskPhoneInput('5511999887766999')).toBe('551199988776699')
  })

  it('vazio continua vazio — não injeta "+55" num campo em branco', () => {
    expect(maskPhoneInput('')).toBe('')
  })
})

describe('phoneDigits — o que vai para a API', () => {
  it('devolve só dígitos, tirando a máscara', () => {
    expect(phoneDigits('+55 11 99988-7766')).toBe('5511999887766')
  })

  it('ida e volta: mascarar e limpar preserva o número', () => {
    const original = '5511999887766'
    expect(phoneDigits(maskPhoneInput(original))).toBe(original)
  })
})

describe('isValidPhone', () => {
  it('aceita celular (9) e fixo (8) com DDD válido', () => {
    expect(isValidPhone('5511999887766')).toBe(true)
    expect(isValidPhone('551139887766')).toBe(true)
  })

  it('recusa sem DDI, com DDD inválido ou com comprimento errado', () => {
    expect(isValidPhone('11999887766')).toBe(false)   // sem 55
    expect(isValidPhone('5501999887766')).toBe(false) // DDD 01
    expect(isValidPhone('551199')).toBe(false)        // curto demais
    expect(isValidPhone('')).toBe(false)
  })
})
