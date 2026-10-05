// Plano MA (MA-6.2): a tela de templates com o que a Meta avisa — status
// novos não quebram a lista, o motivo aparece em todo status que tira o
// template do ar, sinal/qualidade/categoria prevista aparecem, e o excluído na
// Meta fica fora de "Todos".
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { WhatsAppTemplate } from '@/types'

const base = { tenantId: 't', language: 'pt_BR', category: 'UTILITY', body: 'Olá {{1}}', createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z', whatsappNumberId: 'l1' }
const TEMPLATES = [
  { ...base, id: 'a', name: 'lembrete_ok', status: 'APPROVED' },
  { ...base, id: 'b', name: 'promo_pausada', status: 'PAUSED', metaStatusReason: 'primeira pausa por baixa qualidade' },
  { ...base, id: 'c', name: 'antiga_arquivada', status: 'ARCHIVED' },
  { ...base, id: 'd', name: 'apagada_na_meta', status: 'DELETED' },
  { ...base, id: 'e', name: 'sinalizada', status: 'APPROVED', metaFlag: 'FLAGGED', qualityScore: 'RED', pendingCategory: 'MARKETING', pendingCategoryAt: '2026-10-15T12:00:00Z' },
] as unknown as WhatsAppTemplate[]

vi.mock('@/services/api', () => ({
  templatesApi: {
    pullFromMeta: () => Promise.resolve({ data: { errors: [], imported: 0 } }),
    list: () => Promise.resolve({ data: TEMPLATES }),
  },
}))
vi.mock('@/contexts/WorkspaceNumberContext', () => ({
  useWorkspaceNumber: () => ({ numbers: [{ id: 'l1', displayPhoneNumber: '+55 11 0000-0000' }], loading: false, refresh: vi.fn() }),
}))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }))
vi.mock('@/components/common/WhatsappLineChip', () => ({ WhatsappLineChip: () => null }))

import { TemplatesTab } from './TemplatesTab'

afterEach(() => cleanup())

function montar(onCountChange?: (n: number) => void) {
  return render(<MemoryRouter><TemplatesTab onCountChange={onCountChange} /></MemoryRouter>)
}
const abrir = async (nome: string) => {
  fireEvent.click((await screen.findByText(nome)).closest('button')!)
}

describe('TemplatesTab — avisos da Meta (MA-6.2)', () => {
  it('status que a tela não conhecia (ARCHIVED) aparece com rótulo, sem quebrar a lista', async () => {
    montar()
    const linha = (await screen.findByText('antiga_arquivada')).closest('button')!
    expect(within(linha).getByText('Arquivado')).toBeInTheDocument()
  })

  it('pausado: o motivo e a orientação de que a campanha não volta sozinha', async () => {
    montar()
    await abrir('promo_pausada')
    expect(await screen.findByText('A Meta pausou este template.')).toBeInTheDocument()
    expect(screen.getByText('primeira pausa por baixa qualidade')).toBeInTheDocument()
    expect(screen.getByText(/para reenviar, crie uma nova campanha/i)).toBeInTheDocument()
  })

  it('sinalizado: aviso de qualidade, nota baixa e a categoria que vai mudar — sem dizer que parou', async () => {
    montar()
    await abrir('sinalizada')
    expect(await screen.findByText(/sinalizou este template por qualidade baixa/)).toBeInTheDocument()
    expect(screen.getByText('Baixa')).toBeInTheDocument()
    expect(screen.getByText(/vai mudar a categoria deste template para Marketing/)).toBeInTheDocument()
    expect(screen.queryByText(/foram interrompidas/)).toBeNull()
  })

  it('excluído na Meta fica fora de "Todos" e tem filtro próprio', async () => {
    montar()
    await screen.findByText('lembrete_ok')
    expect(screen.queryByText('apagada_na_meta')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Excluídos na Meta' }))
    await waitFor(() => expect(screen.getByText('apagada_na_meta')).toBeInTheDocument())
  })

  it('a contagem da aba não inclui os excluídos na Meta (revisão de código 01/10)', async () => {
    const conta = vi.fn()
    montar(conta)
    await screen.findByText('lembrete_ok')
    await waitFor(() => expect(conta).toHaveBeenLastCalledWith(4))
  })
})
