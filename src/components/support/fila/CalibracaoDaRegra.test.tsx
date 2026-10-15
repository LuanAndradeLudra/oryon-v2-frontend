// SCRUM-1392 — calibração da regra por empresa (só a equipe). Critério na tela:
// a simulação com o histórico mostra a distribuição antes e depois; cada
// indicador com numerador, denominador e período; ligar o ajuste pede motivo.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { showToast } from '@/hooks/useToast'
import { adminSupportApi } from '@/services/supportApi'
import type { VisaoDaCalibracao } from '@/types/support'
import { CalibracaoDaRegra } from './CalibracaoDaRegra'

vi.mock('@/services/supportApi', () => ({ adminSupportApi: { calibracao: vi.fn(), definirConfiguracao: vi.fn() } }))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

const api = vi.mocked(adminSupportApi)

const VISAO: VisaoDaCalibracao = {
  config: { ligado: false, janelaDias: 90, minimo: 10, limiar: 0.5 },
  empresas: [
    { tenantId: 'a', empresa: 'Clínica Exagerada', triados: 10, confirmados: 3, taxa: 30, situacao: 'inflado', janelaDias: 90, ajusteLigado: false, rebaixados: 7, elevados: 1, aConfirmar: 4, naoConfirmados: 3 },
    { tenantId: 'b', empresa: 'Clínica Serra', triados: 2, confirmados: 2, taxa: 100, situacao: 'poucos_dados', janelaDias: 90, ajusteLigado: false, rebaixados: 0, elevados: 0, aConfirmar: 0, naoConfirmados: 0 },
  ],
  simulacao: { chamados: 40, antes: { P0: 1, P1: 3, P2: 20, P3: 16 }, depois: { P0: 1, P1: 3, P2: 9, P3: 27 }, mudariam: 11 },
}

beforeEach(() => vi.clearAllMocks())

describe('Calibração da regra (SCRUM-1392)', () => {
  it('simulação antes/depois e a medida de cada empresa, com numerador, denominador e período', async () => {
    api.calibracao.mockResolvedValue(VISAO)
    render(<LayerProvider><CalibracaoDaRegra onFechar={vi.fn()} /></LayerProvider>)
    const simulacao = await screen.findByRole('region', { name: 'Simulação com o histórico' })
    expect(simulacao).toHaveTextContent('Simulação com o histórico (40 chamados em 90 dias)')
    const linhaP2 = within(simulacao).getByText('P2 · Média').closest('tr')!
    expect(within(linhaP2).getAllByRole('cell').map((c) => c.textContent)).toEqual(['P2 · Média', '20', '9'])
    expect(simulacao).toHaveTextContent('11 chamados mudariam de P2 para P3.')
    const empresas = screen.getByRole('region', { name: 'Empresas' })
    const exagerada = within(empresas).getByText('Clínica Exagerada').closest('tr')!
    expect(exagerada).toHaveTextContent('30% confirmados (3 de 10 · 90 dias)')
    expect(exagerada).toHaveTextContent('3 de 4')
    expect(exagerada).toHaveTextContent('Relato inflado')
    expect(within(empresas).getByText('Clínica Serra').closest('tr')).toHaveTextContent('poucos dados (2 relatos de urgência triados · 90 dias)')
  })

  it('ligar o ajuste pede motivo e recarrega', async () => {
    api.calibracao.mockResolvedValueOnce(VISAO).mockResolvedValueOnce({ ...VISAO, config: { ...VISAO.config, ligado: true } })
    api.definirConfiguracao.mockResolvedValue({ chave: 'calibracao', valor: { ...VISAO.config, ligado: true } })
    render(<LayerProvider><CalibracaoDaRegra onFechar={vi.fn()} /></LayerProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Ligar o ajuste' }))
    const ligar = screen.getByRole('button', { name: 'Ligar' })
    expect(ligar).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Motivo da mudança do ajuste'), { target: { value: 'A Clínica Exagerada rebaixa 7 de 10' } })
    fireEvent.click(ligar)
    await waitFor(() => expect(api.definirConfiguracao).toHaveBeenCalledWith('calibracao', { ...VISAO.config, ligado: true }, 'A Clínica Exagerada rebaixa 7 de 10'))
    expect(showToast).toHaveBeenCalledWith('Ajuste da regra ligado. O motivo ficou no histórico.', 'success')
    expect(await screen.findByRole('button', { name: 'Desligar o ajuste' })).toBeInTheDocument()
  })
})
