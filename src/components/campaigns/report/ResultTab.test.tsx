// Cobre o comportamento que separa este relatório do anterior: quando o dado
// não existe, a tela DIZ que não existe, em vez de mostrar zero. "0 falhas" e
// "não sabemos as falhas" levam a decisões opostas, e era o segundo que o
// relatório antigo exibia como se fosse o primeiro.
//
// Roda nos dois mundos de dados, porque a página nasce tendo de atender aos
// dois: o analytics responde 200 com a forma antiga hoje e com a forma da BE.1
// depois do merge do #81.

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ResultTab } from './ResultTab'
import { corDeLeitura } from './heatmapRamp'
import { buildReportModel } from './reportModel'
import type { Campaign } from '@/types'

const campanha = {
  id: 'c1', tenantId: 't1', name: 'Pesquisa de satisfação',
  templateId: 'tpl', templateName: 'nps_pos_compra',
  segment: {} as Campaign['segment'], variableMappings: [],
  status: 'sent' as const, sentAt: '2026-09-02T13:30:00.000Z',
  stats: { total: 520, sent: 520, delivered: 498, read: 340, failed: 22 },
  createdByUserId: 'u1', createdAt: '2026-09-02T13:00:00.000Z',
}

const ANALYTICS_BE1 = {
  campaignId: 'c1',
  funnel: { sent: 520, delivered: 498, read: 340, replied: 88 },
  avgTimeToReadMinutes: 41,
  readHeatmap: [
    { dayOffset: 0, hour: 18, count: 30 },
    { dayOffset: 0, hour: 19, count: 42 },
    { dayOffset: 1, hour: 9, count: 8 },
  ],
  failures: [
    { code: 'invalid_number', reason: 'Número inválido / sem WhatsApp', count: 14 },
    { code: 'opt_out', reason: 'Opt-out ativo na Meta', count: 6 },
  ],
  replies: [
    { contactId: '1', name: 'Carla M.', text: 'Chegou antes do prazo', at: '2026-09-02T14:02:00Z', score: 10, class: 'promoter' },
    { contactId: '2', name: 'João P.', text: 'Veio com defeito', at: '2026-09-02T14:40:00Z', score: 7, class: 'detractor' },
  ],
}

/** A resposta que o backend devolve HOJE: 200, sem nenhum campo da BE.1. */
const ANALYTICS_ANTIGO = { campaignId: 'c1', campaignName: 'Pesquisa de satisfação', stats: {}, sentAt: null }

function renderTab(analytics: unknown) {
  const model = buildReportModel(campanha, analytics)
  const utils = render(<ResultTab model={model} onVerContatos={vi.fn()} onVerRespostas={vi.fn()} />)
  return { model, ...utils }
}

