// Revisão da A1 (SCRUM-153) — o contrato do salvar com o backend:
// `lineItems` NUNCA é neutro no payload. Em funil de processo o PATCH com a
// chave (mesmo `[]`) responde 400; com a chave e sem `updateAmount`, o backend
// recalcula amountCents = Σ itens e zera o valor digitado à mão (A2/D4). Então
// a chave só viaja quando há composição de verdade a gravar — e o erro que o
// backend devolver aparece na tela, não só num setError invisível.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Product } from '@/types'

const PRODUTO: Product = {
  id: 'prod-1',
  name: 'Plano Essencial',
  active: true,
  order: 0,
  priceVariations: [{ id: 'v1', label: 'Particular', amountCents: 10000, order: 0 }],
}

const { api, contacts, multi } = vi.hoisted(() => ({
  api: { update: vi.fn(), create: vi.fn(), movePipeline: vi.fn() },
  contacts: { get: vi.fn() },
  multi: vi.fn(() => false),
}))
vi.mock('@/services/api', () => ({ dealsApi: api, contactsApi: contacts }))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multi() }))
vi.mock('@/contexts/TenantVocabContext', () => ({
  useTenantVocab: () => ({ vocab: { deal: 'Negócio', deals: 'Negócios' } }),
}))
vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ products: [PRODUTO], pipelines: [], stages: [] }),
}))

import type { Deal, Pipeline, PipelineStage } from '@/types'
const st = (id: string, label: string, order: number, extra: Partial<PipelineStage> = {}): PipelineStage => ({
  id, tenantId: 't', pipelineId: 'v', key: id, label, color: '#111', order, isWon: false, isLost: false, ...extra,
})
const VENDAS: Pipeline = {
  id: 'v', tenantId: 't', name: 'Vendas', color: '#14b8a6', order: 0, isDefault: true, isArchived: false,
  kind: 'sales', terminalLabels: { won: 'Ganho', lost: 'Perdido' }, openDealsCount: 0,
  stages: [st('v1', 'Novo', 1), st('v2', 'Ganho', 2, { isWon: true })],
}
const PROCESSO: Pipeline = {
  ...VENDAS, id: 'p', name: 'Pós-venda', isDefault: false, kind: 'process',
  terminalLabels: { won: 'Concluído', lost: 'Cancelado' },
  stages: [st('p1', 'Novo', 1), st('p2', 'Concluído', 2, { isWon: true })],
}

const ITEM_CATALOGO = {
  id: 'li1', kind: 'catalog' as const, productId: 'prod-1', productName: 'Plano Essencial',
  variationLabel: 'Particular', unitPriceCents: 10000, quantity: 2, discountCents: 0, order: 0,
}
const DEAL_VENDA: Deal = {
  id: 'd1', contactId: 'c1', title: 'Plano Anual', status: 'open', pipelineId: 'v', stageId: 'v1',
  amountCents: 150000, lineItems: [ITEM_CATALOGO],
}
const DEAL_PROCESSO: Deal = {
  id: 'd2', contactId: 'c1', title: 'Mariana', status: 'open', pipelineId: 'p', stageId: 'p1', amountCents: 0,
}

import { DealModal } from './DealModal'

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset())
  contacts.get.mockReset()
  multi.mockReturnValue(false)
  api.update.mockResolvedValue({ data: {} })
  api.create.mockResolvedValue({ data: {} })
})

const renderModal = (props: Partial<Parameters<typeof DealModal>[0]> = {}) =>
  render(
    <DealModal
      open
      contactId="c1"
      pipelines={[VENDAS, PROCESSO]}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      {...props}
    />,
  )

const tituloInput = () => screen.getByPlaceholderText('Ex: Proposta — Plano Anual')
const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

