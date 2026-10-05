// Plano MA (MA-6.4): o limite de envio da Meta aparece legível. O cartão lia
// `messagingLimit`, que o backend nunca mandou — o limite simplesmente sumia.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'

const NUMEROS = [
  { id: 'n1', displayPhoneNumber: '+55 11 99000-0000', phoneNumberId: 'PN1', status: 'CONNECTED', qualityRating: 'RED', messagingLimitTier: 'TIER_10K', maxDailyConversations: 10000, isActive: true, isPrimary: true, label: 'Recepção' },
  { id: 'n2', displayPhoneNumber: '+55 11 98000-0000', phoneNumberId: 'PN2', status: 'CONNECTED', qualityRating: 'GREEN', messagingLimitTier: null, maxDailyConversations: null, isActive: true, isPrimary: false, label: 'Vendas' },
]

vi.mock('@/services/api', () => ({
  api: { get: vi.fn((url: string) => Promise.resolve({ data: url === '/whatsapp/numbers' ? NUMEROS : [] })), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  whatsappNumbersApi: { listDetailed: () => Promise.resolve({ data: NUMEROS }) },
}))
vi.mock('@/services/agentsApi', () => ({ listAgents: () => Promise.resolve([]) }))
vi.mock('@/contexts/WorkspaceNumberContext', () => ({ useWorkspaceNumber: () => ({ refresh: vi.fn(), numbers: NUMEROS, loading: false }) }))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }))

import { WhatsAppNumbers } from './WhatsAppNumbers'

afterEach(() => cleanup())

const cartaoDe = async (rotulo: string) => {
  const titulo = await screen.findByText(rotulo)
  let el: HTMLElement | null = titulo
  while (el && !el.className.includes('py-5')) el = el.parentElement
  return el!
}

describe('WhatsAppNumbers — limite e qualidade da Meta (MA-6.4)', () => {
  it('mostra o limite de envio e a qualidade em MAIÚSCULAS (como o backend manda)', async () => {
    render(<WhatsAppNumbers />)
    const cartao = await cartaoDe('+55 11 99000-0000')
    expect(within(cartao).getByText('10.000 contatos / 24 h')).toBeInTheDocument()
    expect(within(cartao).getByText('Baixa')).toBeInTheDocument()
  })

  it('sem limite informado diz isso, em vez de esconder', async () => {
    render(<WhatsAppNumbers />)
    const cartao = await cartaoDe('+55 11 98000-0000')
    expect(within(cartao).getByText('A Meta ainda não informou')).toBeInTheDocument()
    expect(within(cartao).getByText('Alta')).toBeInTheDocument()
  })
})
