import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MensagensMarcadas, rotuloDoDia } from './SupportPieces'

afterEach(() => cleanup())

const msg = (id: string, enviadaEm: string, autor = 'contato') =>
  ({ id, enviadaEm, autor, texto: `mensagem ${id}` }) as never

describe('Conversa do cliente no suporte — divisão por dia (12/11)', () => {
  it('abre cada dia com um divisor e não repete o divisor no mesmo dia', () => {
    render(<MensagensMarcadas mensagens={[
      msg('a', '2026-11-10T10:40:00Z'),
      msg('b', '2026-11-10T10:41:00Z', 'ia'),
      msg('c', '2026-11-12T13:05:00Z'),
    ]} />)
    const divisores = screen.getAllByTestId('divisor-de-dia')
    expect(divisores).toHaveLength(2)
    expect(divisores[0].textContent).toMatch(/10\/11\/2026|Hoje|Ontem/)
  })

  it('rótulo: Hoje, Ontem ou dia da semana com a data (fuso de Brasília)', () => {
    const agora = new Date('2026-11-12T15:00:00Z')
    expect(rotuloDoDia('2026-11-12T12:00:00Z', agora)).toBe('Hoje')
    expect(rotuloDoDia('2026-11-11T12:00:00Z', agora)).toBe('Ontem')
    expect(rotuloDoDia('2026-11-10T12:00:00Z', agora)).toBe('terça, 10/11/2026')
    // 01h UTC do dia 12 ainda é dia 11 em Brasília
    expect(rotuloDoDia('2026-11-12T01:00:00Z', agora)).toBe('Ontem')
  })
})
