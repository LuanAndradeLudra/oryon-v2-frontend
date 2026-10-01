import { cn } from '@/lib/utils'
import { formatarEspera, janelaFechada, janelaFechando, PRAZO_RESPOSTA_MIN, type ItemDaFila } from '@/lib/filaAgora'
import type { WhatsAppNumberDetailed } from '@/types'
import type { ResumoDaFila, TotaisDaFila } from '@/hooks/useDashboardAgora'

// Faixa do "agora" (direção A): seis contagens do momento. As da fila vêm dos
// totais EXATOS do servidor (as mesmas consultas da aba Fila da inbox); maior
// espera e janela saem da lista carregada — nenhuma é indicador de período
// (esses ficam em Relatórios, e os KPIs estão com o outro dev; ver memória
// dev-externo-dashboard-kpis). Cada célula diz o que conta.

interface Props {
  fila: ItemDaFila[]
  linhas: WhatsAppNumberDetailed[]
  linhasComIA: ReadonlySet<string>
  /** Conversas que precisam de verificação (total do backend). */
  verificarTotal: number
  /** Totais do servidor; sem eles (primeira carga), conta pela lista. */
  totais?: TotaisDaFila | null
  /** Maior espera e janelas, do servidor sobre a fila inteira (M5). */
  resumo?: ResumoDaFila | null
  /** Relógio do painel — a espera anda entre as leituras. */
  agora?: number
}

function conectada(l: WhatsAppNumberDetailed): boolean {
  return String(l.status).toLowerCase() === 'connected'
}

export function FaixaDoAgora({ fila, linhas, linhasComIA, verificarTotal, totais = null, resumo = null, agora = Date.now() }: Props) {
  // Revisão 30/09 (M5): do servidor, sobre a fila inteira; sem o resumo, pela lista carregada.
  const fechando = resumo ? resumo.janelaFechando : fila.filter(janelaFechando).length
  const fechadas = resumo ? resumo.janelaFechada : fila.filter(janelaFechada).length
  const esperando = totais?.esperando ?? fila.length
  const semDono = totais?.semDono ?? fila.filter((i) => i.semDono).length
  const maior = resumo
    ? (resumo.maiorEsperaMin === null ? null : resumo.maiorEsperaMin + Math.max(0, Math.floor((agora - resumo.lidoEm) / 60_000)))
    : fila[0]?.esperaMin ?? null
  const passouTotal = totais?.iaPassou ?? fila.filter((i) => i.iaPassou).length
  const passouSemDono = totais?.iaPassouSemDono ?? fila.filter((i) => i.iaPassou && i.semDono).length
  const conectadas = linhas.filter(conectada)
  const comIA = conectadas.filter((l) => linhasComIA.has(l.id)).length

  const celulas: Array<{ id: string; rotulo: string; valor: string; nota: string; tom?: 'alerta' | 'atencao' }> = [
    {
      id: 'esperando',
      rotulo: 'Esperando alguém',
      valor: String(esperando),
      nota: esperando === 0 ? 'ninguém esperando' : semDono === 0 ? 'todas com dono' : `${semDono} sem dono`,
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
      valor: String(passouTotal),
      nota: passouTotal === 0 ? 'nenhuma agora' : passouSemDono === 0 ? 'todas com dono' : `${passouSemDono} sem dono`,
      tom: passouSemDono > 0 ? 'atencao' : undefined,
    },
    {
      id: 'janela',
      rotulo: 'Janela de 24h fechando',
      valor: String(fechando),
      nota: fechadas > 0 ? `${fechadas} já ${fechadas === 1 ? 'fechou' : 'fecharam'} · só modelo` : 'nas próximas 2 h',
      tom: fechando > 0 ? 'atencao' : undefined,
    },
    {
      id: 'verificar',
      rotulo: 'Precisam de verificação',
      valor: String(verificarTotal),
      nota: verificarTotal === 0 ? 'nenhuma agora' : 'a IA disse algo não confirmado',
      tom: verificarTotal > 0 ? 'atencao' : undefined,
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
      className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
      data-testid="faixa-do-agora"
    >
      {celulas.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            // Grade de 2 (celular), 3 (desktop) ou 6 (tela larga) colunas:
            // divisória à esquerda de quem não abre linha e acima de quem não
            // está na primeira linha.
            'px-4 py-3 min-w-0 border-surface-700',
            i % 2 === 1 && 'max-lg:border-l',
            i >= 2 && 'max-lg:border-t',
            i % 3 !== 0 && 'lg:max-2xl:border-l',
            i >= 3 && 'lg:max-2xl:border-t',
            i > 0 && '2xl:border-l',
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
