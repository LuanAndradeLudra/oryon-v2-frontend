import { describe, it, expect } from 'vitest'
import { lerNumeroDaMeta } from './metasDoPainel'

describe('lerNumeroDaMeta — número no jeito brasileiro', () => {
  it.each([
    ['1.440', 1440], ['1440', 1440], ['92,5', 92.5], ['1.000,5', 1000.5], ['1.5', 1.5], [' 30 ', 30],
  ])('%s → %s', (texto, esperado) => {
    expect(lerNumeroDaMeta(texto)).toBe(esperado)
  })
})
