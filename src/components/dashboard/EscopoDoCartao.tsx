import { cn } from '@/lib/utils'

// Etiqueta do recorte de um cartão que NÃO segue o período escolhido
// ("agora", "todo o histórico", "últimos 7 dias"). Quem segue o período não
// leva etiqueta — vale o seletor. Ver lib/periodoDoPainel.ts.
export function EscopoDoCartao({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-[18px] px-1.5 rounded-[5px] border border-surface-700 text-[10.5px] font-semibold text-surface-500 whitespace-nowrap',
        className,
      )}
      title="Este cartão não segue o período escolhido"
    >
      {children}
    </span>
  )
}
