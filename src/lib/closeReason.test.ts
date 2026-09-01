// A4 (SCRUM-926) — o motivo do desfecho como dado: pré-seleção do motivo único
// e a regra do campo livre (D0-8), que é onde a UI e o relatório de perdas se
// encontram.
import { describe, it, expect } from 'vitest'
import { composeCloseReason, preselectedReason } from './closeReason'

describe('preselectedReason', () => {
  it('catálogo com um único motivo já vem escolhido', () => {
    expect(preselectedReason([{ key: 'outro', label: 'Outro' }])).toBe('outro')
  })

  it('com dois ou mais, ninguém escolhe pelo operador', () => {
    expect(preselectedReason([{ key: 'fechou', label: 'Fechou' }, { key: 'outro', label: 'Outro' }])).toBe('')
    expect(preselectedReason([])).toBe('')
  })
})

describe('composeCloseReason', () => {
  it('motivo da lista vai como está; observação vazia não vira nota', () => {
    expect(composeCloseReason({ picked: 'preco', note: '   ' })).toEqual({ value: { reason: 'preco', note: undefined } })
  })

  it('motivo da lista + observação', () => {
    expect(composeCloseReason({ picked: 'preco', note: 'pediu 20% ' })).toEqual({
      value: { reason: 'preco', note: 'pediu 20%' },
    })
  })

  it('sem escolher nada, erro — nunca um "outro" implícito', () => {
    expect(composeCloseReason({ picked: '' })).toEqual({ error: 'Escolha um motivo.' })
  })

  it('campo livre grava como "outro" + nota estruturada (D0-8)', () => {
    expect(composeCloseReason({ picked: '', free: 'Trocou de CNPJ', allowFree: true })).toEqual({
      value: { reason: 'outro', note: 'Trocou de CNPJ' },
    })
  })

  it('campo livre VENCE a lista: quem digitou já disse que nenhum item servia', () => {
    expect(composeCloseReason({ picked: 'preco', free: 'Trocou de CNPJ', note: 'ver e-mail', allowFree: true })).toEqual({
      value: { reason: 'outro', note: 'Trocou de CNPJ — ver e-mail' },
    })
  })

  it('sem o interruptor do funil, o campo livre é ignorado (lista fechada)', () => {
    expect(composeCloseReason({ picked: 'preco', free: 'Trocou de CNPJ' })).toEqual({
      value: { reason: 'preco', note: undefined },
    })
    expect(composeCloseReason({ picked: '', free: 'Trocou de CNPJ' })).toEqual({ error: 'Escolha um motivo.' })
  })

  it('com o livre ligado, a mensagem de erro oferece as duas saídas', () => {
    expect(composeCloseReason({ picked: '', free: '  ', allowFree: true })).toEqual({
      error: 'Escolha um motivo ou descreva o motivo.',
    })
  })
})
