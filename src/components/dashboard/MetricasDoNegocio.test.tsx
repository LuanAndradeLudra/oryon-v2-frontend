// SCRUM-1465: métricas do negócio no painel — grupo próprio, estados do
// cartão, "Quais são?" paginado e a faixa salva por cliente.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { KpiGrid } from './KpiGrid'
import { KpiCustomizerDrawer } from './KpiCustomizerDrawer'
import { KPI_CATALOG, type KpiMetric } from '@/types/dashboard'
import { kpiDoServidor, type MetricaDoServidor } from '@/lib/metricasDoNegocio'

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/services/api', () => ({ api: { get, put } }))

const TENANT = 'aaaaaaaa-0000-4000-8000-00000000000a'

function doServidor(extra: Partial<MetricaDoServidor>): KpiMetric {
  return kpiDoServidor({
    chave: 'clinica_conversao_pedido_horario', rotulo: 'Conversão de quem pediu horário', grupo: 'Do seu negócio', unidade: 'percent', sentido: 'up',
    ajuda: null, selos: ['pela_ia'], versao: 1, publicadaEm: null, estado: 'ok', valor: 40, anterior: null, comparavel: false,
    partes: { convertidos: 8, base: 20, dentroDoPrazo: 3 }, quebra: [], serie: null, desde: '2026-11-01T03:00:00.000Z',
    explicacao: 'De 20 pessoas que pediram horário, 8 marcaram pela IA em até 7 dias.',
    ...extra,
  })
}

const fixo = (id: string, value: number): KpiMetric => ({ ...KPI_CATALOG.find((d) => d.id === id)!, value, trend: null, sparkline: [] })

const METRICAS: KpiMetric[] = [
  fixo('active_conversations', 10),
  fixo('resolved', 4),
  fixo('queued', 1),
  fixo('resolution_rate', 30),
  doServidor({}),
  doServidor({ chave: 'clinica_valor_tabela', rotulo: 'Valor a preço de tabela', unidade: 'currency', selos: ['estimado'], valor: 125000, partes: { consideradas: 5, semPreco: 1, semEspecialidade: 0 } }),
  doServidor({ chave: 'clinica_pedidos_sem_vaga', rotulo: 'Pedidos sem vaga', unidade: 'count', estado: 'erro', valor: null, partes: {} }),
]

beforeEach(() => {
  get.mockReset()
  get.mockResolvedValue({ data: {} })
})
afterEach(() => { cleanup(); localStorage.clear() })

function montar(tenantId: string | undefined = TENANT) {
  return render(
    <MemoryRouter>
      <KpiGrid metrics={METRICAS} customizerOpen={false} onCustomizerClose={() => undefined} tenantId={tenantId} periodo="30d" />
    </MemoryRouter>,
  )
}

