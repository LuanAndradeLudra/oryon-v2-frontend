import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'
import type { KpiId } from '@/types/dashboard'

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/services/api', () => ({ api: { get, put } }))

beforeEach(() => { get.mockResolvedValue({ data: {} }) })
afterEach(() => { cleanup(); get.mockReset(); put.mockReset() })

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
    expect(onSave).toHaveBeenCalledWith({ slots: [...SLOTS, 'msgs_received'], densidade: 'compacta', destaque: [] })
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

describe('DC-5/DC-6 — densidade, destaque e metas', () => {
  it('densidade e até 2 em destaque vão no Salvar', () => {
    get.mockResolvedValue({ data: {} })
    const { onSave } = montar()
    fireEvent.click(screen.getByRole('radio', { name: /Detalhada/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Destacar Resolvidas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Destacar Em Fila' }))
    // O terceiro não entra: até 2.
    expect(screen.getByRole('button', { name: 'Destacar Conversas Ativas' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onSave).toHaveBeenCalledWith({ slots: SLOTS, densidade: 'detalhada', destaque: ['resolved', 'queued'] })
  })

  it('tirar da faixa tira do destaque', () => {
    get.mockResolvedValue({ data: {} })
    const onSave = vi.fn()
    render(<KpiCustomizerDrawer open onClose={() => undefined} slots={SLOTS} defaults={SLOTS} destaque={['resolved']} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tirar Resolvidas da faixa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ destaque: [] }))
  })

  it('administrador muda as metas: só o que mudou vai no PUT, vazio apaga', async () => {
    get.mockResolvedValue({ data: { taxaResolucao: 70, tempoRespostaMin: 5 } })
    put.mockResolvedValue({ data: {} })
    const onSave = vi.fn()
    const onMetasSalvas = vi.fn()
    render(<KpiCustomizerDrawer open onClose={() => undefined} slots={SLOTS} defaults={SLOTS} onSave={onSave} podeEditarMetas onMetasSalvas={onMetasSalvas} />)
    const taxa = await screen.findByLabelText('Taxa de resolução de pelo menos')
    expect(taxa).toHaveValue('70')
    fireEvent.change(taxa, { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Entrega dos disparos de pelo menos'), { target: { value: '92,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/home/goals', { taxaResolucao: null, taxaEntrega: 92.5 }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onMetasSalvas).toHaveBeenCalled()
  })

  it('"1.440" é mil quatrocentos e quarenta, não 1,44', async () => {
    get.mockResolvedValue({ data: {} })
    put.mockResolvedValue({ data: {} })
    render(<KpiCustomizerDrawer open onClose={() => undefined} slots={SLOTS} defaults={SLOTS} onSave={vi.fn()} podeEditarMetas />)
    fireEvent.change(await screen.findByLabelText('Tempo de resposta (mediana) até'), { target: { value: '1.440' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith('/home/goals', { tempoRespostaMin: 1440 }))
  })

  it('meta fora do intervalo trava o Salvar e diz o limite', async () => {
    get.mockResolvedValue({ data: {} })
    render(<KpiCustomizerDrawer open onClose={() => undefined} slots={SLOTS} defaults={SLOTS} onSave={vi.fn()} podeEditarMetas />)
    fireEvent.change(await screen.findByLabelText('Taxa de resolução de pelo menos'), { target: { value: '120' } })
    expect(screen.getByText('Entre 1 e 100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('falha ao salvar as metas: avisa e não fecha', async () => {
    get.mockResolvedValue({ data: {} })
    put.mockRejectedValue(new Error('403'))
    const onClose = vi.fn()
    const onSave = vi.fn()
    render(<KpiCustomizerDrawer open onClose={onClose} slots={SLOTS} defaults={SLOTS} onSave={onSave} podeEditarMetas />)
    fireEvent.change(await screen.findByLabelText('Taxa de resolução de pelo menos'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar as metas')
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('quem não é administrador só lê as metas', async () => {
    get.mockResolvedValue({ data: { taxaResolucao: 70 } })
    render(<KpiCustomizerDrawer open onClose={() => undefined} slots={SLOTS} defaults={SLOTS} onSave={vi.fn()} />)
    const lista = await screen.findByTestId('kpi-metas')
    expect(within(lista).queryAllByRole('textbox')).toHaveLength(0)
    expect(lista).toHaveTextContent('70 %')
    expect(lista).toHaveTextContent('sem meta')
  })
})
