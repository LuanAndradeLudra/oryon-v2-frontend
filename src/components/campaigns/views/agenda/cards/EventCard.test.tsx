// O que este arquivo cobre é sobretudo o CAMINHO DE FALLBACK: com BE.2 e BE.5
// fora do ar (que é o estado de hoje), a agenda tem que ESCONDER o controle,
// não mostrar botão morto nem número inventado. Ver coord/D1-decisoes.md.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { EventCard } from './EventCard'
import type { CampaignLifecycle } from '../useCampaignLifecycle'
import type { Campaign, CampaignStatus } from '@/types'

/** `CampaignStats` exige as 5 contagens; os testes só se importam com algumas. */
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
    status: 'scheduled' as CampaignStatus,
    stats: stats(),
    createdByUserId: 'u1',
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

const lifecycle = (available: boolean): CampaignLifecycle => ({
  available, busy: null, run: vi.fn().mockResolvedValue(null),
})

function renderCard(c: Campaign, opts: {
  available?: boolean
  audienceCount?: number | null
  perSecond?: number
} = {}) {
  return render(
    <MemoryRouter>
      <ContextMenuProvider>
        <EventCard
          campaign={c}
          rate={opts.perSecond === undefined ? undefined : { perSecond: opts.perSecond }}
          lifecycle={lifecycle(opts.available ?? true)}
          audienceCount={opts.audienceCount ?? null}
          onRequestCancel={vi.fn()}
          onRequestDelete={vi.fn()}
          onSendNow={vi.fn()}
        />
      </ContextMenuProvider>
    </MemoryRouter>,
  )
}

describe('EventCard — fallback sem BE.2', () => {
  const sending = campaign({ id: 'a', status: 'sending', stats: stats({ total: 1240, sent: 640 }) })

  it('mostra "Pausar" quando o endpoint responde', () => {
    renderCard(sending, { available: true })
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument()
  })

  it('ESCONDE "Pausar" quando o endpoint não existe — não desabilita', () => {
    renderCard(sending, { available: false })
    expect(screen.queryByRole('button', { name: 'Pausar' })).not.toBeInTheDocument()
  })

  it('ESCONDE "Retomar" numa pausada quando o endpoint não existe', () => {
    renderCard(campaign({ id: 'b', status: 'paused', stats: stats({ total: 100, sent: 40 }) }), { available: false })
    expect(screen.queryByRole('button', { name: 'Retomar' })).not.toBeInTheDocument()
  })

  it('o progresso continua visível mesmo sem o controle de pausa', () => {
    renderCard(sending, { available: false })
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '52')
  })
})

