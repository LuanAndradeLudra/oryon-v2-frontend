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
 * mais relevante e casa o RADICAL da palavra, não o texto digitado).
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

interface Token {
  type: 'text' | 'match'
  text: string
}

/** Separa o snippet em texto puro / trecho marcado, na ordem em que aparecem. */
function tokenize(snippet: string): Token[] {
  const tokens: Token[] = []
  let rest = snippet
  for (;;) {
    const startIdx = rest.indexOf(HIGHLIGHT_START)
    if (startIdx === -1) {
      if (rest) tokens.push({ type: 'text', text: rest })
      return tokens
    }
    if (startIdx > 0) tokens.push({ type: 'text', text: rest.slice(0, startIdx) })
    const afterStart = rest.slice(startIdx + HIGHLIGHT_START.length)
    const endIdx = afterStart.indexOf(HIGHLIGHT_END)
    if (endIdx === -1) {
      // Marcador sem fechamento — não deveria acontecer (vem do backend);
      // trata como texto pra não sumir com o conteúdo da mensagem.
      tokens.push({ type: 'text', text: afterStart })
      return tokens
    }
    tokens.push({ type: 'match', text: afterStart.slice(0, endIdx) })
    rest = afterStart.slice(endIdx + HIGHLIGHT_END.length)
  }
}

/**
 * Funde marcadores vizinhos separados só por espaço numa caixa só. O
 * `ts_headline` do Postgres marca cada PALAVRA que bateu separadamente — uma
 * busca por "boa tarde" vem como `<S>Boa<E> <S>tarde<E>`, o espaço entre elas
 * fora de qualquer marcador. Sem isto, "Boa" e "tarde" viram duas caixas
 * coladas com um respiro no meio (visualmente errado, principalmente com o
 * destaque em caixa/pill). Marcadores com texto de verdade entre eles (não
 * bateram os dois na busca) continuam em caixas separadas — juntar tudo
 * destacaria texto que não fez parte do resultado.
 */
function mergeAdjacentMatches(tokens: Token[]): Token[] {
  const merged: Token[] = []
  for (const token of tokens) {
    const prev = merged[merged.length - 1]
    if (token.type === 'match' && prev?.type === 'match') {
      prev.text += token.text
      continue
    }
    const beforePrev = merged[merged.length - 2]
    if (
      token.type === 'match' &&
      prev?.type === 'text' &&
      /^\s+$/.test(prev.text) &&
      beforePrev?.type === 'match'
    ) {
      beforePrev.text += prev.text + token.text
      merged.pop() // o espaço foi absorvido no match anterior
      continue
    }
    merged.push({ ...token })
  }
  return merged
}

/**
 * Quebra um snippet com marcadores em texto + `<mark>`, fundindo palavras
 * vizinhas destacadas numa caixa só. SEMPRE texto puro — nunca
 * `dangerouslySetInnerHTML`: o conteúdo vem de mensagem de cliente, não
 * confiável, e o backend nunca manda HTML aqui (só os dois marcadores de
 * controle).
 */
export function renderHighlightedSnippet(snippet: string): ReactNode {
  const tokens = mergeAdjacentMatches(tokenize(snippet))
  if (tokens.length === 0 || tokens.every((t) => t.type === 'text')) return snippet

  return (
    <>
      {tokens.map((t, i) =>
        t.type === 'match' ? (
          <mark key={i} className="rounded px-1 font-semibold" style={highlightStyle}>
            {t.text}
          </mark>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  )
}
