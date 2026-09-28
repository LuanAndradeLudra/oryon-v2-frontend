import { cn } from '@/lib/utils'
import { formatarEspera, PRAZO_RESPOSTA_MIN, type ItemDaFila } from '@/lib/filaAgora'
import type { WhatsAppNumberDetailed } from '@/types'

// Faixa do "agora" (direção A): quatro contagens do momento, todas tiradas das
// mesmas listas que a tela mostra logo abaixo — nenhuma é indicador de período
// (esses ficam em Relatórios, e os KPIs estão com o outro dev; ver memória
// dev-externo-dashboard-kpis). Cada célula diz o que conta.

interface Props {
  fila: ItemDaFila[]
  linhas: WhatsAppNumberDetailed[]
  linhasComIA: ReadonlySet<string>
}

function conectada(l: WhatsAppNumberDetailed): boolean {
  return String(l.status).toLowerCase() === 'connected'
}

export function FaixaDoAgora({ fila, linhas, linhasComIA }: Props) {
  const semDono = fila.filter((i) => i.semDono).length
  const maior = fila[0]?.esperaMin ?? null
  const passou = fila.filter((i) => i.iaPassou)
  const passouSemDono = passou.filter((i) => i.semDono).length
  const conectadas = linhas.filter(conectada)
  const comIA = conectadas.filter((l) => linhasComIA.has(l.id)).length

  const celulas: Array<{ id: string; rotulo: string; valor: string; nota: string; tom?: 'alerta' | 'atencao' }> = [
    {
      id: 'esperando',
      rotulo: 'Esperando alguém',
      valor: String(fila.length),
      nota: fila.length === 0 ? 'ninguém na fila' : semDono === 0 ? 'todas com dono' : `${semDono} sem dono`,
      tom: semDono > 0 ? 'atencao' : undefined,
    },
    {
      id: 'maior-espera',
      rotulo: 'Maior espera',
      valor: maior === null ? '—' : formatarEspera(maior),
      nota: `prazo de ${PRAZO_RESPOSTA_MIN} min`,
      tom: maior !== null && maior >= PRAZO_RESPOSTA_MIN ? 'alerta' : undefined,
    },
    {
      id: 'ia-passou',
      rotulo: 'IA passou para a equipe',
      valor: String(passou.length),
      nota: passou.length === 0 ? 'nenhuma agora' : passouSemDono === 0 ? 'todas com dono' : `${passouSemDono} sem dono`,
      tom: passouSemDono > 0 ? 'atencao' : undefined,
    },
    {
      id: 'linhas',
      rotulo: 'Linhas de WhatsApp',
      valor: linhas.length === 0 ? '—' : `${conectadas.length} de ${linhas.length}`,
      nota: linhas.length === 0 ? 'nenhuma cadastrada' : `conectadas · ${comIA} com IA`,
      tom: linhas.length > 0 && conectadas.length < linhas.length ? 'alerta' : undefined,
    },
  ]

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
      data-testid="faixa-do-agora"
    >
      {celulas.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            'px-4 py-3 min-w-0 border-surface-700',
            i % 2 === 1 && 'border-l',
            i >= 2 && 'border-t lg:border-t-0',
            i === 2 && 'lg:border-l',
          )}
        >
          <p className="text-[11.5px] font-medium text-surface-400 truncate">{c.rotulo}</p>
          <p
            className={cn(
              'mt-0.5 text-[22px] leading-7 font-bold tracking-[-0.02em] tabular-nums truncate',
              c.tom === 'alerta' ? 'text-danger' : 'text-surface-100',
            )}
          >
            {c.valor}
          </p>
          <p className={cn('text-[11.5px] truncate', c.tom === 'atencao' ? 'text-status-pending' : 'text-surface-500')}>{c.nota}</p>
        </div>
      ))}
    </div>
  )
}
