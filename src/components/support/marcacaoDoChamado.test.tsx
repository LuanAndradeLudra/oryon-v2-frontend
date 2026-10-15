// SCRUM-1381 — store da marcação: cada bolha assina só o próprio pedaço, então
// marcar UMA mensagem re-renderiza UMA bolha (na prévia, o Set num contexto
// re-renderizava a conversa inteira a cada clique).
import { describe, it, expect } from 'vitest'
import { act, render } from '@testing-library/react'
import { memo, Profiler, type ProfilerOnRenderCallback } from 'react'
import { criarStoreDaMarcacao, useMarcacao, type StoreDaMarcacao } from './marcacaoDoChamado'
import type { Message } from '@/types'

const msg = (id: string): Message => ({
  id, conversationId: 'c1', direction: 'inbound', type: 'text', status: 'delivered', sentAt: '2026-10-15T10:00:00Z', createdAt: '2026-10-15T10:00:00Z',
})

describe('criarStoreDaMarcacao', () => {
  it('alternar inclui e tira; cada mudança avisa quem assina', () => {
    const store = criarStoreDaMarcacao()
    let avisos = 0
    const sair = store.assinar(() => { avisos += 1 })
    store.alternar('a')
    store.alternar('b')
    store.alternar('a')
    expect([...store.ler().marcadas]).toEqual(['b'])
    expect(avisos).toBe(3)
    sair()
    store.alternar('c')
    expect(avisos).toBe(3)
  })

  it('marca até 50 mensagens, o teto do backend: a 51ª é recusada; desmarcar sempre pode (revisão do Portão 2)', () => {
    const s = criarStoreDaMarcacao()
    for (let i = 0; i < 50; i++) expect(s.alternar(`m${i}`)).toBe(true)
    expect(s.alternar('m50')).toBe(false)
    expect(s.ler().marcadas.size).toBe(50)
    expect(s.alternar('m0')).toBe(true)
    expect(s.ler().marcadas.has('m0')).toBe(false)
  })

  it('zerar volta ao início, mas mantém as mensagens do chat (quem as registra é o chat)', () => {
    const store = criarStoreDaMarcacao()
    const mensagens = [msg('m1')]
    store.mudar({ mensagens, marcando: true, painelAberto: true, sobre: 'conversa', marcadas: new Set(['m1']) })
    store.mudar({ chamadoPorMensagem: new Map([['m1', { id: 't1', numero: 'SUP-0001' }]]) })
    store.zerar(true)
    expect(store.ler()).toMatchObject({ marcando: false, painelAberto: false, sobre: 'mensagens' })
    expect(store.ler().marcadas.size).toBe(0)
    expect(store.ler().mensagens).toBe(mensagens)
    // Cancelar mantém as bandeiras; trocar de conversa (zerar sem argumento) não.
    expect(store.ler().chamadoPorMensagem.get('m1')?.numero).toBe('SUP-0001')
    store.zerar()
    expect(store.ler().chamadoPorMensagem.size).toBe(0)
    expect(store.ler().mensagens).toBe(mensagens)
  })
})

describe('useMarcacao', () => {
  // Conta pelo <Profiler> (o callback roda no commit, fora da renderização).
  function contar(store: StoreDaMarcacao) {
    const renders: Record<string, number> = {}
    const anotar: ProfilerOnRenderCallback = (id) => { renders[id] = (renders[id] ?? 0) + 1 }
    const Bolha = memo(function Bolha({ id }: { id: string }) {
      const marcada = useMarcacao(store, (e) => e.marcadas.has(id))
      return <span data-testid={id}>{marcada ? 'sim' : 'não'}</span>
    })
    const Conversa = () => <>{['a', 'b', 'c'].map((id) => <Profiler key={id} id={id} onRender={anotar}><Bolha id={id} /></Profiler>)}</>
    return { renders, Conversa }
  }

  it('marcar uma mensagem re-renderiza só a bolha dela', () => {
    const store = criarStoreDaMarcacao()
    const { renders, Conversa } = contar(store)
    const { getByTestId } = render(<Conversa />)
    expect(renders).toEqual({ a: 1, b: 1, c: 1 })
    act(() => store.alternar('b'))
    expect(getByTestId('b').textContent).toBe('sim')
    expect(renders).toEqual({ a: 1, b: 2, c: 1 })
    // Mudança que não toca o pedaço de ninguém (abrir o painel) não re-renderiza bolha nenhuma.
    act(() => store.mudar({ painelAberto: true }))
    expect(renders).toEqual({ a: 1, b: 2, c: 1 })
  })
})
