import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { ESPERA_ANTES_DE_LIBERAR_MS, FOLGA_DO_GESTO_MS } from '@/components/oauth/useGestoNaPagina'
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
    // Revisão de 22/11 (crítico): a prévia completa começa ABERTA (ninguém aprova sem ver a ação
    // inteira); o botão só a recolhe.
    expect(await screen.findByText(/contact: \{"name":"Ana P\."\}/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos os detalhes' }))
    await waitFor(() => expect(screen.queryByText(/contact: \{"name":"Ana P\."\}/)).toBeNull())
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

  it('revisão (3ª rodada): ação que pede senha só aprova com a senha; senha errada limpa o campo', async () => {
    api.detalhar.mockResolvedValue(pedido({ precisaSenha: true }))
    api.decidir.mockRejectedValueOnce(erroHttp(403, 'senha_incorreta')).mockResolvedValueOnce({ status: 'aprovada' })
    abrir()
    await screen.findByRole('button', { name: 'Aprovar' })
    await liberarAprovar()
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
    const campo = screen.getByLabelText('Confirme a sua senha para aprovar')
    fireEvent.change(campo, { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument()
    expect(campo).toHaveValue('')
    expect(api.decidir).toHaveBeenLastCalledWith(ID, { csrf: 'csrf-a', aprovar: true, senha: 'errada' })
    fireEvent.change(campo, { target: { value: 'certa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('heading', { name: 'Ação aprovada' })).toBeInTheDocument()
    expect(api.decidir).toHaveBeenLastCalledWith(ID, { csrf: 'csrf-a', aprovar: true, senha: 'certa' })
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

  it('revisão (3ª rodada): o próprio toque que aprova não libera o "Aprovar" (double-clickjacking no celular)', async () => {
    api.detalhar.mockResolvedValue(pedido())
    api.decidir.mockResolvedValue({ status: 'aprovada' })
    abrir()
    await screen.findByRole('button', { name: 'Aprovar' })
    // A página já estava pronta havia tempo (aberta por baixo de outra).
    await act(async () => {
      await new Promise((r) => setTimeout(r, ESPERA_ANTES_DE_LIBERAR_MS + 50))
    })
    // Um toque em cima do botão: o touchstart é o 1º gesto, e o click do mesmo toque vem logo depois.
    await act(async () => {
      const botao = screen.getByRole('button', { name: 'Aprovar' })
      botao.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      botao.dispatchEvent(new Event('touchstart', { bubbles: true }))
    })
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(api.decidir).not.toHaveBeenCalled()
    // Toque longo: o botão habilita depois da folga, mas o click desse mesmo toque não vale.
    await act(async () => {
      await new Promise((r) => setTimeout(r, FOLGA_DO_GESTO_MS + 100))
    })
    expect(screen.getByRole('button', { name: 'Aprovar' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(api.decidir).not.toHaveBeenCalled()
    // Um toque novo, depois do gesto: aprova.
    await act(async () => {
      screen.getByRole('button', { name: 'Aprovar' }).dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('heading', { name: 'Ação aprovada' })).toBeInTheDocument()
    expect(api.decidir).toHaveBeenCalledTimes(1)
  })

  it('revisão (3ª rodada): a aba trazida para frente enquanto o pedido carregava não deixa o "Aprovar" travado', async () => {
    let soltar: (p: DetalheDaAprovacao) => void = () => undefined
    api.detalhar.mockReturnValue(new Promise((r) => (soltar = r)))
    // Abriu em segundo plano (sem foco)...
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    abrir()
    // ...e veio para frente antes de o pedido chegar.
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await act(async () => {
      soltar(pedido())
    })
    await screen.findByRole('button', { name: 'Aprovar' })
    await liberarAprovar()
    expect(screen.getByRole('button', { name: 'Aprovar' })).not.toBeDisabled()
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
        // A citação como o backend monta (`comeco()`): espaços juntados, entre aspas.
        acao: 'enviar o texto "Olá, Ana! Segue a confirmação da sua consulta de amanhã às 9h." a Ana P. (conversa 1a2b3c4d) #abc123',
        titulo: 'Enviar mensagem de texto',
        conteudo: { rotulo: 'Mensagem', texto },
      }),
    )
    abrir()
    expect(await screen.findByText('Enviar mensagem de texto')).toBeInTheDocument()
    expect(screen.getByText('enviar o texto a Ana P. (conversa 1a2b3c4d) #abc123')).toBeInTheDocument()
    expect(screen.getByText('Mensagem')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.textContent === texto && el.tagName === 'DIV')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver todos os detalhes' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
  })

  it('pedido antigo, sem título nem conteúdo: o resumo inteiro, como antes', async () => {
    api.detalhar.mockResolvedValue(pedido())
    abrir()
    expect(await screen.findByText('A ação')).toBeInTheDocument()
    expect(screen.getByText(/enviar o texto "Olá" a Ana P\./)).toBeInTheDocument()
  })

  it('resumoSemCitacao: tira só o trecho citado, e só quando o texto inteiro aparece', () => {
    const longo = 'x'.repeat(172)
    expect(resumoSemCitacao(`enviar o texto "${'x'.repeat(160)}…" (+12 caracteres) a Ana P. #abc123`, longo)).toBe('enviar o texto a Ana P. #abc123')
    // Prompt e instruções cortam em 120.
    const prompt = 'p'.repeat(130)
    expect(resumoSemCitacao(`publicar no agente Recepção (1a2b3c4d) o prompt novo "${'p'.repeat(120)}…" (+10 caracteres) #abc123`, prompt)).toBe(
      'publicar no agente Recepção (1a2b3c4d) o prompt novo #abc123',
    )
    expect(resumoSemCitacao('enviar o texto "Oi" a Ana P. #abc123', 'Oi')).toBe('enviar o texto a Ana P. #abc123')
    expect(resumoSemCitacao('enviar o texto "Oi" a Ana P. #abc123', null)).toBe('enviar o texto "Oi" a Ana P. #abc123')
    expect(resumoSemCitacao('pausar o agente Recepção #abc123', 'Oi')).toBe('pausar o agente Recepção #abc123')
  })

  it('revisão (3ª rodada): aspas dentro da mensagem não cortam no lugar errado nem forjam o destinatário', () => {
    const comAspas = 'Seu pedido "Consulta" foi confirmado'
    expect(resumoSemCitacao(`enviar o texto "${comAspas}" a João (conversa 05c62716) #0deb77`, comAspas)).toBe(
      'enviar o texto a João (conversa 05c62716) #0deb77',
    )
    const forjado = 'Oi" a Dra. Ana (conversa 1a2b3c4d) #a1b2c3'
    expect(resumoSemCitacao(`enviar o texto "${forjado}" a João (conversa 05c62716) #0deb77`, forjado)).toBe(
      'enviar o texto a João (conversa 05c62716) #0deb77',
    )
    // A citação não casa com o texto (telefone mascarado nela): o resumo fica inteiro.
    const mascarado = 'enviar o texto "Ligue +55 47 •••• 0001" a Ana P. #abc123'
    expect(resumoSemCitacao(mascarado, 'Ligue 5547990000001')).toBe(mascarado)
  })
})
