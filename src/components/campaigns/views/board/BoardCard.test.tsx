// O que este arquivo cobre é sobretudo o que o quadro NÃO mostra: sem BE.2 o
// botão de pausar some, sem motivo de falha o cartão não inventa um, e sem
// envio as porcentagens não viram 0%. O resto do mockup que não tem dado está
// listado em coord/D1b-plano.md §5.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BoardCard } from './BoardCard'
import type { CampaignLifecycle } from '../agenda/useCampaignLifecycle'
import type { Campaign } from '@/types'

const agora = new Date(2026, 8, 3, 18, 31)

function stats(over: Partial<Campaign['stats']> = {}): Campaign['stats'] {
  return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, ...over }
}

function campaign(over: Partial<Campaign> & { id: string }): Campaign {
  return {
    tenantId: 't1',
    name: 'Lançamento coleção inverno',
    templateId: 'tpl-1',
    templateName: 'novo_lancamento_v2',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'scheduled',
    stats: stats(),
    createdByUserId: 'u1',
    createdAt: new Date(2026, 7, 31).toISOString(),
    ...over,
  } as Campaign
}

// `can` por AÇÃO: um stub que responde igual para as três não vê QUAL
// capacidade cada cartão consulta.
const lifecycle = (
  disponiveis: boolean | ReadonlyArray<'pause' | 'resume' | 'cancel'>,
): CampaignLifecycle => ({
  can: (a) => (typeof disponiveis === 'boolean' ? disponiveis : disponiveis.includes(a)),
  busy: null,
  run: vi.fn().mockResolvedValue(null),
})

function renderCard(c: Campaign, opts: {
  available?: boolean | ReadonlyArray<'pause' | 'resume' | 'cancel'>
  perSecond?: number
  showChip?: boolean
  authorName?: string
  lineName?: string
  onRequestCancel?: (c: Campaign) => void
} = {}) {
  return render(
    <MemoryRouter>
      <BoardCard
        campaign={c}
        now={agora}
        rate={opts.perSecond === undefined ? undefined : { perSecond: opts.perSecond }}
        lifecycle={lifecycle(opts.available ?? true)}
        authorName={opts.authorName}
        lineName={opts.lineName}
        showChip={opts.showChip}
        onSendNow={vi.fn()}
        onRequestCancel={opts.onRequestCancel ?? vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('BoardCard · rascunho', () => {
  const rascunho = campaign({ id: 'd', status: 'draft', templateId: '', segment: undefined as unknown as Campaign['segment'] })

  it('diz o que falta, não quanto falta em porcentagem', () => {
    renderCard(rascunho, { authorName: 'Ana R.' })
    expect(screen.getByText('Falta:')).toBeInTheDocument()
    expect(screen.getByText('template')).toBeInTheDocument()
    expect(screen.getByText('público')).toBeInTheDocument()
    expect(screen.getByText('horário')).toBeInTheDocument()
  })

  it('põe o autor e a data de criação no rodapé', () => {
    renderCard(rascunho, { authorName: 'Ana R.' })
    expect(screen.getByText(/Ana R\. · seg 31 · 00:00/)).toBeInTheDocument()
  })

  // Sem `usersApi`, o rodapé fica só com a data: um id cru ou um "—" ocupam o
  // espaço de algo que informaria.
  it('sem nome resolvido, o rodapé fica só com a data', () => {
    renderCard(rascunho)
    expect(screen.getByText('seg 31 · 00:00')).toBeInTheDocument()
  })

  it('leva ao Composer, e não oferece enviar o que ainda não está pronto', () => {
    renderCard(rascunho)
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar agora/ })).not.toBeInTheDocument()
  })
})

describe('BoardCard · agendada', () => {
  const agendada = campaign({ id: 's', status: 'scheduled', scheduledAt: new Date(2026, 8, 3, 20, 30).toISOString() })

  // Na Agenda o relógio vinha do trilho; aqui ele tem que estar no cartão.
  it('carrega o próprio relógio, com a contagem regressiva ao lado', () => {
    renderCard(agendada)
    expect(screen.getAllByText('hoje · 20:30').length).toBeGreaterThan(0)
    expect(screen.getByText('em 1h 59')).toBeInTheDocument()
  })

  it('não mostra contagem de público — seriam centenas de chamadas', () => {
    renderCard(agendada)
    expect(screen.queryByText(/contatos/i)).not.toBeInTheDocument()
  })
})

