// A3 (SCRUM-925) — o "Novo negócio". O que estes testes protegem:
//   * o valor é o ÚNICO lugar do produto onde valor digitado e itens
//     coexistem — a escolha dos dois botões (D0-2) só aparece quando há
//     divergência de fato, e é ela que decide o `updateAmount` do POST;
//   * `amountCents` só viaja quando foi DIGITADO (um campo intocado não pode
//     zerar a soma dos itens);
//   * dono é opcional (D0-9): pré-preenchido com quem cria — e aí OMITIDO, para
//     o backend aplicar o default humano — ou `null` explícito ao ser removido;
//   * `409 open_exists` nunca vira erro cru na tela (I1).
//
// A tela passou de dois passos para uma só (09/09): funil, etapa, dono,
// previsão e valor viram FICHAS, e o bloco de dinheiro cresce na própria tela
// quando a ficha "Valor" é ligada. Os testes dirigem as fichas; os invariantes
// acima são os mesmos.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
  // Cores reais do produto (`pipeline_stages.color`): índigo nas iniciais,
  // verde no ganho. A trilha espelha o quadro, então a cor importa aqui.
  id, tenantId: 't', pipelineId: 'v', key: id, label, color: '#6366f1', order, isWon: false, isLost: false, ...extra,
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

/** Funil com quatro etapas — usado pela trilha e pelas regressões da etapa. */
const VENDAS_3: Pipeline = {
  ...VENDAS,
  stages: [
    st('v1', 'Novo', 1),
    st('v2', 'Negociando', 2),
    st('v3', 'Proposta', 3),
    st('vw', 'Ganho', 4, { isWon: true }),
  ],
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

/** Abre o bloco de valor — o convite de largura inteira na coluna esquerda. */
const abrirValor = () => fireEvent.click(screen.getByRole('button', { name: /Adicionar valor ou itens/ }))

/** A etapa passou a ser escolhida na TRILHA, não numa ficha. */
const etapaAtiva = () => screen.getByRole('button', { current: 'step' })

/** Abre uma ficha e escolhe uma opção do popover. */
const escolherNaFicha = (ficha: RegExp, opcao: RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: ficha }))
  fireEvent.click(screen.getByRole('menuitem', { name: opcao }))
}

/**
 * Digita no campo monetário. O campo é OPT-IN desde 09/09: o bloco recém-aberto
 * mostra os botões de item, e quem quer valor livre pede o campo.
 */
const digitarValor = (reais: string) => {
  const pedir = screen.queryByRole('button', { name: /Informar (valor sem itens|outro valor)/ })
  if (pedir) fireEvent.click(pedir)
  fireEvent.change(screen.getByLabelText('Valor do negócio'), { target: { value: reais } })
}

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

describe('NewDealDialog — uma tela', () => {
  // Antes o diálogo escondia os funis de processo sem dizer por quê — metade
  // dos funis do tenant sumia do seletor. Agora lista os dois, com o tipo no
  // rótulo; o caminho de 1 clique pelo "Adicionar ao funil ▾" continua existindo.
  it('lista os DOIS tipos de funil, com o tipo no rótulo', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /^Funil:/ }))
    const nomes = screen.getAllByRole('menuitem').map((o) => o.textContent).join(' ')
    expect(nomes).toContain('Vendas')
    expect(nomes).toContain('Pós-venda')
    expect(nomes).toContain('Processo ·')
  })

  it('não cria sem título e mostra o erro', () => {
    renderDialog({ contactName: null })
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    expect(screen.getByText('O título é obrigatório.')).toBeInTheDocument()
    expect(deals.create).not.toHaveBeenCalled()
  })

  it('pré-preenche o título com o nome do contato', () => {
    renderDialog()
    expect((screen.getByLabelText(/Título/) as HTMLTextAreaElement).value).toBe('Negócio · Mariana')
  })

  // O passo "Quanto" prometia dinheiro que quase nunca existe: criado do chat,
  // o negócio nasce sem valor. Agora o bloco só ocupa a tela quando é pedido.
  it('o bloco de valor só existe depois de ser pedido', () => {
    renderDialog()
    expect(screen.queryByRole('button', { name: /Adicionar do catálogo/ })).not.toBeInTheDocument()
    abrirValor()
    expect(screen.getByRole('button', { name: /Adicionar do catálogo/ })).toBeInTheDocument()
  })

  // O campo em branco no topo fazia o operador preencher na mão antes de
  // descobrir o catálogo. O caminho normal é lançar itens e ver a soma.
  it('o bloco abre nos ITENS, sem campo de valor para preencher na mão', () => {
    renderDialog()
    abrirValor()
    expect(screen.queryByLabelText('Valor do negócio')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Informar valor sem itens/ })).toBeInTheDocument()
  })

  it('com itens lançados o total aparece somado, sem virar campo', async () => {
    renderDialog()
    abrirValor()
    addItemPersonalizado('Instalação', '20000')
    expect(await screen.findByTestId('valor-total')).toHaveTextContent('R$ 200,00')
    expect(screen.queryByLabelText('Valor do negócio')).not.toBeInTheDocument()
    expect(screen.getByText(/= soma de/)).toBeInTheDocument()
  })
})

