/**
 * NENHUMA CHAMADA NÃO MAPEADA.
 *
 * Monta cada tela do roteiro da landing com o app real e o backend de
 * demonstração, e falha se alguma tela pedir um endpoint que o backend não
 * atende. É a garantia de que:
 *  • nada que a demonstração mostra depende de uma resposta vazia por acaso
 *    (tela "sem dados", banner de configuração, aviso de plano);
 *  • uma mudança futura no produto que passe a chamar um endpoint novo nessas
 *    telas é pega aqui, e não descoberta na landing publicada.
 */
import { render, screen, cleanup } from '@testing-library/react'
import { prepararAntesDoApp, conectarAoApp } from './preparar'
import { rotasNaoMapeadas, limparRotasNaoMapeadas } from './guards'
import { semearSessaoDemo } from './backend'
import { DemoApp } from './DemoApp'

prepararAntesDoApp()

beforeAll(async () => {
  await conectarAoApp()
})

// O setup global limpa o armazenamento antes de cada teste; a sessão da
// demonstração precisa ser semeada de novo depois disso.
beforeEach(() => {
  semearSessaoDemo()
  limparRotasNaoMapeadas()
})

afterEach(() => cleanup())

const TELAS: { rota: string; aparece: string | RegExp }[] = [
  { rota: '/conversations?id=demo-conv-0', aparece: /Bom dia! Vocês têm plano anual/ },
  { rota: '/pipelines', aparece: 'Migração de base' },
  { rota: '/campaigns', aparece: /Renovação Pro · setembro/ },
  { rota: '/agents?agent=ag-vendas', aparece: 'Capacidades' },
]

describe('demonstração da landing — rotas do roteiro', () => {
  it.each(TELAS)('$rota não chama endpoint fora do backend de demonstração', async ({ rota, aparece }) => {
    render(<DemoApp inicial={rota} />)
    expect((await screen.findAllByText(aparece, {}, { timeout: 20_000 })).length).toBeGreaterThan(0)
    // Uma volta a mais no event loop: chamadas disparadas por efeitos que só
    // rodam depois do primeiro conteúdo (painéis, contadores) também contam.
    await new Promise((r) => setTimeout(r, 300))
    expect(rotasNaoMapeadas()).toEqual([])
  }, 40_000)
})
