import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ValorComUnidade } from '../ValorComUnidade'
import type { FiltroDaFila } from './FilaAoVivo'
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
  /** Clicar numa célula da fila filtra a lista logo abaixo. */
  onFiltro?: (f: FiltroDaFila) => void
  filtroAtivo?: FiltroDaFila
}

type Tom = 'alerta' | 'atencao'
type Acao =
  | { tipo: 'filtro'; filtro: FiltroDaFila; rotulo: string }
  | { tipo: 'rolar'; alvo: string; rotulo: string }
  | { tipo: 'link'; para: string; rotulo: string }
interface Celula { id: string; grupo: string; rotulo: string; valor: string; nota: string; tom?: Tom; acao?: Acao }

/** Filete de urgência à esquerda — só nas células que pedem ação. */
const FILETE: Record<Tom, string> = { alerta: 'var(--color-danger)', atencao: 'var(--color-status-pending)' }

function rolarAte(seletor: string) {
  document.querySelector(seletor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function conectada(l: WhatsAppNumberDetailed): boolean {
  return String(l.status).toLowerCase() === 'connected'
}

export function FaixaDoAgora({ fila, linhas, linhasComIA, verificarTotal, totais = null, resumo = null, agora = Date.now(), onFiltro, filtroAtivo }: Props) {
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

  const celulas: Celula[] = [
    {
      id: 'esperando',
      grupo: 'Fila',
      acao: { tipo: 'filtro', filtro: 'todas', rotulo: 'Ver toda a fila' },
      rotulo: 'Esperando alguém',
      valor: String(esperando),
      nota: esperando === 0 ? 'ninguém esperando' : semDono === 0 ? 'todas com dono' : `${semDono} sem dono`,
      tom: semDono > 0 ? 'atencao' : undefined,
    },
    {
      id: 'maior-espera',
      grupo: 'Fila',
      acao: { tipo: 'filtro', filtro: 'todas', rotulo: 'Ver a fila, da maior espera para a menor' },
      rotulo: 'Maior espera',
      valor: maior === null ? '—' : formatarEspera(maior),
      nota: `prazo de ${PRAZO_RESPOSTA_MIN} min`,
      tom: maior !== null && maior >= PRAZO_RESPOSTA_MIN ? 'alerta' : undefined,
    },
    {
      id: 'ia-passou',
      grupo: 'Fila',
      acao: { tipo: 'filtro', filtro: 'ia-passou', rotulo: 'Filtrar o que a IA passou para a equipe' },
      rotulo: 'IA passou para a equipe',
      valor: String(passouTotal),
      nota: passouTotal === 0 ? 'nenhuma agora' : passouSemDono === 0 ? 'todas com dono' : `${passouSemDono} sem dono`,
      tom: passouSemDono > 0 ? 'atencao' : undefined,
    },
    {
      id: 'janela',
      grupo: 'Fila',
      acao: { tipo: 'filtro', filtro: 'janela', rotulo: 'Filtrar as janelas fechando' },
      rotulo: 'Janela de 24h fechando',
      valor: String(fechando),
      nota: fechadas > 0 ? `${fechadas} já ${fechadas === 1 ? 'fechou' : 'fecharam'} · só modelo` : 'nas próximas 2 h',
      tom: fechando > 0 ? 'atencao' : undefined,
    },
    {
      id: 'verificar',
      grupo: 'Verificação',
      acao: { tipo: 'rolar', alvo: '[data-testid="verificacao-agora"]', rotulo: 'Ver as conversas para verificar' },
      rotulo: 'Precisam de verificação',
      valor: String(verificarTotal),
      nota: verificarTotal === 0 ? 'nenhuma agora' : 'a IA disse algo não confirmado',
      tom: verificarTotal > 0 ? 'atencao' : undefined,
    },
    {
      id: 'linhas',
      grupo: 'Linhas',
      acao: { tipo: 'link', para: '/settings/numbers', rotulo: 'Abrir as linhas de WhatsApp' },
      rotulo: 'Linhas de WhatsApp',
      valor: linhas.length === 0 ? '—' : `${conectadas.length} de ${linhas.length}`,
      nota: linhas.length === 0 ? 'nenhuma cadastrada' : `conectadas · ${comIA} com IA`,
      tom: linhas.length > 0 && conectadas.length < linhas.length ? 'alerta' : undefined,
    },
  ]

  // Mesma linguagem dos Relatórios (PO, 01/10): um cartão por assunto, com
  // cabeçalho em faixa e divisória fina entre as células. Aqui a cor diz a
  // URGÊNCIA: filete à esquerda só nas células que pedem ação.
  const grupos: Array<{ grupo: string; itens: Celula[] }> = []
  for (const c of celulas) {
    const g = grupos.find((x) => x.grupo === c.grupo)
    if (g) g.itens.push(c)
    else grupos.push({ grupo: c.grupo, itens: [c] })
  }

  const conteudoDa = (c: Celula) => (
    <>
      <p className="text-[11.5px] font-medium text-surface-400 truncate">{c.rotulo}</p>
      <p
        className={cn(
          'mt-0.5 text-[22px] leading-7 font-bold tracking-[-0.02em] tabular-nums truncate font-display',
          c.tom === 'alerta' ? 'text-danger' : 'text-surface-100',
        )}
      >
        <ValorComUnidade texto={c.valor} />
      </p>
      <p className={cn('text-[11.5px] truncate', c.tom === 'atencao' ? 'text-status-pending' : 'text-surface-500')}>{c.nota}</p>
    </>
  )

  return (
    <div className="flex flex-wrap gap-3.5" data-testid="faixa-do-agora">
      {grupos.map(({ grupo, itens }) => (
        <section
          key={grupo}
          aria-label={grupo}
          className="min-w-0 flex flex-col bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
          style={{ flexGrow: itens.length, flexBasis: `${itens.length * 168}px` }}
        >
          <h3 className="flex items-center h-8 px-3.5 bg-[var(--sf2)] border-b border-surface-700 text-[11px] font-bold uppercase tracking-[0.08em] text-surface-300">
            {grupo}
          </h3>
          <div className="grid flex-1 -mr-px -mb-px" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {itens.map((c) => {
              const base = 'block text-left px-4 py-3 min-w-0 border-r border-b border-surface-700'
              const estilo = c.tom ? { boxShadow: `inset 2px 0 0 ${FILETE[c.tom]}` } : undefined
              const clicavel = 'transition-colors hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500'
              const a = c.acao
              if (a?.tipo === 'link') {
                return <Link key={c.id} to={a.para} title={a.rotulo} className={cn(base, clicavel)} style={estilo} data-celula={c.id}>{conteudoDa(c)}</Link>
              }
              if (a && (a.tipo === 'rolar' || onFiltro)) {
                const ativo = a.tipo === 'filtro' && filtroAtivo === a.filtro && a.filtro !== 'todas'
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={a.rotulo}
                    aria-pressed={a.tipo === 'filtro' ? ativo : undefined}
                    onClick={() => {
                      if (a.tipo === 'filtro') { onFiltro?.(a.filtro); rolarAte('[data-testid="fila-ao-vivo"]') }
                      else if (a.tipo === 'rolar') rolarAte(a.alvo)
                    }}
                    className={cn(base, clicavel, ativo && 'bg-[var(--rowhover)]')}
                    style={estilo}
                    data-celula={c.id}
                  >
                    {conteudoDa(c)}
                  </button>
                )
              }
              return <div key={c.id} className={base} style={estilo} data-celula={c.id}>{conteudoDa(c)}</div>
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
