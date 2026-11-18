import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ESPERA_ANTES_DE_LIBERAR_MS } from '@/components/oauth/useGestoNaPagina'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { DetalheDaAprovacao } from '@/services/oauthApi'

const api = vi.hoisted(() => ({ detalhar: vi.fn(), decidir: vi.fn() }))
vi.mock('@/services/oauthApi', async (original) => ({
  ...(await original<typeof import('@/services/oauthApi')>()),
  detalharAprovacaoOAuth: api.detalhar,
  decidirAprovacaoOAuth: api.decidir,
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'ana@empresa.test' }, logout: vi.fn() }) }))

import { OAuthAprovarPage } from './OAuthAprovarPage'
import { resumoSemCitacao } from '@/components/oauth/resumoSemCitacao'

const ID = 'a'.repeat(43)
function pedido(extra: Partial<DetalheDaAprovacao> = {}): DetalheDaAprovacao {
  return {
    id: ID,
    csrf: 'csrf-a',
    cliente: 'Claude',
    acao: 'enviar o texto "Olá" a Ana P. (conversa 1a2b3c4d) #abc123',
    previa: 'conversation:\n  contact: {"name":"Ana P."}\ntext: Olá',
    previaCortada: false,
    status: 'pendente',
    criadoEm: new Date().toISOString(),
    expiraEm: new Date(Date.now() + 300_000).toISOString(),
    ...extra,
  }
}
const erroHttp = (status: number, code: string) => Object.assign(new Error(code), { response: { status, data: { error: { code, message: code } } } })

