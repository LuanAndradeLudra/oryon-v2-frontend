import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AudienceBlock } from './AudienceBlock'
import { createCondition, createGroup, type AudienceDraft } from './segmentBuilder'

const evaluate = vi.fn()
const listSegments = vi.fn()
const countSegment = vi.fn()

vi.mock('@/services/campaignsV2Api', () => ({
  segmentsApi: {
    evaluate: (...args: unknown[]) => evaluate(...args),
    list: () => listSegments(),
    preview: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  campaignsApi: {
    countSegment: (...args: unknown[]) => countSegment(...args),
    previewSegment: vi.fn(),
  },
  tagsApi: { list: () => Promise.resolve({ data: [{ id: 't1', name: 'carrinho', color: '#fff' }] }) },
  stagesApi: { list: () => Promise.resolve({ data: [] }) },
}))

/** Erro no formato que `withFallback` reconhece como "endpoint ainda não
 *  existe" (duck-type de axios). */
function notFound() {
  return Object.assign(new Error('Not Found'), { response: { status: 404 } })
}

function draft(): AudienceDraft {
  return {
    definition: {
      groups: [createGroup([createCondition('tags', 'includes_any', ['t1'])])],
      exclude: { optOut: true },
    },
  }
}

const evaluation = {
  matched: 323,
  eligible: 184,
  excluded: { optOut: 9, recentlyCampaigned: 127, activeAi: 3 },
  perCondition: [[1412]],
  within24h: 61,
  sample: [{ id: 'c1', displayName: 'Júlia P.', waId: '5511999998888', stage: 'interessado' }],
}

describe('AudienceBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listSegments.mockResolvedValue({ data: [] })
  })

  it('mostra o público avaliado e oferece salvar segmento quando o BE.3 responde', async () => {
    evaluate.mockResolvedValue({ data: evaluation })

    render(<AudienceBlock value={draft()} onChange={vi.fn()} />)

    // O 184 aparece duas vezes de propósito: o número grande e a legenda da
    // barra empilhada. Aqui interessa o número grande.
    expect(await screen.findByText('184', { selector: '[aria-live="polite"]' })).toBeInTheDocument()
    expect(screen.getByText(/de 323 que atendem/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Usar 184/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Salvar segmento/ })).toBeInTheDocument()
    // A amostra vem do próprio evaluate, sem segunda chamada.
    expect(screen.getByText('Júlia P.')).toBeInTheDocument()
  })

  it('pinta a contagem parcial em cada linha de condição', async () => {
    // Regressão: o redutor tinha `apply_counts` e o hook trazia
    // `perCondition`, mas ninguém ligava os dois — as linhas ficavam sem
    // número, que é metade do que a rubrica pede na linha de condição.
    evaluate.mockResolvedValue({ data: { ...evaluation, perCondition: [[1412]] } })

    render(<AudienceBlock value={draft()} onChange={vi.fn()} />)

    expect(await screen.findByText('1.412')).toBeInTheDocument()
  })

  it('degrada para o motor antigo quando o evaluate ainda não existe', async () => {
    evaluate.mockRejectedValue(notFound())
    countSegment.mockResolvedValue({ data: { count: 42 } })

    render(<AudienceBlock value={draft()} onChange={vi.fn()} />)

    expect(await screen.findByText('42')).toBeInTheDocument()

    // Sem `campaign_segments` não há onde gravar, e sem grupos no motor antigo
    // não faz sentido oferecer um segundo grupo.
    expect(screen.queryByRole('button', { name: /Salvar segmento/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Incluir também outro grupo/ })).not.toBeInTheDocument()

    // Opt-out deixa de ser escolha e vira regra declarada.
    expect(screen.getByText(/Sempre aplicado/)).toBeInTheDocument()

    // O motor antigo recebeu o segmento traduzido, com opt-in imposto.
    await waitFor(() => expect(countSegment).toHaveBeenCalled())
    expect(countSegment.mock.calls[0][0]).toEqual({
      type: 'filter',
      filterTagIds: ['t1'],
      filterOptIn: true,
    })
  })

  it('avisa o pai com null, e não com zero, quando o cálculo falha', async () => {
    evaluate.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 500 } }))
    const onResolvedChange = vi.fn()

    render(<AudienceBlock value={draft()} onChange={vi.fn()} onResolvedChange={onResolvedChange} />)

    expect(await screen.findByText(/Não foi possível calcular o público/)).toBeInTheDocument()
    expect(onResolvedChange).toHaveBeenCalledWith(null)
    expect(onResolvedChange).not.toHaveBeenCalledWith(expect.objectContaining({ eligible: 0 }))
    // Público desconhecido não pode virar "Usar 0" clicável.
    expect(screen.getByRole('button', { name: /Usar 0/ })).toBeDisabled()
  })

  it('não chama a API antes de haver alguma condição montada', async () => {
    evaluate.mockResolvedValue({ data: evaluation })

    render(<AudienceBlock value={{ definition: { groups: [createGroup([])], exclude: {} } }} onChange={vi.fn()} />)

    expect(await screen.findByText(/Monte ao menos uma condição/)).toBeInTheDocument()
    expect(evaluate).not.toHaveBeenCalled()
  })
})
