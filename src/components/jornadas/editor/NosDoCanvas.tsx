import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { CircleAlert, DoorOpen, Funnel, Repeat2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconeDoCatalogo } from '../comum'
import { ROTULO_DO_GRUPO, type SaidaDoPasso } from '@/services/jornadas/catalogo'
import type { GrupoDoPasso } from '@/services/jornadas/tipos'

/**
 * Os cartões do canvas. Hierarquia: grupo (rótulo pequeno) → título → resumo.
 * O grupo aparece na cor do ícone; erro, num marcador; o caminho do teste, num
 * anel. Saídas de quem ramifica ficam rotuladas na base, cada uma com a sua alça.
 */

export interface DadosDoPasso extends Record<string, unknown> {
  titulo: string
  resumo: string
  icone: string
  grupo: GrupoDoPasso
  saidas: SaidaDoPasso[]
  erros: number
  custo: string | null
  contador: { now: number; reached: number } | null
  noCaminhoDoTeste: boolean
  atualNoTeste: boolean
  emBreve: boolean
}

export interface DadosDaEntrada extends Record<string, unknown> {
  portas: { titulo: string; detalhe: string }[]
  filtro: string
  reentrada: string
  erros: number
  noCaminhoDoTeste: boolean
}

export type NoDoPassoRF = Node<DadosDoPasso, 'passo'>
export type NoDaEntradaRF = Node<DadosDaEntrada, 'entrada'>

const COR_DO_GRUPO: Record<GrupoDoPasso, string> = {
  mensagem: 'var(--color-accent-blue)',
  conversa: 'var(--color-accent-cyan)',
  crm: 'var(--color-accent-amber)',
  integracao: 'var(--color-accent-green)',
  controle: 'var(--color-status-muted)',
  ia: 'var(--color-accent-violet)',
}

/** Largura do cartão: cresce com o número de saídas, para os rótulos caberem. */
const larguraDoPasso = (saidas: number) => Math.max(260, saidas * 116)

const ALCA = '!w-2.5 !h-2.5 !border-2 !border-[var(--color-surface-950)] !bg-surface-400'

function Contador({ c }: { c: { now: number; reached: number } }) {
  return (
    <div className="flex items-center gap-3 border-t border-surface-700 px-3 py-2 text-[11px] text-surface-400 tabular-nums">
      <span title="Pessoas neste passo agora"><strong className="font-semibold text-surface-100">{c.now.toLocaleString('pt-BR')}</strong> agora</span>
      <span title="Pessoas que passaram por aqui nos últimos 30 dias"><strong className="font-semibold text-surface-200">{c.reached.toLocaleString('pt-BR')}</strong> em 30 dias</span>
    </div>
  )
}

