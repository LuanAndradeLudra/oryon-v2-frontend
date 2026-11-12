import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'
import { ValorComUnidade } from '../ValorComUnidade'
import type { FiltroDaFila } from './FilaAoVivo'
import { formatarEspera, janelaFechada, janelaFechando, PRAZO_RESPOSTA_MIN, type ItemDaFila } from '@/lib/filaAgora'
import type { WhatsAppNumberDetailed } from '@/types'
import { HORIZONTE_PADRAO_DIAS, type ResumoDaFila, type TotaisDaFila } from '@/hooks/useDashboardAgora'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { classeDaGrade } from '@/components/dashboard/gradeDeIndicadores'

// Faixa do "agora" (direção A). Auditoria do Dashboard (12/11, decisões do João):
//  - a fila conta só as conversas ATIVAS (mensagem do paciente nos últimos 7 dias); as paradas
//    aparecem à parte, embaixo, e não inflam a fila nem a maior espera;
//  - o TOTAL vai no título do grupo, com a barra parte-todo, e as células são só PARTES que não
//    se repetem: "Ninguém assumiu" + "Assumidas, sem resposta" = total. Antes "Esperando alguém"
//    e "Sem dono" ficavam lado a lado e um estava dentro do outro (quem lia somava 72 + 39);
//  - cada célula tem o "?" com o que conta e o que não conta.