describe('NewDealDialog — valor × itens (D0-2)', () => {
  it('valor digitado sem itens: POST com amountCents e sem lineItems', async () => {
    renderDialog()
    abrirValor()
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
    abrirValor()
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
    abrirValor()
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
    abrirValor()
    digitarValor('150000')
    addItemPersonalizado('Instalação', '20000')
    fireEvent.click(screen.getByRole('button', { name: 'Vincular e atualizar valor' }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].updateAmount).toBe(true)
  })

  it('atalho "usar a soma" alinha o valor aos itens e a escolha some', async () => {
    renderDialog()
    abrirValor()
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
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0]).not.toHaveProperty('ownerUserId')
  })

  // "Sem dono" é destino legítimo, com fila própria — por isso a ficha fica
  // PREENCHIDA com o texto, e não vazia como se o campo tivesse sido esquecido.
  it('remover o dono manda ownerUserId: null (fila "sem dono")', async () => {
    renderDialog()
    await waitFor(() => expect(users.list).toHaveBeenCalled())
    escolherNaFicha(/^Dono:/, /Sem dono/)
    expect(screen.getByRole('button', { name: 'Dono: Sem dono' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(onConflict).toHaveBeenCalledWith({
      openDealId: 'd-aberto', pipelineId: 'v', contactId: 'c1', contactName: 'Mariana',
    }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// ─── Revisão da A3: a etapa da COLUNA e o tenant sem múltiplos funis ────────
describe('NewDealDialog — regressões da revisão', () => {
  it('o "+" de uma coluna cria NAQUELA etapa — não na primeira', async () => {
    renderDialog({ pipelines: [VENDAS_3], initialPipelineId: 'v', initialStageId: 'v3' })
    expect(etapaAtiva()).toHaveTextContent('Proposta')
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].stageId).toBe('v3')
  })

  it('etapa que não pertence ao funil escolhido cai na 1ª não-terminal', () => {
    renderDialog({ pipelines: [VENDAS_3], initialPipelineId: 'v', initialStageId: 'de-outro-funil' })
    expect(etapaAtiva()).toHaveTextContent('Novo')
  })

  // Tenant sem `FF_MULTI_PIPELINE`: o contexto entrega `pipelines: []`, e a aba
  // de negócios do contato só tem ESTE caminho de criação. Exigir funil ali
  // deixava o botão primário sem saída — o POST vai sem `pipelineId` e o
  // backend resolve o funil default, como o `DealModal` fazia antes da A3.
  it('sem nenhum funil conhecido, cria mesmo assim e não pede funil', async () => {
    renderDialog({ pipelines: [] })
    expect(screen.queryByRole('button', { name: /^Funil/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(screen.queryByText('Selecione um funil.')).not.toBeInTheDocument()
    const body = deals.create.mock.calls[0][0]
    expect('pipelineId' in body).toBe(false)
    expect('stageId' in body).toBe(false)
  })

  // Título e escopo respondem à mesma pergunta — "o que é isto?" — em duas
  // escalas, e agora abrem a tela juntos, sem moldura.
  it('título e escopo abrem a tela, juntos', () => {
    renderDialog()
    expect(screen.getByLabelText(/Título/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Escopo/)).toBeInTheDocument()
  })

  // O escopo (`description`) é o "o que está sendo tratado" — existe para os
  // dois tipos e ficava preso ao passo 2, que sumia em processo.
  it('escopo é enviado como `description` e existe também em processo', async () => {
    renderDialog({ pipelines: [PROCESSO] })
    fireEvent.change(screen.getByLabelText(/Escopo/), { target: { value: 'Consulta de retorno' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar registro/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Consulta de retorno' }),
    ))
  })

  it('escopo em branco não vai no payload', async () => {
    renderDialog({ pipelines: [PROCESSO] })
    fireEvent.click(screen.getByRole('button', { name: /Criar registro/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0]).not.toHaveProperty('description')
  })

  // Processo não tem valor nem itens (§4 do Modelo B): a ficha "Valor" nem é
  // oferecida — antes isso era resolvido sumindo com um passo inteiro.
  it('funil de processo: sem ficha de valor, e o substantivo é o do tipo', async () => {
    renderDialog({ pipelines: [PROCESSO] })
    expect(screen.getByRole('button', { name: /Criar registro/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Definir valor' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Criar registro/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
  })

  // A "Observação" saiu da criação (decisão do PO, 09/09): recado operacional
  // para a equipe vive na ficha do negócio, não no diálogo que o cria.
  it('a observação não existe mais na criação', () => {
    renderDialog()
    expect(screen.queryByLabelText(/Observação/)).not.toBeInTheDocument()
  })
})

// ─── A didática que a primeira versão tinha perdido ────────────────────────
// A passada de 09/09 tirou os rótulos junto com as molduras: o escopo virou um
// texto sem borda que lia como legenda ("sumiu", nas palavras do PO) e a ficha
// mostrava só o valor — "Novo" sem dizer que aquilo era a Etapa.
describe('NewDealDialog — o nome de cada coisa', () => {
  it('escopo é campo com rótulo visível, não legenda do título', () => {
    renderDialog()
    const escopo = screen.getByLabelText(/Escopo/) as HTMLTextAreaElement
    expect(escopo.tagName).toBe('TEXTAREA')
    // O rótulo é do próprio campo — clicar nele foca o campo.
    expect(escopo.id).toBeTruthy()
    expect(document.querySelector(`label[for="${escopo.id}"]`)).toBeInTheDocument()
  })

  it('cada propriedade da coluna tem nome visível e valor', () => {
    renderDialog()
    // Na coluna o nome vive no rótulo acima; a ficha carrega só o valor, senão
    // seria a mesma redundância das seções nomeadas do formulário antigo.
    expect(screen.getByText('Dono')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dono: Ana Souza' })).toBeInTheDocument()
  })

  it('o popover diz o que está sendo escolhido e o que aquilo significa', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /^Funil:/ }))
    expect(screen.getByText(/Onde este negócio vai viver/)).toBeInTheDocument()
  })

  // A trilha substituiu a ficha "Etapa": mostra o caminho inteiro, marca onde o
  // registro nasce e não deixa nascer numa etapa terminal.
  // O quadro pinta o ponto e o rótulo da coluna com `stage.color`. A faixa
  // repete a convenção — é o que a faz ler como "as colunas do meu funil" em
  // vez de um stepper genérico.
  it('a trilha usa a cor de cada etapa e se anuncia como as etapas do funil', () => {
    renderDialog({ pipelines: [{ ...VENDAS_3, stages: [
      st('v1', 'Novo', 1, { color: '#6366f1' }),
      st('v2', 'Proposta', 2, { color: '#f59e0b' }),
      st('vw', 'Ganho', 3, { isWon: true, color: '#10b981' }),
    ] }] })
    const trilha = screen.getByRole('navigation', { name: 'Etapa de entrada' })
    // O eixo é declarado: sem isso a faixa é só uma fileira de pontos.
    expect(within(trilha).getByText('Etapas')).toBeInTheDocument()
    // A etapa ativa leva a própria cor no rótulo, como no quadro.
    expect(within(trilha).getByText('Novo')).toHaveStyle({ color: '#6366f1' })
  })

  it('a trilha mostra o funil inteiro e não deixa nascer em etapa terminal', () => {
    renderDialog()
    const trilha = screen.getByRole('navigation', { name: 'Etapa de entrada' })
    expect(trilha).toHaveTextContent('Novo')
    expect(trilha).toHaveTextContent('Ganho')
    const ganho = within(trilha).getByRole('button', { name: /Ganho/ })
    expect(ganho).toBeDisabled()
  })

  // Opacidade sozinha dizia só "apagado" — tanto podia ser encerramento quanto
  // "ainda não chegou". O terminal ganhou forma própria e o fio antes dele
  // vira tracejado: é ali que o funil deixa de ser percurso.
  it('etapa terminal se distingue por forma, não só por tom', () => {
    renderDialog({ pipelines: [{ ...VENDAS_3, stages: [
      st('v1', 'Novo', 1),
      st('vw', 'Ganho', 2, { isWon: true, color: '#10b981' }),
      st('vl', 'Perdido', 3, { isLost: true, color: '#ef4444' }),
    ] }] })
    const trilha = screen.getByRole('navigation', { name: 'Etapa de entrada' })
    // O ganho leva ✓ e a perda leva ×; a etapa de percurso não leva ícone.
    expect(within(trilha).getByRole('button', { name: /Ganho/ }).querySelector('svg')).toBeTruthy()
    expect(within(trilha).getByRole('button', { name: /Perdido/ }).querySelector('svg')).toBeTruthy()
    expect(within(trilha).getByRole('button', { name: /Novo/ }).querySelector('svg')).toBeNull()
    // O fio que antecede o primeiro terminal é tracejado.
    expect(trilha.querySelectorAll('.border-dashed')).toHaveLength(1)
  })

  it('clicar numa etapa da trilha muda onde o negócio nasce', async () => {
    renderDialog({ pipelines: [VENDAS_3] })
    const trilha = screen.getByRole('navigation', { name: 'Etapa de entrada' })
    fireEvent.click(within(trilha).getByRole('button', { name: /Proposta/ }))
    expect(etapaAtiva()).toHaveTextContent('Proposta')
    fireEvent.click(screen.getByRole('button', { name: /Criar negócio/i }))
    await waitFor(() => expect(deals.create).toHaveBeenCalled())
    expect(deals.create.mock.calls[0][0].stageId).toBe('v3')
  })
})
