import { EyeOff } from 'lucide-react'

/**
 * SCRUM-1253 (PO, 06–07/10): o item ABERTO fica na lista mesmo quando não
 * atende ao filtro — e o selo diz isso com todas as letras. Mesma forma em
 * Conversas e em Leads: olho riscado + contorno tracejado.
 */
export function SeloForaDoFiltro({ title }: { title?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 h-5 px-1.5 rounded-[6px] text-[11px] font-semibold flex-shrink-0 whitespace-nowrap border border-dashed border-[var(--bd2)] text-surface-300"
      title={title}
    >
      <EyeOff className="w-3 h-3" aria-hidden />
      Fora deste filtro
    </span>
  )
}
