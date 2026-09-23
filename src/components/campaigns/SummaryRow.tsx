import { cn } from '@/lib/utils'

// ─── SummaryRow ──────────────────────────────────────────────────────────────
// Direção C: linha rótulo/valor em faixa, sem cartão — divisor de 1px acima de
// cada linha (exceto a primeira), rótulo em coluna fixa de 88px. Extraído de
// TemplateCreator.tsx (onde nasceu como `LinhaResumo`) porque o CampaignWizard
// tinha copiado a receita à mão com medida diferente (37-38px em vez de 29px,
// sem divisor) — mesma peça, duas telas irmãs, duas medidas. Agora é um
// componente de domínio de campaigns/, não uma cópia.
export function SummaryRow({ label, value, action, strong, wrap }: {
  label: string
  value: React.ReactNode
  /** Slot opcional à direita (ex.: link "Editar" que volta pra etapa de origem). */
  action?: React.ReactNode
  /** Nome da campanha etc. — dado que o usuário digitou, não uma constante do produto. */
  strong?: boolean
  /** Some valores (recorte de público com vários filtros) são longos demais
   *  pra truncar sem perder informação relevante — quebram linha em vez de
   *  cortar. Default é truncate, igual ao TemplateCreator. */
  wrap?: boolean
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-t border-surface-700 first:border-t-0 first:pt-0">
      <span className="text-[11px] text-surface-500 w-[88px] flex-none">{label}</span>
      <span className={cn(
        'text-xs min-w-0',
        wrap ? 'break-words' : 'truncate',
        strong ? 'font-semibold text-surface-100' : 'text-surface-100',
      )}>{value}</span>
      {action && <span className="ml-auto flex-none">{action}</span>}
    </div>
  )
}
