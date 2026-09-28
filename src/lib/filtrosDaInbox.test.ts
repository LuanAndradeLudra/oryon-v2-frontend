import { describe, it, expect } from 'vitest'
import { abaAtiva, chaveDosFiltros, comAba, ehFila, escreverFiltros, lerFiltros } from './filtrosDaInbox'

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
    // O "pendente" é da própria Fila: não vai como status avulso.
    expect(url.has('status')).toBe(false)
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

describe('a Fila = pendentes sem dono (decisão do PO, 28/09)', () => {
  it('entrar na Fila fixa pendente; sair devolve o status a todos', () => {
    const naFila = comAba({ status: 'all' }, 'unassigned')
    expect(naFila).toMatchObject({ assignedTo: 'unassigned', status: 'pending' })
    expect(ehFila(naFila)).toBe(true)
    expect(comAba(naFila, 'me')).toMatchObject({ assignedTo: 'me', status: 'all' })
    // Fora da Fila, trocar de aba mantém o status escolhido.
    expect(comAba({ status: 'resolved', assignedTo: 'all' }, 'me')).toMatchObject({ status: 'resolved' })
  })

  it('a aba marcada: "Sem atribuição" de qualquer status NÃO é a Fila', () => {
    expect(abaAtiva({ assignedTo: 'unassigned', status: 'pending' })).toBe('unassigned')
    expect(abaAtiva({ assignedTo: 'unassigned', status: 'all' })).toBeNull()
    expect(abaAtiva({ assignedTo: 'me', status: 'all' })).toBe('me')
    expect(abaAtiva({ status: 'all' })).toBe('all')
  })

  it('URL: aba=fila vence um status avulso; "Sem atribuição" vai como equipe=sem-dono', () => {
    expect(lerFiltros(sp('aba=fila&status=resolved'))).toMatchObject({ assignedTo: 'unassigned', status: 'pending' })
    const semDono = escreverFiltros(sp(''), { assignedTo: 'unassigned', status: 'resolved' })
    expect(semDono.get('equipe')).toBe('sem-dono')
    expect(semDono.get('status')).toBe('resolved')
    expect(lerFiltros(semDono)).toMatchObject({ assignedTo: 'unassigned', status: 'resolved' })
  })
})
