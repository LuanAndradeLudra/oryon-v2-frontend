import { describe, it, expect } from 'vitest'
import { resolvePreviewVars, shortName } from './previewVars'
import type { CampaignVariableMapping, Contact } from '@/types'

const CONTATO = {
  id: 'c1',
  tenantId: 'tnt_1',
  waId: '5511999990001',
  displayName: 'Marina Torres',
  company: 'Nuvem Moda',
  city: '',
  customFields: [{ key: 'plano', label: 'Plano', value: 'Ouro', type: 'text' }],
} as unknown as Contact

const map = (over: Partial<CampaignVariableMapping>): CampaignVariableMapping => ({
  position: 1, variableName: 'nome', source: 'contact_field', ...over,
}) as CampaignVariableMapping

describe('resolvePreviewVars — o valor REAL do contato, não o rótulo do campo', () => {
  it('resolve campo do contato com o dado da pessoa', () => {
    const vars = resolvePreviewVars([map({ contactField: 'displayName' })], CONTATO)
    // O `Step3Variaveis` devolveria "Nome do contato" aqui; a diferença é o
    // ponto do telefone (mockup §D2: "com dados reais do contato").
    expect(vars).toEqual({ '1': 'Marina Torres' })
  })

  it('resolve campo personalizado pela chave, e não pelo rótulo', () => {
    const vars = resolvePreviewVars(
      [map({ source: 'custom_field', customFieldKey: 'plano' })],
      CONTATO,
    )
    expect(vars).toEqual({ '1': 'Ouro' })
  })

  it('resolve valor fixo mesmo sem contato — é o mesmo texto para todo mundo', () => {
    const vars = resolvePreviewVars(
      [map({ source: 'literal', literal: 'nuvemmoda.com.br/inverno' })],
      null,
    )
    expect(vars).toEqual({ '1': 'nuvemmoda.com.br/inverno' })
  })

  it('campo vazio no contato NÃO entra no mapa: a variável fica visível como {{n}}', () => {
    // Sem chave, o `TemplatePreview` mantém o `{{2}}` à mostra. É a informação
    // que interessa — este contato não tem cidade — e não inventa o fallback
    // "cliente" do mockup, que não existe no contrato de envio.
    const vars = resolvePreviewVars(
      [map({ position: 2, contactField: 'city' })],
      CONTATO,
    )
    expect(vars).toEqual({})
  })

  it('sem contato, só o valor fixo resolve', () => {
    const vars = resolvePreviewVars(
      [map({ contactField: 'displayName' }), map({ position: 2, source: 'literal', literal: 'X' })],
      null,
    )
    expect(vars).toEqual({ '2': 'X' })
  })

  it('campo fora dos oferecidos pelo mapeador é ignorado', () => {
    // Sem a trava, `tenantId` — que o operador nunca escolheu e que nem
    // aparece na lista — iria parar dentro da mensagem.
    const vars = resolvePreviewVars([map({ contactField: 'tenantId' })], CONTATO)
    expect(vars).toEqual({})
  })

  it('valor não-texto não vira mensagem', () => {
    const comNumero = { ...CONTATO, company: 42 } as unknown as Contact
    const vars = resolvePreviewVars([map({ contactField: 'company' })], comNumero)
    expect(vars).toEqual({})
  })
})

describe('shortName', () => {
  it('abrevia o sobrenome, como o rótulo do seletor no mockup', () => {
    expect(shortName('Marina Torres')).toBe('Marina T.')
  })

  it('usa o último sobrenome quando há nome do meio', () => {
    expect(shortName('Ana Beatriz Ribeiro')).toBe('Ana R.')
  })

  it('nome de uma palavra fica inteiro', () => {
    expect(shortName('Marina')).toBe('Marina')
  })

  it('nome vazio devolve vazio, para quem chama decidir o que mostrar', () => {
    expect(shortName('   ')).toBe('')
  })
})
