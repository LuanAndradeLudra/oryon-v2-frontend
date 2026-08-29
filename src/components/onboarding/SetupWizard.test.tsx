// F13-899/900/901 — o wizard de primeiro uso: três passos (WhatsApp → time →
// contexto da IA), retomável, sem nenhum passo de CRM. As seções pesadas
// reaproveitadas (Números WhatsApp, Setores) entram mockadas: o que se testa
// aqui é o caminho, não o conteúdo delas — que já tem teste próprio.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const completeOnboarding = vi.fn()
const complete = vi.fn().mockResolvedValue({ data: { success: true } })
let multiPipeline = true

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { tenantId: 't1' }, completeOnboarding }),
}))
vi.mock('@/hooks/useMultiPipeline', () => ({ useMultiPipeline: () => multiPipeline }))
vi.mock('@/services/api', () => ({ onboardingApi: { complete: () => complete() } }))
vi.mock('@/services/agentsApi', () => ({ extractBrandFile: vi.fn() }))
vi.mock('@/components/settings/sections/WhatsAppNumbers', () => ({
  WhatsAppNumbers: () => <div data-testid="wa-numbers-section" />,
}))
vi.mock('@/components/settings/sections/Departments', () => ({
  Departments: () => <div data-testid="departments-section" />,
}))
const saveHub = vi.fn()
vi.mock('@/services/companyContextService', async () => {
  const DEFAULT_HUB = {
    companyName: '', industry: '', businessType: [], teamSize: '', description: '',
    productsServices: '', website: '', instagram: '', facebook: '', linkedin: '',
    twitter: '', whatsapp: '', brandFiles: [], lastUpdatedAt: '',
  }
  return { DEFAULT_HUB, loadHub: () => ({ ...DEFAULT_HUB }), saveHub: (...a: unknown[]) => saveHub(...a) }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

import { SetupWizard } from './SetupWizard'

const onComplete = vi.fn()

describe('SetupWizard — primeiro uso em 3 passos (F13)', () => {
  beforeEach(() => {
    localStorage.clear()
    multiPipeline = true
    vi.clearAllMocks()
  })

  it('abre no passo 1 (conectar WhatsApp), reaproveitando a seção de Configurações', () => {
    render(<SetupWizard onComplete={onComplete} />)

    expect(screen.getByTestId('setup-step-counter')).toHaveTextContent('Passo 1 de 3')
    expect(screen.getByText('Conectar WhatsApp')).toBeInTheDocument()
    expect(screen.getByTestId('wa-numbers-section')).toBeInTheDocument()
    // Não há "Voltar" no primeiro passo.
    expect(screen.queryByTestId('setup-back')).toBeNull()
  })

  it('avança WhatsApp → time → contexto da IA e salva o passo a cada troca (retomável)', async () => {
    render(<SetupWizard onComplete={onComplete} />)

    fireEvent.click(screen.getByTestId('setup-continue'))
    await waitFor(() => expect(screen.getByTestId('departments-section')).toBeInTheDocument())
    expect(screen.getByTestId('setup-step-counter')).toHaveTextContent('Passo 2 de 3')
    expect(localStorage.getItem('oryon.setup.step.t1')).toBe('team')

    fireEvent.click(screen.getByTestId('setup-continue'))
    await waitFor(() => expect(screen.getByText('Contexto da IA')).toBeInTheDocument())
    expect(screen.getByTestId('setup-step-counter')).toHaveTextContent('Passo 3 de 3')
    expect(localStorage.getItem('oryon.setup.step.t1')).toBe('hub')
  })

  it('retoma no passo salvo — F5 no meio do wizard não volta ao começo', () => {
    localStorage.setItem('oryon.setup.step.t1', 'team')

    render(<SetupWizard onComplete={onComplete} />)

    expect(screen.getByTestId('setup-step-counter')).toHaveTextContent('Passo 2 de 3')
    expect(screen.getByTestId('departments-section')).toBeInTheDocument()
  })

  it('"Voltar" desfaz o passo e regrava o progresso', async () => {
    localStorage.setItem('oryon.setup.step.t1', 'team')
    render(<SetupWizard onComplete={onComplete} />)

    fireEvent.click(screen.getByTestId('setup-back'))

    await waitFor(() => expect(screen.getByTestId('wa-numbers-section')).toBeInTheDocument())
    expect(screen.getByTestId('setup-step-counter')).toHaveTextContent('Passo 1 de 3')
    expect(localStorage.getItem('oryon.setup.step.t1')).toBe('whatsapp')
  })

  it('pular o último passo conclui: marca no servidor, marca na sessão e limpa o progresso', async () => {
    localStorage.setItem('oryon.setup.step.t1', 'hub')
    render(<SetupWizard onComplete={onComplete} />)

    fireEvent.click(screen.getByTestId('setup-skip-step'))
    await screen.findByText('Plataforma pronta!')

    expect(complete).toHaveBeenCalledTimes(1)
    expect(completeOnboarding).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('oryon.setup.step.t1')).toBeNull()
    // Pular NÃO salva o Hub (o usuário não preencheu).
    expect(saveHub).not.toHaveBeenCalled()
  })

  it('a tela final anuncia o funil "Vendas" só com o flag de múltiplos funis (SCRUM-498)', async () => {
    localStorage.setItem('oryon.setup.step.t1', 'hub')
    const { unmount } = render(<SetupWizard onComplete={onComplete} />)
    fireEvent.click(screen.getByTestId('setup-skip-step'))
    expect(await screen.findByTestId('setup-done-pipeline')).toHaveTextContent('Vendas')
    unmount()

    multiPipeline = false
    localStorage.setItem('oryon.setup.step.t1', 'hub')
    render(<SetupWizard onComplete={onComplete} />)
    fireEvent.click(screen.getByTestId('setup-skip-step'))
    await screen.findByText('Plataforma pronta!')

    expect(screen.queryByTestId('setup-done-pipeline')).toBeNull()
  })

  it('nenhum passo pede estágios, campos ou funil — a geração de CRM saiu do onboarding (F13-901)', async () => {
    render(<SetupWizard onComplete={onComplete} />)
    const textOf = () => document.body.textContent ?? ''

    const proibidos = /estágio|campo personalizado|gerar com ia|pipeline/i
    expect(textOf()).not.toMatch(proibidos)
    fireEvent.click(screen.getByTestId('setup-continue'))
    await waitFor(() => expect(screen.getByTestId('departments-section')).toBeInTheDocument())
    expect(textOf()).not.toMatch(proibidos)
    fireEvent.click(screen.getByTestId('setup-continue'))
    await waitFor(() => expect(screen.getByText('Contexto da IA')).toBeInTheDocument())
    expect(textOf()).not.toMatch(proibidos)
  })
})
