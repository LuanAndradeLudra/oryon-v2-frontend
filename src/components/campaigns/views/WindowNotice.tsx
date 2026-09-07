import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A tela DIZ o que está mostrando quando o teto de paginação corta a lista.
 * `GET /campaigns` ordena por `createdAt DESC` e não aceita recorte por data,
 * então uma campanha criada há meses e agendada para o mês que vem pode ficar
 * de fora. Silenciar isso faria a tela parecer completa quando não está — o
 * `?from=&to=` está registrado como item de Onda 2 (decisão 2 do Maestro).
 *
 * Vale para a Agenda e para o Board, e no Board vale MAIS: lá a contagem no
 * cabeçalho de cada coluna tem cara de total do sistema, e é da janela.
 */
export function WindowNotice({ truncated, shown, total }: {
  truncated: boolean
  shown: number
  total: number
}) {
  if (!truncated) return null
  return (
    <div className={cn(
      'flex items-start gap-2 text-[11px] text-surface-400',
      'mt-4 px-3 py-2.5 rounded-xl border border-dashed border-surface-700',
    )}>
      <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-status-pending" />
      <span>
        Mostrando os {shown.toLocaleString('pt-BR')} disparos criados mais
        recentemente, de {total.toLocaleString('pt-BR')}. Períodos mais antigos
        podem estar incompletos — a lista ainda é ordenada por data de criação,
        não pela data em que o disparo acontece.
      </span>
    </div>
  )
}