export const NoDoPasso = memo(function NoDoPasso({ data, selected }: NodeProps<NoDoPassoRF>) {
  const muitas = data.saidas.length > 1
  const cor = COR_DO_GRUPO[data.grupo]
  return (
    <div
      style={{ width: larguraDoPasso(data.saidas.length) }}
      className={cn(
        'relative rounded-[12px] border border-surface-700 bg-surface-800 shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-shadow',
        selected && 'ring-2 ring-brand-500',
        !selected && data.atualNoTeste && 'ring-2 ring-[var(--color-accent-violet)]',
        !selected && !data.atualNoTeste && data.noCaminhoDoTeste && 'ring-1 ring-[color-mix(in_srgb,var(--color-accent-violet)_55%,transparent)]',
        data.emBreve && 'opacity-60',
      )}
    >
      <Handle type="target" position={Position.Top} className={ALCA} />
      <div className="flex items-start gap-2.5 px-3 pt-3">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${cor} 16%, var(--color-surface-800))`, color: `color-mix(in srgb, ${cor} 82%, var(--color-surface-50))` }}
        >
          <IconeDoCatalogo nome={data.icone} className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-surface-500 leading-4">{ROTULO_DO_GRUPO[data.grupo]}</p>
          <p className="truncate text-[13.5px] font-semibold text-surface-50 leading-5" title={data.titulo}>{data.titulo}</p>
        </div>
        {data.erros > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 h-5 text-[11px] font-semibold text-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_14%,var(--color-surface-800))]" title={`${data.erros} problema(s) neste passo`}>
            <CircleAlert className="w-3 h-3" aria-hidden />{data.erros}
          </span>
        )}
      </div>
      <p className="px-3 pt-1.5 pb-3 text-[12px] leading-[1.45] text-surface-400 line-clamp-2" title={data.resumo}>{data.resumo || '—'}</p>
      {(data.custo || data.emBreve) && (
        <div className="px-3 pb-3 -mt-1">
          <span className="inline-flex items-center gap-1 rounded-[6px] px-1.5 h-5 text-[10.5px] font-semibold text-[color-mix(in_srgb,var(--color-accent-violet)_82%,var(--color-surface-50))] bg-[color-mix(in_srgb,var(--color-accent-violet)_14%,var(--color-surface-800))]">
            <Sparkles className="w-3 h-3" aria-hidden />{data.emBreve ? 'Próximo épico' : data.custo}
          </span>
        </div>
      )}
      {data.contador && <Contador c={data.contador} />}
      {data.saidas.length === 1 && <Handle type="source" id={data.saidas[0].key} position={Position.Bottom} className={ALCA} />}
      {muitas && (
        <div className="flex border-t border-surface-700">
          {data.saidas.map((s, i) => (
            <div key={s.key} className={cn('relative flex-1 min-w-0 px-1.5 py-1.5 text-center', i > 0 && 'border-l border-surface-700')}>
              <span className="block truncate text-[11px] font-medium text-surface-300" title={s.label}>{s.label}</span>
              <Handle type="source" id={s.key} position={Position.Bottom} className={ALCA} style={{ left: '50%' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export const NoDaEntrada = memo(function NoDaEntrada({ data, selected }: NodeProps<NoDaEntradaRF>) {
  return (
    <div
      style={{ width: 300 }}
      className={cn(
        'rounded-[12px] border border-surface-700 bg-surface-800 shadow-[0_1px_2px_rgba(0,0,0,0.18)]',
        selected && 'ring-2 ring-brand-500',
        !selected && data.noCaminhoDoTeste && 'ring-1 ring-[color-mix(in_srgb,var(--color-accent-violet)_55%,transparent)]',
      )}
    >
      <div className="flex items-center gap-2.5 px-3 pt-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-[var(--color-accent-soft)] text-brand-500 shrink-0">
          <DoorOpen className="w-4 h-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-surface-500 leading-4">Gatilho</p>
          <p className="text-[13.5px] font-semibold text-surface-50 leading-5">Entrada</p>
        </div>
        {data.erros > 0 && <CircleAlert className="w-4 h-4 text-[var(--color-danger)]" aria-label="A entrada tem problema" />}
      </div>
      <ul className="px-3 pt-2.5 space-y-1.5">
        {data.portas.length === 0 && <li className="text-[12px] text-surface-400">Nenhuma porta: escolha como as pessoas entram.</li>}
        {data.portas.map((p, i) => (
          <li key={i} className="rounded-[8px] bg-surface-900 px-2.5 py-2">
            <p className="text-[11.5px] font-semibold text-surface-100">{p.titulo}</p>
            <p className="text-[11.5px] text-surface-400 leading-snug">{p.detalhe}</p>
          </li>
        ))}
      </ul>
      <dl className="px-3 pt-2.5 pb-3 space-y-1.5 text-[11.5px]">
        <div className="flex items-start gap-2 text-surface-400" title="Quem pode entrar">
          <Funnel className="w-3.5 h-3.5 mt-px shrink-0 text-surface-500" aria-hidden />
          <dd className="line-clamp-2">{data.filtro}</dd>
        </div>
        <div className="flex items-start gap-2 text-surface-400" title="Entrar de novo">
          <Repeat2 className="w-3.5 h-3.5 mt-px shrink-0 text-surface-500" aria-hidden />
          <dd>{data.reentrada}</dd>
        </div>
      </dl>
      <Handle type="source" id="next" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2 !border-[var(--color-surface-950)] !bg-brand-500" />
    </div>
  )
})
