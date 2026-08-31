// ─── templateVariables (SCRUM-807) ───────────────────────────────────────────
// A coleta de variáveis no modal "Revisar template" depende destas regras:
//   1. só o CORPO define quantas variáveis existem (bodyVariables é rótulo);
//   2. placeholder repetido é UMA variável; a ordem é numérica, não textual;
//   3. templates nomeados ({{nome}}) viram posições, na ordem de aparição;
//   4. o envio só libera com todos os valores preenchidos (espaço não conta).

import { describe, it, expect } from 'vitest'
import {
  templatePlaceholders,
  templateVariableSlots,
  variablesComplete,
  variablesToArray,
} from '@/lib/templateVariables'

describe('templatePlaceholders', () => {
  it('lista posicionais deduplicados em ordem numérica', () => {
    expect(templatePlaceholders('Olá {{2}}, sua consulta {{1}} às {{2}}. Ref {{10}}')).toEqual(['1', '2', '10'])
  })

  it('lista nomeados na ordem de primeira aparição', () => {
    expect(templatePlaceholders('Olá {{ nome }}, {{data}} — {{nome}}')).toEqual(['nome', 'data'])
  })

  it('devolve vazio quando não há placeholder', () => {
    expect(templatePlaceholders('Sem variáveis aqui.')).toEqual([])
  })
})

describe('templateVariableSlots', () => {
  it('usa bodyVariables como rótulo e cai para "sem descrição"', () => {
    const slots = templateVariableSlots({ body: 'Oi {{1}}, dia {{2}}', bodyVariables: ['Nome do cliente'] })
    expect(slots).toEqual([
      { key: '1', placeholder: '{{1}}', label: 'Nome do cliente' },
      { key: '2', placeholder: '{{2}}', label: 'sem descrição' },
    ])
  })

  it('nomeados: rótulo cai para o próprio nome e a chave é posicional', () => {
    const slots = templateVariableSlots({ body: 'Oi {{nome}}, {{data}}', bodyVariables: undefined })
    expect(slots).toEqual([
      { key: '1', placeholder: '{{nome}}', label: 'nome' },
      { key: '2', placeholder: '{{data}}', label: 'data' },
    ])
  })

  it('corpo sem placeholder → nenhum slot, mesmo com bodyVariables cadastradas', () => {
    expect(templateVariableSlots({ body: 'Texto fixo', bodyVariables: ['legado'] })).toEqual([])
  })
})

describe('variablesComplete / variablesToArray', () => {
  const slots = templateVariableSlots({ body: '{{1}} e {{2}}', bodyVariables: [] })

  it('bloqueia com valor ausente ou só espaços', () => {
    expect(variablesComplete(slots, { '1': 'João' })).toBe(false)
    expect(variablesComplete(slots, { '1': 'João', '2': '   ' })).toBe(false)
  })

  it('libera com todos preenchidos e monta a lista posicional aparada', () => {
    const values = { '1': ' João ', '2': '14:00' }
    expect(variablesComplete(slots, values)).toBe(true)
    expect(variablesToArray(slots, values)).toEqual(['João', '14:00'])
  })

  it('sem slots: sempre completo e lista vazia', () => {
    expect(variablesComplete([], {})).toBe(true)
    expect(variablesToArray([], {})).toEqual([])
  })
})
