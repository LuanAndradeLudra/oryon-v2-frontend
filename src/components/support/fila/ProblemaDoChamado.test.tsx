// SCRUM-1387 — o problema do chamado na fila da Oryon. Critérios na tela:
// sugestão nunca vincula sozinha (vincular é manual e devolve o chamado);
// problema novo a partir do chamado; status, causa e Jira DO PROBLEMA salvos
// na hora; "corrigido" sem o candidato a teste é recusado (a mensagem vem do
// backend); gerar o candidato só de chamado de IA; 409 recarrega o chamado.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { showToast } from '@/hooks/useToast'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe, ProblemaCompleto, ResumoDoProblema } from '@/types/support'
import { ProblemaDoChamado } from './ProblemaDoChamado'

vi.mock('@/services/supportApi', () => ({
  adminSupportApi: {
    vincularProblema: vi.fn(), criarProblema: vi.fn(), problema: vi.fn(), atualizarProblema: vi.fn(), gerarFixture: vi.fn(), baixarFixture: vi.fn(),
  },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

const api = vi.mocked(adminSupportApi)

const P: ResumoDoProblema = {
  id: 'p7', numero: 'PRB-0007', titulo: 'Valor sem confirmação', status: 'aberto', nomeDoStatus: 'Aberto', causaRaiz: null, jiraRef: null,
  chamados: 3, empresas: 2, temFixture: false,
}
const completo = (extra: Partial<ProblemaCompleto> = {}): ProblemaCompleto => ({ ...P, assinatura: 'ia|wrong_info|x', fixture: null, lista: [], ...extra })
const chamado = (extra: Partial<ChamadoDaEquipe> = {}) =>
  ({ id: 't1', numero: 'SUP-0001', version: 4, origemDoProblema: 'ia', problema: null, ...extra }) as unknown as ChamadoDaEquipe
const erro = (status: number, message: string) => ({ isAxiosError: true, response: { status, data: { message } } })

function montar(c: ChamadoDaEquipe, sugeridos: ResumoDoProblema[] | null = []) {
  const props = { onAtualizar: vi.fn(), onRecarregar: vi.fn(), onAbrir: vi.fn() }
  render(<LayerProvider><ProblemaDoChamado c={c} sugeridos={sugeridos} {...props} /></LayerProvider>)
  return props
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom não implementa scrollIntoView (o menu do campo rola até ele ao abrir).
  Element.prototype.scrollIntoView = vi.fn()
})

describe('Problema do chamado (SCRUM-1387)', () => {
  it('sugestão "Parece com PRB-0007 · N chamados em M empresas": nada muda sozinho; vincular é manual e devolve o chamado', async () => {
    const vinculado = chamado({ problema: P, version: 5 })
    api.vincularProblema.mockResolvedValue(vinculado)
    const { onAtualizar } = montar(chamado(), [P])
    expect(screen.getByText(/Parece com/)).toHaveTextContent('Parece com PRB-0007 · Valor sem confirmação')
    expect(screen.getByText('3 chamados em 2 empresas · Aberto')).toBeInTheDocument()
    expect(screen.getByText(/Só sugestão: vincular é manual/)).toBeInTheDocument()
    expect(api.vincularProblema).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Vincular ao PRB-0007' }))
    await waitFor(() => expect(api.vincularProblema).toHaveBeenCalledWith('t1', 'p7', 4))
    expect(onAtualizar).toHaveBeenCalledWith(vinculado)
    expect(showToast).toHaveBeenCalledWith('Vinculado ao PRB-0007.', 'success')
  })

  it('SCRUM-1393: a sugestão diz por que parece o mesmo erro (assinatura e/ou relato parecido, de outra empresa)', () => {
    montar(chamado(), [{ ...P, motivo: 'Relato 56% parecido com SUP-0042 (Clínica Serra) — já em 2 empresas.', mesmaAssinatura: false }])
    expect(screen.getByText('Relato 56% parecido com SUP-0042 (Clínica Serra) — já em 2 empresas.')).toBeInTheDocument()
    expect(api.vincularProblema).not.toHaveBeenCalled()
  })

  it('problema novo a partir do chamado: título opcional (vazio, o backend dá o padrão)', async () => {
    api.criarProblema.mockResolvedValue(chamado({ problema: P }))
    const { onAtualizar } = montar(chamado(), null)
    fireEvent.click(screen.getByRole('button', { name: 'Problema novo' }))
    fireEvent.change(screen.getByLabelText('Título do problema'), { target: { value: '  Valor sem confirmação ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e vincular' }))
    await waitFor(() => expect(api.criarProblema).toHaveBeenCalledWith('t1', 'Valor sem confirmação', 4))
    expect(onAtualizar).toHaveBeenCalledWith(chamado({ problema: P }))

    fireEvent.click(screen.getByRole('button', { name: 'Problema novo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar e vincular' }))
    await waitFor(() => expect(api.criarProblema).toHaveBeenLastCalledWith('t1', null, 4))
  })

  it('vinculado: status, causa e Jira do PROBLEMA salvos na hora; o chamado guarda só o resumo', async () => {
    const c = chamado({ problema: P })
    const { onAtualizar } = montar(c)
    expect(screen.getByRole('region', { name: 'Problema PRB-0007' })).toHaveTextContent('3 chamados em 2 empresas')

    api.atualizarProblema.mockResolvedValue(completo({ status: 'investigando', nomeDoStatus: 'Investigando', lista: [{ id: 't1' } as never] }))
    fireEvent.click(screen.getByRole('button', { name: 'Status do problema: Aberto' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Investigando' }))
    await waitFor(() => expect(api.atualizarProblema).toHaveBeenCalledWith('p7', { status: 'investigando' }))
    const novo = onAtualizar.mock.calls[0][0] as ChamadoDaEquipe
    expect(novo.problema).toEqual({ ...P, status: 'investigando', nomeDoStatus: 'Investigando' })

    api.atualizarProblema.mockResolvedValue(completo({ causaRaiz: 'generative_residual' }))
    fireEvent.click(screen.getByRole('button', { name: 'Causa do problema: não informado' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Erro residual da IA' }))
    await waitFor(() => expect(api.atualizarProblema).toHaveBeenCalledWith('p7', { causaRaiz: 'generative_residual' }))

    api.atualizarProblema.mockResolvedValue(completo({ jiraRef: 'SCRUM-1400' }))
    const jira = screen.getByLabelText('Card do Jira do problema')
    fireEvent.change(jira, { target: { value: ' SCRUM-1400 ' } })
    fireEvent.blur(jira)
    await waitFor(() => expect(api.atualizarProblema).toHaveBeenCalledWith('p7', { jiraRef: 'SCRUM-1400' }))
  })

  it('"corrigido" sem o candidato a teste: a recusa do backend vira aviso e nada muda', async () => {
    api.atualizarProblema.mockRejectedValue(erro(400, 'Problema corrigido precisa do candidato a teste de regressão: gere a fixture a partir de um chamado de IA.'))
    const { onAtualizar } = montar(chamado({ problema: P }))
    fireEvent.click(screen.getByRole('button', { name: 'Status do problema: Aberto' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Corrigido' }))
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/precisa do candidato a teste de regressão/), 'error'))
    expect(onAtualizar).not.toHaveBeenCalled()
  })

  it('candidato a teste: gerar de chamado de IA; baixar quando existe; fora da IA, só a explicação', async () => {
    api.gerarFixture.mockResolvedValue(completo({ temFixture: true, fixture: { id: 'sup-0001', deChamado: 'SUP-0001', geradaEm: '2026-10-15T10:00:00Z' } }))
    const c = chamado({ problema: P })
    const { onAtualizar } = montar(c)
    fireEvent.click(screen.getByRole('button', { name: 'Gerar deste chamado' }))
    await waitFor(() => expect(api.gerarFixture).toHaveBeenCalledWith('p7', 't1'))
    expect((onAtualizar.mock.calls[0][0] as ChamadoDaEquipe).problema).toMatchObject({ temFixture: true })
  })

  it('com o candidato: "Baixar JSON" baixa pelo backend (a leitura fica registrada lá)', async () => {
    api.baixarFixture.mockResolvedValue(undefined)
    montar(chamado({ problema: { ...P, temFixture: true } }))
    expect(screen.getByText('Candidato gerado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Baixar JSON' }))
    await waitFor(() => expect(api.baixarFixture).toHaveBeenCalledWith('p7', 'PRB-0007'))
    expect(screen.getByRole('button', { name: 'Gerar de novo deste chamado' })).toBeInTheDocument()
  })

  it('chamado que não é sobre a IA não gera o candidato', () => {
    montar(chamado({ problema: P, origemDoProblema: 'plataforma' }))
    expect(screen.queryByRole('button', { name: 'Gerar deste chamado' })).toBeNull()
    expect(screen.getByText('Sai de um chamado sobre resposta da IA do problema.')).toBeInTheDocument()
  })

  it('desvincular devolve o chamado; 409 recarrega o chamado', async () => {
    api.vincularProblema.mockResolvedValueOnce(chamado())
    const props = montar(chamado({ problema: P }))
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular este chamado' }))
    await waitFor(() => expect(api.vincularProblema).toHaveBeenCalledWith('t1', null, 4))
    expect(props.onAtualizar).toHaveBeenCalledWith(chamado())

    api.vincularProblema.mockRejectedValueOnce(erro(409, 'Alguém mudou este chamado agora há pouco. Recarregue antes de salvar.'))
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular este chamado' }))
    await waitFor(() => expect(props.onRecarregar).toHaveBeenCalled())
    expect(showToast).toHaveBeenCalledWith('Alguém mudou este chamado agora há pouco. Recarregue antes de salvar.', 'error')
  })
})
