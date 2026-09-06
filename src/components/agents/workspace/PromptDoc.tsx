// ─── Prompt como documento com gutter (A2 / SCRUM-1013) ──────────────────────
// Estética `.doc`/`.dl` do mockup (`p1-head.html:294-298`): documento com um
// gutter de número de linha à esquerda. Cabeçalhos (`##`) viram linhas de
// seção DENTRO do documento, não cards separados, e a numeração é contínua no
// doc inteiro. Parsing em `promptDocCore.ts` (puro, testado).

import { accentColor } from '@/components/ui/accentColor'
import { cn } from '@/lib/utils'
import { parseBold, parsePromptDoc, type PromptLine } from './promptDocCore'

/** `.dl.sec` do mockup: a linha de seção é violeta, mono e espaçada — é o que
 *  separa visualmente a estrutura do prompt do corpo dele. Via token, nunca
 *  hex (o mockup usa `var(--av)`, que é `--color-accent-violet`).
 *
 *  Tamanho: `text-2xs`, não `text-xs`. `--text-2xs` é 11px FIXO de propósito
 *  (index.css:49), então a seção fica menor que o corpo nos dois regimes. Com
 *  `text-xs` os dois emitiam 13,2px no desktop (a manopla de 110% do
 *  `index.css:355`) e a hierarquia entre corpo e seção colapsava — no mockup a
 *  seção é a MENOR das duas. */
const SECTION_KINDS = new Set<PromptLine['kind']>(['h1', 'h2', 'h3'])

export function PromptDoc({ content }: { content: string }) {
  const lines = parsePromptDoc(content)

  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-surface-700 bg-surface-900 px-4 py-6 text-center text-sm text-surface-500">
        Este agente ainda não tem prompt.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-surface-700 bg-surface-900">
      {lines.map((line, i) => (
        <DocLine key={i} line={line} number={i + 1} />
      ))}
    </div>
  )
}

function DocLine({ line, number }: { line: PromptLine; number: number }) {
  const isSection = SECTION_KINDS.has(line.kind)

  return (
    <div className="grid grid-cols-[36px_1fr] text-xs leading-[1.7] hover:bg-white/[0.02]">
      <span
        // O número não faz parte do prompt: `select-none` mantém o
        // copiar/colar do documento limpo, e `aria-hidden` evita que o leitor
        // de tela leia "1 2 3" antes de cada linha de conteúdo.
        aria-hidden="true"
        className="select-none pr-2.5 text-right font-mono text-2xs text-surface-600 tabular-nums"
      >
        {number}
      </span>
      <span
        className={cn(
          'min-w-0 pr-4',
          isSection
            ? 'font-mono text-2xs font-semibold tracking-[0.06em]'
            : 'whitespace-pre-wrap text-surface-200',
        )}
        style={isSection ? { color: accentColor('violet') } : undefined}
      >
        {isSection ? (
          line.text
        ) : line.kind === 'bullet' ? (
          <>
            <span aria-hidden="true" className="text-surface-500">• </span>
            <Bold text={line.text} />
          </>
        ) : line.kind === 'blank' ? (
          // Mantém a altura de uma linha para o gutter seguir alinhado ao texto.
          ' '
        ) : (
          <Bold text={line.text} />
        )}
      </span>
    </div>
  )
}

function Bold({ text }: { text: string }) {
  return (
    <>
      {parseBold(text).map((span, i) =>
        span.bold
          ? <strong key={i} className="font-semibold text-surface-50">{span.text}</strong>
          : <span key={i}>{span.text}</span>,
      )}
    </>
  )
}
