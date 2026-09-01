// A3 (SCRUM-925) — o "Novo negócio" em 2 passos. O que estes testes protegem:
//   * o passo 2 é o ÚNICO lugar do produto onde valor digitado e itens
//     coexistem — a escolha dos dois botões (D0-2) só aparece quando há
//     divergência de fato, e é ela que decide o `updateAmount` do POST;
//   * `amountCents` só viaja quando foi DIGITADO (um campo intocado não pode
//     zerar a soma dos itens);
//   * dono é opcional (D0-9): pré-preenchido com quem cria — e aí OMITIDO, para
//     o backend aplicar o default humano — ou `null` explícito ao ser removido;
//   * `409 open_exists` nunca vira erro cru na tela (I1).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Deal, Pipeline, PipelineStage, Product, User } from '@/types'

const PRODUTO: Product = {
  id: 'prod-1',
  name: 'Plano Essencial',
  active: true,
  order: 0,
  priceVariations: [{ id: 'v1', label: 'Particular', amountCents: 10000, order: 0 }],
}

const EU: User = {
  id: 'u1', tenantId: 't', email: 'eu@oryon.com', firstName: 'Ana', lastName: 'Souza',
  role: 'agent', isActive: true,
}

const { deals, contacts, users, mobile } = vi.hoisted(() => ({
  deals: { create: vi.fn() },
  contacts: { list: vi.fn() },
  users: { list: vi.fn() },
  mobile: vi.fn(() => false),
}))
vi.mock('@/services/api', () => ({ dealsApi: deals, contactsApi: contacts, usersApi: users }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => mobile() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: EU }) }))
vi.mock('@/contexts/TenantVocabContext', () => ({
  useTenantVocab: () => ({ vocab: { deal: 'Negócio', deals: 'Negócios' } }),
}))
vi.mock('@/contexts/CRMConfigContext', () => ({
  useCRMConfig: () => ({ products: [PRODUTO], pipelines: [], stages: [] }),
}))

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
  stages: [st('p1', 'Novo', 1)],
}

const CRIADO = { data: { id: 'd9' } as Deal }

import { NewDealDialog } from './NewDealDialog'

const renderDialog = (props: Partial<React.ComponentProps<typeof NewDealDialog>> = {}) =>
  render(
    <NewDealDialog
      open
      onClose={vi.fn()}
      contactId="c1"
      contactName="Mariana"
      pipelines={[VENDAS, PROCESSO]}
      onCreated={vi.fn()}
      {...props}
    />,
  )

/** Passo 1 → passo 2 com os defaults (contato pronto, funil de venda). */
const avancar = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

/** Digita no campo monetário (acumulador: só dígitos contam). */
const digitarValor = (reais: string) =>
  fireEvent.change(screen.getByLabelText('Valor do negócio'), { target: { value: reais } })

const addItemPersonalizado = (nome: string, precoDigitos: string) => {
  fireEvent.click(screen.getByRole('button', { name: /Adicionar personalizado/ }))
  fireEvent.change(screen.getByLabelText('Nome do item personalizado'), { target: { value: nome } })
  fireEvent.change(screen.getByLabelText('Preço unitário'), { target: { value: precoDigitos } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mobile.mockReturnValue(false)
  deals.create.mockResolvedValue(CRIADO)
  users.list.mockResolvedValue({ data: [EU] })
  contacts.list.mockResolvedValue({ data: { data: [] } })
})

describe('NewDealDialog — 2 passos', () => {
  it('só mostra funis de VENDA (processo continua no "Adicionar ao funil" de 1 clique)', () => {
    renderDialog()
    const funil = screen.getByLabelText(/Funil/) as HTMLSelectElement
    const nomes = Array.from(funil.options).map((o) => o.textContent)
    expect(nomes.join(' ')).toContain('Vendas')
    expect(nomes.join(' ')).not.toContain('Pós-venda')
  })

  it('não avança sem título e mostra o erro no campo', () => {
    renderDialog({ contactName: null })
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: '   ' } })
    avancar()
    expect(screen.getByText('O título é obrigatório.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Valor do negócio')).not.toBeInTheDocument()
  })

  it('pré-preenche o título com o nome do contato e avança para "Quanto"', () => {
    renderDialog()
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe('Negócio · Mariana')
    avancar()
    expect(screen.getByLabelText('Valor do negócio')).toBeInTheDocument()
  })
})

