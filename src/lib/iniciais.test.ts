// Iniciais de avatar com emoji/símbolo no nome (28/10): contato "💐 Maria
// Aparecida" aparecia como "�M" — `palavra[0]` pegava meio emoji (surrogate
// solto). Vale para o getInitials (Avatar, listas, painel) e para o
// initialsOf (notificações).
import { describe, it, expect } from 'vitest'
import { getInitials } from './utils'
import { initialsOf } from './notificationsUx'

/** Nenhum surrogate solto — o que o navegador desenha como "�". */
const semMeioEmoji = (s: string) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s)

describe('getInitials', () => {
  it.each([
    ['Maria Aparecida', 'MA'],
    ['💐 Maria Aparecida', 'MA'],
    ['💐Maria Aparecida', 'MA'],
    ['Maria 💐 Aparecida', 'MA'],
    ['🌸✨ ana  luiza', 'AL'],
    ['*Dra. Paula*', 'DP'],
    ['Ítalo Ávila', 'ÍÁ'],
    ['Juliana', 'J'],
    ['  Gisana   Regina  ', 'GR'],
    ['24 99999', '29'],
  ])('%s → %s', (nome, esperado) => {
    expect(getInitials(nome)).toBe(esperado)
  })

  it('nome só com emoji mostra o emoji inteiro, nunca meio', () => {
    expect(getInitials('💐')).toBe('💐')
    expect(getInitials('💐 🌸')).toBe('💐')
  })

  it('vazio continua vazio', () => {
    expect(getInitials('')).toBe('')
  })

  it.each(['💐 Maria', '👩‍⚕️ Dra Ana', '🇧🇷 Brasil Saúde', '💐', '🙏🏽'])('%s não gera surrogate solto', (nome) => {
    expect(semMeioEmoji(getInitials(nome))).toBe(true)
  })
})

describe('initialsOf (notificações)', () => {
  it.each([
    ['Maria Aparecida', 'MA'],
    ['💐 Maria Aparecida', 'MA'],
    ['Maria Aparecida 💐', 'MA'],
    ['💐 Juliana', 'JU'],
    ['Juliana', 'JU'],
    ['João da Silva', 'JS'],
  ])('%s → %s', (nome, esperado) => {
    expect(initialsOf(nome)).toBe(esperado)
  })

  it('só emoji mostra o emoji inteiro; vazio segue "?"', () => {
    expect(initialsOf('💐')).toBe('💐')
    expect(initialsOf('')).toBe('?')
  })
})
