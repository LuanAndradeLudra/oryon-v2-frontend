// ─── dateRange — presets de período do inbox ─────────────────────────────────
// Primeiros testes deste módulo. Ele não tinha nenhum, e foi exatamente aí que
// passou o bug que o UAT pegou: `resolveActivePreset` (então inline dentro de
// ConversationFilters) devolvia 'today' sempre que `startDate` estava ausente.
//
// O estado "sem período" é alcançável de verdade: ConversationsPage limpa o
// range ao restaurar uma conversa por `?id=` — link do CRM ou notificação — pra
// que uma conversa fora do período apareça na lista. Com o fallback antigo, a
// faixa acendia "Hoje" enquanto a lista mostrava todos os períodos. O operador
// lia um filtro que não estava aplicado.
//
// A lógica de fuso também nunca foi coberta: o app fixa 00:00 BRT (= 03:00 UTC)
// independente do fuso do browser, e é fácil regredir isso sem ninguém notar.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { resolveActivePreset, resolveRange } from '@/lib/dateRange'

afterEach(() => {
  vi.useRealTimers()
})

/** Fixa o relógio num instante UTC conhecido. */
function freezeAt(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('resolveActivePreset', () => {
  it('devolve null quando NÃO há filtro de período — a regressão', () => {
    // Antes isto devolvia 'today' e a faixa mentia sobre o estado da lista.
    expect(resolveActivePreset(undefined)).toBeNull()
    expect(resolveActivePreset('')).toBeNull()
  })

  it('reconhece cada preset a partir do startDate que ele mesmo produz', () => {
    for (const preset of ['today', 'yesterday', 'last7'] as const) {
      expect(resolveActivePreset(resolveRange(preset).startDate)).toBe(preset)
    }
  })

  it('trata um startDate que não bate com preset nenhum como custom', () => {
    expect(resolveActivePreset('2026-03-11T03:00:00.000Z')).toBe('custom')
  })

  it('não confunde "sem período" com "período custom"', () => {
    // Os dois caem fora dos três presets nomeados; só um deles tem filtro.
    expect(resolveActivePreset(undefined)).toBeNull()
    expect(resolveActivePreset('2026-03-11T03:00:00.000Z')).toBe('custom')
  })
})

describe('resolveRange — alinhamento em BRT', () => {
  it('ancora o dia em 00:00 São Paulo = 03:00 UTC', () => {
    freezeAt('2026-07-29T10:00:00.000Z') // 07:00 BRT de 29/07
    expect(resolveRange('today')).toEqual({
      startDate: '2026-07-29T03:00:00.000Z',
      endDate: '2026-07-30T03:00:00.000Z',
    })
  })

  it('um instante UTC que ainda é ONTEM em Brasília usa o dia de Brasília', () => {
    // 01:00 UTC de 29/07 = 22:00 BRT de 28/07. "Hoje" para o operador é 28.
    freezeAt('2026-07-29T01:00:00.000Z')
    expect(resolveRange('today').startDate).toBe('2026-07-28T03:00:00.000Z')
  })

  it('ontem é o dia imediatamente anterior e termina onde hoje começa', () => {
    freezeAt('2026-07-29T10:00:00.000Z')
    const hoje = resolveRange('today')
    const ontem = resolveRange('yesterday')
    expect(ontem.endDate).toBe(hoje.startDate)
    expect(ontem.startDate).toBe('2026-07-28T03:00:00.000Z')
  })

  it('últimos 7 dias inclui hoje — 7 dias no total, não 8', () => {
    freezeAt('2026-07-29T10:00:00.000Z')
    const r = resolveRange('last7')
    expect(r.startDate).toBe('2026-07-23T03:00:00.000Z')
    expect(r.endDate).toBe('2026-07-30T03:00:00.000Z')
    const dias = (Date.parse(r.endDate!) - Date.parse(r.startDate!)) / 86_400_000
    expect(dias).toBe(7)
  })

  it('custom sem as duas pontas não aplica filtro nenhum', () => {
    // O backend só aplica startDate/endDate quando presentes, então um range
    // pela metade tem que virar objeto vazio em vez de meia-cláusula.
    expect(resolveRange('custom')).toEqual({})
    expect(resolveRange('custom', new Date('2026-07-01T12:00:00Z'))).toEqual({})
  })

  it('custom normaliza as pontas para limites de dia BRT, com fim exclusivo', () => {
    freezeAt('2026-07-29T10:00:00.000Z')
    const r = resolveRange(
      'custom',
      new Date('2026-07-01T15:00:00.000Z'),
      new Date('2026-07-06T15:00:00.000Z'),
    )
    expect(r.startDate).toBe('2026-07-01T03:00:00.000Z')
    // Fim exclusivo: 06/07 selecionado ⇒ corta no início de 07/07.
    expect(r.endDate).toBe('2026-07-07T03:00:00.000Z')
  })

  it('o range custom do UAT realmente cobre a conversa de 06/07', () => {
    // Caso concreto do UAT: conversa com lastMessageAt 2026-07-06 19:39.
    // O backend filtra com `>= startDate` e `< endDate`.
    const r = resolveRange(
      'custom',
      new Date('2026-07-01T12:00:00.000Z'),
      new Date('2026-07-29T12:00:00.000Z'),
    )
    const conversa = Date.parse('2026-07-06T19:39:00.000Z')
    expect(conversa).toBeGreaterThanOrEqual(Date.parse(r.startDate!))
    expect(conversa).toBeLessThan(Date.parse(r.endDate!))
  })
})
