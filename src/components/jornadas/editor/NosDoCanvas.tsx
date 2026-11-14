import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { CircleAlert, DoorOpen, Funnel, Repeat2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconeDoCatalogo } from '../comum'
import { ROTULO_DO_GRUPO, type SaidaDoPasso } from '@/services/jornadas/catalogo'
import type { GrupoDoPasso } from '@/services/jornadas/tipos'

/**
 * Os quadradinhos do canvas. Sem borda colorida: o grupo aparece no ícone,
 * erro aparece num marcador, e o caminho do teste ganha um anel de destaque.
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

const BASE = 'rounded-[10px] bg-surface-800 border border-surface-700 shadow-sm transition-shadow'

function Contador({ c }: { c: { now: number; reached: number } }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-[10.5px] text-surface-400 tabular-nums">
      <span title="Pessoas neste passo agora"><strong className="text-surface-100 font-semibold">{c.now.toLocaleString('pt-BR')}</strong> agora</span>
      <span aria-hidden>·</span>
      <span title="Pessoas que já passaram por aqui (30 dias)">{c.reached.toLocaleString('pt-BR')} passaram</span>
    </div>
  )
}

export const NoDoPasso = memo(function NoDoPasso({ data, selected }: NodeProps<NoDoPassoRF>) {
  const muitas = data.saidas.length > 1
  return (
    <div
      className={cn(
        BASE,
        'w-[248px] px-3 pt-2.5',
        muitas ? 'pb-8' : 'pb-2.5',
        selected && 'ring-2 ring-brand-500',
        !selected && data.atualNoTeste && 'ring-2 ring-[var(--color-accent-violet)]',
        !selected && !data.atualNoTeste && data.noCaminhoDoTeste && 'ring-1 ring-[color-mix(in_srgb,var(--color-accent-violet)_60%,transparent)]',
        data.emBreve && 'opacity-70',
      )}
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-surface-500 !border-0" />
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-[7px] shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${COR_DO_GRUPO[data.grupo]} 18%, var(--color-surface-800))`, color: `color-mix(in srgb, ${COR_DO_GRUPO[data.grupo]} 80%, var(--color-surface-50))` }}
          title={ROTULO_DO_GRUPO[data.grupo]}
        >
          <IconeDoCatalogo nome={data.icone} className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-surface-50">{data.titulo}</p>
            {data.erros > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[var(--color-danger)]" title={`${data.erros} problema(s) neste passo`}>
                <CircleAlert className="w-3.5 h-3.5" aria-hidden />{data.erros}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-surface-400 leading-snug line-clamp-2">{data.resumo || '—'}</p>
          {(data.custo || data.emBreve) && (
            <p className="mt-1 text-[10.5px] font-medium text-[color-mix(in_srgb,var(--color-accent-violet)_80%,var(--color-surface-50))]">
              {data.emBreve ? 'Próximo épico' : data.custo}
            </p>
          )}
          {data.contador && <Contador c={data.contador} />}
        </div>
      </div>
      {data.saidas.length === 1 && <Handle type="source" id={data.saidas[0].key} position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-surface-400 !border-0" />}
      {muitas && (
        <div className="absolute left-0 right-0 bottom-0 h-7 flex">
          {data.saidas.map((s) => (
            <div key={s.key} className="relative flex-1 flex items-start justify-center">
              <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-medium text-surface-300" title={s.label}>{s.label}</span>
              <Handle type="source" id={s.key} position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-surface-400 !border-0" style={{ left: '50%' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export const NoDaEntrada = memo(function NoDaEntrada({ data, selected }: NodeProps<NoDaEntradaRF>) {
  return (
    <div className={cn(BASE, 'w-[300px] px-3 py-2.5', selected && 'ring-2 ring-brand-500', !selected && data.noCaminhoDoTeste && 'ring-1 ring-[color-mix(in_srgb,var(--color-accent-violet)_60%,transparent)]')}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-[var(--color-accent-soft)] text-brand-500 shrink-0">
          <DoorOpen className="w-3.5 h-3.5" aria-hidden />
        </span>
        <p className="text-[13px] font-semibold text-surface-50">Entrada</p>
        {data.erros > 0 && <CircleAlert className="w-3.5 h-3.5 text-[var(--color-danger)]" aria-label="A entrada tem problema" />}
      </div>
      <ul className="mt-2 space-y-1">
        {data.portas.length === 0 && <li className="text-[11.5px] text-surface-400">Nenhuma porta: escolha como as pessoas entram.</li>}
        {data.portas.map((p, i) => (
          <li key={i} className="rounded-[7px] bg-surface-900 px-2 py-1.5">
            <p className="text-[11px] font-semibold text-surface-200">{p.titulo}</p>
            <p className="text-[11px] text-surface-400 leading-snug">{p.detalhe}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-surface-400"><Funnel className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />{data.filtro}</p>
      <p className="mt-1 flex items-start gap-1.5 text-[11px] text-surface-400"><Repeat2 className="w-3 h-3 mt-0.5 shrink-0" aria-hidden />{data.reentrada}</p>
      <Handle type="source" id="next" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-brand-500 !border-0" />
    </div>
  )
})

