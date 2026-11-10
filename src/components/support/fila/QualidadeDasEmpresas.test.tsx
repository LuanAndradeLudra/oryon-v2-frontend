// SCRUM-1391 — qualidade por empresa. Critérios na tela: cada indicador com
// numerador, denominador e período; sem amostra revisada, a taxa de erro não
// aparece; o e-mail do mês confere com a tela (a prévia sai do mesmo retrato).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { adminSupportApi } from '@/services/supportApi'
import type { IndicadorDaQualidade, QualidadeDaEmpresa, VisaoDaQualidade } from '@/types/support'
import { QualidadeDasEmpresas } from './QualidadeDasEmpresas'
import { IndicadoresDaQualidade } from '../IndicadoresDaQualidade'
import { fracaoCurta, nomeDoPeriodo, textoDaFonte, valorEmDestaque } from '../qualidade'

vi.mock('@/services/supportApi', () => ({
  adminSupportApi: { qualidade: vi.fn(), qualidadeDaEmpresa: vi.fn(), previaDoEmailDaQualidade: vi.fn() },
}))

const api = vi.mocked(adminSupportApi)

const ind = (chave: string, titulo: string, numerador: number | null, denominador: number | null, percentual: number | null, texto: string, nota: string | null = null): IndicadorDaQualidade =>
  ({ chave, titulo, numerador, denominador, percentual, texto, nota })

const INDICADORES: IndicadorDaQualidade[] = [
  ind('respostas_da_ia', 'Respostas da IA', 3, 5, 60, '3 respostas de 5 mensagens enviadas (60%)'),
  ind('respondeu_sozinha', 'A IA respondeu sozinha', 3, 6, 50, '3 turnos de 6 turnos (50%)'),
  ind('encaminhou', 'A IA encaminhou para a equipe', 1, 6, 17, '1 turno de 6 turnos (17%)', 'Inclui o encaminhamento por regra de negócio e por segurança.'),
  ind('sem_resposta', 'Turnos sem resposta da IA', 2, 6, 33, '2 turnos de 6 turnos (33%)', 'Tempo esgotado, erro ou resposta vazia.'),
  ind('chamados_sobre_ia', 'Chamados sobre a IA', 3, 3, null, '3 chamados para 3 respostas da IA (1000 por mil)'),
  ind('confirmados', 'Confirmados após análise', 2, 3, 67, '2 chamados de 3 chamados analisados (67%)'),
  ind('agrupados', 'Agrupados no mesmo problema', 1, 5, 20, '1 chamado de 5 chamados (20%)'),
  ind('primeira_resposta', 'Tempo até a 1ª resposta da Oryon', 95, 3, null, 'Mediana de 1 h 35 min (3 chamados respondidos)'),
]
const AVISO = 'A taxa de erro da IA vai aparecer quando houver a revisão por amostragem das respostas, sempre com o tamanho da amostra.'

const SETEMBRO: QualidadeDaEmpresa = {
  tenantId: 'alfa', empresa: 'Clínica Alfa', periodo: '2026-09', nomeDoPeriodo: 'setembro de 2026', fechado: true,
  retrato: { geradoEm: '2026-10-01T11:00:00.000Z', enviadoEm: null, destinatarios: 0 },
  indicadores: INDICADORES, avisoDaTaxaDeErro: AVISO, periodos: ['2026-10', '2026-09'],
}
const VISAO: VisaoDaQualidade = {
  periodo: '7d', nomeDoPeriodo: 'últimos 7 dias', fechado: false, avisoDaTaxaDeErro: AVISO, periodos: ['7d', '2026-10', '2026-09'],
  empresas: [
    { tenantId: 'alfa', empresa: 'Clínica Alfa', retrato: false, indicadores: INDICADORES },
    { tenantId: 'beta', empresa: 'Clínica Beta', retrato: false, indicadores: [] },
  ],
}

beforeEach(() => vi.clearAllMocks())

describe('helpers da qualidade', () => {
  it('número em destaque, fração curta, período e de onde vêm os números', () => {
    expect(valorEmDestaque(INDICADORES[0])).toBe('60%')
    expect(valorEmDestaque(INDICADORES[4])).toBe('3')
    expect(valorEmDestaque(INDICADORES[7])).toBe('1 h 35 min')
    expect(valorEmDestaque(ind('agrupados', 'x', 0, 0, null, 'Nenhum chamado no período'))).toBe('—')
    expect(valorEmDestaque(ind('primeira_resposta', 'x', null, 0, null, 'Nenhum'))).toBe('—')
    expect(fracaoCurta(INDICADORES[0])).toBe('3 de 5')
    expect(fracaoCurta(INDICADORES[7])).toBe('3 resp.')
    expect(fracaoCurta(ind('confirmados', 'x', 0, 0, null, 'Nenhum chamado analisado no período'))).toBe('')
    expect(nomeDoPeriodo('2026-09')).toBe('Setembro de 2026')
    expect(nomeDoPeriodo('7d')).toBe('Últimos 7 dias')
    expect(textoDaFonte({ fechado: false, retrato: null })).toBe('Mês em andamento: os números até agora.')
    expect(textoDaFonte({ fechado: true, retrato: null })).toContain('conta ao vivo')
    expect(textoDaFonte(SETEMBRO)).toMatch(/^Retrato do mês guardado em \d{2}\/\d{2}\/2026: os números não mudam mais\.$/)
    expect(textoDaFonte({ fechado: true, retrato: { ...SETEMBRO.retrato!, enviadoEm: '2026-10-01T11:05:00.000Z' } })).toContain('Enviado por e-mail à gestão')
  })
})