interface Props {
  fila: ItemDaFila[]
  linhas: WhatsAppNumberDetailed[]
  linhasComIA: ReadonlySet<string>
  /** Conversas que precisam de verificação (total do backend). */
  verificarTotal: number
  /** Totais do servidor; sem eles (primeira carga ou falha), conta pela lista. */
  totais?: TotaisDaFila | null
  /** Maior espera e janelas, do servidor (M5). */
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
interface Celula { id: string; rotulo: string; valor: string; nota: string; ajuda: ReactNode; tom?: Tom; acao?: Acao }

const FILETE: Record<Tom, string> = { alerta: 'var(--color-danger)', atencao: 'var(--color-status-pending)' }

function rolarAte(seletor: string) {
  document.querySelector(seletor)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

function conectada(l: WhatsAppNumberDetailed): boolean {
  return String(l.status).toLowerCase() === 'connected'
}

/** Título do balão de ajuda: maior, com divisória embaixo, separado do texto (12/11, João). */
export function TituloDaAjuda({ children }: { children: ReactNode }) {
  return <span className="block text-[13px] font-bold leading-5 pb-1.5 mb-1.5 border-b border-[color-mix(in_srgb,currentColor_22%,transparent)]">{children}</span>
}

/** O "?" de cada célula: o que o número representa (mesmo componente dos Relatórios). */
export function Ajuda({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex flex-shrink-0 cursor-help" data-testid="ajuda">
      <Tooltip
        side="top"
        wide
        content={<span className="block space-y-1 py-1"><TituloDaAjuda>{titulo}</TituloDaAjuda>{children}</span>}
      >
        <HelpCircle className="w-3 h-3 text-surface-600 hover:text-surface-400 transition-colors" aria-label={`O que é ${titulo}`} />
      </Tooltip>
    </span>
  )
}

const L = ({ t, children }: { t: string; children: ReactNode }) => (
  <span className="block"><b className="font-bold">{t}</b> {children}</span>
)

export function FaixaDoAgora({ fila, linhas, linhasComIA, verificarTotal, totais = null, resumo = null, agora = Date.now(), onFiltro, filtroAtivo }: Props) {
  const { user } = useAuth()
  const abreLinhas = isAdminTier(user?.role)
  const dias = totais?.horizonteDias ?? HORIZONTE_PADRAO_DIAS
  const fechando = resumo ? resumo.janelaFechando : fila.filter(janelaFechando).length
  const fechadas = resumo ? resumo.janelaFechada : fila.filter(janelaFechada).length
  const esperando = totais?.esperando ?? fila.length
  const semDono = totais?.semDono ?? fila.filter((i) => i.semDono).length
  const assumidas = totais?.comDonoSemResposta ?? Math.max(0, esperando - semDono)
  const paradas = totais?.paradas ?? 0
  const maior = resumo
    ? (resumo.maiorEsperaMin === null ? null : resumo.maiorEsperaMin + Math.max(0, Math.floor((agora - resumo.lidoEm) / 60_000)))
    : fila[0]?.esperaMin ?? null
  const conectadas = linhas.filter(conectada)
  const comIA = conectadas.filter((l) => linhasComIA.has(l.id)).length

  const celulasDaFila: Celula[] = [
    {
      id: 'sem-dono',
      acao: { tipo: 'filtro', filtro: 'sem-dono', rotulo: 'Filtrar quem ninguém assumiu' },
      rotulo: 'Ninguém assumiu',
      valor: String(semDono),
      nota: semDono === 0 ? 'todas com alguém' : 'assumir ou atribuir',
      tom: semDono > 0 ? 'atencao' : undefined,
      ajuda: <>
        <span className="block">Na fila e sem dono: ninguém da equipe pegou ainda. É a aba "Fila" da inbox.</span>
        <L t="O que fazer:">assumir ou atribuir.</L>
        <L t="Conta:">pendentes sem dono, com mensagem do paciente nos últimos {dias} dias.</L>
      </>,
    },
    {
      id: 'assumidas',
      acao: { tipo: 'filtro', filtro: 'assumidas', rotulo: 'Filtrar as assumidas sem resposta' },
      rotulo: 'Assumidas, sem resposta',
      valor: String(assumidas),
      nota: assumidas === 0 ? 'ninguém aguardando o dono' : 'cobrar o dono ou redistribuir',
      ajuda: <>
        <span className="block">Alguém da equipe assumiu, mas ainda não respondeu desde a última mensagem do paciente.</span>
        <L t="O que fazer:">cobrar quem assumiu ou redistribuir.</L>
        <span className="block">Cada conversa da fila está em uma só das duas partes: {semDono} + {assumidas} = {esperando}.</span>
      </>,
    },
    {
      id: 'maior-espera',
      acao: { tipo: 'filtro', filtro: 'todas', rotulo: 'Ver a fila, da maior espera para a menor' },
      rotulo: 'Maior espera',
      valor: maior === null ? '—' : formatarEspera(maior),
      nota: `prazo de ${PRAZO_RESPOSTA_MIN} min`,
      tom: maior !== null && maior >= PRAZO_RESPOSTA_MIN ? 'alerta' : undefined,
      ajuda: <>
        <span className="block">Há quanto tempo o paciente que espera há mais tempo está sem resposta de uma pessoa, contado da última mensagem dele. Uma mensagem da IA não zera a espera.</span>
        <L t="Conta:">só a fila dos últimos {dias} dias. Fica vermelho quando passa do prazo de {PRAZO_RESPOSTA_MIN} min.</L>
      </>,
    },
    {
      id: 'janela',
      acao: { tipo: 'filtro', filtro: 'janela', rotulo: 'Filtrar as janelas fechando' },
      rotulo: 'Janela de 24h fechando',
      valor: String(fechando),
      nota: fechadas > 0 ? `${fechadas} já ${fechadas === 1 ? 'fechou' : 'fecharam'} · só modelo` : 'nas próximas 2 h',
      tom: fechando > 0 ? 'atencao' : undefined,
      ajuda: <>
        <span className="block">Depois de 24 h da última mensagem do paciente, só dá para responder com um modelo aprovado (pago).</span>
        <L t="Fechando:">fecha nas próximas 2 h.</L>
        <L t="Já fechou:">conversas da fila dos últimos {dias} dias com a janela fechada.</L>
      </>,
    },
  ]

  const verificacao: Celula = {
    id: 'verificar',
    acao: { tipo: 'rolar', alvo: '[data-testid="verificacao-agora"]', rotulo: 'Ver as conversas para verificar' },
    rotulo: 'Precisam de verificação',
    valor: String(verificarTotal),
    nota: verificarTotal === 0 ? 'nenhuma agora' : 'a IA disse algo não confirmado',
    tom: verificarTotal > 0 ? 'atencao' : undefined,
    ajuda: <>
      <span className="block">A IA disse ao paciente que fez algo (marcar, cancelar, confirmar) que o sistema não confirmou. Alguém precisa conferir com o paciente.</span>
      <L t="Sai sozinha quando:">alguém da equipe responde depois do alerta, ou alguém marca como verificada.</L>
      <L t="Vence:">em 7 dias. O vencido vai para Relatórios, em "Alertas não verificados".</L>
    </>,
  }

  const linhasCel: Celula = {
    id: 'linhas',
    acao: abreLinhas ? { tipo: 'link', para: '/settings/numbers', rotulo: 'Abrir as linhas de WhatsApp' } : undefined,
    rotulo: 'Linhas de WhatsApp',
    valor: linhas.length === 0 ? '—' : `${conectadas.length} de ${linhas.length}`,
    nota: linhas.length === 0 ? 'nenhuma cadastrada' : `conectadas · ${comIA} com IA`,
    tom: linhas.length > 0 && conectadas.length < linhas.length ? 'alerta' : undefined,
    ajuda: <>
      <span className="block">Quantas linhas da unidade estão conectadas à Meta agora e quantas têm um agente de IA ligado.</span>
      <span className="block">Fica vermelho se alguma estiver desconectada.</span>
    </>,
  }

  const conteudoDa = (c: Celula) => (
    <>
      <span className="flex items-start gap-1.5 min-w-0">
        <span className="flex-1 min-w-0 text-xs font-medium text-surface-400 truncate">{c.rotulo}</span>
        <Ajuda titulo={c.rotulo}>{c.ajuda}</Ajuda>
      </span>
      <span
        className={cn(
          'block mt-0.5 text-xl leading-7 font-semibold tracking-[-0.01em] tabular-nums truncate',
          c.tom === 'alerta' ? 'text-danger' : 'text-surface-100',
        )}
      >
        <ValorComUnidade texto={c.valor} />
      </span>
      <span className={cn('block text-xs line-clamp-2', c.tom === 'atencao' ? 'text-status-pending' : 'text-surface-500')}>{c.nota}</span>
    </>
  )

  const celula = (c: Celula) => {
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
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          title={a.rotulo}
          aria-pressed={a.tipo === 'filtro' ? ativo : undefined}
          onClick={() => {
            if (a.tipo === 'filtro') { onFiltro?.(a.filtro); rolarAte('[data-testid="fila-ao-vivo"]') }
            else if (a.tipo === 'rolar') rolarAte(a.alvo)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            if (a.tipo === 'filtro') { onFiltro?.(a.filtro); rolarAte('[data-testid="fila-ao-vivo"]') }
            else if (a.tipo === 'rolar') rolarAte(a.alvo)
          }}
          className={cn(base, clicavel, 'cursor-pointer', ativo && 'bg-[var(--rowhover)]')}
          style={estilo}
          data-celula={c.id}
        >
          {conteudoDa(c)}
        </div>
      )
    }
    return <div key={c.id} className={base} style={estilo} data-celula={c.id}>{conteudoDa(c)}</div>
  }

