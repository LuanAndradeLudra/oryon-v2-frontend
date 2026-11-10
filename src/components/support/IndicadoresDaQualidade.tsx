import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QualidadeDaEmpresa } from '@/types/support'
import { nomeDoPeriodo, textoDaFonte, valorEmDestaque } from './qualidade'
import './suporte.css'

/**
 * QUALIDADE (SCRUM-1391) — os indicadores de uma empresa num mês. Cada cartão
 * mostra o número em destaque e o texto com numerador, denominador e período
 * (o mesmo do e-mail do mês). A taxa de erro da IA não aparece: só o aviso de
 * por quê, até existir a revisão por amostragem. A gestão da empresa e a
 * equipe Oryon veem o mesmo componente.
 */
export function IndicadoresDaQualidade({ dados, periodo, onPeriodo, acoes }: {
  dados: QualidadeDaEmpresa
  /** O mês escolhido (enquanto o novo carrega, os números ainda são do anterior). */
  periodo?: string
  onPeriodo: (periodo: string) => void
  /** Ações extras ao lado do período (a equipe: a prévia do e-mail). */
  acoes?: ReactNode
}) {
  // Trocou o mês e o novo ainda não chegou: os cartões ficam apagados, sem fingir que são do mês escolhido.
  const carregando = periodo !== undefined && periodo !== dados.periodo
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="inline-flex items-center gap-2 text-[13px] text-surface-300">
          Período
          <select value={periodo ?? dados.periodo} onChange={(e) => onPeriodo(e.target.value)}
            className="h-8 rounded-[7px] bg-surface-800 border border-[var(--bd2)] px-2 text-[13px] text-surface-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500">
            {[...new Set([...dados.periodos, periodo ?? dados.periodo])].map((p) => <option key={p} value={p}>{nomeDoPeriodo(p)}</option>)}
          </select>
        </label>
        {acoes}
      </div>
      <p className="text-[12px] text-surface-400" role="status">
        {carregando ? `Carregando ${nomeDoPeriodo(periodo).toLowerCase()}…` : textoDaFonte(dados)}
      </p>
      <ul className={cn('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 transition-opacity', carregando && 'opacity-50')}
        aria-busy={carregando} aria-label={`Indicadores de ${nomeDoPeriodo(dados.periodo).toLowerCase()}`}>
        {dados.indicadores.map((i) => (
          <li key={i.chave} className="sup-cartao px-4 py-3 flex flex-col gap-1 min-w-0">
            <p className="text-[12px] text-surface-400">{i.titulo}</p>
            <p className="text-[22px] leading-tight font-semibold tabular-nums text-surface-50">{valorEmDestaque(i)}</p>
            <p className="text-[13px] text-surface-200">{i.texto}</p>
            {i.nota && <p className="text-[12px] text-surface-400">{i.nota}</p>}
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 text-[12px] text-surface-400">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-accent-dark" aria-hidden />
        <span>{dados.avisoDaTaxaDeErro}</span>
      </p>
    </div>
  )
}
