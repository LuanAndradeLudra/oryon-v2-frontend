// ─── O resumo só entra quando tem forma (SCRUM-992) ──────────────────────────
//
// Achado do Lince (`HandoffKpis.tsx:43`, `topReasons7d[0]` derrubando a tela no
// ErrorBoundary) mais a varredura que ele pediu, que achou outros quatro no
// mesmo arquivo — todos silenciosos, um deles renderizando **"undefined%"** na
// cara do operador.
//
// NÃO ERAM CINCO DEFEITOS, ERA UM: o `resumo` entrava no componente sem nunca
// ter sido conferido. Por isso a guarda é na FRONTEIRA e não nas cinco linhas.
//
// AS TRÊS GUARDAS QUE EXISTIAM ERAM FALSAS, e é padrão:
//   `topReasons7d[0] ?? null`        guarda o ELEMENTO — o `[0]` estoura antes
//   `avgWaitSeconds === null ? …`    confere `null`, deixa `undefined` passar
//   `returnedToAiPct === null ? …`   idem
// As três LEEM como guardadas. Foi por isso que sobreviveram à varredura do
// #171, que foi honesta e olhou o arquivo errado.
//
// Metade dos casos afirma o ESTADO e metade afirma O QUE A TELA MOSTRA. Só o
// estado não bastaria: o `undefined%` é exatamente um defeito que o estado não
// denuncia.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, waitFor } from '@testing-library/react'
import type { HandoffSummary } from '@/types/agentsOps'

const listaHandoffs = vi.fn()
const resumoHandoffs = vi.fn()

vi.mock('@/services/agentsOpsApi', () => ({
  handoffsApi: {
    list: (...a: unknown[]) => listaHandoffs(...a),
    summary: (...a: unknown[]) => resumoHandoffs(...a),
  },
}))
vi.mock('@/services/api', () => ({ conversationsApi: { list: vi.fn() } }))
vi.mock('@/services/agentsApi', () => ({ listAgents: () => Promise.resolve([]) }))

const { resumoValido, useHandoffQueue } = await import('./useHandoffQueue')
const { HandoffKpis } = await import('./HandoffKpis')

const COMPLETO: HandoffSummary = {
  waiting: 3, claimed: 2, resolvedToday: 7,
  avgWaitSeconds: 120, slaBreached: 1,
  topReasons7d: [{ label: 'reembolso', count: 4, total: 10 }],
  returnedToAiPct: 25,
}

/** O resumo sem um campo — é a forma que o defeito exigia e que o
 *  `Partial<>` não expressa: o campo tem de estar AUSENTE, não `undefined`. */
function semCampo(campo: keyof HandoffSummary): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...COMPLETO }
  delete copia[campo]
  return copia
}

beforeEach(() => vi.clearAllMocks())

describe('resumoValido · o que entra e o que vira null', () => {
  it('CONTROLE: o resumo completo passa inteiro, sem cópia nem normalização', () => {
    // Devolve o MESMO objeto: normalizar campo a campo criaria um segundo lugar
    // onde o shape é definido, e o shape já mora no tipo.
    expect(resumoValido(COMPLETO)).toBe(COMPLETO)
  })

  it('`topReasons7d` ausente vira null — era o CRASH', () => {
    expect(resumoValido(semCampo('topReasons7d'))).toBeNull()
  })

  it('`topReasons7d` que não é array também vira null', () => {
    expect(resumoValido({ ...COMPLETO, topReasons7d: 'nenhum' })).toBeNull()
  })

  it('`null` é VÁLIDO nos dois campos que o contrato define como anuláveis', () => {
    // D37 e a regra "`null` onde `0` mentiria": fila vazia não é média zero.
    // Rejeitar `null` aqui apagaria os KPIs de todo tenant com fila vazia — é
    // a correção exagerada.
    expect(resumoValido({ ...COMPLETO, avgWaitSeconds: null, returnedToAiPct: null })).not.toBeNull()
  })

  it('mas `undefined` NÃO é — e é essa a diferença que as guardas antigas perdiam', () => {
    expect(resumoValido({ ...COMPLETO, avgWaitSeconds: undefined })).toBeNull()
    expect(resumoValido({ ...COMPLETO, returnedToAiPct: undefined })).toBeNull()
  })

  it('contagem ausente ou não-numérica vira null', () => {
    for (const campo of ['waiting', 'claimed', 'resolvedToday', 'slaBreached'] as const) {
      expect(resumoValido({ ...COMPLETO, [campo]: undefined }), campo).toBeNull()
      expect(resumoValido({ ...COMPLETO, [campo]: null }), campo).toBeNull()
    }
  })

  it('NaN não passa: ele é `number` e quebraria a conta da tela', () => {
    expect(resumoValido({ ...COMPLETO, slaBreached: Number.NaN })).toBeNull()
  })

  it('corpo vazio, nulo ou de outro tipo vira null', () => {
    expect(resumoValido({})).toBeNull()
    expect(resumoValido(null)).toBeNull()
    expect(resumoValido('resumo')).toBeNull()
  })
})