describe('NewDealDialog — valor × itens (D0-2)', () => {
  it('valor digitado sem itens: POST com amountCents e sem lineItems', async () => {
    renderDialog()
    avancar()
    digitarValor('150000')
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    const body = deals.create.mock.calls[0][0]
    expect(body.amountCents).toBe(150000)
    expect(body).not.toHaveProperty('lineItems')
    expect(body).not.toHaveProperty('updateAmount')
  })

  it('campo de valor intocado não viaja no POST (não pode zerar a soma dos itens)', async () => {
    renderDialog()
    avancar()
    addItemPersonalizado('Instalação', '20000')
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    const body = deals.create.mock.calls[0][0]
    expect(body).not.toHaveProperty('amountCents')
    expect(body.lineItems).toHaveLength(1)
    // Sem divergência não há escolha a fazer — `updateAmount` fica fora.
    expect(body).not.toHaveProperty('updateAmount')
  })

  it('valor divergente da soma: aparecem os dois botões, e "Vincular" preserva o valor', async () => {
    renderDialog()
    avancar()
    digitarValor('150000')
    addItemPersonalizado('Instalação', '20000')
    expect(screen.queryByRole('button', { name: /Criar negócio/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    const body = deals.create.mock.calls[0][0]
    expect(body.amountCents).toBe(150000)
    expect(body.updateAmount).toBe(false)
  })

  it('"Vincular e atualizar valor" manda updateAmount: true', async () => {
    renderDialog()
    avancar()
    digitarValor('150000')
    addItemPersonalizado('Instalação', '20000')
    fireEvent.click(screen.getByRole('button', { name: 'Vincular e atualizar valor' }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].updateAmount).toBe(true)
  })

  it('atalho "usar a soma" alinha o valor aos itens e a escolha some', async () => {
    renderDialog()
    avancar()
    digitarValor('150000')
    addItemPersonalizado('Instalação', '20000')
    fireEvent.click(screen.getByRole('button', { name: /Usar a soma dos itens/ }))
    expect(screen.queryByRole('button', { name: 'Vincular' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].amountCents).toBe(20000)
  })
})

describe('NewDealDialog — dono opcional (D0-9)', () => {
  it('dono pré-preenchido com quem cria é OMITIDO (o default humano é do backend)', async () => {
    renderDialog()
    await waitFor(() => expect(users.list).toHaveBeenCalled())
    avancar()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0]).not.toHaveProperty('ownerUserId')
  })

  it('remover o dono manda ownerUserId: null (fila "sem dono")', async () => {
    renderDialog()
    await waitFor(() => expect(users.list).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText(/Dono/), { target: { value: '' } })
    avancar()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].ownerUserId).toBeNull()
  })
})

describe('NewDealDialog — conflito I1', () => {
  it('409 open_exists sobe para o chamador e não vira erro cru', async () => {
    deals.create.mockRejectedValue({
      response: { status: 409, data: { code: 'open_exists', openDealId: 'd-aberto', pipelineId: 'v' } },
    })
    const onConflict = vi.fn()
    renderDialog({ onConflict })
    avancar()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(onConflict).toHaveBeenCalledWith({
      openDealId: 'd-aberto', pipelineId: 'v', contactId: 'c1', contactName: 'Mariana',
    }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// ─── Revisão da A3: a etapa da COLUNA e o tenant sem múltiplos funis ────────
describe('NewDealDialog — regressões da revisão', () => {
  const VENDAS_3: Pipeline = {
    ...VENDAS,
    stages: [
      st('v1', 'Novo', 1),
      st('v2', 'Negociando', 2),
      st('v3', 'Proposta', 3),
      st('vw', 'Ganho', 4, { isWon: true }),
    ],
  }

  it('o "+" de uma coluna cria NAQUELA etapa — não na primeira', async () => {
    renderDialog({ pipelines: [VENDAS_3], initialPipelineId: 'v', initialStageId: 'v3' })
    expect((screen.getByLabelText(/Etapa/) as HTMLSelectElement).value).toBe('v3')
    avancar()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].stageId).toBe('v3')
  })

  it('etapa que não pertence ao funil escolhido cai na 1ª não-terminal', async () => {
    renderDialog({ pipelines: [VENDAS_3], initialPipelineId: 'v', initialStageId: 'de-outro-funil' })
    expect((screen.getByLabelText(/Etapa/) as HTMLSelectElement).value).toBe('v1')
  })

  // Tenant sem `FF_MULTI_PIPELINE`: o contexto entrega `pipelines: []`, e a aba
  // de negócios do contato só tem ESTE caminho de criação. Exigir funil ali
  // deixava o botão primário sem saída — o POST vai sem `pipelineId` e o
  // backend resolve o funil default, como o `DealModal` fazia antes da A3.
  it('sem nenhum funil conhecido, cria mesmo assim e não pede funil', async () => {
    renderDialog({ pipelines: [] })
    expect(screen.queryByLabelText(/Funil/)).not.toBeInTheDocument()
    avancar()
    expect(screen.queryByText('Selecione um funil.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    const body = deals.create.mock.calls[0][0]
    expect('pipelineId' in body).toBe(false)
    expect('stageId' in body).toBe(false)
  })

  it('com funis, mas nenhum de venda, continua barrando (não há onde criar)', () => {
    renderDialog({ pipelines: [PROCESSO] })
    avancar()
    expect(screen.getByText('Selecione um funil.')).toBeInTheDocument()
    expect(deals.create).not.toHaveBeenCalled()
  })
})
