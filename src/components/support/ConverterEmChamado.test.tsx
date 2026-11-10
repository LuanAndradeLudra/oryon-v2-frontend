// SCRUM-1388 — "Converter em chamado" na conversa do WhatsApp de suporte da
// Oryon. Critérios na tela: converter gera o chamado na empresa escolhida (a
// sugerida pelo telefone já vem marcada) e avisa que o contato recebeu o
// número; converter de novo a mesma conversa oferece juntar ao chamado
// existente (também quando o servidor responde 409 com ele).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { LayerProvider } from '@/contexts/LayerContext'
import { showToast } from '@/hooks/useToast'
import { whatsappSuporteApi } from '@/services/supportApi'
import type { ContextoDaConversaDeSuporte } from '@/types/support'
import { ConverterEmChamado } from './ConverterEmChamado'
import { mensagensSugeridas } from './whatsappDeSuporte'

vi.mock('@/services/supportApi', () => ({
  whatsappSuporteApi: { estado: vi.fn(), contexto: vi.fn(), empresas: vi.fn(), converter: vi.fn() },
}))
vi.mock('@/hooks/useToast', async (original) => ({ ...(await original<typeof import('@/hooks/useToast')>()), showToast: vi.fn() }))

const api = vi.mocked(whatsappSuporteApi)

const msg = (id: string, de: 'contato' | 'equipe', texto: string) => ({ id, de, texto, em: '2026-10-15T10:00:00Z' })
const CTX: ContextoDaConversaDeSuporte = {
  contato: { nome: 'Gabi da Clínica', telefone: '…1002' },
  mensagens: [msg('m1', 'contato', 'Oi'), msg('m2', 'equipe', 'Olá! Como posso ajudar?'), msg('m3', 'contato', 'O funil não carrega.'), msg('m4', 'contato', 'Desde ontem.')],
  sugestoes: [{ tenantId: 'ten-a', empresa: 'Clínica Serra', userId: 'u-gabi', nome: 'Gabi Gestora', papel: 'admin' }],
  existente: null,
}

function montar() {
  const onFechar = vi.fn()
  render(<LayerProvider><ConverterEmChamado conversationId="conv-s" onFechar={onFechar} /></LayerProvider>)
  return onFechar
}

beforeEach(() => {
  vi.clearAllMocks()
  api.empresas.mockResolvedValue([{ id: 'ten-c', nome: 'Clínica Sem Suporte', suporteLigado: false }])
})

describe('mensagensSugeridas', () => {
  it('o pedido atual: as falas do contato depois da última da equipe; sem elas, a última do contato', () => {
    expect([...mensagensSugeridas(CTX.mensagens)]).toEqual(['m3', 'm4'])
    expect([...mensagensSugeridas([msg('a', 'contato', 'x'), msg('b', 'equipe', 'y')])]).toEqual(['a'])
    expect([...mensagensSugeridas([])]).toEqual([])
  })

  it('o que já está no chamado aberto não volta como sugestão (revisão do Portão 4)', () => {
    const ja = { ...msg('m3', 'contato', 'O funil não carrega.'), noChamado: true }
    expect([...mensagensSugeridas([msg('m1', 'contato', 'Oi'), msg('m2', 'equipe', 'Olá'), ja, msg('m4', 'contato', 'E agora isto.')])]).toEqual(['m4'])
  })
})

