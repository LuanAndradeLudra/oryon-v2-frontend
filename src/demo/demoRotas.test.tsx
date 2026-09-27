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
  { rota: '/conversations?id=demo-conv-0', aparece: /A Dra. Helena tem horário essa semana/ },
  // A lista inteira na aba "Todas" (status=all) — não só a conversa aberta.
  { rota: '/conversations', aparece: 'Rafaela Couto' },
  { rota: '/pipelines', aparece: 'Check-up · 3 exames' },
  { rota: '/campaigns', aparece: /Retorno · setembro/ },
  { rota: '/campaigns?report=cp-retorno', aparece: /Funil de engajamento/ },
  { rota: '/pipelines/pl-consultas?deal=demo-deal-0', aparece: /Particular/ },
  { rota: '/agents/ag-recepcao/capacidades', aparece: 'Mover negócio ou registro no funil' },
  // Seção Plataforma (26/09): de onde vem o conhecimento e o Dashboard.
  { rota: '/agents/ag-recepcao/instrucoes', aparece: /Use só valores e condições/ },
  { rota: '/agents/ag-recepcao/conhecimento', aparece: 'Convênios aceitos' },
  { rota: '/agents/ag-recepcao/catalogo', aparece: 'Consulta de retorno' },
  { rota: '/dashboard', aparece: 'Volume de Mensagens' },
  // Agentes IA, direção D (27/09): a lista, cada seção da página, o formato
  // antigo redirecionando e a bancada de teste aberta pela URL.
  { rota: '/agents', aparece: 'Precisam de atenção' },
  { rota: '/agents?agent=ag-recepcao&tab=knowledge', aparece: 'Convênios aceitos' },
  { rota: '/agents/ag-recepcao', aparece: /Use só valores e condições/ },
  { rota: '/agents/ag-recepcao/transferencia', aparece: 'Encaixe ou urgência' },
  { rota: '/agents/ag-recepcao/comportamento', aparece: 'Esperar o cliente terminar de escrever' },
  { rota: '/agents/ag-recepcao/desempenho', aparece: 'buscar_base_conhecimento' },
  { rota: '/agents/ag-recepcao/alteracoes', aparece: 'Regras de transferência atualizadas' },
  { rota: '/agents/ag-recepcao/instrucoes?teste=1', aparece: 'Converse como se fosse um cliente' },
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
