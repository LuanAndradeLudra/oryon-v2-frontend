import { Clock3 } from 'lucide-react'

/**
 * Estado "este bloco existe, mas o dado por contato ainda não é apurado".
 *
 * Um componente só, usado nos quatro lugares (falhas, heatmap, respostas,
 * contatos), para a linguagem ser idêntica: quatro textos soltos viram quatro
 * explicações ligeiramente diferentes da mesma coisa, e o usuário conclui que
 * são quatro problemas distintos.
 *
 * Não é `EmptyState`: vazio é "não há nada", isto é "ainda não medimos" — e a
 * diferença importa, porque "0 falhas" e "não sabemos as falhas" levam a
 * decisões opostas.
 */
export function PendingDataCard({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-surface-800/60 border border-surface-700 px-3.5 py-3">
      <Clock3 className="w-4 h-4 text-surface-500 shrink-0 mt-px" aria-hidden="true" />
      <p className="text-xs text-surface-400 leading-relaxed">
        {what} fica disponível quando a apuração por contato entrar no ar.
      </p>
    </div>
  )
}
