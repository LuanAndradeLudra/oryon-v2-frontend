// ─── Prompt como documento com gutter (A2 / SCRUM-1013) ──────────────────────
// Estética `.doc`/`.dl` do mockup: fonte mono, altura de linha fixa e um
// gutter de número à esquerda. Cabeçalhos (`##`) viram títulos DENTRO do
// documento, não cards separados — a numeração é contínua no doc inteiro.
// Parsing em `promptDocCore.ts` (puro, testado).

import { gutterWidth, parseBold, parsePromptDoc, type PromptLine } from './promptDocCore'

export function PromptDoc({ content }: { content: string }) {
  const lines = parsePromptDoc(content)
  const width = gutterWidth(lines.length)

  if (lines.length === 0) {
    return (
      <p className="text-sm text-surface-500 rounded-xl border border-surface-700 px-4 py-6 text-center">
        Este agente ainda não tem prompt.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-900/40 py-3 overflow-x-auto font-mono text-xs leading-6">
      {lines.map((line, i) => (
        <DocLine key={i} line={line} number={i + 1} width={width} />
      ))}
    </div>
  )
}

function DocLine({ line, number, width }: { line: PromptLine; number: number; width: number }) {
  return (
    <div className="flex items-start gap-3 px-3 hover:bg-white/[0.02]">
      <span
        // O número não faz parte do prompt: `select-none` mantém o
        // copiar/colar do documento limpo, e `aria-hidden` evita que o leitor
        // de tela leia "1 2 3" antes de cada linha de conteúdo.
        aria-hidden="true"
        className="select-none text-right text-surface-600 tabular-nums shrink-0"
        style={{ width: `${width}ch` }}
      >
        {number}
      </span>
      <LineBody line={line} />
    </div>
  )
}

function LineBody({ line }: { line: PromptLine }) {
  switch (line.kind) {
    case 'blank':
      // Ocupa a altura de uma linha para o gutter continuar alinhado ao texto.
      return <span className="min-w-0 flex-1">&nbsp;</span>
    case 'h1':
      return <span className="min-w-0 flex-1 font-sans font-bold text-base text-surface-50">{line.text}</span>
    case 'h2':
      return <span className="min-w-0 flex-1 font-sans font-semibold text-sm text-surface-200">{line.text}</span>
    case 'h3':
      return (
        <span className="min-w-0 flex-1 font-sans font-semibold text-xs uppercase tracking-wide text-surface-300">
          {line.text}
        </span>
      )
    case 'bullet':
      return (
        <span className="min-w-0 flex-1 text-surface-400 flex gap-2">
          <span aria-hidden="true" className="text-surface-600">•</span>
          <span className="min-w-0"><Bold text={line.text} /></span>
        </span>
      )
    case 'text':
      return <span className="min-w-0 flex-1 text-surface-400 whitespace-pre-wrap"><Bold text={line.text} /></span>
  }
}

function Bold({ text }: { text: string }) {
  return (
    <>
      {parseBold(text).map((span, i) =>
        span.bold
          ? <strong key={i} className="font-semibold text-surface-200">{span.text}</strong>
          : <span key={i}>{span.text}</span>,
      )}
    </>
  )
}
