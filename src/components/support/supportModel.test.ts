// SCRUM-1382 — "Onde aconteceu?" vem da rota (nomes do menu lateral) e só
// aceita áreas conhecidas: texto livre de um link nunca vira "onde".
import { describe, it, expect } from 'vitest'
import { AREAS_DO_PRODUTO, areaDaRota, areaValida, tituloDoChamado } from './supportModel'

describe('áreas do produto', () => {
  // Recebe o pathname (a busca nunca chega aqui).
  it.each([
    ['/conversations', 'Conversas'], ['/contacts/123', 'Contatos'], ['/pipelines/abc', 'Funis'], ['/campaigns', 'Disparos'],
    ['/settings/company', 'Configurações'], ['/agents/a1/base', 'Agentes IA'], ['/home', 'Home'], ['/dashboard', 'Dashboard'],
    ['/support', 'Suporte'], ['/', null], ['/settingsx', null], ['/plataforma/x', null],
  ])('%s → %s', (rota, area) => {
    expect(areaDaRota(rota)).toBe(area)
  })

  it('a lista do formulário tem um nome por área e termina em "Outro"', () => {
    expect(new Set(AREAS_DO_PRODUTO).size).toBe(AREAS_DO_PRODUTO.length)
    expect(AREAS_DO_PRODUTO.at(-1)).toBe('Outro')
  })

  it('areaValida só aceita áreas conhecidas', () => {
    expect(areaValida('Funis')).toBe('Funis')
    expect(areaValida('Outro')).toBe('Outro')
    expect(areaValida('Maria Silva 21998765432')).toBeNull()
    expect(areaValida('')).toBeNull()
    expect(areaValida(null)).toBeNull()
  })

  it('título do chamado sem conversa é "onde · tipo"', () => {
    expect(tituloDoChamado({ origemDoProblema: 'plataforma', categoria: 'platform', tipoDePedido: 'defeito', ondeAconteceu: 'Funis' })).toBe('Funis · Algo não funciona')
    expect(tituloDoChamado({ origemDoProblema: 'plataforma', categoria: 'question', tipoDePedido: 'cobranca', ondeAconteceu: null })).toBe('Plataforma · Plano ou cobrança')
  })
})