describe('IndicadoresDaQualidade (a tela da gestão e da equipe)', () => {
  it('cada cartão com o número e o texto com numerador e denominador; sem cartão de taxa de erro, só o aviso', () => {
    const onPeriodo = vi.fn()
    render(<IndicadoresDaQualidade dados={SETEMBRO} onPeriodo={onPeriodo} />)
    const cartoes = within(screen.getByRole('list', { name: 'Indicadores de setembro de 2026' })).getAllByRole('listitem')
    expect(cartoes).toHaveLength(8)
    expect(cartoes[0]).toHaveTextContent('Respostas da IA60%3 respostas de 5 mensagens enviadas (60%)')
    expect(cartoes[7]).toHaveTextContent('1 h 35 min')
    expect(screen.queryByText(/^Taxa de erro/)).toBeNull()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '2026-10' } })
    expect(onPeriodo).toHaveBeenCalledWith('2026-10')
  })

  it('trocou o mês e o novo ainda não chegou: os cartões ficam apagados e o status diz o que carrega', () => {
    render(<IndicadoresDaQualidade dados={SETEMBRO} periodo="2026-10" onPeriodo={vi.fn()} />)
    expect(screen.getByRole('list', { name: 'Indicadores de setembro de 2026' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando outubro de 2026…')
  })
})

describe('QualidadeDasEmpresas (equipe)', () => {
  it('visão geral: uma linha por empresa, cada célula com n de d; abrir a empresa mostra os cartões dela', async () => {
    api.qualidade.mockResolvedValue(VISAO)
    api.qualidadeDaEmpresa.mockResolvedValue({ ...SETEMBRO, periodo: '2026-10', fechado: false, retrato: null })
    render(<LayerProvider><QualidadeDasEmpresas onFechar={vi.fn()} /></LayerProvider>)
    const alfa = (await screen.findByRole('rowheader', { name: /Clínica Alfa/ })).closest('tr')!
    expect(api.qualidade).toHaveBeenCalledWith('7d')
    const celulas = within(alfa).getAllByRole('cell')
    expect(celulas[0]).toHaveTextContent('60%3 de 5')
    expect(celulas[0]).toHaveAttribute('title', '3 respostas de 5 mensagens enviadas (60%)')
    expect(celulas[6]).toHaveTextContent('1 h 35 min3 resp.')
    // Sem indicador (empresa sem dados ainda): traço, nunca "0%".
    const beta = screen.getByRole('rowheader', { name: /Clínica Beta/ }).closest('tr')!
    expect(within(beta).getAllByRole('cell')[0]).toHaveTextContent('—')
    fireEvent.change(screen.getByLabelText('Período'), { target: { value: '2026-09' } })
    expect(api.qualidade).toHaveBeenLastCalledWith('2026-09')

    fireEvent.click(screen.getByRole('button', { name: 'Clínica Alfa' }))
    expect(await screen.findByRole('list', { name: 'Indicadores de outubro de 2026' })).toBeInTheDocument()
    expect(api.qualidadeDaEmpresa).toHaveBeenCalledWith('alfa', undefined)
    // Mês em andamento não tem e-mail.
    expect(screen.queryByRole('button', { name: /Ver o e-mail do mês/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Todas as empresas' }))
    expect(await screen.findByRole('rowheader', { name: /Clínica Alfa/ })).toBeInTheDocument()
  })

  it('aberta pelo chamado já começa na empresa; o e-mail do mês fechado aparece numa prévia isolada', async () => {
    api.qualidadeDaEmpresa.mockResolvedValue(SETEMBRO)
    api.previaDoEmailDaQualidade.mockResolvedValue({
      assunto: 'Qualidade do atendimento · setembro de 2026 · Clínica Alfa', retrato: true,
      html: '<html><body><p>3 respostas de 5 mensagens enviadas (60%)</p></body></html>',
    })
    render(<LayerProvider><QualidadeDasEmpresas inicial={{ tenantId: 'alfa', empresa: 'Clínica Alfa' }} onFechar={vi.fn()} /></LayerProvider>)
    expect(await screen.findByRole('list', { name: 'Indicadores de setembro de 2026' })).toBeInTheDocument()
    expect(api.qualidade).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Todas as empresas' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Ver o e-mail do mês/ }))
    const previa = await screen.findByRole('region', { name: 'Prévia do e-mail do mês' })
    expect(api.previaDoEmailDaQualidade).toHaveBeenCalledWith('alfa', '2026-09')
    expect(previa).toHaveTextContent('Assunto: Qualidade do atendimento · setembro de 2026 · Clínica Alfa')
    const quadro = within(previa).getByTitle('Prévia do e-mail do mês')
    expect(quadro).toHaveAttribute('sandbox', 'allow-same-origin') // sem allow-scripts: nada roda no e-mail
    expect(quadro.getAttribute('srcdoc')).toContain('3 respostas de 5 mensagens enviadas (60%)')
  })

  it('erro ao carregar: mensagem e tentar de novo', async () => {
    api.qualidade.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(VISAO)
    render(<LayerProvider><QualidadeDasEmpresas onFechar={vi.fn()} /></LayerProvider>)
    fireEvent.click(await screen.findByRole('button', { name: /Tentar novamente|Tentar de novo/ }))
    expect(await screen.findByRole('rowheader', { name: /Clínica Alfa/ })).toBeInTheDocument()
  })
})
