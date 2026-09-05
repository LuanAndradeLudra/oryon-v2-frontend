import { describe, it, expect } from 'vitest'
import { accentColor, tint } from './accentColor'

describe('accentColor', () => {
  it('mapeia "brand" para a cor da marca (CTA)', () => {
    expect(accentColor('brand')).toBe('var(--color-brand-cta)')
  })

  it.each([
    ['blue', 'var(--color-accent-blue)'],
    ['green', 'var(--color-accent-green)'],
    ['violet', 'var(--color-accent-violet)'],
    ['amber', 'var(--color-accent-amber)'],
    ['rose', 'var(--color-accent-rose)'],
    ['cyan', 'var(--color-accent-cyan)'],
  ] as const)('mapeia "%s" para %s', (accent, expected) => {
    expect(accentColor(accent)).toBe(expected)
  })
})

describe('tint', () => {
  it('gera color-mix com a porcentagem informada, nunca hex cru', () => {
    expect(tint('rose', 16)).toBe('color-mix(in srgb, var(--color-accent-rose) 16%, transparent)')
  })
})
