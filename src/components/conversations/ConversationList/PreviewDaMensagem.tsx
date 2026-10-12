import { truncate } from '@/lib/utils'
import { classificarPreview, type ContextoDoPreview } from './classificarPreview'

/** Preview da última mensagem na lista — regras em classificarPreview.ts (SCRUM-1253).
 *  Auditoria 12/10: ícone e mini-botão têm 16px e alinham ao topo — antes
 *  esticavam a linha para 17–20px e a lista perdia o ritmo. */
export function PreviewDaMensagem({ text, contexto }: { text: string; contexto?: ContextoDoPreview }) {
  const p = classificarPreview(text, contexto)
  if (p.tipo === 'texto') return <>{truncate(p.texto, 52)}</>
  const Icone = p.icone
  if (p.tipo === 'resposta') {
    // Mini-botão: lê como "o cliente apertou isto" (mesmo ícone do chat).
    return (
      <span
        className="inline-flex items-center gap-1 max-w-full min-w-0 h-4 px-1.5 rounded-[5px] border border-surface-700 bg-surface-900 text-surface-200 leading-[14px] align-top"
        title={`Respondeu: ${p.texto}`}
      >
        <Icone className="w-3 h-3 flex-shrink-0 text-surface-400" aria-hidden />
        <span className="truncate">{p.texto}</span>
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 h-4 align-top${p.tipo === 'aviso' ? ' italic text-surface-500' : ''}`}>
      <Icone className="w-3 h-3 flex-shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{truncate(p.texto, 52)}</span>
      {p.tipo === 'reacao' && p.reacao && <span className="flex-shrink-0">{p.reacao}</span>}
    </span>
  )
}