describe('ResultTab — com os dados da BE.1', () => {
  it('desenha o funil com os quatro volumes e o percentual sobre as enviadas', () => {
    renderTab(ANALYTICS_BE1)
    const funil = screen.getByRole('img', { name: /Funil de entrega/i })
    const resumo = funil.getAttribute('aria-label') ?? ''

    expect(resumo).toContain('Enviadas: 520')
    expect(resumo).toContain('Entregues: 498 (95,8%)')
    expect(resumo).toContain('Lidas: 340 (65,4%)')
    expect(resumo).toContain('Responderam: 88 (16,9%)')
  })

  it('mostra o tempo médio até ler quando o backend manda (D34)', () => {
    renderTab(ANALYTICS_BE1)
    expect(screen.getByText(/tempo médio até ler: 41 min/i)).toBeInTheDocument()
  })

  it('rotula a nota como "Nota média", nunca como NPS, e sem variação', () => {
    renderTab(ANALYTICS_BE1)
    expect(screen.getByText('Nota média')).toBeInTheDocument()
    expect(screen.queryByText(/NPS/i)).not.toBeInTheDocument()
    // Delta exige período de comparação, que não existe endpoint para dar.
    expect(screen.queryByText(/\+0,4/)).not.toBeInTheDocument()
  })

  it('lista as falhas por motivo com a ação "Ver contatos"', () => {
    renderTab(ANALYTICS_BE1)
    expect(screen.getByText('Número inválido / sem WhatsApp')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver contatos' }).length).toBeGreaterThan(0)
  })

  it('não oferece as mutações que não têm endpoint', () => {
    renderTab(ANALYTICS_BE1)
    for (const proibido of [/Marcar inválidos/i, /Excluir de listas/i, /Reenviar/i]) {
      expect(screen.queryByText(proibido)).not.toBeInTheDocument()
    }
  })

  it('marca o pico de leitura a partir dos dados, sem reconverter fuso', () => {
    renderTab(ANALYTICS_BE1)
    // 18h+19h é a maior soma; as horas vêm prontas em horário local da BE.1.
    expect(screen.getByText(/pico 18h–20h/)).toBeInTheDocument()
  })
})

describe('ResultTab — com a resposta antiga (o que o backend devolve hoje)', () => {
  it('deriva o funil de campaign.stats e mostra travessão onde não há medição', () => {
    renderTab(ANALYTICS_ANTIGO)
    const resumo = screen.getByRole('img', { name: /Funil de entrega/i }).getAttribute('aria-label') ?? ''

    expect(resumo).toContain('Enviadas: 520')
    expect(resumo).toContain('Entregues: 498')
    // `replied` não é escrito por ninguém hoje: "não apurado", nunca "0".
    expect(resumo).toContain('Responderam: não apurado')
    expect(resumo).not.toContain('Responderam: 0')
  })

  it('mostra "—" nos KPIs em vez de zero', () => {
    renderTab(ANALYTICS_ANTIGO)
    // O rótulo é uma div; o cartão do KPI é o pai dela.
    const notaMedia = screen.getByText('Nota média').parentElement!
    expect(within(notaMedia).getByText('—')).toBeInTheDocument()
    expect(within(notaMedia).queryByText('0')).not.toBeInTheDocument()
  })

  it('explica que os blocos por contato ainda não são apurados, sem fingir vazio', () => {
    renderTab(ANALYTICS_ANTIGO)
    const pendentes = screen.getAllByText(/fica disponível quando a apuração por contato entrar no ar/i)
    // Falhas, heatmap e respostas — a mesma frase nos três, de propósito.
    expect(pendentes).toHaveLength(3)
    expect(screen.queryByText(/Nenhuma falha neste disparo/i)).not.toBeInTheDocument()
  })

  it('omite o tempo médio até ler em vez de estimar no cliente', () => {
    renderTab(ANALYTICS_ANTIGO)
    expect(screen.queryByText(/tempo médio até ler/i)).not.toBeInTheDocument()
  })
})

// A cor da célula do heatmap é calculada em JS e nunca vira classe, então ela
// escapa do gate de CSS por construção — o gate enumera o que o `vite build`
// emite, e isto não é emitido. Estas asserções são o que a traz de volta para
// dentro de um gate que roda.
describe('corDeLeitura — a rampa do heatmap segue o mockup', () => {
  it('usa o token violeta, nunca hex, e varre a faixa 3%–95% do mockup', () => {
    expect(corDeLeitura(0)).toBe('color-mix(in srgb, var(--color-accent-violet) 3%, transparent)')
    expect(corDeLeitura(1)).toBe('color-mix(in srgb, var(--color-accent-violet) 95%, transparent)')
    // Nenhum hex literal, em ponto nenhum da rampa.
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(corDeLeitura(t)).not.toMatch(/#[0-9a-fA-F]{3,6}/)
      expect(corDeLeitura(t)).toContain('--color-accent-violet')
    }
  })

  it('e o violeta casa com o chip de pico — não pinta teal ao lado de um rótulo violeta', () => {
    // Era a contradição: as células saíam da rampa teal do dashboard enquanto o
    // chip "pico 18h–20h" é accent-violet.
    expect(corDeLeitura(0.8)).not.toContain('brand')
    expect(corDeLeitura(0.8)).not.toContain('teal')
  })

  it('satura fora do intervalo em vez de extrapolar', () => {
    expect(corDeLeitura(-1)).toBe(corDeLeitura(0))
    expect(corDeLeitura(9)).toBe(corDeLeitura(1))
  })
})
