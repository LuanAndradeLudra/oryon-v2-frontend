// ─── Faixa de período do inbox — estado ativo e toggle ───────────────────────
// Complementa dateRange.test.ts: lá se testa a DERIVAÇÃO do preset ativo, aqui
// o que a faixa renderiza e o que ela emite ao ser clicada.
//
// Os dois comportamentos cobertos nasceram do UAT:
//
//   1. Com o período limpo, NENHUM chip pode acender. O caminho de restore por
//      `?id=` (link do CRM, notificação) limpa startDate/endDate, e a faixa
//      acendia "Hoje" — o operador lia um filtro que não estava aplicado.
//   2. Clicar no chip ativo DESLIGA o período. Antes era no-op, então "todos os
//      períodos" só era alcançável como efeito colateral do item 1.

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickFiltersMenu } from '@/components/conversations/ConversationList/QuickFiltersMenu'
import { resolveRange } from '@/lib/dateRange'
import type { ConversationFilters } from '@/types'

const HOJE  = resolveRange('today')
const ONTEM = resolveRange('yesterday')

function renderBar(filters: ConversationFilters) {
  const onFiltersChange = vi.fn()
  render(<QuickFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />)
  // R2-1D-FILT: o período agora vive dentro do menu do funil.
  fireEvent.click(screen.getByRole('button', { name: 'Filtros rápidos' }))
  return { onFiltersChange }
}

const chip = (nome: string) => screen.getByRole('button', { name: new RegExp(`^${nome}`) })

const PERIODOS = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Personalizado']
/** Linhas de período acesas (o menu também tem linhas de Status com aria-pressed). */
const chipsPressionados = () =>
  screen.getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent?.trim() ?? '')
    .filter((t) => PERIODOS.some((p) => t.startsWith(p)))

describe('faixa de período — qual chip acende', () => {
  it('acende o chip que corresponde ao startDate aplicado', () => {
    renderBar({ startDate: HOJE.startDate, endDate: HOJE.endDate })
    expect(chip('Hoje')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('Ontem')).toHaveAttribute('aria-pressed', 'false')
  })

  it('SEM período aplicado, nenhum chip acende — a regressão do UAT', () => {
    // Antes isto acendia "Hoje" enquanto a lista mostrava todos os períodos.
    renderBar({})
    expect(chipsPressionados()).toEqual([])
  })

  it('um startDate fora dos presets nomeados acende "Personalizado"', () => {
    renderBar({ startDate: '2026-03-11T03:00:00.000Z', endDate: '2026-03-12T03:00:00.000Z' })
    expect(chip('Personalizado')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('faixa de período — toggle', () => {
  it('clicar no chip ATIVO limpa o filtro de período', () => {
    const { onFiltersChange } = renderBar({ startDate: HOJE.startDate, endDate: HOJE.endDate })

    fireEvent.click(chip('Hoje'))

    expect(onFiltersChange).toHaveBeenCalledTimes(1)
    expect(onFiltersChange.mock.calls[0][0]).toMatchObject({
      startDate: undefined,
      endDate: undefined,
    })
  })

  it('clicar em OUTRO chip troca o período em vez de limpar', () => {
    const { onFiltersChange } = renderBar({ startDate: HOJE.startDate, endDate: HOJE.endDate })

    fireEvent.click(chip('Ontem'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: ONTEM.startDate, endDate: ONTEM.endDate }),
    )
  })

  it('preserva os demais filtros ao limpar o período', () => {
    // O toggle faz spread de `filters`; se alguém trocar por um objeto literal,
    // o operador perde status/etiqueta/needsReview ao mexer no período.
    const { onFiltersChange } = renderBar({
      startDate: HOJE.startDate,
      endDate: HOJE.endDate,
      status: 'pending',
      needsReview: true,
    })

    fireEvent.click(chip('Hoje'))

    expect(onFiltersChange.mock.calls[0][0]).toMatchObject({
      status: 'pending',
      needsReview: true,
      startDate: undefined,
      endDate: undefined,
    })
  })

  it('clicar num chip inativo NÃO limpa nada quando não havia período', () => {
    const { onFiltersChange } = renderBar({})

    fireEvent.click(chip('Hoje'))

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: HOJE.startDate, endDate: HOJE.endDate }),
    )
  })
})
