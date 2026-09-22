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
 *
 * Cor via `--color-search-highlight-bg`/`-fg` (src/index.css, redefinidos em
 * `[data-theme="light"]`) — tokens PRÓPRIOS, não `--color-accent-soft`/-dark
 * compartilhados (aquele é usado no hover do Button; mudar o alpha dele
 * mudaria hover de botão sem querer). Escolhidos por comparação visual num
 * artifact (ver PR) — no claro a caixa tinge com o próprio teal escuro
 * (não o teal claro em alpha maior), fica mais escura sem ficar mais
 * saturada.
 */
const HIGHLIGHT_START = '\u0001'
const HIGHLIGHT_END = '\u0002'
const highlightStyle = {
  backgroundColor: 'var(--color-search-highlight-bg)',
  color: 'var(--color-search-highlight-fg)',
}

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
            <mark className="rounded px-1 font-semibold" style={highlightStyle}>{matched}</mark>
            {rest}
          </span>
        )
      })}
    </>
  )
}
