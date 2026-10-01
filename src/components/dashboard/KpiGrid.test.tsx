// Cartões dos Relatórios (pedido do PO, 01/10): um cartão por categoria,
// cabeçalho da categoria separado do título, ponto "ao vivo" nos de agora,
// barra nas taxas, estado da meta e o clique levando à lista do número.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { KpiGrid } from './KpiGrid'
import { agruparPorGrupo, estadoDaMeta } from './kpiIdentidade'
import { KPI_CATALOG, type KpiMetric } from '@/types/dashboard'

function kpi(id: string, value: number | null, extra: Partial<KpiMetric> = {}): KpiMetric {
  const def = KPI_CATALOG.find((d) => d.id === id)!
  return { ...def, value, trend: 0, sparkline: [], ...extra }
}

const METRICAS: KpiMetric[] = [
  kpi('active_conversations', 190),
  kpi('queued', 8),
  kpi('resolution_rate', 39, { detail: 'de 36 atendimentos iniciados' }),
  kpi('first_response_time', 37200),
  kpi('human_first_response', 1320, { meta: { alvo: 900, sentido: 'menor' } }),
  kpi('bot_deflection', 0),
]

beforeEach(() => {
  localStorage.setItem('oryon:dashboard:kpi-slots', JSON.stringify(METRICAS.map((m) => m.id)))
})
afterEach(() => { cleanup(); localStorage.clear() })

function montar() {
  return render(
    <MemoryRouter>
      <KpiGrid metrics={METRICAS} customizerOpen={false} onCustomizerClose={() => undefined} />
    </MemoryRouter>,
  )
}

describe('kpiIdentidade', () => {
  it('agrupa pela categoria na ordem em que aparece, mantendo a ordem do usuário dentro dela', () => {
    const grupos = agruparPorGrupo([kpi('resolved', 1), kpi('first_response_time', 1), kpi('queued', 1), kpi('bot_resolved', 1)])
    expect(grupos.map((g) => [g.grupo, g.itens.map((i) => i.id)])).toEqual([
      ['Atendimento', ['resolved', 'queued']],
      ['Velocidade', ['first_response_time']],
      ['Bot', ['bot_resolved']],
    ])
  })

  it('estado da meta: tempo (menor é melhor) e taxa (maior é melhor)', () => {
    expect(estadoDaMeta({ value: 600, meta: { alvo: 900, sentido: 'menor' } })).toBe('ok')
    expect(estadoDaMeta({ value: 1320, meta: { alvo: 900, sentido: 'menor' } })).toBe('atencao')
    expect(estadoDaMeta({ value: 3600, meta: { alvo: 900, sentido: 'menor' } })).toBe('fora')
    expect(estadoDaMeta({ value: 75, meta: { alvo: 70, sentido: 'maior' } })).toBe('ok')
    expect(estadoDaMeta({ value: 60, meta: { alvo: 70, sentido: 'maior' } })).toBe('atencao')
    expect(estadoDaMeta({ value: null, meta: { alvo: 70, sentido: 'maior' } })).toBeNull()
    expect(estadoDaMeta({ value: 10, meta: null })).toBeNull()
  })
})

describe('KpiGrid — um cartão por categoria', () => {
  it('cada categoria é um cartão com o próprio cabeçalho (IA para a categoria Bot)', () => {
    montar()
    const faixa = screen.getByTestId('faixa-kpi')
    const cartoes = within(faixa).getAllByRole('region')
    expect(cartoes.map((c) => c.getAttribute('aria-label'))).toEqual(['Atendimento', 'Velocidade', 'IA'])
    expect(within(cartoes[1]).getByRole('heading', { name: 'Velocidade' })).toBeInTheDocument()
    expect(within(cartoes[1]).getByText('Tempo de Resposta')).toBeInTheDocument()
  })

  it('indicador de agora tem o ponto "ao vivo"; o do período não', () => {
    montar()
    const fila = screen.getByRole('link', { name: /Em Fila/ })
    expect(within(fila).getByText('agora', { selector: '.sr-only' })).toBeInTheDocument()
    const taxa = screen.getByText('Taxa de Resolução').closest('[data-spotlight-target]') as HTMLElement
    expect(within(taxa).queryByText('agora', { selector: '.sr-only' })).toBeNull()
  })

  it('o cartão leva à lista que compõe o número', () => {
    montar()
    expect(screen.getByRole('link', { name: /Em Fila: 8\. Abrir a Fila/ })).toHaveAttribute('href', '/conversations?aba=fila')
    expect(screen.getByRole('link', { name: /Conversas Ativas/ })).toHaveAttribute('href', '/conversations?status=open')
  })

  it('taxa ganha a barra; tempo com meta mostra o estado e a meta', () => {
    montar()
    const taxa = screen.getByText('Taxa de Resolução').closest('[data-spotlight-target]') as HTMLElement
    expect(taxa.querySelector('span[style*="width: 39%"]')).not.toBeNull()
    const humana = screen.getByText('1ª Resposta Humana').closest('[data-spotlight-target]') as HTMLElement
    expect(within(humana).getByText('atenção')).toBeInTheDocument()
    expect(within(humana).getByText('· meta 15m')).toBeInTheDocument()
  })

  it('a unidade aparece separada do número (menor e mais leve)', () => {
    montar()
    const tempo = screen.getByText('Tempo de Resposta').closest('[data-spotlight-target]') as HTMLElement
    const unidades = [...tempo.querySelectorAll('span.text-\\[0\\.58em\\]')].map((s) => s.textContent)
    expect(unidades).toEqual(['h', 'm'])
  })
})