describe('EventCard — cartão de falha', () => {
  // O pré-voo: `markFailed()` grava `{total: 0, sent: 0}` — ninguém recebeu.
  const preVoo = campaign({ id: 'c', status: 'failed', stats: stats() })
  // A parcial: `haltedByLineOffline` grava os contadores REAIS. 8 das 15
  // campanhas em `failed` do tenant estão assim.
  const parcial = campaign({
    id: 'p', status: 'failed', stats: stats({ total: 1037, sent: 601 }),
  })

  it('não oferece reenviar: a campanha não guarda por que falhou', () => {
    renderCard(preVoo)
    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver detalhes' })).toBeInTheDocument()
  })

  it('a que falhou antes de sair não desenha barra sobre denominador zero', () => {
    renderCard(preVoo)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  // O achado C1, e o motivo dele não ser estético: quem lê "Falhou" e não vê
  // contador nenhum conclui que não saiu nada, recria a campanha, e as 601
  // pessoas que JÁ receberam recebem a mesma mensagem duas vezes.
  it('a que falhou no meio diz quantas pessoas já receberam', () => {
    renderCard(parcial)
    expect(screen.getByText('601 / 1.037')).toBeInTheDocument()
    expect(screen.getByText('parou aqui')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '58')
  })

  it('e não mostra taxa: uma fila que parou não tem taxa', () => {
    renderCard(parcial, { perSecond: 3.2 })
    expect(screen.queryByText(/msg\/s/)).not.toBeInTheDocument()
  })

  // A asserção que o defeito exigia: os dois casos precisavam PARAR de
  // renderizar byte por byte iguais.
  it('os dois casos de falha não renderizam iguais', () => {
    const { container: a, unmount } = renderCard(preVoo)
    const preVooHtml = a.innerHTML
    unmount()
    const { container: b } = renderCard(parcial)
    expect(b.innerHTML).not.toBe(preVooHtml)
  })
})

describe('EventCard — a enviada em que tudo falhou', () => {
  // `campaigns.processor.ts` marca `status: 'sent'` ao fim do laço mesmo
  // quando todo envio falhou. Duas campanhas reais do tenant estão assim.
  const tudoFalhou = campaign({
    id: 'z', status: 'sent', stats: stats({ total: 5188, sent: 0, failed: 5188 }),
  })

  it('a linha é liderada pela falha, não pelo zero', () => {
    renderCard(tudoFalhou)
    expect(screen.getByText('5.188 falharam · nenhuma enviada')).toBeInTheDocument()
    expect(screen.queryByText('0 enviadas')).not.toBeInTheDocument()
  })

  it('desenha barra em vez de sumir — "falhou tudo" não é "não há dado"', () => {
    renderCard(tudoFalhou)
    expect(screen.getByRole('img', { name: /Falhou: 5188/ })).toBeInTheDocument()
  })
})

describe('EventCard — a cancelada no meio do envio', () => {
  // Mesma armadilha do C1, um ramo do `if` ao lado: sem contador, quem cancelou
  // um disparo já em curso lê "Cancelada", conclui que não saiu nada e recria.
  it('diz quantas pessoas já receberam antes do cancelamento', () => {
    renderCard(campaign({
      id: 'x', status: 'cancelled', stats: stats({ total: 1037, sent: 601 }),
    }))
    expect(screen.getByText('601 / 1.037')).toBeInTheDocument()
    expect(screen.getByText('parou aqui')).toBeInTheDocument()
  })

  it('a cancelada antes de sair continua sem miolo', () => {
    renderCard(campaign({ id: 'y', status: 'cancelled', stats: stats() }))
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

describe('EventCard — cancelada', () => {
  it('aparece no dia, esmaecida e sem nenhuma ação', () => {
    renderCard(campaign({ id: 'd', status: 'cancelled' }))
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('EventCard — agendada sem contagem de público', () => {
  it('não escreve "0 contatos" quando a contagem não foi resolvida', () => {
    renderCard(campaign({ id: 'e', status: 'scheduled' }), { audienceCount: null })
    expect(screen.queryByText(/contatos/)).not.toBeInTheDocument()
  })

  it('mostra a contagem quando ela existe', () => {
    renderCard(campaign({ id: 'f', status: 'scheduled' }), { audienceCount: 310 })
    expect(screen.getByText('310 contatos')).toBeInTheDocument()
  })
})

describe('EventCard — a taxa nunca vira zero', () => {
  const enviando = (over: Partial<Campaign> = {}) =>
    campaign({ id: 'g', status: 'sending', stats: stats({ total: 1000, sent: 100 }), ...over })

  it('omite "msg/s" no primeiro tique, em vez de mostrar 0', () => {
    renderCard(enviando())
    expect(screen.queryByText(/msg\/s/)).not.toBeInTheDocument()
  })

  it('fila lenta não vira "0,0 msg/s" — 1 mensagem no poll de 60 s', () => {
    renderCard(enviando(), { perSecond: 1 / 60 })
    expect(screen.queryByText(/0,0 msg\/s/)).not.toBeInTheDocument()
    expect(screen.getByText('< 0,1 msg/s')).toBeInTheDocument()
  })

  it('taxa que o mockup mostra continua saindo com uma casa', () => {
    renderCard(enviando(), { perSecond: 3.2 })
    expect(screen.getByText('3,2 msg/s')).toBeInTheDocument()
  })

  it('acima de 10 msg/s arredonda para inteiro', () => {
    renderCard(enviando(), { perSecond: 42.4 })
    expect(screen.getByText('42 msg/s')).toBeInTheDocument()
  })
})

describe('EventCard — pausada não pode parecer enviando', () => {
  const stats100 = stats({ total: 100, sent: 40 })
  const frame = (el: HTMLElement) => (el.firstElementChild as HTMLElement).className

  it('a moldura da pausada não é a da enviando nem a neutra do padrão', () => {
    const pausada = frame(renderCard(campaign({ id: 'p', status: 'paused', stats: stats100 })).container)
    const enviando = frame(renderCard(campaign({ id: 's', status: 'sending', stats: stats100 })).container)
    const agendada = frame(renderCard(campaign({ id: 'a', status: 'scheduled' })).container)
    expect(pausada).toContain('border-status-paused/55')
    expect(pausada).not.toBe(enviando)
    expect(pausada).not.toBe(agendada)
  })

  it('a barra de progresso da pausada não é a verde-marca da enviando', () => {
    const { container } = renderCard(campaign({ id: 'p', status: 'paused', stats: stats100 }))
    const barra = container.querySelector('[role="progressbar"]')
    expect(barra?.className).toContain('bg-status-paused')
    expect(barra?.className).not.toContain('bg-brand-500')
    expect(screen.getByText('fila parada')).toBeInTheDocument()
  })
})

describe('EventCard — rascunho', () => {
  it('lista o que falta a partir do próprio registro', () => {
    renderCard(campaign({ id: 'h', status: 'draft', templateId: '', segment: { type: 'tag' } }))
    expect(screen.getByText('Falta:')).toBeInTheDocument()
    expect(screen.getByText('template')).toBeInTheDocument()
    expect(screen.getByText('horário')).toBeInTheDocument()
  })
})

describe('EventCard — acessibilidade', () => {
  it('o botão de mais ações tem rótulo que identifica o disparo', () => {
    renderCard(campaign({ id: 'i', status: 'sent', stats: stats({ sent: 84, delivered: 80, read: 71 }) }))
    expect(
      screen.getByRole('button', { name: 'Mais ações do disparo Lançamento coleção inverno' }),
    ).toBeInTheDocument()
  })
})