describe('DealModal — payload do salvar (#1 da revisão)', () => {
  it('editar só o título em funil de PROCESSO: PATCH SEM `lineItems` (o backend responderia 400)', async () => {
    renderModal({ editDeal: DEAL_PROCESSO })
    fireEvent.change(tituloInput(), { target: { value: 'Mariana — retorno' } })
    salvar()
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect(payload.title).toBe('Mariana — retorno')
    expect('lineItems' in payload).toBe(false)
    expect('updateAmount' in payload).toBe(false)
  })

  it('editar o título SEM mexer nos itens: PATCH sem `lineItems` — o valor digitado não é zerado', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(tituloInput(), { target: { value: 'Plano Anual — revisado' } })
    salvar()
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect('lineItems' in payload).toBe(false)
    expect('updateAmount' in payload).toBe(false)
  })

  it('com item ALTERADO e valor do banco já divergente da soma: sem "Salvar" — exige "Vincular e atualizar valor" (SCRUM-965)', async () => {
    // DEAL_VENDA chega com amountCents=150000 e um item que soma 20000 — já
    // diverge da abertura do modal, sem o operador tocar no campo Valor. Até
    // a SCRUM-965 o "Salvar" sobrescrevia isso em silêncio (bug); agora o
    // modal exige a escolha explícita, igual ao caso em que o operador digita
    // o valor.
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '3' } })
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Vincular e atualizar valor' }))
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect(payload.updateAmount).toBe(true)
    expect(payload.lineItems).toEqual([expect.objectContaining({ id: 'li1', quantity: 3 })])
    expect('amountCents' in payload).toBe(false)
  })

  it('com item ALTERADO e valor do banco já divergente: "Vincular" preserva o valor do banco sem reenviá-lo (SCRUM-965)', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }))
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect(payload.updateAmount).toBe(false)
    expect(payload.lineItems).toEqual([expect.objectContaining({ id: 'li1', quantity: 3 })])
    // O valor exibido (150000) já é o do banco — não precisa viajar de volta,
    // `updateAmount:false` já basta pro backend não recalculá-lo dos itens.
    expect('amountCents' in payload).toBe(false)
  })

  it('criar negócio novo com itens (sem editDeal, sem tocar no Valor): sem diálogo — "Criar" direto (SCRUM-965)', async () => {
    // Sem `editDeal` não há valor estabelecido a proteger, e sem tocar no
    // campo Valor os dois botões seriam idênticos (amountCents nunca viaja
    // no create quando `amountTouched` é false) — o diálogo seria só ruído.
    renderModal({ initialPipelineId: 'v' })
    fireEvent.change(tituloInput(), { target: { value: 'Proposta nova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar personalizado' }))
    fireEvent.change(screen.getByLabelText('Nome do item personalizado'), { target: { value: 'Instalação' } })
    fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: '5000' } })
    expect(screen.queryByRole('button', { name: 'Vincular' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect('amountCents' in api.create.mock.calls[0][0]).toBe(false)
  })

  it('criar em funil de PROCESSO: POST sem a chave `lineItems` (omitida, não `[]`)', async () => {
    renderModal({ initialPipelineId: 'p', contactName: 'Mariana' })
    fireEvent.change(tituloInput(), { target: { value: 'Mariana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect('lineItems' in api.create.mock.calls[0][0]).toBe(false)
  })

  it('criar em funil de VENDA envia `lineItems` normalmente', async () => {
    renderModal({ initialPipelineId: 'v' })
    fireEvent.change(tituloInput(), { target: { value: 'Proposta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }))
    await waitFor(() => expect(api.create).toHaveBeenCalled())
    expect(api.create.mock.calls[0][0].lineItems).toEqual([])
  })
})

describe('DealModal — erro genérico visível (#1 da revisão)', () => {
  it('erro do backend sem campo próprio aparece no bloco com role=alert', async () => {
    api.update.mockRejectedValue({
      response: { data: { message: 'Registros de processo não têm itens.' } },
    })
    renderModal({ editDeal: DEAL_VENDA })
    salvar()
    const alert = await screen.findByTestId('deal-modal-error')
    expect(alert).toHaveTextContent('Registros de processo não têm itens.')
    expect(alert).toHaveAttribute('role', 'alert')
  })

  it('erro com campo próprio (título) NÃO duplica no bloco genérico', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(tituloInput(), { target: { value: '' } })
    salvar()
    await waitFor(() => expect(screen.getAllByText('O título é obrigatório.')).toHaveLength(1))
    expect(screen.queryByTestId('deal-modal-error')).toBeNull()
    expect(api.update).not.toHaveBeenCalled()
  })
})

describe('DealModal — editor de itens fora do FormField (#3 da revisão)', () => {
  it('cada linha mantém ids próprios e o campo Qtd tem nome acessível', () => {
    const doisItens: Deal = {
      ...DEAL_VENDA,
      lineItems: [
        ITEM_CATALOGO,
        { id: 'li2', kind: 'custom', productId: null, productName: 'Instalação', variationLabel: null, unitPriceCents: 5000, quantity: 1, discountCents: 0, order: 1 },
      ],
    }
    renderModal({ editDeal: doisItens })
    // O rótulo "Itens" continua na tela (agora manual, sem FormField).
    expect(screen.getByText('Itens')).toBeInTheDocument()
    // Uma Qtd nomeada por linha — antes o contexto do FormField dava o MESMO
    // id a todos os campos e o htmlFor de cada rótulo quebrava.
    expect(screen.getAllByLabelText('Qtd')).toHaveLength(2)
    const ids = Array.from(document.querySelectorAll('input, select'))
      .map((el) => el.id)
      .filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─── A3 (SCRUM-925, subtarefa 956) — o valor virou campo editável aqui ──────
// Antes o total era só consequência dos itens: um negócio de valor livre (sem
// itens) não tinha onde ser corrigido depois de criado.
const valorInput = () => screen.getByLabelText('Valor do negócio')

describe('DealModal — campo Valor (A3/956)', () => {
  it('funil de PROCESSO não tem campo de valor', () => {
    renderModal({ editDeal: DEAL_PROCESSO })
    expect(screen.queryByLabelText('Valor do negócio')).toBeNull()
  })

  it('abre com o valor do negócio e, sem tocar nele, o PATCH não o envia', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    expect((valorInput() as HTMLInputElement).value).toContain('1.500,00')
    fireEvent.change(tituloInput(), { target: { value: 'Plano Anual — revisado' } })
    salvar()
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    expect('amountCents' in api.update.mock.calls[0][1]).toBe(false)
  })

  it('editar SÓ o valor: PATCH com amountCents e sem lineItems (valor livre, D4)', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(valorInput(), { target: { value: '200000' } })
    salvar()
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect(payload.amountCents).toBe(200000)
    expect('lineItems' in payload).toBe(false)
  })

  it('valor divergente + itens alterados: dois botões, e "Vincular" preserva o valor', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '3' } })
    fireEvent.change(valorInput(), { target: { value: '200000' } })
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }))
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect(payload.updateAmount).toBe(false)
    expect(payload.amountCents).toBe(200000)
    expect(payload.lineItems).toHaveLength(1)
  })

  it('"Vincular e atualizar valor": updateAmount true e sem amountCents no corpo', async () => {
    renderModal({ editDeal: DEAL_VENDA })
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '3' } })
    fireEvent.change(valorInput(), { target: { value: '200000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Vincular e atualizar valor' }))
    await waitFor(() => expect(api.update).toHaveBeenCalled())
    const payload = api.update.mock.calls[0][1]
    expect(payload.updateAmount).toBe(true)
    expect('amountCents' in payload).toBe(false)
  })
})
