// A coluna existe para que a ALTURA signifique gargalo. Estes testes guardam
// as duas coisas que destruiriam isso: rolagem por dentro (que igualaria as
// alturas) e uma contagem no cabeçalho que fosse a exibida em vez da real.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BoardColumn } from './BoardColumn'
import { buildBoard, COLUMN_CAP, type BoardColumnId } from './boardColumns'
import type { CampaignLifecycle } from '../agenda/useCampaignLifecycle'
import type { Campaign, CampaignStatus } from '@/types'

const agora = new Date(2026, 8, 3, 18, 31)

const lifecycle: CampaignLifecycle = { can: () => true, busy: null, run: vi.fn().mockResolvedValue(null) }

function campaign(id: string, status: CampaignStatus): Campaign {
  return {
    id, tenantId: 't1', name: `Disparo ${id}`,
    templateId: 'tpl', templateName: 'tpl', segment: { type: 'all' },
    variableMappings: [], status,
    stats: { total: 10, sent: 10, delivered: 10, read: 5, failed: 0 },
    createdByUserId: 'u1', createdAt: '2026-09-01T00:00:00.000Z',
    sentAt: status === 'sent' ? '2026-09-02T00:00:00.000Z' : undefined,
  } as Campaign
}

function renderColumn(cs: Campaign[], id: BoardColumnId, expanded = false) {
  const column = buildBoard(cs).find((c) => c.def.id === id)!
  const onToggle = vi.fn()
  const view = render(
    <MemoryRouter>
      <BoardColumn
        column={column}
        now={agora}
        expanded={expanded}
        onToggleExpand={onToggle}
        lifecycle={lifecycle}
        rateOf={() => undefined}
        authorOf={() => undefined}
        lineOf={() => undefined}
        onSendNow={vi.fn()}
        onRequestCancel={vi.fn()}
        sendingNowId={null}
      />
    </MemoryRouter>,
  )
  return { ...view, onToggle }
}

describe('BoardColumn · o cabeçalho', () => {
  it('conta o total REAL da coluna, não o que coube na tela', () => {
    const muitas = Array.from({ length: 18 }, (_, i) => campaign(`c${i}`, 'sent'))
    renderColumn(muitas, 'sent')
    // 18 no cabeçalho, 8 cartões na coluna — é o par do mockup (18 / 3 cartões).
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getAllByText(/^Disparo c/)).toHaveLength(COLUMN_CAP)
  })

  it('diz a contagem também para quem não vê o quadro', () => {
    renderColumn([campaign('a', 'sent')], 'sent')
    expect(screen.getByRole('region', { name: 'Enviada: 1 disparo' })).toBeInTheDocument()
  })

  it('a coluna vazia continua de pé, com zero', () => {
    renderColumn([], 'sent')
    expect(screen.getByRole('region', { name: 'Enviada: 0 disparos' })).toBeInTheDocument()
  })
})

describe('BoardColumn · o corte', () => {
  const muitas = Array.from({ length: COLUMN_CAP + 5 }, (_, i) => campaign(`c${i}`, 'sent'))

  it('oferece as que ficaram de fora, com o número delas', () => {
    renderColumn(muitas, 'sent')
    expect(screen.getByRole('button', { name: '+ 5 anteriores' })).toBeInTheDocument()
  })

  it('o botão pede a expansão em vez de rolar por dentro', () => {
    const { onToggle } = renderColumn(muitas, 'sent')
    fireEvent.click(screen.getByRole('button', { name: '+ 5 anteriores' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('expandida mostra todas e oferece o caminho de volta', () => {
    renderColumn(muitas, 'sent', true)
    expect(screen.getAllByText(/^Disparo c/)).toHaveLength(COLUMN_CAP + 5)
    expect(screen.getByRole('button', { name: 'mostrar menos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /anteriores/ })).not.toBeInTheDocument()
  })

  it('coluna curta não ganha rodapé nenhum', () => {
    renderColumn(muitas.slice(0, 3), 'sent')
    expect(screen.queryByRole('button', { name: /anteriores|mostrar menos/ })).not.toBeInTheDocument()
  })

  it('a coluna nunca rola por dentro — a altura é o sinal de gargalo', () => {
    renderColumn(muitas, 'sent', true)
    const col = screen.getByRole('region', { name: /^Enviada/ })
    expect(col.className).not.toMatch(/overflow-y-(auto|scroll)/)
    expect(col.className).toMatch(/min-h-\[420px\]/)
  })
})

describe('BoardColumn · o que é só de uma coluna', () => {
  it('o fantasma de novo rascunho fica na coluna de rascunhos', () => {
    renderColumn([campaign('d', 'draft')], 'draft')
    expect(screen.getByRole('button', { name: /Novo rascunho/ })).toBeInTheDocument()
  })

  it('e não aparece nas outras', () => {
    renderColumn([campaign('a', 'sent')], 'sent')
    expect(screen.queryByRole('button', { name: /Novo rascunho/ })).not.toBeInTheDocument()
  })

  it('a coluna que mistura status põe o chip em cada cartão', () => {
    renderColumn([campaign('s', 'sending'), campaign('p', 'paused')], 'sending')
    // "Enviando" duas vezes: o rótulo da coluna e o chip do cartão que está
    // enviando. "Pausada" só existe como chip — e é ele que diz qual dos dois
    // cartões é qual, dentro de uma coluna que junta os dois.
    expect(screen.getAllByText('Enviando')).toHaveLength(2)
    expect(screen.getByText('Pausada')).toBeInTheDocument()
  })

  // O outro lado da mesma regra, e o que a mutação provou que faltava: numa
  // coluna de um status só o chip seria ruído, e "Enviada" tem que aparecer
  // uma vez (o rótulo da coluna), não duas.
  it('a coluna de um status só não põe chip em cartão nenhum', () => {
    renderColumn([campaign('a', 'sent'), campaign('b', 'sent')], 'sent')
    expect(screen.getAllByText('Enviada')).toHaveLength(1)
  })
})
