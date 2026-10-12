// Página "Para a sua área" (/solucoes, 02/10): a área vem do endereço, as abas
// trocam a área (e o endereço), só a clínica mostra a tela do app, o convite
// leva ao formulário — que já vem com a área preenchida.
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SolucoesPage } from './PaginasPublicas'
import * as copy from '@/components/landing/landingCopy'

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: /min-width/.test(query), media: query,
  addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {},
  onchange: null, dispatchEvent: () => false,
}))
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
})

/** Mostra o endereço atual (a área mora nele). */
function Endereco() {
  const { pathname, search } = useLocation()
  return <output data-testid="endereco">{pathname + search}</output>
}

function renderPagina(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/solucoes" element={<><SolucoesPage /><Endereco /></>} />
      </Routes>
    </MemoryRouter>,
  )
}

const ESPERA = { timeout: 15000 }
const { solucoes, home, formDemo } = copy

describe('SolucoesPage', () => {
  it('sem área no endereço, abre na clínica — com a tela do app e os quatro momentos', async () => {
    renderPagina('/solucoes')
    const abas = screen.getByRole('tablist', { name: solucoes.abasLabel })
    expect(within(abas).getAllByRole('tab')).toHaveLength(5)
    expect(within(abas).getByRole('tab', { name: 'Clínica' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: home.dor.setores.clinica.titulo }, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: solucoes.areas.clinica.tela.titulo })).toBeInTheDocument()
    for (const m of solucoes.areas.clinica.tela.marcos) expect(screen.getByText(m.titulo)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: solucoes.areas.clinica.cta })).toBeInTheDocument()
  }, 25_000)

  it('os momentos da tela são clicáveis: o escolhido fica marcado', async () => {
    renderPagina('/solucoes')
    const lista = await screen.findByRole('list', { name: solucoes.momentosLabel }, ESPERA)
    const botoes = within(lista).getAllByRole('button')
    expect(botoes).toHaveLength(4)
    expect(botoes[0]).toHaveAttribute('aria-current', 'step')
    fireEvent.click(botoes[2])
    expect(botoes[2]).toHaveAttribute('aria-current', 'step')
    expect(botoes[0]).not.toHaveAttribute('aria-current')
  }, 25_000)

  it('a área vem do endereço; cada área tem a sua tela do app, com os seus momentos', async () => {
    renderPagina('/solucoes?area=imobiliaria')
    expect(screen.getByRole('tab', { name: 'Imobiliária' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: home.dor.setores.imobiliaria.titulo }, ESPERA)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: solucoes.areas.imobiliaria.tela.titulo })).toBeInTheDocument()
    for (const m of solucoes.areas.imobiliaria.tela.marcos) expect(screen.getByText(m.titulo)).toBeInTheDocument()
    const ia = screen.getByRole('region', { name: solucoes.atos.ia })
    for (const item of solucoes.areas.imobiliaria.itens) expect(within(ia).getByText(item)).toBeInTheDocument()
  }, 25_000)

  it('área desconhecida no endereço cai na clínica', async () => {
    renderPagina('/solucoes?area=padaria')
    expect(screen.getByRole('tab', { name: 'Clínica' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: home.dor.setores.clinica.titulo }, ESPERA)).toBeInTheDocument()
  }, 25_000)

  it('a aba troca a área e o endereço, e o formulário acompanha a área', async () => {
    renderPagina('/solucoes?area=clinica')
    await screen.findByRole('heading', { name: home.dor.setores.clinica.titulo }, ESPERA)
    const segmento = () => document.querySelector<HTMLInputElement>('input[type="hidden"][name="segmento"]')?.value
    expect(await screen.findByRole('button', { name: formDemo.enviar }, ESPERA)).toBeInTheDocument()
    expect(segmento()).toBe('Clínica ou consultório')

    fireEvent.click(screen.getByRole('tab', { name: 'Loja' }))
    expect(screen.getByTestId('endereco')).toHaveTextContent('/solucoes?area=loja')
    expect(screen.getByRole('tab', { name: 'Loja' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: home.dor.setores.loja.titulo }, ESPERA)).toBeInTheDocument()
    expect(segmento()).toBe('Varejo ou loja')
  }, 25_000)

  it('o convite aponta para o formulário da própria página', async () => {
    const { container } = renderPagina('/solucoes?area=juridico')
    const convite = await screen.findByRole('region', { name: solucoes.areas.juridico.cta }, ESPERA)
    const link = within(convite).getByRole('link', { name: home.ctaPrincipal })
    expect(link).toHaveAttribute('href', '#demonstracao')
    expect(await screen.findByRole('button', { name: formDemo.enviar }, ESPERA)).toBeInTheDocument()
    expect(container.querySelector('#demonstracao')).not.toBeNull()
  }, 25_000)

  it('não vende o que não existe: sem planos, preços, depoimentos nem módulos desligados', async () => {
    const { container } = renderPagina('/solucoes')
    await screen.findByRole('button', { name: formDemo.enviar }, ESPERA)
    // Os aparelhos e as telas do app (aria-hidden) mostram dados de exemplo; aqui vale a copy.
    const clone = container.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[role="img"], [aria-hidden="true"]').forEach((el) => el.remove())
    const texto = clone.textContent ?? ''
    for (const proibido of [
      /planos?\b/i, /pre[çc]os?\b/i, /depoiment/i, /agendament/i, /conectores?\b/i,
      /copilot/i, /automa[çc][õo]es\b/i, /marketing/i, /nexus/i, /\bbots?(?![\wÀ-ÿ])/i,
      /a mesma conversa,? organizada/i, // a tela do app não é a conversa dos iPhones (dados diferentes)
    ]) {
      expect(texto, `texto banido: ${proibido}`).not.toMatch(proibido)
    }
  }, 25_000)
})
