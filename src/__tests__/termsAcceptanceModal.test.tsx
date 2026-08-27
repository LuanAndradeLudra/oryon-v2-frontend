/**
 * Pedido de aceite dos termos (SCRUM-777 / H3).
 *
 * O teste que mais importa aqui é o que garante que o modal **não trava o
 * painel**. O cartão é explícito: "Contrato vigente não é suspenso por falta
 * de re-aceite — a operação decide o que fazer". Um modal intransponível seria
 * exatamente uma suspensão, decidida pelo código em vez da operação, e
 * aplicada a um cliente que está pagando em dia.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('@/services/termsApi', async () => {
  const real = await vi.importActual<typeof import('@/services/termsApi')>('@/services/termsApi')
  return {
    ...real,
    termsApi: { pending: vi.fn(), accept: vi.fn(), upcoming: vi.fn() },
  }
})

import { termsApi } from '@/services/termsApi'
import { TermsAcceptanceModal } from '@/components/terms/TermsAcceptanceModal'

const mock = termsApi as unknown as {
  pending: ReturnType<typeof vi.fn>
  accept: ReturnType<typeof vi.fn>
}

const versao = (id: string, document = 'terms_of_use', version = '2026-08-10') => ({
  id,
  document,
  version,
  contentUrl: `https://oryon/termos/${id}`,
  effectiveAt: '2026-08-10T00:00:00.000Z',
})

beforeEach(() => {
  mock.pending.mockReset()
  mock.accept.mockReset().mockResolvedValue(undefined)
})

describe('quando não há pendência', () => {
  it('não renderiza nada', async () => {
    mock.pending.mockResolvedValue([])
    const { container } = render(<TermsAcceptanceModal />)
    await waitFor(() => expect(mock.pending).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('falha ao consultar não deixa o modal aparecer', async () => {
    mock.pending.mockRejectedValue(new Error('500'))
    const { container } = render(<TermsAcceptanceModal />)
    await waitFor(() => expect(mock.pending).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  // LIMITE CONHECIDO: este teste NAO distingue a presenca do `.catch()` no
  // componente. Sem ele o estado fica vazio do mesmo jeito e o modal tambem
  // nao aparece; o que sobra e uma rejeicao nao tratada, que em producao vira
  // ruido no Sentry. Tentei detectar com um ouvinte de `unhandledrejection` e
  // o Vitest intercepta antes. O catch fica porque esta certo, nao porque um
  // teste o defende — e isso esta escrito aqui para ninguem supor o contrario.

})

describe('quando há pendência', () => {
  it('lista os documentos com a versão', async () => {
    mock.pending.mockResolvedValue([versao('v1')])
    render(<TermsAcceptanceModal />)
    expect(await screen.findByText('Termos de Uso')).toBeTruthy()
    expect(screen.getByText(/versão 2026-08-10/)).toBeTruthy()
  })

  it('aceitar registra CADA versão pendente e fecha', async () => {
    mock.pending.mockResolvedValue([versao('v1'), versao('v2', 'privacy_policy')])
    render(<TermsAcceptanceModal />)

    fireEvent.click(await screen.findByRole('button', { name: /li e concordo/i }))

    await waitFor(() => expect(mock.accept).toHaveBeenCalledTimes(2))
    expect(mock.accept).toHaveBeenCalledWith('v1')
    expect(mock.accept).toHaveBeenCalledWith('v2')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('erro ao registrar mantém o modal aberto e explica', async () => {
    mock.accept.mockRejectedValue(new Error('rede'))
    mock.pending.mockResolvedValue([versao('v1')])
    render(<TermsAcceptanceModal />)

    fireEvent.click(await screen.findByRole('button', { name: /li e concordo/i }))

    expect(await screen.findByText(/não foi possível registrar/i)).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('não suspende quem está em dia', () => {
  it('"Agora não" fecha o modal SEM aceitar', async () => {
    // A propriedade central da SCRUM-777. Um modal intransponível seria uma
    // suspensão de contrato decidida pelo código.
    mock.pending.mockResolvedValue([versao('v1')])
    render(<TermsAcceptanceModal />)

    fireEvent.click(await screen.findByRole('button', { name: /agora não/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mock.accept).not.toHaveBeenCalled()
  })

  it('o X também fecha, e também sem aceitar', async () => {
    mock.pending.mockResolvedValue([versao('v1')])
    render(<TermsAcceptanceModal />)

    fireEvent.click(await screen.findByRole('button', { name: /fechar/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mock.accept).not.toHaveBeenCalled()
  })
})
