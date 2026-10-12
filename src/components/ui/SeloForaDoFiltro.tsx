import { EyeOff } from 'lucide-react'

/**
 * SCRUM-1253 (PO, 06–07/10): o item ABERTO fica na lista mesmo quando não
 * atende ao filtro — e o selo diz isso com todas as letras. Mesma forma em
 * Conversas e em Leads: olho riscado + contorno tracejado.
 */
export function SeloForaDoFiltro({ title, compacto = false }: { title?: string; compacto?: boolean }) {
  // `compacto` (SCRUM-1253, PO 12/10): na lista de Conversas o selo com texto
  // espremia o nome da conversa aberta até "Clínica Ser…". Lá fica só o olho
  // riscado, mesma forma; a frase vai para o tooltip e para o leitor de tela.
  if (compacto) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-[6px] flex-shrink-0 border border-dashed border-[var(--bd2)] text-surface-300"
        title={title ?? 'Fora deste filtro'}
      >
        <EyeOff className="w-3 h-3" aria-hidden />
        <span className="sr-only">Fora deste filtro</span>
      </span>
    )
  }
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