describe('Métricas do negócio na faixa', () => {
  it('ficam no grupo "Do seu negócio", com estimado, apoio e erro como aviso', () => {
    localStorage.setItem(`oryon:dashboard:kpi-slots:${TENANT}`, JSON.stringify(['resolved', 'clinica_conversao_pedido_horario', 'clinica_valor_tabela', 'clinica_pedidos_sem_vaga']))
    montar()
    const grupo = screen.getByRole('region', { name: 'Do seu negócio' })
    expect(within(grupo).getByText('Conversão de quem pediu horário')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Conversão de quem pediu horário: 40,0%/ })).toBeTruthy()
    expect(within(grupo).getByText('8 de 20 · 3 dentro do prazo')).toBeTruthy()
    expect(within(grupo).getByText('estimado')).toBeTruthy()
    expect(within(grupo).getByText('estimado · 1 sem preço')).toBeTruthy()
    const erro = within(grupo).getByText('não foi possível calcular agora')
    expect(erro.className).toContain('text-status-pending')
  })

  it('a faixa é guardada por cliente; a chave antiga (global) semeia a do cliente', () => {
    localStorage.setItem('oryon:dashboard:kpi-slots', JSON.stringify(['resolved', 'queued', 'clinica_valor_tabela']))
    montar()
    expect(screen.getByText('Valor a preço de tabela')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(`oryon:dashboard:kpi-slots:${TENANT}`) ?? '[]')).toEqual(['resolved', 'queued', 'clinica_valor_tabela'])
    cleanup()
    // Outro cliente no mesmo navegador não herda o que este escolheu depois.
    localStorage.setItem(`oryon:dashboard:kpi-slots:${TENANT}`, JSON.stringify(['clinica_pedidos_sem_vaga', 'resolved']))
    montar('bbbbbbbb-0000-4000-8000-00000000000b')
    expect(screen.queryByText('Pedidos sem vaga')).toBeNull()
  })

  it('id salvo de métrica que não carregou desta vez não é apagado', () => {
    localStorage.setItem(`oryon:dashboard:kpi-slots:${TENANT}`, JSON.stringify(['resolved', 'metrica_que_nao_veio']))
    montar()
    expect(JSON.parse(localStorage.getItem(`oryon:dashboard:kpi-slots:${TENANT}`) ?? '[]')).toEqual(['resolved', 'metrica_que_nao_veio'])
  })

  it('clicar abre o "Quais são?": explicação, total, itens e a página seguinte', async () => {
    localStorage.setItem(`oryon:dashboard:kpi-slots:${TENANT}`, JSON.stringify(['resolved', 'clinica_conversao_pedido_horario']))
    const item = (i: number) => ({ chave: `c${i}`, contatoId: `ct${i}`, contatoNome: `Pessoa ${i}`, conversaId: `cv${i}`, em: '2026-11-02T15:00:00.000Z', atributos: { havia_horario: true }, convertido: i % 2 === 0 })
    get.mockImplementation((url: string, cfg: { params: { page: number } }) =>
      Promise.resolve({ data: cfg.params.page === 1
        ? { total: 51, pagina: 1, limite: 50, itens: Array.from({ length: 50 }, (_, i) => item(i)) }
        : { total: 51, pagina: 2, limite: 50, itens: [item(50)] } }))
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Conversão de quem pediu horário: 40,0%\. Ver quais são/ }))
    expect(await screen.findByTestId('como-calculamos')).toBeTruthy()
    expect(screen.getByTestId('como-calculamos').textContent).toContain('8 marcaram pela IA')
    await waitFor(() => expect(within(screen.getByTestId('itens-da-metrica')).getAllByRole('listitem')).toHaveLength(50))
    expect(get).toHaveBeenCalledWith('/home/metrics/clinica_conversao_pedido_horario/list', { params: { range: '30d', page: 1, limit: 50 } })
    expect(screen.getByTestId('total-da-lista').textContent).toBe('51')
    expect(screen.getByRole('link', { name: 'Pessoa 0' }).getAttribute('href')).toBe('/conversations?id=cv0')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    await waitFor(() => expect(within(screen.getByTestId('itens-da-metrica')).getAllByRole('listitem')).toHaveLength(1))
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()
  })

  it('lista que falhou avisa, sem zerar nada', async () => {
    localStorage.setItem(`oryon:dashboard:kpi-slots:${TENANT}`, JSON.stringify(['resolved', 'clinica_conversao_pedido_horario']))
    get.mockRejectedValue(new Error('500'))
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Ver quais são/ }))
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível carregar a lista')
  })
})

describe('Personalizar com as métricas do negócio', () => {
  it('o catálogo à vista inclui o grupo do servidor; Salvar mantém o id que não carregou', () => {
    const onSave = vi.fn()
    render(
      <KpiCustomizerDrawer
        open onClose={() => undefined} onSave={onSave}
        slots={['active_conversations', 'resolved', 'queued', 'resolution_rate', 'metrica_que_nao_veio']}
        defaults={['active_conversations', 'resolved', 'queued', 'resolution_rate']}
        catalogo={METRICAS}
      />,
    )
    // O id oculto não aparece nem conta.
    expect(within(screen.getByTestId('kpi-selecionados')).getAllByRole('listitem')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'Do seu negócio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Pedidos sem vaga' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(onSave.mock.calls[0][0].slots).toEqual(['active_conversations', 'resolved', 'queued', 'resolution_rate', 'clinica_pedidos_sem_vaga', 'metrica_que_nao_veio'])
  })
})
