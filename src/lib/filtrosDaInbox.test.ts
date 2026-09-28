import { describe, it, expect } from 'vitest'
import { chaveDosFiltros, escreverFiltros, lerFiltros } from './filtrosDaInbox'

const sp = (q: string) => new URLSearchParams(q)

describe('filtros da inbox na URL', () => {
  it('sem parâmetros = o padrão de hoje (Todas, qualquer status)', () => {
    expect(lerFiltros(sp(''))).toEqual({ status: 'all' })
  })

  it('ida e volta: o que se escreve é o que se lê', () => {
    const f = {
      status: 'pending' as const, assignedTo: 'unassigned', aiHandling: 'paused' as const,
      unreadOnly: true, needsReview: true, untagged: true, tagId: 't1', search: 'maria',
      startDate: '2026-09-28T03:00:00.000Z', endDate: '2026-09-29T03:00:00.000Z',
    }
    const url = escreverFiltros(sp(''), f)
    expect(url.get('aba')).toBe('fila')
    expect(url.get('status')).toBe('pending')
    expect(url.get('ia')).toBe('pausada')
    expect(lerFiltros(url)).toEqual(f)
  })

  it('pessoa da equipe vai como `equipe`, abas como nome legível', () => {
    const uuid = '0f0fe007-60b0-4276-8e23-5b297d4c2483'
    expect(escreverFiltros(sp(''), { assignedTo: uuid }).get('equipe')).toBe(uuid)
    expect(escreverFiltros(sp(''), { assignedTo: 'me' }).get('aba')).toBe('minhas')
    expect(escreverFiltros(sp(''), { assignedTo: 'all' }).has('aba')).toBe(false)
  })

  it('não toca na conversa aberta nem em parâmetros de outras telas', () => {
    const url = escreverFiltros(sp('id=c1&deal=d9&aba=fila'), { assignedTo: 'me' })
    expect(url.get('id')).toBe('c1')
    expect(url.get('deal')).toBe('d9')
    expect(url.get('aba')).toBe('minhas')
  })

  it('valores inválidos na URL são ignorados', () => {
    expect(lerFiltros(sp('status=xyz&aba=nada&equipe=nao-uuid&de=ontem&ate=hoje'))).toEqual({ status: 'all' })
  })

  it('a chave muda com filtro, não com a conversa aberta', () => {
    expect(chaveDosFiltros(sp('aba=fila&id=a'))).toBe(chaveDosFiltros(sp('aba=fila&id=b')))
    expect(chaveDosFiltros(sp('aba=fila'))).not.toBe(chaveDosFiltros(sp('aba=minhas')))
  })
})
