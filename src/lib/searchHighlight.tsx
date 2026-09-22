import type { ReactNode } from 'react'

/**
 * Busca de conversas por conteúdo de mensagem — SCRUM-1096.
 *
 * Marcadores que o backend devolve em `Conversation.searchSnippet`
 * (ver search-highlight.util.ts, mesmo par de caracteres dos dois lados —
 * mudar aqui exige mudar lá). Caracteres de controle (SOH/STX) não aparecem
 * em texto real de mensagem, então não há risco de casar com conteúdo do
 * cliente por acidente.
 *
 * O trecho vem pronto do `ts_headline()` do Postgres (já escolhe o recorte
 * mais relevante e casa o RADICAL da palavra, não o texto digitado — por
 * isso aqui é só split() nos marcadores, nunca um regex reconstruindo o
 * match a partir do termo buscado).
 */
const HIGHLIGHT_START = '\u0001'
const HIGHLIGHT_END = '\u0002'

/**
 * Quebra um snippet com marcadores em texto + `<mark>`. SEMPRE texto puro —
 * nunca `dangerouslySetInnerHTML`: o conteúdo vem de mensagem de cliente,
 * não confiável, e o backend nunca manda HTML aqui (só os dois marcadores
 * de controle).
 */
export function renderHighlightedSnippet(snippet: string): ReactNode {
  const segments = snippet.split(HIGHLIGHT_START)
  if (segments.length === 1) return snippet

  return (
    <>
      {segments[0]}
      {segments.slice(1).map((segment, i) => {
        const endIdx = segment.indexOf(HIGHLIGHT_END)
        if (endIdx === -1) return <span key={i}>{segment}</span>
        const matched = segment.slice(0, endIdx)
        const rest = segment.slice(endIdx + HIGHLIGHT_END.length)
        return (
          <span key={i}>
            <mark className="bg-brand-500/30 text-inherit rounded-sm px-0.5">{matched}</mark>
            {rest}
          </span>
        )
      })}
    </>
  )
}
