import type { ReactNode } from 'react'
import { CalendarClock, ChevronRight, Flag, History, LogOut, Timer, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Catalogo, Jornada, VersaoDaJornada } from '@/services/jornadas/tipos'
import { custoPorInscricao } from '@/services/jornadas/custos'
import { numero } from '../apoio'
import { tomDaCor, type TomDaJornada } from './categorias'

/**
 * ORY-60 — o resumo da jornada (o que ela busca e quanto custa), aberto pelo
 * menu vertical do canvas. Antes ficava numa barra de fichas acima do canvas;
 * o João achou informação demais na tela (16/11) e pediu um menu no canto,
 * como o do HubSpot. Cada linha leva a quem a edita.
 */

const NOMES_DOS_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
/** [1,2,3,4,5] → "seg a sex"; [1,3,5] → "seg, qua, sex". */
function diasEmTexto(dias: number[]): string {
  const d = [...dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  if (!d.length) return 'nenhum dia'
  if (d.length === 7) return 'todo dia'
  const seguidos = d.every((x, i) => i === 0 || (x - d[i - 1] + 7) % 7 === 1)
  return seguidos && d.length > 2 ? `${NOMES_DOS_DIAS[d[0]]} a ${NOMES_DOS_DIAS[d[d.length - 1]]}` : d.map((x) => NOMES_DOS_DIAS[x]).join(', ')
}

/** "08:00" → "8h"; "08:30" → "8h30". */
const hora = (h: string) => h.replace(/^0(\d)/, '$1').replace(':00', 'h').replace(':', 'h')

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Linha({ tom, icone, rotulo, valor, detalhe, onClick }: { tom: TomDaJornada; icone: ReactNode; rotulo: string; valor: ReactNode; detalhe?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[8px] px-2 py-2 text-left transition-colors',
        onClick ? 'cursor-pointer hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500' : 'cursor-default',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]" style={tomDaCor(tom)} aria-hidden>{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] leading-4 text-surface-400">{rotulo}</span>
        <span className="block truncate text-[14px] font-medium leading-5 text-surface-50">{valor}</span>
        {detalhe && <span className="block text-[12px] leading-4 text-surface-400">{detalhe}</span>}
      </span>
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-surface-500 transition-colors group-hover:text-surface-200" aria-hidden />}
    </button>
  )
}

export function ResumoDaJornada({ jornada, versao, catalogo, onConfig, onSimular, onVersoes }: {
  jornada: Jornada
  versao: VersaoDaJornada
  catalogo: Catalogo
  onConfig: () => void
  onSimular: () => void
  onVersoes: () => void
}) {
  const { goals, exitIf, ttlDays } = versao.goals
  const metasNoDesenho = Object.values(versao.graph.nodes).filter((n) => n.type === 'goal').map((n) => String(n.params.label ?? 'Meta atingida'))
  const metas = [...goals.map((g) => g.label), ...metasNoDesenho.filter((m) => !goals.some((g) => g.label === m))]
  const custo = custoPorInscricao(versao.graph, catalogo)
  const porVersao = jornada.enrolledByVersion.filter((v) => v.count > 0).map((v) => `${numero(v.count)} na v${v.version}`).join(' · ')

  const textoDoCusto = custo.modelos || custo.creditos
    ? [custo.modelos ? `≈ ${reais(custo.reais)}` : '', custo.creditos ? `${custo.creditos.toLocaleString('pt-BR')} crédito${custo.creditos > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ')
    : 'Sem custo'
  const detalheDoCusto = custo.modelos ? `No caminho mais caro: até ${custo.modelos} modelo${custo.modelos > 1 ? 's' : ''} da Meta.` : undefined

  return (
    <div className="space-y-0.5">
      <Linha tom={metas.length ? 'verde' : 'ambar'} icone={<Flag className="h-4 w-4" />} rotulo="Meta" onClick={onConfig}
        valor={metas.length ? <>{metas[0]}{metas.length > 1 ? <span className="text-surface-400"> +{metas.length - 1}</span> : null}</> : 'Sem meta'}
        detalhe={metas.length ? (goals[0]?.windowDays ? `Conta até ${goals[0].windowDays} dia${goals[0].windowDays > 1 ? 's' : ''} depois da última mensagem.` : undefined) : 'Sem meta, os resultados não mostram a taxa de sucesso.'} />
      <Linha tom="cinza" icone={<LogOut className="h-4 w-4" />} rotulo="Sai da jornada quando" onClick={onConfig}
        valor={exitIf.length ? `${exitIf.length} regra${exitIf.length > 1 ? 's' : ''}` : 'Nenhuma regra'}
        detalhe={exitIf.length ? exitIf.map((x) => x.label).join('; ') : undefined} />
      <Linha tom={versao.rules?.window || versao.rules?.frequencyCap ? 'azul' : 'cinza'} icone={<CalendarClock className="h-4 w-4" />} rotulo="Horários e limites" onClick={onConfig}
        valor={versao.rules?.window ? `${diasEmTexto(versao.rules.window.days)}, ${hora(versao.rules.window.from)}–${hora(versao.rules.window.to)}` : 'Envia a qualquer hora'}
        detalhe={versao.rules?.frequencyCap ? `No máximo ${versao.rules.frequencyCap.maxMessages} mensagens a cada ${versao.rules.frequencyCap.perDays === 1 ? 'dia' : `${versao.rules.frequencyCap.perDays} dias`}.` : undefined} />
      <Linha tom="cinza" icone={<Timer className="h-4 w-4" />} rotulo="Prazo máximo" onClick={onConfig}
        valor={`${ttlDays} dia${ttlDays === 1 ? '' : 's'}`} />
      <Linha tom={custo.creditos ? 'violeta' : 'cinza'} icone={<Wallet className="h-4 w-4" />} rotulo="Custo por pessoa" onClick={onSimular}
        valor={textoDoCusto} detalhe={detalheDoCusto} />
      {jornada.publishedVersion
        ? <Linha tom="azul" icone={<History className="h-4 w-4" />} rotulo="Versão" onClick={onVersoes}
            valor={`v${jornada.publishedVersion} no ar`}
            detalhe={[jornada.hasDraftChanges ? 'O rascunho tem mudanças não publicadas.' : '', porVersao ? `Pessoas: ${porVersao}.` : ''].filter(Boolean).join(' ') || undefined} />
        : <Linha tom="cinza" icone={<History className="h-4 w-4" />} rotulo="Versão" valor="Nunca publicada" />}
    </div>
  )
}
