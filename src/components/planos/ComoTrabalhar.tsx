// Retomadas (06/11): o passo a passo do plano, para quem usa o app pela primeira vez. Some com
// "Entendi" (guardado só neste navegador) e volta pelo "Como funciona?" do cabeçalho.
import { CircleCheck, MessageCircle, Send, X } from 'lucide-react'
import { marcarComoTrabalharVisto } from './comoTrabalharVisto'

const PASSOS = [
  { icone: MessageCircle, titulo: 'Abra a conversa', texto: 'Leia o que a pessoa pediu e quando. O motivo e a especialidade estão na linha dela.' },
  { icone: Send, titulo: 'Fale com ela', texto: 'Responda na conversa, envie um modelo (quem não escreve há mais de 24 h só recebe modelo) ou ligue.' },
  { icone: CircleCheck, titulo: 'Marque o resultado', texto: 'Em “Resultado”, escolha o que aconteceu. Se ela marcar pelo WhatsApp, aparece “Marcou” sozinho.' },
]

export function ComoTrabalhar({ onFechar }: { onFechar: () => void }) {
  return (
    <section aria-labelledby="como-trabalhar-titulo" className="relative rounded-[10px] border border-surface-700 bg-surface-800 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <h2 id="como-trabalhar-titulo" className="text-sm font-semibold text-surface-100">Como trabalhar este plano</h2>
        <button type="button" onClick={() => { marcarComoTrabalharVisto(true); onFechar() }} aria-label="Fechar o passo a passo"
          className="-mt-1 -mr-1 p-1.5 rounded-[6px] text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <ol className="mt-2 grid gap-3 md:grid-cols-3">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="flex items-start gap-2.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--rowhover)] text-xs font-bold text-brand-500 flex-shrink-0" aria-hidden>{i + 1}</span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-surface-100"><p.icone className="w-3.5 h-3.5 text-surface-400" aria-hidden />{p.titulo}</span>
              <span className="block mt-0.5 text-xs text-surface-400 leading-snug">{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-700 pt-2.5">
        <p className="text-xs text-surface-400">Quando terminar, use “Concluir plano”. O gestor vê o resultado no painel dele.</p>
        <button type="button" onClick={() => { marcarComoTrabalharVisto(true); onFechar() }}
          className="h-8 px-3 rounded-[8px] text-[13px] font-semibold text-brand-500 hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          Entendi
        </button>
      </div>
    </section>
  )
}
