/**
 * SCRUM-1216 (05/11) — seletor de período do painel: os fixos novos, o
 * "De … até …" com validação e a comparação com o ano anterior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangePicker } from './DateRangePicker'
import type { Periodo } from '@/lib/periodoDoPainel'

const SETE: Periodo = { tipo: 'fixo', valor: '7d', comparar: 'anterior' }

function abrir(value: Periodo = SETE) {
  const onChange = vi.fn()
  render(<DateRangePicker value={value} onChange={onChange} />)
  fireEvent.click(screen.getByTestId('periodo-pilula'))
  return onChange
}

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 05/11/2026, 15h em Brasília.
    vi.setSystemTime(new Date('2026-11-05T18:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('oferece os períodos novos e mantém a comparação ao trocar', () => {
    const onChange = abrir({ ...SETE, comparar: 'ano_anterior' })
    expect(screen.getByText('Últimos 90 dias')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Mês anterior'))
    expect(onChange).toHaveBeenCalledWith({ tipo: 'fixo', valor: 'last_month', comparar: 'ano_anterior' })
  })

  it('compara com o mesmo período do ano anterior', () => {
    const onChange = abrir()
    fireEvent.click(screen.getByText('Mesmo período do ano anterior'))
    expect(onChange).toHaveBeenCalledWith({ ...SETE, comparar: 'ano_anterior' })
  })

  it('personalizado: começa nos últimos 30 dias e aplica um intervalo válido', () => {
    const onChange = abrir()
    fireEvent.click(screen.getByText('Personalizado…'))
    expect(screen.getByTestId('periodo-de')).toHaveValue('2026-10-07')
    expect(screen.getByTestId('periodo-ate')).toHaveValue('2026-11-05')
    expect(screen.getByTestId('periodo-ate')).toHaveAttribute('max', '2026-11-05')
    fireEvent.change(screen.getByTestId('periodo-de'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByTestId('periodo-ate'), { target: { value: '2026-10-15' } })
    expect(screen.getByText(/15 dias · até 400 dias/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('periodo-aplicar'))
    expect(onChange).toHaveBeenCalledWith({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'anterior' })
  })

  it('personalizado inválido mostra a mensagem e não aplica', () => {
    const onChange = abrir()
    fireEvent.click(screen.getByText('Personalizado…'))
    fireEvent.change(screen.getByTestId('periodo-de'), { target: { value: '2025-01-01' } })
    fireEvent.click(screen.getByTestId('periodo-aplicar'))
    expect(screen.getByTestId('periodo-erro')).toHaveTextContent('no máximo 400 dias')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId('periodo-de'), { target: { value: '2026-11-10' } })
    expect(screen.getByTestId('periodo-erro')).toHaveTextContent('A data inicial precisa ser antes da final.')
  })

  it('a pílula mostra o intervalo à vista e reabre nele', () => {
    abrir({ tipo: 'personalizado', de: '2026-10-01', ate: '2026-10-15', comparar: 'ano_anterior' })
    expect(screen.getByTestId('periodo-pilula')).toHaveTextContent('01/10 – 15/10')
    expect(screen.getByTestId('periodo-pilula')).toHaveAccessibleName('Período: 01/10 – 15/10, comparado ao ano anterior')
    expect(screen.getByTestId('periodo-de')).toHaveValue('2026-10-01')
  })
})
