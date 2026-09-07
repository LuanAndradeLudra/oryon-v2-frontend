// O painel "Próximos 7 dias" era o ÚNICO lugar da pilha que imprimia um zero.
// O `MIN_SEVEN_DAY_ROWS` que deveria apagá-lo existia e estava morto: a lista
// de linhas era construída com um item fixo, então `rows.length` nunca caía
// abaixo de 1 e o guard nunca era alcançado. Achado do Calibre no #138, medido
// no tenant real, que tem zero agendadas.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgendaSidebar } from './AgendaSidebar'
import type { Campaign, CampaignStatus } from '@/types'

// Quinta, 3 de setembro de 2026, 18:31 — o mesmo instante do mockup.
const AGORA = new Date(2026, 8, 3, 18, 31)

function campaign(over: Partial<Campaign> & { id: string }): Campaign {
  return {
    tenantId: 't1',
    name: `Disparo ${over.id}`,
    templateId: 'tpl-1',
    templateName: 'template_teste',
    segment: { type: 'all' },
    variableMappings: [],
    status: 'scheduled' as CampaignStatus,
    stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    createdByUserId: 'u1',
    createdAt: new Date(2026, 8, 1).toISOString(),
    ...over,
  } as Campaign
}

const agendadaEm = (dia: number, id: string) =>
  campaign({ id, scheduledAt: new Date(2026, 8, dia, 18, 0).toISOString() })

function renderSidebar(campanhas: Campaign[]) {
  return render(
    <AgendaSidebar
      all={campanhas}
      filtered={campanhas}
      now={AGORA}
      month={AGORA}
      onMonthChange={vi.fn()}
      selectedDay={undefined}
      onSelectDay={vi.fn()}
      filters={<div />}
    />,
  )
}

describe('AgendaSidebar — o painel dos próximos 7 dias', () => {
  it('some inteiro quando não há nada agendado, em vez de escrever zero', () => {
    renderSidebar([campaign({ id: 'e', status: 'sent', sentAt: new Date(2026, 8, 2).toISOString() })])

    expect(screen.queryByText('Próximos 7 dias')).not.toBeInTheDocument()
    expect(screen.queryByText('Disparos agendados')).not.toBeInTheDocument()
    // A asserção que importa: nenhum zero impresso onde havia uma contagem.
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('a tela sem campanha nenhuma também não escreve zero', () => {
    renderSidebar([])
    expect(screen.queryByText('Próximos 7 dias')).not.toBeInTheDocument()
  })

  it('aparece com a contagem REAL quando há agendadas na janela', () => {
    renderSidebar([agendadaEm(4, 'a'), agendadaEm(8, 'b')])

    expect(screen.getByText('Próximos 7 dias')).toBeInTheDocument()
    // Escopado à LINHA do painel: um `getByText('2')` solto casaria também com
    // o dia 2 do mini-calendário, que está na mesma barra lateral.
    const linha = screen.getByText('Disparos agendados').parentElement!
    expect(linha.textContent).toBe('Disparos agendados2')
  })

  // A janela é de 7 dias a partir de hoje: o que cai fora não entra na conta, e
  // se NADA sobrar o painel some junto.
  it('agendada fora da janela de 7 dias não sustenta o painel sozinha', () => {
    renderSidebar([agendadaEm(30, 'longe')])
    expect(screen.queryByText('Próximos 7 dias')).not.toBeInTheDocument()
  })
})
