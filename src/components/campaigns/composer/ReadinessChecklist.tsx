// ─── ReadinessChecklist ────────────────────────────────────────────────────
// Card de 3 colunas logo acima da barra fixa — mockup `p3-disparos.html` §D2.
// Não repete os 4 blocos: responde à pergunta "o disparo tem condição de
// sair?", que é outra coisa. O bloco Template fica verde assim que há
// template escolhido e nome; esta linha só fica verde se esse template
// estiver APROVADO pela Meta, que é o que o backend exige na hora de enviar.
import { CheckCircle2, Circle } from 'lucide-react'
import { accentColor } from '@/components/ui/accentColor'

export interface ReadinessItem {
  label: string
  done: boolean
}

interface ReadinessChecklistProps {
  items: ReadinessItem[]
}

export function ReadinessChecklist({ items }: ReadinessChecklistProps) {
  const pending = items.filter((i) => !i.done).length

  return (
    <div
      role="group"
      aria-label={
        pending === 0
          ? 'Pré-requisitos do disparo: todos atendidos'
          : `Pré-requisitos do disparo: ${pending} pendente${pending > 1 ? 's' : ''}`
      }
      className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 rounded-2xl border border-surface-700 bg-surface-800 p-4"
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          {item.done
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: accentColor('green') }} aria-hidden />
            : <Circle className="w-4 h-4 flex-shrink-0 text-surface-500" aria-hidden />}
          <span className={item.done ? 'text-surface-200' : 'text-surface-400'}>{item.label}</span>
          {/* O ícone é decorativo; quem lê por audição precisa do estado em
              texto, senão as 3 linhas soam iguais. */}
          <span className="sr-only">{item.done ? '(atendido)' : '(pendente)'}</span>
        </div>
      ))}
    </div>
  )
}