function abrir() {
  return render(
    <MemoryRouter initialEntries={[`/oauth/aprovar/${ID}`]}>
      <Routes>
        <Route path="/oauth/aprovar/:id" element={<OAuthAprovarPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Revisão ORY-94 (2ª rodada): um gesto nesta página e a espera curta liberam o "Aprovar". */
async function liberarAprovar() {
  await act(async () => {
    window.dispatchEvent(new Event('pointermove'))
    await new Promise((r) => setTimeout(r, ESPERA_ANTES_DE_LIBERAR_MS + 50))
  })
}

describe('OAuthAprovarPage — aprovar a ação de um aplicativo externo', () => {
  beforeEach(() => {
    api.detalhar.mockReset()
    api.decidir.mockReset()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  })

  it('mostra quem pede, a ação e os detalhes', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    expect(await screen.findByRole('heading', { name: 'Claude quer fazer uma ação em seu nome' })).toBeInTheDocument()
    expect(screen.getByText(/enviar o texto "Olá" a Ana P\./)).toBeInTheDocument()
    // Os detalhes técnicos ficam recolhidos; abrem no botão.
    expect(screen.queryByText(/contact: \{"name":"Ana P\."\}/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos os detalhes' }))
    expect(await screen.findByText(/contact: \{"name":"Ana P\."\}/)).toBeInTheDocument()
    expect(api.detalhar).toHaveBeenCalledWith(ID)
    // Revisão ORY-94: mostra com qual conta a pessoa está decidindo.
    expect(screen.getByText('ana@empresa.test')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usar outra conta' })).toBeInTheDocument()
  })

  it('revisão: prévia grande demais — dá para recusar, não para aprovar', async () => {
    api.detalhar.mockResolvedValue(pedido({ previaCortada: true }))
    abrir()
    expect(await screen.findByText(/grande demais para conferir inteira/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Recusar' })).not.toBeDisabled()
  })

  it('aprovar manda o CSRF e mostra que é para voltar ao aplicativo', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ status: 'aprovada' })
    abrir()
    await screen.findByRole('button', { name: 'Aprovar' })
    await liberarAprovar()
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('heading', { name: 'Ação aprovada' })).toBeInTheDocument()
    // ORY-117: o Claude percebe sozinho (espera ativa); avisar só se ele já parou.
    expect(screen.getByText(/Volte ao Claude: ele segue sozinho/)).toBeInTheDocument()
    expect(api.decidir).toHaveBeenCalledWith(ID, { csrf: 'csrf-a', aprovar: true })
  })

  it('recusar diz que nada foi feito', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ status: 'recusada' })
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
    expect(await screen.findByRole('heading', { name: 'Ação recusada' })).toBeInTheDocument()
    expect(screen.getByText(/Nada foi feito/)).toBeInTheDocument()
    expect(api.decidir).toHaveBeenCalledWith(ID, { csrf: 'csrf-a', aprovar: false })
  })

  it('pedido já decidido abre direto no resultado (sem botões)', async () => {
    api.detalhar.mockResolvedValue(pedido({ status: 'aprovada' }))
    abrir()
    expect(await screen.findByRole('heading', { name: 'Ação aprovada' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
  })

  it('indisponível (vencido, concluído ou de outra conta): texto neutro, sem mandar refazer', async () => {
    api.detalhar.mockRejectedValue(erroHttp(404, 'aprovacao_expirada'))
    abrir()
    expect(await screen.findByText('Este pedido não está mais disponível')).toBeInTheDocument()
    expect(screen.queryByText(/preparar a ação de novo/)).toBeNull()
    expect(screen.getByText('ana@empresa.test')).toBeInTheDocument()
  })

  it('decidido em outra aba enquanto esta estava aberta: avisa sem quebrar', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockRejectedValue(erroHttp(409, 'ja_decidido'))
    abrir()
    await screen.findByRole('button', { name: 'Aprovar' })
    await liberarAprovar()
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText(/já foi decidido/)).toBeInTheDocument()
  })

  it('revisão: "Aprovar" nasce desabilitado e só libera depois de um gesto na página e da espera', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    const aprovar = await screen.findByRole('button', { name: 'Aprovar' })
    expect(aprovar).toBeDisabled()
    // Só o tempo, sem gesto nesta página: continua desabilitado.
    await act(async () => {
      await new Promise((r) => setTimeout(r, ESPERA_ANTES_DE_LIBERAR_MS + 50))
    })
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
    await liberarAprovar()
    expect(screen.getByRole('button', { name: 'Aprovar' })).not.toBeDisabled()
    // Página sem foco (outra janela por cima): volta a pedir um gesto.
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    await act(async () => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
  })

  it('dentro de um iframe: não carrega nem mostra os botões', async () => {
    const topo = Object.getOwnPropertyDescriptor(window, 'top')
    Object.defineProperty(window, 'top', { configurable: true, value: {} })
    try {
      abrir()
      expect(await screen.findByText(/não abre dentro de outra página/)).toBeInTheDocument()
      expect(api.detalhar).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull()
    } finally {
      if (topo) Object.defineProperty(window, 'top', topo)
    }
  })
})

/** Revisão de 18/11 (pedido do João): a ação escrita para gente, a mensagem inteira e os botões à vista. */
describe('OAuthAprovarPage — leitura da ação', () => {
  beforeEach(() => {
    api.detalhar.mockReset()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  })

  it('mostra o nome da ação, a mensagem inteira e o resumo sem repetir o texto; os detalhes ficam recolhidos', async () => {
    const texto = 'Olá, Ana!\nSegue a confirmação da sua consulta de amanhã às 9h.'
    api.detalhar.mockResolvedValue(
      pedido({
        acao: 'enviar o texto "Olá, Ana! Segue a confirmação…" (+20 caracteres) a Ana P. (conversa 1a2b3c4d) #abc123',
        titulo: 'Enviar mensagem de texto',
        conteudo: { rotulo: 'Mensagem', texto },
      }),
    )
    abrir()
    expect(await screen.findByText('Enviar mensagem de texto')).toBeInTheDocument()
    expect(screen.getByText('enviar o texto a Ana P. (conversa 1a2b3c4d) #abc123')).toBeInTheDocument()
    expect(screen.getByText('Mensagem')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.textContent === texto && el.tagName === 'DIV')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver todos os detalhes' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
  })

  it('pedido antigo, sem título nem conteúdo: o resumo inteiro, como antes', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    expect(await screen.findByText('A ação')).toBeInTheDocument()
    expect(screen.getByText(/enviar o texto "Olá" a Ana P\./)).toBeInTheDocument()
  })

  it('resumoSemCitacao: tira só o trecho citado, e só quando o texto inteiro aparece', () => {
    expect(resumoSemCitacao('enviar o texto "Oi…" (+12 caracteres) a Ana P. #abc123', true)).toBe('enviar o texto a Ana P. #abc123')
    expect(resumoSemCitacao('enviar o texto "Oi" a Ana P. #abc123', true)).toBe('enviar o texto a Ana P. #abc123')
    expect(resumoSemCitacao('enviar o texto "Oi" a Ana P. #abc123', false)).toBe('enviar o texto "Oi" a Ana P. #abc123')
    expect(resumoSemCitacao('pausar o agente Recepção #abc123', true)).toBe('pausar o agente Recepção #abc123')
  })
})
