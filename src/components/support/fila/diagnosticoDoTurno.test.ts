import { describe, expect, it } from 'vitest'
import { sinaisDoTurno } from './diagnosticoDoTurno'

describe('diagnóstico do turno (revisão de UX de 27/10)', () => {
  it('sem fonte e promessa de retorno sem transferir: os dois sinais vêm marcados', () => {
    const sinais = sinaisDoTurno({
      rastro: { desfecho: 'reply_created', transferiu: false },
      secoes: {
        turno: { respostaFinal: 'Não encontrei essa informação. Vou pedir para alguém da equipe confirmar e já te retorno.' },
        verificacao: [{ verdict: 'pass', findings: [], sources: { catalog: 'empty', kbChunks: 0, skillOutputs: 0 } }],
      },
    })
    expect(sinais).toEqual([
      { rotulo: 'Desfecho', valor: 'Respondeu ao contato', alerta: false },
      { rotulo: 'Transferência', valor: 'Prometeu retorno e NÃO passou para a equipe', alerta: true },
      { rotulo: 'Fontes', valor: 'Nenhuma fonte: catálogo vazio · 0 trechos da base · 0 resultados de ferramenta', alerta: true },
      { rotulo: 'Verificação', valor: 'passou', alerta: false },
    ])
  })

  it('turno normal: nada marcado; falha de ferramenta e achado da verificação marcam', () => {
    const normal = sinaisDoTurno({
      rastro: { desfecho: 'reply_created', transferiu: true },
      secoes: { verificacao: [{ verdict: 'pass', sources: { catalog: 'ok', kbChunks: 3, skillOutputs: 1 } }] },
    })
    expect(normal.every((s) => !s.alerta)).toBe(true)
    const comFalha = sinaisDoTurno({
      rastro: { desfecho: 'timeout' },
      secoes: { ferramentas: [{ nome: 'agenda', status: 'error' }], verificacao: [{ verdict: 'repair', findings: [{}] }] },
    })
    expect(comFalha.filter((s) => s.alerta).map((s) => s.rotulo)).toEqual(['Desfecho', 'Ferramentas', 'Verificação'])
  })
})
