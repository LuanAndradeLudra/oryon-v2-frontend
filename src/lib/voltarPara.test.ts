// Ida e volta entre trabalho e configuração. O que estes testes fixam não é o
// formato da URL — é a promessa: quem sai de um contexto volta para ELE, com o
// que estava na tela, e ninguém consegue usar esse retorno para mandar o
// usuário para fora da aplicação.
import { describe, it, expect } from 'vitest'
import { comVolta, destinoDeVolta } from './voltarPara'

describe('comVolta', () => {
  it('preserva a querystring da origem — é ela que carrega aba, filtro e seleção', () => {
    const url = comVolta('/settings/pipeline-stages?pipeline=p1', '/pipelines/p1?tab=reports&q=ana', 'Voltar para o funil')
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('pipeline')).toBe('p1')
    expect(params.get('voltarPara')).toBe('/pipelines/p1?tab=reports&q=ana')
    expect(params.get('voltarRotulo')).toBe('Voltar para o funil')
  })

  it('devolve caminho relativo, nunca absoluto', () => {
    expect(comVolta('/settings/tags', '/conversations')).toMatch(/^\/settings\/tags\?/)
  })

  it('ignora origem que não seja caminho interno', () => {
    const url = comVolta('/settings/tags', 'https://exemplo.com/phish')
    expect(url).not.toContain('voltarPara')
  })
})

describe('destinoDeVolta', () => {
  it('lê destino e rótulo', () => {
    const volta = destinoDeVolta(new URLSearchParams('voltarPara=/pipelines/p1?tab=reports&voltarRotulo=Voltar ao funil'))
    expect(volta).toEqual({ para: '/pipelines/p1?tab=reports', rotulo: 'Voltar ao funil' })
  })

  it('sem rótulo, usa um genérico em vez de sumir com o botão', () => {
    expect(destinoDeVolta(new URLSearchParams('voltarPara=/conversations'))?.rotulo).toBe('Voltar')
  })

  it('sem o parâmetro não há volta — a tela é o próprio destino', () => {
    expect(destinoDeVolta(new URLSearchParams(''))).toBeNull()
  })

  // `voltarPara` vem da barra do navegador e vira `navigate()`. Sem a guarda, um
  // link montado por terceiro tiraria o usuário da aplicação a partir de uma
  // tela autenticada — redirecionamento aberto.
  it.each([
    ['http://evil.com', 'absoluto'],
    ['//evil.com', 'protocol-relative'],
    ['javascript:alert(1)', 'esquema perigoso'],
    ['pipelines/p1', 'relativo sem barra'],
  ])('recusa destino externo: %s (%s)', (destino) => {
    expect(destinoDeVolta(new URLSearchParams(`voltarPara=${encodeURIComponent(destino)}`))).toBeNull()
  })
})

// Revisão 02/10: barra invertida e caracteres de controle passavam na checagem
// "começa com / e não com //" e o navegador os resolve para OUTRA origem
// ('/\evil.com' → https://evil.com) — redirecionamento aberto.
describe('voltarPara — não aceita truques que levam para fora da aplicação', () => {
  const p = (v: string) => new URLSearchParams({ voltarPara: v })
  it.each([
    ['/' + String.fromCharCode(92) + 'evil.com'],
    ['/' + String.fromCharCode(92) + String.fromCharCode(92) + 'evil.com'],
    ['/\t/evil.com'],
    ['/\n/evil.com'],
    ['/%5Cevil.com'.replace('%5C', String.fromCharCode(92))],
  ])('recusa %j', (valor) => {
    expect(destinoDeVolta(p(valor))).toBeNull()
  })
  it('continua aceitando caminho interno com busca e hash', () => {
    expect(destinoDeVolta(p('/conversations?id=1&aba=fila#x'))?.para).toBe('/conversations?id=1&aba=fila#x')
  })
})