describe('BoardCard · enviando e pausada', () => {
  const enviando = campaign({
    id: 'g', status: 'sending',
    stats: stats({ total: 1240, sent: 640, delivered: 626, read: 198 }),
  })

  it('mostra progresso, taxa medida e as duas porcentagens', () => {
    renderCard(enviando, { perSecond: 3.2 })
    expect(screen.getByText('640 / 1.240')).toBeInTheDocument()
    expect(screen.getByText('3,2 msg/s')).toBeInTheDocument()
    expect(screen.getByText('97,8%')).toBeInTheDocument()
    expect(screen.getByText('30,9%')).toBeInTheDocument()
  })

  // A regra do #136 vale igual nas duas telas — é por isso que `formatRate`
  // saiu de dentro do EventCard.
  it('uma fila lenta lê "< 0,1", nunca "0,0"', () => {
    renderCard(enviando, { perSecond: 0.0167 })
    expect(screen.getByText('< 0,1 msg/s')).toBeInTheDocument()
  })

  it('sem envio, as porcentagens somem em vez de virar 0%', () => {
    renderCard(campaign({ id: 'g0', status: 'sending', stats: stats({ total: 100 }) }))
    expect(screen.queryByText(/Entregues/)).not.toBeInTheDocument()
  })

  it('pausada diz que a fila parou e oferece retomar', () => {
    renderCard(campaign({ id: 'p', status: 'paused', stats: stats({ total: 100, sent: 40 }) }))
    expect(screen.getByText('fila parada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retomar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pausar/ })).not.toBeInTheDocument()
  })

  // Sem BE.2 o botão some: um controle que erra 404 é pior que um ausente.
  it('sem a BE.2, nem Pausar nem Retomar aparecem', () => {
    renderCard(enviando, { available: false })
    expect(screen.queryByRole('button', { name: /Pausar/ })).not.toBeInTheDocument()
  })

  // No backend do 992, `pause` existe (`campaigns.controller.ts:143`) e
  // `resume` não (`:150`). Cada cartão pergunta pela SUA capacidade: sem isso,
  // a ausência de uma rota esconderia o botão da outra, que está no ar.
  it('sem a rota de retomar, a pausada não oferece Retomar', () => {
    renderCard(campaign({ id: 'p2', status: 'paused', stats: stats({ total: 100, sent: 40 }) }),
      { available: ['pause', 'cancel'] })
    expect(screen.queryByRole('button', { name: /Retomar/ })).not.toBeInTheDocument()
  })

  // O beco que o Nível achou: o aviso do Pausar promete que a pausada "só pode
  // ser cancelada", a pessoa pausa NO QUADRO, e o cartão ficava sem ação
  // nenhuma. Sem caminho para a frente, a ação vira a SAÍDA.
  it('e oferece a SAÍDA no lugar: a pausada pode ser cancelada aqui', () => {
    const pedido = vi.fn()
    const pausada = campaign({ id: 'p3', status: 'paused', stats: stats({ total: 100, sent: 40 }) })
    renderCard(pausada, { available: ['pause', 'cancel'], onRequestCancel: pedido })

    const botao = screen.getByRole('button', { name: /Cancelar/ })
    fireEvent.click(botao)
    expect(pedido).toHaveBeenCalledWith(pausada)
  })

  it('com a rota de retomar no ar, a ação volta a ser seguir em frente', () => {
    renderCard(campaign({ id: 'p4', status: 'paused', stats: stats({ total: 100, sent: 40 }) }),
      { available: ['pause', 'resume', 'cancel'] })
    expect(screen.getByRole('button', { name: /Retomar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument()
  })

  // Sem NENHUMA das rotas não há saída a oferecer — e um botão que erra 404 é
  // pior que um ausente.
  it('sem BE.2 nenhuma, a pausada não promete saída que não existe', () => {
    renderCard(campaign({ id: 'p5', status: 'paused', stats: stats({ total: 100, sent: 40 }) }),
      { available: [] })
    expect(screen.queryByRole('button', { name: /Cancelar|Retomar/ })).not.toBeInTheDocument()
  })

  it('e a que está enviando continua com Pausar ao lado dela', () => {
    renderCard(enviando, { available: ['pause', 'cancel'] })
    expect(screen.getByRole('button', { name: /Pausar/ })).toBeInTheDocument()
  })

  // O preço, dito antes do clique — mesma frase da Agenda, mesma constante.
  it('e o Pausar carrega a consequência de não haver volta', () => {
    renderCard(enviando, { available: ['pause', 'cancel'] })
    expect(screen.getByRole('button', { name: /Pausar/ }))
      .toHaveAttribute('title', expect.stringContaining('só pode ser cancelado'))
  })

  it('com a rota de retomar no ar, o aviso some sozinho', () => {
    renderCard(enviando, { available: ['pause', 'resume', 'cancel'] })
    expect(screen.getByRole('button', { name: /Pausar/ })).not.toHaveAttribute('title')
  })
})

describe('BoardCard · enviada, falhou e cancelada', () => {
  it('a enviada resume o funil e leva ao relatório', () => {
    renderCard(campaign({
      id: 'e', status: 'sent', sentAt: new Date(2026, 8, 3, 9, 14).toISOString(),
      stats: stats({ total: 84, sent: 84, delivered: 82, read: 71, replied: 22 }),
    }))
    expect(screen.getByText('71 lidas · 22 resp.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Relatório/ })).toBeInTheDocument()
  })

  // A campanha não guarda motivo de falha e a BE.2 não abre `failed → sending`.
  it('a que falhou não inventa motivo nem oferece reenviar', () => {
    renderCard(campaign({ id: 'f', status: 'failed' }), { showChip: true })
    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver detalhes/ })).toBeInTheDocument()
  })

  it('a cancelada fica no quadro para contar que existiu, e sem ação nenhuma', () => {
    renderCard(campaign({ id: 'c', status: 'cancelled' }), { showChip: true })
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// O C1 do #136 vale igual aqui: sem o contador, "não saiu nada" e "601 pessoas
// já receberam" renderizam iguais, e quem lê recria a campanha.
describe('BoardCard · o que parou no meio do envio', () => {
  const parcial = (status: Campaign['status']) => campaign({
    id: status, status, stats: stats({ total: 1037, sent: 601, delivered: 590, read: 200 }),
  })
  const preVoo = (status: Campaign['status']) => campaign({ id: `${status}0`, status, stats: stats() })

  it.each(['failed', 'cancelled'] as const)('a %s parcial diz quantas pessoas já receberam', (status) => {
    renderCard(parcial(status), { showChip: true })
    expect(screen.getByText('601 / 1.037')).toBeInTheDocument()
    expect(screen.getByText('parou aqui')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '58')
  })

  it.each(['failed', 'cancelled'] as const)('a %s de pré-voo não desenha barra sobre zero', (status) => {
    renderCard(preVoo(status), { showChip: true })
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText('parou aqui')).not.toBeInTheDocument()
  })

  it('os dois casos não renderizam iguais', () => {
    const { container: a, unmount } = renderCard(preVoo('failed'), { showChip: true })
    const html = a.innerHTML
    unmount()
    const { container: b } = renderCard(parcial('failed'), { showChip: true })
    expect(b.innerHTML).not.toBe(html)
  })

  it('uma fila que parou não tem taxa', () => {
    renderCard(parcial('failed'), { perSecond: 3.2, showChip: true })
    expect(screen.queryByText(/msg\/s/)).not.toBeInTheDocument()
  })
})

describe('BoardCard · o chip', () => {
  // Ele existe só onde a coluna junta dois status; nas outras a coluna já é o
  // status e o chip seria ruído (o mockup não desenha nenhum).
  it('aparece quando a coluna mistura status', () => {
    renderCard(campaign({ id: 'p', status: 'paused', stats: stats({ total: 10, sent: 4 }) }), { showChip: true })
    expect(screen.getByText('Pausada')).toBeInTheDocument()
  })

  it('não aparece na coluna de um status só', () => {
    renderCard(campaign({ id: 'e', status: 'sent', stats: stats({ total: 10, sent: 10 }) }))
    expect(screen.queryByText('Enviada')).not.toBeInTheDocument()
  })
})
