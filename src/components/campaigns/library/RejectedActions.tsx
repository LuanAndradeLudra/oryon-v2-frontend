// ─── RejectedActions ───────────────────────────────────────────────────────
// O que um template recusado pela Meta mostra: o motivo dela, com as palavras
// dela, e a única ação que resolve — reescrever e reenviar.
//
// Sem o BE.8 no ar, "Reescrever com a IA" abre o criador pré-preenchido com o
// template recusado e o motivo à vista, para a pessoa reescrever à mão. Com o
// BE.8, `rewrite` devolve uma sugestão que NÃO é persistida (Decisão D15), e
// por isso ela também precisa cair num passo de revisão em vez de reenviar
// sozinha. Os dois caminhos terminam no mesmo lugar, o que é o motivo de o
// botão ser um só.
import { AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface RejectedActionsProps {
  /** Texto da Meta. Sem ele não há o que explicar, e a linha some. */
  reason?: string
  onRewrite: () => void
}

export function RejectedActions({ reason, onRewrite }: RejectedActionsProps) {
  return (
    <>
      {reason && (
        // `--color-danger-text-dark` é o único token do sistema com o
        // #FCA5A5 do mockup: vermelho clareado para texto corrido sobre
        // superfície escura, diferente do `--color-danger` (#EF4444) da
        // etiqueta. Ele é fixo nos dois temas — um `--color-danger-text`
        // sensível ao tema seria a correção certa, mas mora no `index.css`
        // compartilhado e não é desta história.
        <p className="flex items-start gap-1.5 text-xs text-danger-text-dark">
          <AlertTriangle className="w-[1em] h-[1em] mt-0.5 shrink-0" aria-hidden="true" />
          <span>Meta: {reason}</span>
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={onRewrite}
        leftIcon={<Sparkles className="w-3.5 h-3.5" />}
        className="w-full justify-center"
      >
        Reescrever com a IA e reenviar
      </Button>
    </>
  )
}
