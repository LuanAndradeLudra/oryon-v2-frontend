// B5 (SCRUM-931, D0-7) — probabilidade default por etapa: só oferecida em
// funil de vendas (showProbability) e nunca em etapa terminal (Ganho/Perdido
// são 100/0 fixos na leitura — o formulário nem pergunta).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PipelineStageModal } from './PipelineStageModal'
import type { PipelineStage } from '@/types'

const STAGE: PipelineStage = {
  id: 's1', tenantId: 't', pipelineId: 'p1', key: 'proposta', label: 'Proposta',
  color: '#6366f1', order: 1, isWon: false, isLost: false, probability: 40,
}

type SaveData = { label: string; color: string; isWon: boolean; isLost: boolean; probability?: number | null }
const mockOnSave = () => vi.fn<(d: SaveData) => Promise<void>>(async () => {})

describe('PipelineStageModal — probabilidade (D0-7)', () => {
  it('não mostra o campo quando showProbability é false', () => {
    render(<PipelineStageModal open onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.queryByLabelText(/Probabilidade/)).toBeNull()
  })

  it('mostra e pré-preenche o campo ao editar uma etapa normal de funil de vendas', () => {
    render(<PipelineStageModal open onClose={vi.fn()} onSave={vi.fn()} editStage={STAGE} showProbability />)
    expect(screen.getByLabelText(/Probabilidade/)).toHaveValue(40)
  })

  it('esconde o campo para etapa terminal mesmo com showProbability — terminais são 100/0 fixos', () => {
    const won = { ...STAGE, isWon: true, probability: null }
    render(<PipelineStageModal open onClose={vi.fn()} onSave={vi.fn()} editStage={won} showProbability />)
    expect(screen.queryByLabelText(/Probabilidade/)).toBeNull()
  })

  it('envia probability=null quando o campo é deixado em branco (limpa o override)', async () => {
    const onSave = mockOnSave()
    render(<PipelineStageModal open onClose={vi.fn()} onSave={onSave} editStage={STAGE} showProbability />)
    fireEvent.change(screen.getByLabelText(/Probabilidade/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({ probability: null })
  })

  it('envia o número digitado', async () => {
    const onSave = mockOnSave()
    render(<PipelineStageModal open onClose={vi.fn()} onSave={onSave} editStage={STAGE} showProbability />)
    fireEvent.change(screen.getByLabelText(/Probabilidade/), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({ probability: 75 })
  })

  it('rejeita um valor fora de 0-100 com mensagem inline, sem chamar onSave', async () => {
    const onSave = mockOnSave()
    render(<PipelineStageModal open onClose={vi.fn()} onSave={onSave} editStage={STAGE} showProbability />)
    fireEvent.change(screen.getByLabelText(/Probabilidade/), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))
    expect(await screen.findByText(/entre 0 e 100/)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('não manda probability na criação/edição de um funil sem showProbability (processo)', async () => {
    const onSave = mockOnSave()
    render(<PipelineStageModal open onClose={vi.fn()} onSave={onSave} editStage={STAGE} />)
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('probability')
  })
})
