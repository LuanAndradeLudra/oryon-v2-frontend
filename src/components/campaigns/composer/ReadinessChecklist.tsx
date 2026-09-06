// ─── ReadinessChecklist ────────────────────────────────────────────────────
// Card de 3 colunas logo acima da barra fixa — mockup `p3-disparos.html` §D2.
// Não repete os 4 blocos: responde à pergunta "o disparo tem condição de
// sair?", que é outra coisa. O bloco Template fica verde assim que há
// template escolhido e nome; esta linha só fica verde se esse template
// estiver APROVADO pela Meta, que é o que o backend exige na hora de enviar.
//
// A caixa é o `<Card>` de `ui/` e não um div montado à mão: o `.card` do
// mockup é exatamente o primitivo (fundo s800, borda s700, raio 24, padding
// 16 e a sombra `0 1px 3px`), e a sombra some quando se remonta na mão.
// O `role="group"` fica num wrapper porque o `Card` não repassa props de
// ARIA — sem ele as 3 linhas chegam soltas ao leitor de tela.
import { CheckCircle2, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

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
    >
      <Card
        className={cn(
          'grid grid-cols-1 sm:grid-cols-3 gap-3.5',
          // O mockup desenha a borda rosa porque desenha o cartão COM
          // pendência. Deixá-la fixa anunciaria risco depois que os 3
          // pré-requisitos fecham, então ela volta ao neutro do `.card`.
          pending > 0 && 'border-accent-rose/25',
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {item.done
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-status-active" aria-hidden />
              : <Circle className="w-4 h-4 flex-shrink-0 text-surface-500" aria-hidden />}
            <span className={item.done ? 'text-surface-200' : 'text-surface-400'}>{item.label}</span>
            {/* O ícone é decorativo; quem lê por audição precisa do estado em
                texto, senão as 3 linhas soam iguais. */}
            <span className="sr-only">{item.done ? '(atendido)' : '(pendente)'}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