describe('Converter em chamado (SCRUM-1388)', () => {
  it('converte com a empresa da pessoa do mesmo telefone, as falas do pedido atual e o relato vindo delas', async () => {
    api.contexto.mockResolvedValue(CTX)
    api.converter.mockResolvedValue({ chamado: { id: 't1', numero: 'SUP-0042', empresa: 'Clínica Serra' }, juntado: false, respostaEnviada: true })
    const onFechar = montar()
    expect(await screen.findByText(/Gabi da Clínica/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /O funil não carrega/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Olá! Como posso ajudar/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Gabi Gestora · Clínica Serra/ })).toBeChecked()
    expect(screen.getByLabelText('Relato do chamado')).toHaveValue('O funil não carrega.\nDesde ontem.')

    // Rádios nativos: o tipo vem marcado e as setas trocam (revisão do Portão 4).
    expect(screen.getByRole('radio', { name: 'Algo não funciona' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Está lento' }))
    fireEvent.click(screen.getByRole('button', { name: 'Converter em chamado' }))
    await waitFor(() => expect(api.converter).toHaveBeenCalledWith('conv-s', {
      messageIds: ['m3', 'm4'], tenantId: 'ten-a', abertoPorUserId: 'u-gabi', tipoDePedido: 'lentidao',
      relato: 'O funil não carrega.\nDesde ontem.', abrirOutro: false,
    }))
    expect(showToast).toHaveBeenCalledWith('Chamado SUP-0042 aberto (Clínica Serra). O contato recebeu o número.', 'success')
    expect(onFechar).toHaveBeenCalled()
  })

  it('a conversa já tem chamado aberto: começa em juntar; "Abrir outro" volta ao formulário e manda abrirOutro', async () => {
    api.contexto.mockResolvedValue({ ...CTX, existente: { id: 't7', numero: 'SUP-0007', status: 'triaged', tenantId: 'ten-a', empresa: 'Clínica Serra' } })
    api.converter.mockResolvedValue({ chamado: { id: 't7', numero: 'SUP-0007', empresa: 'Clínica Serra' }, juntado: true, respostaEnviada: true })
    montar()
    const grupo = await screen.findByRole('group', { name: 'Chamado aberto desta conversa' })
    expect(grupo).toHaveTextContent('Esta conversa já virou o SUP-0007 (Clínica Serra).')
    expect(screen.queryByLabelText('Relato do chamado')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Juntar ao SUP-0007' }))
    await waitFor(() => expect(api.converter).toHaveBeenCalledWith('conv-s', { messageIds: ['m3', 'm4'], juntarA: 't7' }))
    expect(showToast).toHaveBeenCalledWith('Mensagens juntadas ao SUP-0007. O contato recebeu o número.', 'success')

    fireEvent.click(within(grupo).getByRole('radio', { name: 'Abrir outro chamado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Converter em chamado' }))
    await waitFor(() => expect(api.converter).toHaveBeenLastCalledWith('conv-s', expect.objectContaining({ abrirOutro: true, tenantId: 'ten-a' })))
  })

  it('409 do servidor (alguém converteu agora há pouco): a escolha passa a ser juntar ao chamado dele', async () => {
    api.contexto.mockResolvedValue(CTX)
    api.converter.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Esta conversa já virou o chamado SUP-0009 (Clínica Serra). Junte as mensagens a ele ou abra outro.', existente: { id: 't9', numero: 'SUP-0009', status: 'received', tenantId: 'ten-a', empresa: 'Clínica Serra' } } },
    })
    montar()
    fireEvent.click(await screen.findByRole('button', { name: 'Converter em chamado' }))
    expect(await screen.findByRole('button', { name: 'Juntar ao SUP-0009' })).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/já virou o chamado SUP-0009/), 'error')
  })

  it('sem pessoa com o telefone: busca a empresa; sem a página Suporte, avisa; a resposta que não sai vira aviso', async () => {
    api.contexto.mockResolvedValue({ ...CTX, sugestoes: [] })
    api.converter.mockResolvedValue({ chamado: { id: 't2', numero: 'SUP-0001', empresa: 'Clínica Sem Suporte' }, juntado: false, respostaEnviada: false })
    montar()
    const botao = await screen.findByRole('button', { name: 'Converter em chamado' })
    expect(botao).toBeDisabled() // sem empresa escolhida — e a tela diz o que falta
    expect(screen.getByText('Escolha a empresa do contato.')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('radio', { name: /Clínica Sem Suporte/ }))
    expect(api.empresas).toHaveBeenCalledWith('')
    expect(screen.getByText(/não tem a página Suporte ligada/)).toBeInTheDocument()
    expect(screen.getByText(/o chamado fica aberto pelo contato/)).toBeInTheDocument()
    fireEvent.click(botao)
    await waitFor(() => expect(api.converter).toHaveBeenCalledWith('conv-s', expect.objectContaining({ tenantId: 'ten-c', abertoPorUserId: null })))
    expect(showToast).toHaveBeenCalledWith('Chamado SUP-0001 aberto (Clínica Sem Suporte). A resposta automática não saiu: avise o contato pela conversa.', 'warning')
  })

  it('sem mensagem escolhida não converte', async () => {
    api.contexto.mockResolvedValue(CTX)
    montar()
    fireEvent.click(await screen.findByRole('checkbox', { name: /O funil não carrega/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Desde ontem/ }))
    expect(screen.getByRole('button', { name: 'Converter em chamado' })).toBeDisabled()
    expect(screen.getByText('Escolha ao menos uma mensagem.')).toBeInTheDocument()
  })
})
