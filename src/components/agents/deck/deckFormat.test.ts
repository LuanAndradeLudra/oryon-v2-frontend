// deckFormat (A1/SCRUM-1012) — formatação compartilhada do Deck.
//
// O que estes testes protegem é a diferença entre "zero" e "não sei": um
// denominador zerado vira "—", não "0%", e uma data ausente vira "—", não
// "agora". O Deck inteiro depende dessa distinção para não afirmar coisas
// falsas sobre um agente enquanto o BE.7 não existe.

import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  daysSince,
  draftProgress,
  elapsedSince,
  formatDuration,
  formatPct,
  personaAccent,
  personaInitial,
  relativeTime,
  WIZARD_STEPS,
} from './deckFormat'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

afterEach(() => { vi.useRealTimers() })

describe('elapsedSince / daysSince', () => {
  it('devolve null para data ausente ou inválida, em vez de tratar como agora', () => {
    expect(elapsedSince(null)).toBeNull()
    expect(elapsedSince(undefined)).toBeNull()
    expect(elapsedSince('nao-e-data')).toBeNull()
    expect(daysSince(null)).toBeNull()
  })

  it('conta dias inteiros decorridos', () => {
    expect(daysSince(ago(9 * DAY))).toBe(9)
    expect(daysSince(ago(2 * DAY + HOUR))).toBe(2)
    expect(daysSince(ago(HOUR))).toBe(0)
  })

  it('não devolve tempo negativo para data no futuro', () => {
    expect(elapsedSince(new Date(Date.now() + HOUR).toISOString())).toBe(0)
  })
})

describe('relativeTime', () => {
  it('cobre as faixas que o feed e a faixa ao vivo usam', () => {
    expect(relativeTime(ago(2 * SECOND))).toBe('agora')
    expect(relativeTime(ago(40 * SECOND))).toBe('há 40s')
    expect(relativeTime(ago(3 * MINUTE))).toBe('há 3 min')
    expect(relativeTime(ago(5 * HOUR))).toBe('há 5h')
    expect(relativeTime(ago(2 * DAY))).toBe('há 2d')
  })

  it('mostra "—" quando não há data, nunca "agora"', () => {
    expect(relativeTime(null)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('formata a métrica "Resposta" como no mockup (58s, 1m42, 2h)', () => {
    expect(formatDuration(58)).toEqual({ value: '58', unit: 's' })
    expect(formatDuration(102)).toEqual({ value: '1m42', unit: undefined })
    expect(formatDuration(120)).toEqual({ value: '2', unit: 'm' })
    expect(formatDuration(7200)).toEqual({ value: '2', unit: 'h' })
  })

  it('sem valor, mostra "—"', () => {
    expect(formatDuration(null).value).toBe('—')
    expect(formatDuration(undefined).value).toBe('—')
    expect(formatDuration(Number.NaN).value).toBe('—')
  })
})

describe('formatPct', () => {
  it('arredonda a taxa para inteiro com unidade separada', () => {
    expect(formatPct(82, 100)).toEqual({ value: '82', unit: '%' })
    expect(formatPct(46, 60)).toEqual({ value: '77', unit: '%' })
  })

  it('sem base, mostra "—" em vez de 0% (uma taxa sem denominador é desconhecida)', () => {
    expect(formatPct(0, 0)).toEqual({ value: '—' })
  })
})

describe('personaAccent / personaInitial', () => {
  it('dá a mesma cor ao mesmo agente sempre, e usa toda a paleta categórica', () => {
    expect(personaAccent('agente-1')).toBe(personaAccent('agente-1'))
    const cores = new Set(Array.from({ length: 40 }, (_, i) => personaAccent(`id-${i}`)))
    expect(cores.size).toBeGreaterThan(1)
    expect([...cores].every((c) => ['blue', 'violet', 'green', 'amber', 'rose', 'cyan'].includes(c))).toBe(true)
  })

  it('usa a inicial maiúscula do nome, com "?" para nome vazio', () => {
    expect(personaInitial('sofia')).toBe('S')
    expect(personaInitial('  Rafa')).toBe('R')
    expect(personaInitial('   ')).toBe('?')
  })
})

describe('draftProgress', () => {
  it('conta só os campos preenchidos do wizard', () => {
    expect(draftProgress({ a: 'x', b: 'y', c: 'z' })).toBe(3)
    expect(draftProgress({ a: 'x', b: '', c: null, d: undefined, e: [] })).toBe(1)
  })

  it('nunca passa do total de etapas', () => {
    const cheio = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, 'v']))
    expect(draftProgress(cheio)).toBe(WIZARD_STEPS)
  })

  it('sem wizard_config, devolve null — o card some com a barra em vez de dizer "0 de 8"', () => {
    expect(draftProgress(undefined)).toBeNull()
  })
})
