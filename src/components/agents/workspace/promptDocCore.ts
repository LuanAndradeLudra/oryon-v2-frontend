// ─── Parsing do prompt para o doc com gutter (A2 / SCRUM-1013) ───────────────
// Módulo PURO (sem JSX), testável sem render — mesmo padrão de
// `sectionNavCore.ts`.
//
// POR QUE NÃO REUSO O PromptArtifact (decisão 7 do Maestro, §5.11 do A2-plano):
// a decisão pedia "reaproveitar `renderPromptSections` e trocar só a camada
// visual". Ao ler o arquivo, `renderPromptSections` (`PromptArtifact.tsx:27`)
// **não é um parser** — é um renderer que já devolve o JSX dos cards com o
// markup cravado (`rounded-xl border border-surface-700 p-4`). Para obter o
// gutter eu teria que alterar essa função, que é exatamente o que a decisão
// proíbe (mudaria o Studio). O `renderPromptLine` exportado ao lado dela
// também não serve: ele delega a `renderBodyLine`, que devolve `<li>` para
// bullets — dentro das minhas linhas de gutter (que são `div`) isso vira `<li>`
// órfão, HTML inválido e ruído de leitor de tela.
// Resultado: parsing próprio aqui, e **`PromptArtifact.tsx` fica com ZERO
// mudanças** — nem a exportação que o Maestro chegou a autorizar foi precisa.

export type PromptLineKind = 'h1' | 'h2' | 'h3' | 'bullet' | 'blank' | 'text'

export interface PromptLine {
  kind: PromptLineKind
  /** Conteúdo já sem o marcador (`## `, `- ` etc.). */
  text: string
}

/** Um pedaço de texto de uma linha, com ou sem negrito (`**assim**`). */
export interface PromptSpan {
  text: string
  bold: boolean
}

/** Classifica UMA linha. Espelha as regras que o `renderBodyLine` do
 *  PromptArtifact já aplica, para as duas telas lerem o mesmo markdown do
 *  mesmo jeito — o que muda é só como cada uma desenha. */
export function parsePromptLine(line: string): PromptLine {
  if (line.startsWith('# '))   return { kind: 'h1',     text: line.slice(2) }
  if (line.startsWith('## '))  return { kind: 'h2',     text: line.slice(3) }
  if (line.startsWith('### ')) return { kind: 'h3',     text: line.slice(4) }
  if (line.startsWith('• ') || line.startsWith('- ')) return { kind: 'bullet', text: line.slice(2) }
  if (line.trim() === '')      return { kind: 'blank',  text: '' }
  return { kind: 'text', text: line }
}

const BOLD = /\*\*[^*]+\*\*/

/** Quebra `**negrito**` em pedaços. Segmentos vazios são descartados para o
 *  render não emitir `<span>` à toa.
 *
 *  O teste do pedaço usa a MESMA regex do split, e não `startsWith('**') &&
 *  endsWith('**')`: `'****'` satisfaz os dois `starts/endsWith` sem ser um
 *  negrito de verdade (não há conteúdo entre os marcadores), e acabaria
 *  virando um negrito vazio que engole o texto original. */
export function parseBold(text: string): PromptSpan[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(part => part !== '')
    .map(part =>
      BOLD.test(part) && part.startsWith('**')
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    )
}

/** Contagem aproximada de tokens, para o subtítulo da seção Prompt.
 *  Aproximada de propósito e rotulada como tal na UI (`~1.842 tokens`): não
 *  existe tokenizer no frontend e trazer um só para um subtítulo não se paga.
 *  ~4 caracteres por token é a heurística usual para português. */
export function approxTokens(content: string): number {
  return Math.round(content.length / 4)
}

/** O documento inteiro, linha a linha. A numeração do gutter é o índice + 1 e
 *  é CONTÍNUA no documento todo — não reinicia por seção, e linhas em branco
 *  contam (senão o número deixaria de corresponder ao texto que a pessoa
 *  edita no textarea). */
export function parsePromptDoc(content: string): PromptLine[] {
  if (content === '') return []
  return content.split('\n').map(parsePromptLine)
}
