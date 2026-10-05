import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useEstadoNaUrl, lerUmDe, lerPaginaUrl, escreverPaginaUrl } from './useEstadoNaUrl'
import { preservarVolta } from '@/lib/voltarPara'

function Endereco() {
  const { search } = useLocation()
  return <output data-testid="url">{search}</output>
}

const lerVisao = lerUmDe(['lista', 'tabela'] as const, 'lista')

function Tela() {
  const [visao, setVisao] = useEstadoNaUrl('visao', { padrao: 'lista', ler: lerVisao, aliases: ['view'], resetar: ['pagina'] })
  const [pagina, setPagina] = useEstadoNaUrl('pagina', { padrao: 1, ler: lerPaginaUrl, escrever: escreverPaginaUrl })
  return (
    <>
      <p>visao:{visao} pagina:{pagina}</p>
      <button onClick={() => setVisao('tabela')}>tabela</button>
      <button onClick={() => setVisao('lista')}>lista</button>
      <button onClick={() => setPagina((p) => p + 1)}>próxima</button>
      <Endereco />
    </>
  )
}

const montar = (url: string) => render(<MemoryRouter initialEntries={[url]}><Tela /></MemoryRouter>)

describe('useEstadoNaUrl', () => {
  it('lê da URL e escreve sem apagar os outros parâmetros (voltarPara incluso)', () => {
    montar('/contacts?voltarPara=%2Fconversations%3Fid%3D1&busca=ana')
    fireEvent.click(screen.getByText('tabela'))
    const p = new URLSearchParams(screen.getByTestId('url').textContent ?? '')
    expect(p.get('visao')).toBe('tabela')
    expect(p.get('busca')).toBe('ana')
    expect(p.get('voltarPara')).toBe('/conversations?id=1')
  })

  it('o valor padrão não vai para a URL', () => {
    montar('/contacts?visao=tabela')
    fireEvent.click(screen.getByText('lista'))
    expect(new URLSearchParams(screen.getByTestId('url').textContent ?? '').has('visao')).toBe(false)
  })

  it('aceita a chave antiga (alias) e a troca pela nova ao escrever', () => {
    montar('/contacts?view=tabela')
    expect(screen.getByText(/visao:tabela/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('lista'))
    fireEvent.click(screen.getByText('tabela'))
    const p = new URLSearchParams(screen.getByTestId('url').textContent ?? '')
    expect(p.get('visao')).toBe('tabela')
    expect(p.has('view')).toBe(false)
  })

  it('valor inválido editado à mão cai no padrão; mudar a visão volta a página para 1', () => {
    montar('/contacts?visao=xpto&pagina=3')
    expect(screen.getByText('visao:lista pagina:3')).toBeInTheDocument()
    fireEvent.click(screen.getByText('tabela'))
    expect(screen.getByText('visao:tabela pagina:1')).toBeInTheDocument()
  })
})

describe('preservarVolta', () => {
  it('leva voltarPara/voltarRotulo da tela atual para o próximo destino', () => {
    const atual = new URLSearchParams('voltarPara=%2Fpipelines%2Fp1&voltarRotulo=Voltar+para+o+funil')
    const url = new URL(preservarVolta('/settings/tags', atual), 'http://x')
    expect(url.pathname).toBe('/settings/tags')
    expect(url.searchParams.get('voltarPara')).toBe('/pipelines/p1')
    expect(url.searchParams.get('voltarRotulo')).toBe('Voltar para o funil')
  })

  it('sem voltarPara (ou com endereço externo) devolve o destino intacto', () => {
    expect(preservarVolta('/settings/tags', new URLSearchParams())).toBe('/settings/tags')
    expect(preservarVolta('/settings/tags', new URLSearchParams('voltarPara=https://mal.com'))).toBe('/settings/tags')
  })
})

function DuasNoMesmoClique() {
  const [ordem, setOrdem] = useEstadoNaUrl<string>('ordem', { padrao: 'atividade' })
  const [direcao, setDirecao] = useEstadoNaUrl<string>('direcao', { padrao: 'desc' })
  return (
    <>
      <p>{ordem}/{direcao}</p>
      <button onClick={() => { setOrdem('nome'); setDirecao('asc') }}>ordenar</button>
      <Endereco />
    </>
  )
}

describe('useEstadoNaUrl · duas mudanças no mesmo clique', () => {
  it('as duas ficam na URL (o React Router montava a 2ª sobre a URL antiga e apagava a 1ª)', () => {
    render(<MemoryRouter initialEntries={['/automations?busca=x']}><DuasNoMesmoClique /></MemoryRouter>)
    fireEvent.click(screen.getByText('ordenar'))
    const p = new URLSearchParams(screen.getByTestId('url').textContent ?? '')
    expect(p.get('ordem')).toBe('nome')
    expect(p.get('direcao')).toBe('asc')
    expect(p.get('busca')).toBe('x')
    expect(screen.getByText('nome/asc')).toBeInTheDocument()
  })
})
