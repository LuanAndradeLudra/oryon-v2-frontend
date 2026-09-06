import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingChecklist } from './OnboardingChecklist'
import { computeOnboardingState, type OnboardingInput } from './onboardingState'
import type { WhatsAppNumber, WhatsAppTemplate } from '@/types'

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

function line(patch: Partial<WhatsAppNumber> = {}): WhatsAppNumber {
  return { id: 'n1', displayPhoneNumber: '5511999887766', status: 'CONNECTED', ...patch }
}

function tpl(patch: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  return {
    id: 't1', tenantId: 'tenant', name: 'boas_vindas_v1', language: 'pt_BR',
    category: 'MARKETING', status: 'APPROVED', body: 'Corpo',
    createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z',
    ...patch,
  }
}

function renderChecklist(input: Partial<OnboardingInput> = {}, props: Partial<Parameters<typeof OnboardingChecklist>[0]> = {}) {
  const handlers = { onCreateTemplate: vi.fn(), onImportFromMeta: vi.fn() }
  const state = computeOnboardingState({ numbers: [], templates: [], campaignCount: 0, ...input })
  render(
    <MemoryRouter>
      <OnboardingChecklist state={state} composerReady {...handlers} {...props} />
    </MemoryRouter>,
  )
  return handlers
}

describe('OnboardingChecklist', () => {
  it('conta o que falta no título e no anel', () => {
    renderChecklist()
    expect(screen.getByRole('heading', { name: /Faltam 3 passos/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3')
  })

  it('usa o singular quando falta um só — "Faltam 1 passo" seria desleixo', () => {
    renderChecklist({ numbers: [line()], templates: [tpl()] })
    expect(screen.getByRole('heading', { name: /Falta 1 passo/ })).toBeInTheDocument()
    expect(screen.queryByText(/Faltam 1/)).not.toBeInTheDocument()
  })

  it('o passo feito perde a ação — não há o que fazer nele', () => {
    renderChecklist({ numbers: [line()] })
    expect(screen.queryByRole('button', { name: 'Conectar WhatsApp' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Criar template/ })).toBeInTheDocument()
  })

  it('mostra o chip de análise com contagem e nome, quando há', () => {
    renderChecklist({ numbers: [line()], templates: [tpl({ status: 'PENDING' })] })
    expect(screen.getByText('1 em análise')).toBeInTheDocument()
    expect(screen.getByText('boas_vindas_v1')).toBeInTheDocument()
  })

  it('as duas ações do passo 2 chegam ao dono do fluxo', () => {
    const handlers = renderChecklist({ numbers: [line()] })
    fireEvent.click(screen.getByRole('button', { name: /Criar template/ }))
    expect(handlers.onCreateTemplate).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /Importar da Meta/ }))
    expect(handlers.onImportFromMeta).toHaveBeenCalledOnce()
  })

  it('"Importar da Meta" desabilita enquanto importa', () => {
    renderChecklist({ numbers: [line()] }, { importing: true })
    expect(screen.getByRole('button', { name: /Importar da Meta/ })).toBeDisabled()
  })

  it('o passo 3 só abre o Composer quando 1 e 2 estão prontos', () => {
    renderChecklist({ numbers: [line()] })
    const botao = screen.getByRole('button', { name: /Abrir Composer/ })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('title', expect.stringContaining('Conecte uma linha'))
  })

  it('sem o Composer no ar, o passo 3 fica desabilitado COM O MOTIVO', () => {
    // A válvula que o Maestro pediu: mandar alguém para um esqueleto no fim de
    // um checklist de onboarding é o pior lugar possível para um beco.
    renderChecklist({ numbers: [line()], templates: [tpl()] }, { composerReady: false })
    const botao = screen.getByRole('button', { name: /Abrir Composer/ })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('title', 'Disponível quando o construtor de disparos entrar')
  })

  it('com o Composer no ar e os pré-requisitos prontos, o passo 3 navega', () => {
    renderChecklist({ numbers: [line()], templates: [tpl()] })
    const botao = screen.getByRole('button', { name: /Abrir Composer/ })
    expect(botao).toBeEnabled()
    fireEvent.click(botao)
    expect(navigate).toHaveBeenCalledWith('/campaigns/new')
  })

  it('o selo de qualidade só aparece quando quem olha pode vê-lo', () => {
    // `/meta/health` é admin-only. Sem o selo, o passo 1 não escreve nada no
    // lugar — nada de "qualidade —" ou de valor vazio.
    renderChecklist({ numbers: [line()] })
    expect(screen.queryByText(/qualidade/i)).not.toBeInTheDocument()

    renderChecklist({ numbers: [line()] }, { lineQuality: 'qualidade alta' })
    expect(screen.getByText('qualidade alta')).toBeInTheDocument()
  })
})
