// ─── SONDA F1 do #158 — "Assumir" no modo degradado DESATRIBUI a conversa ────
//
// Escrita pelo Calibre na revisão do #158 (`8f61b8d`) e entregue à Tecelã como
// TESTE DE REGRESSÃO do conserto. Copie para
//   src/pages/agents/HandoffInboxPage.assumir.test.tsx
//
// COMO ELA ESTÁ HOJE: C1 FALHA (é o defeito), C2 e C3 passam.
// COMO ELA TEM QUE FICAR: os três passam.
//
// O defeito: `HandoffInboxPage.tsx:86` chama `conversationsApi.assign(id, null)`
// no ramo degradado. `null` NÃO é no-op — é DESATRIBUIR, e está escrito em três
// lugares independentes: a assinatura em `services/api.ts:921`, o comentário do
// backend em `conversations.controller.ts:252` ("ou null para desatribuir") e a
// implementação em `conversations.service.ts:1283`, que escreve
// `assignedUserId: targetUserId` sem reinterpretar o null. Hoje o toast ainda
// diz "Conversa assumida." com variante success.
//
// C3 É A PARTE QUE MAIS IMPORTA e não é opcional: "Devolver à IA" também passa
// `null`, e ali o `null` está CERTO (limpar a pausa = a IA volta a atender). Os
// dois ramos passam null e só um está errado — sem o C3, "parar de mandar null"
// conserta o C1 e quebra o "Devolver".
//
// NOTA: não há `@testing-library/user-event` neste repo; use `fireEvent`.
// "Devolver à IA" abre um ConfirmModal, então são dois cliques.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const listaHandoffs = vi.fn()
const claimHandoff = vi.fn()
const returnHandoff = vi.fn()
const listaConversas = vi.fn()
const assign = vi.fn()
const setAiPause = vi.fn()
const toast = vi.fn()

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/contexts/TopBarActionsContext', () => ({ useRegisterTopBarActions: () => {} }))
// ADIÇÃO DA TECELÃ ao copiar a sonda: o conserto do C1 passou a ler QUEM está
// assumindo, e `useAuth` lança fora do provider. Sem este mock a sonda nem
// monta — não é afrouxar a prova, é dar a ela a sessão que a tela agora exige.
// O `expect` do C1 continua o que o Calibre escreveu.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-logado', tenantId: 't1' } }),
}))
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast }) }))
vi.mock('@/services/agentsApi', () => ({ listAgents: () => Promise.resolve([]) }))
vi.mock('@/services/agentsOpsApi', () => ({
  handoffsApi: {
    list: (...a: unknown[]) => listaHandoffs(...a),
    summary: () => Promise.resolve({ data: null }),
    claim: (...a: unknown[]) => claimHandoff(...a),
    return: (...a: unknown[]) => returnHandoff(...a),
    detail: () => Promise.resolve({ data: null }),
  },
}))
vi.mock('@/services/api', () => ({
  conversationsApi: {
    list: (...a: unknown[]) => listaConversas(...a),
    assign: (...a: unknown[]) => assign(...a),
    setAiPause: (...a: unknown[]) => setAiPause(...a),
    get: () => Promise.resolve({ data: null }),
    listMessages: () => Promise.resolve({ data: { data: [] } }),
  },
}))

const { HandoffInboxPage } = await import('./HandoffInboxPage')

const erro404 = Object.assign(new Error('nope'), { response: { status: 404 } })

const conversa = {
  id: 'c1',
  contact: { id: 'ct1', displayName: 'Ana Souza', waId: '5511999999977' },
  lastMessageAt: new Date(Date.now() - 60_000).toISOString(),
}

const handoffReal = {
  id: 'h1', conversationId: 'c1',
  contact: { id: 'ct1', name: 'Ana Souza', phoneMasked: '+55 11 9******-77' },
  agent: { id: 'a1', name: 'Alfa' }, rule: { id: null, label: null },
  target: { type: null, id: null, label: null }, intent: null,
  queue: '', summary: null, waitingSeconds: 60, slaSeconds: 300,
  createdAt: new Date(Date.now() - 60_000).toISOString(),
}

beforeEach(() => {
  ;[listaHandoffs, claimHandoff, returnHandoff, listaConversas, assign, setAiPause, toast]
    .forEach((f) => f.mockReset())
  listaConversas.mockResolvedValue({ data: { data: [conversa], total: 1 } })
  assign.mockResolvedValue({ data: {} })
  setAiPause.mockResolvedValue({ data: {} })
  claimHandoff.mockResolvedValue({ data: {} })
  returnHandoff.mockResolvedValue({ data: {} })
})

async function clicar(nome: RegExp) {
  await screen.findByText('Ana Souza')
  fireEvent.click(screen.getAllByRole('button', { name: nome })[0])
}

describe('HandoffInboxPage — "Assumir" no modo degradado', () => {
  it('C1 DEFEITO: assumir não pode mandar userId=null (o backend lê como DESATRIBUIR)', async () => {
    listaHandoffs.mockRejectedValue(erro404)
    render(<HandoffInboxPage />)
    await clicar(/assumir/i)
    await waitFor(() => expect(assign).toHaveBeenCalled())

    // O Calibre deixou o C1 em `not.toBeNull()` porque o conserto ainda não
    // estava decidido. Decidido: quem assume é a sessão. Aperto o expect ao
    // fato — "não é null" ainda passaria com um id inventado.
    expect(assign).toHaveBeenCalledWith('c1', 'u-logado')
    expect(toast).toHaveBeenCalledWith('Conversa assumida.', 'success')
  })

  it('C2 CONTROLE: com o BE.6 no ar, assumir usa handoffsApi.claim e não toca em assign', async () => {
    listaHandoffs.mockResolvedValue({ data: { items: [handoffReal], total: 1 } })
    render(<HandoffInboxPage />)
    await clicar(/assumir/i)
    await waitFor(() => expect(claimHandoff).toHaveBeenCalledWith('h1'))
    expect(assign).not.toHaveBeenCalled()
  })

  it('C3 GUARDA: "Devolver à IA" no degradado continua limpando a pausa com null', async () => {
    listaHandoffs.mockRejectedValue(erro404)
    render(<HandoffInboxPage />)
    await clicar(/devolver/i)
    // O botão da linha abre o ConfirmModal; o último é a confirmação.
    await waitFor(() => expect(screen.getAllByRole('button', { name: /devolver/i }).length).toBeGreaterThan(1))
    const botoes = screen.getAllByRole('button', { name: /devolver/i })
    fireEvent.click(botoes[botoes.length - 1])
    await waitFor(() => expect(setAiPause).toHaveBeenCalled())
    expect(setAiPause).toHaveBeenCalledWith('c1', null)
  })
})
