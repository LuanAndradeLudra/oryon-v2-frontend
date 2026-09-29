import { describe, it, expect } from 'vitest'
import { lerFiltrosDeContatos, escreverFiltrosDeContatos, chaveDosFiltrosDeContatos, lerSituacao } from './filtrosDeContatos'

describe('filtros de Leads na URL', () => {
  it('ida e volta: o que se escreve é o que se lê', () => {
    const f = {
      search: 'ana', stage: ['lead', 'cliente'], tagId: ['t1'], source: 'whatsapp' as const,
      sentiment: 'positive' as const, intent: 'high' as const, optIn: false,
      leadScoreBand: 'high' as const, lastContact: '7d' as const, sortBy: 'leadScore' as const, sortDir: 'desc' as const,
    }
    const url = escreverFiltrosDeContatos(new URLSearchParams(), f)
    expect(lerFiltrosDeContatos(url)).toEqual(f)
  })

  it('não mexe nas chaves de outras coisas (visão, contato aberto, voltarPara)', () => {
    const prev = new URLSearchParams('view=tabela&contact=c1&voltarPara=%2Fconversations&busca=velho')
    const p = escreverFiltrosDeContatos(prev, { search: 'novo' })
    expect(p.get('view')).toBe('tabela')
    expect(p.get('contact')).toBe('c1')
    expect(p.get('voltarPara')).toBe('/conversations')
    expect(p.get('busca')).toBe('novo')
  })

  it('a ordenação padrão (mais recentes) não vai para a URL, mas é o que se lê sem nada', () => {
    const p = escreverFiltrosDeContatos(new URLSearchParams(), { sortBy: 'createdAt', sortDir: 'desc' })
    expect(p.has('ordem')).toBe(false)
    expect(lerFiltrosDeContatos(new URLSearchParams())).toEqual({ sortBy: 'createdAt', sortDir: 'desc' })
  })

  it('valores editados à mão e inválidos são ignorados', () => {
    const f = lerFiltrosDeContatos(new URLSearchParams('sentimento=raiva&ordem=xpto&score=muito'))
    expect(f).toEqual({ sortBy: 'createdAt', sortDir: 'desc' })
    expect(lerSituacao(new URLSearchParams('situacao=qualquer'))).toBe('all')
  })

  it('a chave muda com o filtro e não com o resto da URL', () => {
    const a = chaveDosFiltrosDeContatos(new URLSearchParams('busca=ana&contact=c1'))
    const b = chaveDosFiltrosDeContatos(new URLSearchParams('busca=ana&contact=c2'))
    const c = chaveDosFiltrosDeContatos(new URLSearchParams('busca=bia&contact=c1'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