  const grupo = (titulo: ReactNode, rotulo: string, itens: Celula[], extra?: { topo?: ReactNode; rodape?: ReactNode }) => (
    <section
      aria-label={rotulo}
      className={cn('min-w-0 flex flex-col bg-surface-800 border border-surface-700 rounded-[10px] overflow-hidden', '@container')}
      style={{ flexGrow: itens.length, flexBasis: `${itens.length * 168}px` }}
    >
      <h3 className="flex items-center gap-2 h-8 px-3.5 bg-[var(--sf2)] border-b border-surface-700 text-2xs font-semibold uppercase tracking-[0.08em] text-surface-300">
        {titulo}
      </h3>
      {extra?.topo}
      <div className={cn('grid flex-1 -mr-px -mb-px', classeDaGrade(itens.length))}>
        {itens.map(celula)}
      </div>
      {extra?.rodape}
    </section>
  )

  const pctSemDono = esperando > 0 ? (semDono / esperando) * 100 : 0
  const tituloDaFila = (
    <>
      Fila
      <span className="normal-case tracking-normal text-xs font-semibold text-surface-100 tabular-nums" data-testid="fila-total">
        {esperando} <span className="font-medium text-surface-400">esperando uma pessoa</span>
      </span>
      <Ajuda titulo="Fila · esperando uma pessoa">
        <span className="block">Conversas em que o paciente aguarda alguém da equipe: a IA passou para a equipe e ninguém respondeu desde a última mensagem dele.</span>
        <L t="Conta:">pendentes com mensagem do paciente nos últimos {dias} dias.</L>
        <L t="Não conta:">as que a IA está atendendo, as já respondidas por uma pessoa e as paradas há mais de {dias} dias (aparecem embaixo).</L>
      </Ajuda>
      <span className="ml-auto normal-case tracking-normal font-medium text-surface-500">últimos {dias} dias</span>
    </>
  )
  const barra = esperando > 0 ? (
    // 12/11 (João): a faixa da barra tem tom próprio e divisória, separada das células logo abaixo.
    <div className="px-3.5 pt-2.5 bg-[color-mix(in_srgb,var(--sf2)_55%,transparent)] border-b border-surface-700" aria-label={`${semDono} ninguém assumiu, ${assumidas} assumidas sem resposta`}>
      <div className="flex h-1 rounded-full overflow-hidden bg-[var(--sf2)]">
        <span className="block h-full bg-status-pending" style={{ width: `${pctSemDono}%` }} />
        <span className="block h-full bg-surface-500" style={{ width: `${100 - pctSemDono}%` }} />
      </div>
      <div className="flex gap-3.5 pt-1.5 pb-1 text-2xs text-surface-500 tabular-nums">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-status-pending" aria-hidden />{semDono} ninguém assumiu</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-surface-500" aria-hidden />{assumidas} assumidas, sem resposta</span>
      </div>
    </div>
  ) : null
  const rodape = (
    <p className="flex items-center gap-2 px-3.5 py-2 border-t border-surface-700 text-xs text-surface-500" data-testid="fila-paradas">
      {paradas > 0 ? (
        <>
          <span><b className="font-semibold text-surface-300 tabular-nums">+ {paradas}</b> {paradas === 1 ? 'parada' : 'paradas'} há mais de {dias} dias, fora da fila</span>
          {abreLinhas && <Link to="/settings/inactivity" className="font-semibold text-brand-400 hover:underline">encerramento por inatividade</Link>}
        </>
      ) : (
        <span>Nenhuma conversa parada há mais de {dias} dias.</span>
      )}
      <Ajuda titulo="Paradas há mais de 7 dias">
        <span className="block">Pendentes sem mensagem do paciente há mais de {dias} dias. Não entram na fila nem na maior espera.</span>
        <span className="block">O encerramento por inatividade arquiva essas conversas uma vez por dia; elas reabrem sozinhas se o paciente escrever.</span>
      </Ajuda>
    </p>
  )

  return (
    <div className="flex flex-wrap gap-3.5" data-testid="faixa-do-agora">
      {grupo(tituloDaFila, 'Fila', celulasDaFila, { topo: barra, rodape })}
      {grupo('Verificação', 'Verificação', [verificacao])}
      {grupo('Linhas', 'Linhas', [linhasCel])}
    </div>
  )
}
