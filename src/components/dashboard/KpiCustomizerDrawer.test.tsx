import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'
import type { KpiId } from '@/types/dashboard'

afterEach(() => cleanup())

const SLOTS: KpiId[] = ['active_conversations', 'resolved', 'first_response_time', 'queued', 'resolution_rate']

function montar(slots: KpiId[] = SLOTS) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<KpiCustomizerDrawer open onClose={onClose} slots={slots} defaults={SLOTS} onSave={onSave} />)
  const selecionados = () => within(screen.getByTestId('kpi-selecionados')).getAllByRole('listitem').map((li) => li.textContent ?? '')
  return { onSave, onClose, selecionados }
}

describe('Personalizar indicadores', () => {
  it('mostra a faixa na ordem e reordena com as setas', () => {
    const { selecionados } = montar()
    expect(selecionados()[0]).toContain('Conversas Ativas')
    fireEvent.click(screen.getByRole('button', { name: 'Descer Conversas Ativas' }))
    expect(selecionados()[0]).toContain('Resolvidas')
    expect(selecionados()[1]).toContain('Conversas Ativas')
  })

  it('adiciona pelo catálogo com busca, e Salvar grava o rascunho', () => {
    const { onSave, onClose } = montar()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar indicador' }), { target: { value: 'recebidas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Msgs Recebidas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onSave).toHaveBeenCalledWith([...SLOTS, 'msgs_received'])
    expect(onClose).toHaveBeenCalled()
  })

  it('Cancelar não grava nada', () => {
    const { onSave, onClose } = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Tirar Resolvidas da faixa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('não deixa ficar abaixo do mínimo de 4', () => {
    const quatro = SLOTS.slice(0, 4)
    montar(quatro)
    expect(screen.getByRole('button', { name: 'Tirar Resolvidas da faixa' })).toBeDisabled()
  })

  it('K13-FE/D4: não há indicador sem dado para oferecer (NPS/CSAT saíram do catálogo)', () => {
    montar()
    expect(screen.queryByRole('button', { name: /Ainda sem dado/ })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar indicador' }), { target: { value: 'NPS' } })
    expect(screen.queryByText('NPS')).toBeNull()
  })

  it('filtra o catálogo por categoria e Salvar fica desligado sem mudança', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Clínica' }))
    const lista = screen.getByTestId('kpi-disponiveis')
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Agendamentos Marcados'),
      expect.stringContaining('Cancelamentos'),
    ])
  })
})
