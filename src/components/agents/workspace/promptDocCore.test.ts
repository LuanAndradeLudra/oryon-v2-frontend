import { describe, it, expect } from 'vitest'
import { gutterWidth, parseBold, parsePromptDoc, parsePromptLine } from './promptDocCore'

describe('promptDocCore — classificação de linha', () => {
  it('reconhece os 3 níveis de cabeçalho e tira o marcador', () => {
    expect(parsePromptLine('# Título')).toEqual({ kind: 'h1', text: 'Título' })
    expect(parsePromptLine('## Seção')).toEqual({ kind: 'h2', text: 'Seção' })
    expect(parsePromptLine('### Sub')).toEqual({ kind: 'h3', text: 'Sub' })
  })

  it('reconhece as duas marcas de bullet que o prompt usa', () => {
    expect(parsePromptLine('- item')).toEqual({ kind: 'bullet', text: 'item' })
    expect(parsePromptLine('• item')).toEqual({ kind: 'bullet', text: 'item' })
  })

  it('exige o espaço depois do marcador — "#tag" é texto, não cabeçalho', () => {
    expect(parsePromptLine('#tag').kind).toBe('text')
    expect(parsePromptLine('##tag').kind).toBe('text')
    expect(parsePromptLine('-1 grau').kind).toBe('text')
  })

  it('trata linha vazia e só-espaços como branco', () => {
    expect(parsePromptLine('')).toEqual({ kind: 'blank', text: '' })
    expect(parsePromptLine('   ').kind).toBe('blank')
  })

  it('não confunde nível: "### " não vira h2', () => {
    expect(parsePromptLine('### x').kind).toBe('h3')
    expect(parsePromptLine('## x').kind).toBe('h2')
  })
})

describe('promptDocCore — negrito', () => {
  it('separa os trechos em negrito dos normais', () => {
    expect(parseBold('fale **sempre** em português')).toEqual([
      { text: 'fale ', bold: false },
      { text: 'sempre', bold: true },
      { text: ' em português', bold: false },
    ])
  })

  it('texto sem negrito vira um único pedaço', () => {
    expect(parseBold('texto simples')).toEqual([{ text: 'texto simples', bold: false }])
  })

  it('não emite pedaço vazio quando o negrito abre ou fecha a linha', () => {
    expect(parseBold('**tudo**')).toEqual([{ text: 'tudo', bold: true }])
    expect(parseBold('**a** b')).toEqual([
      { text: 'a', bold: true },
      { text: ' b', bold: false },
    ])
  })

  it('asterisco solto ou par vazio não quebra', () => {
    expect(parseBold('2 * 3 = 6')).toEqual([{ text: '2 * 3 = 6', bold: false }])
    expect(parseBold('****')).toEqual([{ text: '****', bold: false }])
    expect(parseBold('')).toEqual([])
  })
})

describe('promptDocCore — documento', () => {
  it('numeração é contínua e conta linha em branco', () => {
    const doc = parsePromptDoc('# T\n\n## S\n- a')
    expect(doc).toHaveLength(4)
    expect(doc.map(l => l.kind)).toEqual(['h1', 'blank', 'h2', 'bullet'])
  })

  it('não reinicia a contagem por seção — 2 seções seguem numeradas em sequência', () => {
    const doc = parsePromptDoc('## A\nlinha\n## B\nlinha')
    // Se reiniciasse por seção, a 4ª linha seria "2"; aqui ela é a 4ª do doc.
    expect(doc).toHaveLength(4)
    expect(doc[3]).toEqual({ kind: 'text', text: 'linha' })
  })

  it('conteúdo vazio não gera uma linha fantasma', () => {
    expect(parsePromptDoc('')).toEqual([])
  })

  it('preserva a linha em branco final (o textarea a tem, o doc também)', () => {
    expect(parsePromptDoc('a\n')).toHaveLength(2)
  })

  it('gutter não muda de largura no meio da lista', () => {
    expect(gutterWidth(9)).toBe(1)
    expect(gutterWidth(10)).toBe(2)
    expect(gutterWidth(100)).toBe(3)
    expect(gutterWidth(0)).toBe(1)
  })
})
