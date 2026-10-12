import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FormDemonstracao, validarPedido, type PedidoDemonstracao } from './FormDemonstracao'
import { formDemo } from '../landingCopy'

const OK: PedidoDemonstracao = {
  nome: 'Ana', empresa: 'Loja Azul', whatsapp: '(47) 99999-0000', email: 'ana@lojaazul.com.br',
  segmento: formDemo.segmentos[0], equipe: formDemo.tamanhos[1], mensagem: '', site: '', origem: 'teste',
}

describe('validarPedido', () => {
  it('aceita um pedido completo', () => {
    expect(validarPedido(OK)).toEqual({})
  })
  it('exige os campos obrigatórios (a mensagem é opcional)', () => {
    const e = validarPedido({ ...OK, nome: ' ', empresa: '', segmento: '', equipe: '' })
    expect(Object.keys(e).sort()).toEqual(['empresa', 'equipe', 'nome', 'segmento'])
  })
  it('confere e-mail e WhatsApp com DDD', () => {
    expect(validarPedido({ ...OK, email: 'ana@' }).email).toBe(formDemo.emailInvalido)
    expect(validarPedido({ ...OK, whatsapp: '9999-0000' }).whatsapp).toBe(formDemo.whatsappInvalido)
  })
})

function preencher() {
  const campos: Array<[string, string]> = [
    [formDemo.campos.nome, OK.nome], [formDemo.campos.empresa, OK.empresa],
    [formDemo.campos.whatsapp, OK.whatsapp], [formDemo.campos.email, OK.email],
  ]
  for (const [rotulo, valor] of campos) {
    fireEvent.change(screen.getByLabelText(new RegExp(rotulo.replace(/[?]/g, '\\?'))), { target: { value: valor } })
  }
  // Área de atuação e tamanho da equipe: o menu da landing (combobox + listbox).
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(formDemo.campos.segmento) }))
  fireEvent.click(screen.getByRole('option', { name: OK.segmento }))
  fireEvent.click(screen.getByRole('combobox', { name: new RegExp(formDemo.campos.equipe.replace(/[?]/g, '\\?')) }))
  fireEvent.click(screen.getByRole('option', { name: OK.equipe }))
}

describe('FormDemonstracao', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('com campos vazios, não envia e mostra os erros', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<FormDemonstracao origem="teste" />)
    fireEvent.click(screen.getByRole('button', { name: formDemo.enviar }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getAllByText(formDemo.obrigatorio).length).toBeGreaterThanOrEqual(6)
  })

  it('envia para /public/demo-requests e só confirma com resposta de sucesso', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 })
    vi.stubGlobal('fetch', fetchMock)
    render(<FormDemonstracao origem="home" />)
    preencher()
    fireEvent.click(screen.getByRole('button', { name: formDemo.enviar }))
    await screen.findByText(formDemo.sucessoTitulo)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/public\/demo-requests$/)
    const corpo = JSON.parse(init.body)
    expect(corpo).toMatchObject({ nome: 'Ana', whatsapp: '47999990000', origem: 'home' })
  })

  it('o menu de área funciona pelo teclado (padrão combobox do WAI-ARIA)', () => {
    render(<FormDemonstracao origem="teste" />)
    const area = screen.getByRole('combobox', { name: new RegExp(formDemo.campos.segmento) })
    expect(area).toHaveAttribute('aria-expanded', 'false')
    fireEvent.keyDown(area, { key: 'ArrowDown' })
    expect(area).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox', { name: formDemo.campos.segmento })).toBeInTheDocument()
    fireEvent.keyDown(area, { key: 'ArrowDown' })
    expect(area.getAttribute('aria-activedescendant')).toBeTruthy()
    fireEvent.keyDown(area, { key: 'Enter' })
    expect(area).toHaveAttribute('aria-expanded', 'false')
    expect(area).toHaveTextContent(formDemo.segmentos[1])
    // Uma letra leva à opção que começa com ela, sem acento ("e" → "Educação").
    fireEvent.keyDown(area, { key: 'e' })
    fireEvent.keyDown(area, { key: 'Enter' })
    expect(area).toHaveTextContent('Educação')
    // Esc fecha sem mudar.
    fireEvent.keyDown(area, { key: 'ArrowDown' })
    fireEvent.keyDown(area, { key: 'Home' })
    fireEvent.keyDown(area, { key: 'Escape' })
    expect(area).toHaveTextContent('Educação')
  })

  it('a mensagem é opcional: começa recolhida e abre pelo link', () => {
    render(<FormDemonstracao origem="teste" />)
    expect(screen.queryByLabelText(new RegExp(formDemo.campos.mensagem.replace(/[?]/g, '\\?')))).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(formDemo.mensagemAbrir) }))
    expect(screen.getByLabelText(new RegExp(formDemo.campos.mensagem.replace(/[?]/g, '\\?')))).toBeInTheDocument()
  })

  it('falha no envio: nada de sucesso falso — mostra o erro e deixa tentar de novo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    render(<FormDemonstracao origem="home" />)
    preencher()
    fireEvent.click(screen.getByRole('button', { name: formDemo.enviar }))
    await screen.findByText(formDemo.erro)
    expect(screen.queryByText(formDemo.sucessoTitulo)).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: formDemo.enviar })).toBeEnabled())
  })
})