describe('HandoffKpis · o que a TELA mostra, que é onde o defeito aparecia', () => {
  it('com o resumo completo, os números aparecem', () => {
    render(<HandoffKpis resumo={COMPLETO} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('NUNCA renderiza "undefined" — o defeito que não derrubava nada', () => {
    // A linha 69 fazia `returnedToAiPct === null ? … : \`${pct}%\``, então
    // `undefined` virava a string "undefined%" na tela. Não crasha, não acende
    // alarme, e o operador lê um número que não existe.
    //
    // Com a guarda de fronteira este resumo nunca chega ao componente — mas a
    // asserção é sobre a TELA de propósito: se alguém remover a guarda, é aqui
    // que o sintoma reaparece, e é o sintoma que o operador vê.
    const torto = { ...COMPLETO, returnedToAiPct: undefined } as unknown as HandoffSummary
    const guardado = resumoValido(torto)
    expect(guardado).toBeNull()

    render(<>{guardado && <HandoffKpis resumo={guardado} />}</>)
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('e o resumo sem `topReasons7d` não chega a montar o componente', () => {
    const guardado = resumoValido(semCampo('topReasons7d'))
    expect(guardado).toBeNull()
    // O par do caso acima: aqui o sintoma era crash, e a prova é que o render
    // condicional que a página já faz não chega a acontecer.
    render(<>{guardado && <HandoffKpis resumo={guardado} />}</>)
    expect(screen.queryByText(/Motivo/i)).not.toBeInTheDocument()
  })
})

describe('useHandoffQueue · a guarda está LIGADA no ponto de entrada', () => {
  // Este bloco existe porque os casos acima provavam o VALIDADOR e não a
  // fiação: desligar a guarda do `setResumo` deixava os 11 verdes. Validador
  // correto e não chamado é o mesmo que validador ausente — e a mutação que
  // encontra isso é a que muda o CHAMADOR, não a função.
  beforeEach(() => {
    vi.resetAllMocks()
    listaHandoffs.mockResolvedValue({ data: { items: [], total: 0 } })
  })

  it('resumo torto vindo da rede não chega ao estado', async () => {
    resumoHandoffs.mockResolvedValue({ data: semCampo('topReasons7d') })

    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))
    await waitFor(() => expect(resumoHandoffs).toHaveBeenCalled())

    expect(r.result.current.resumo).toBeNull()
  })

  it('e o resumo bom continua chegando — a guarda não pode comer o caso normal', async () => {
    resumoHandoffs.mockResolvedValue({ data: COMPLETO })

    const r = renderHook(() => useHandoffQueue('waiting'))
    await waitFor(() => expect(r.result.current.carregando).toBe(false))
    await waitFor(() => expect(r.result.current.resumo).not.toBeNull())

    expect(r.result.current.resumo?.waiting).toBe(3)
  })
})
