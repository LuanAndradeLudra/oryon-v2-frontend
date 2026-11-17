import { useNavigate } from 'react-router-dom'
import { ArrowRight, CircleCheck, HeartPulse, Siren, TriangleAlert } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { SaudeDaJornada } from '@/services/jornadas/tipos'
import { SeloDoStatus } from './comum'
import { quandoFoi, useCarregar } from './apoio'

/**
 * A saúde de todas as jornadas ligadas numa tela só (P2, 16/11, como o "Health"
 * da HubSpot): um semáforo por jornada, o porquê em frase e um atalho que abre
 * a jornada já no problema (o alerta, o registro de erros, a porta).
 */
type Alvo = SaudeDaJornada['issues'][number]['target']
const DESTINO: Record<Alvo, { busca: string; rotulo: string }> = {
  alertas: { busca: '?alertas=1', rotulo: 'Ver o alerta' },
  erros: { busca: '?aba=pessoas&erros=1', rotulo: 'Ver os erros' },
  desenho: { busca: '', rotulo: 'Abrir o desenho' },
  pessoas: { busca: '?aba=pessoas', rotulo: 'Ver as pessoas' },
  config: { busca: '?config=1', rotulo: 'Ver a porta' },
}
const NIVEL = {
  grave: { rotulo: 'Grave', tom: 'jt-vermelho', Icone: Siren },
  atencao: { rotulo: 'Precisa de atenção', tom: 'jt-ambar', Icone: TriangleAlert },
  ok: { rotulo: 'Tudo certo', tom: 'jt-verde', Icone: CircleCheck },
} as const
const ORDEM = { grave: 0, atencao: 1, ok: 2 }

export function SaudeDasJornadas() {
  const navigate = useNavigate()
  const { dados, erro, recarregar } = useCarregar(() => jornadasApi.saude(), [])
  if (erro && !dados) return <ErrorState onRetry={recarregar} />
  if (!dados) return <div className="space-y-2">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={2} />)}</div>
  if (!dados.length) return <EmptyState icon={HeartPulse} title="Nenhuma jornada ligada" hint="A saúde aparece quando uma jornada estiver publicada (ativa, em sombra ou pausada)." />
  const lista = [...dados].sort((a, b) => ORDEM[a.level] - ORDEM[b.level] || b.issues.length - a.issues.length)
  const conta = (n: SaudeDaJornada['level']) => dados.filter((d) => d.level === n).length
  const abrir = (id: string, alvo: Alvo) => navigate(`/jornadas/${id}${DESTINO[alvo].busca}`)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['grave', 'atencao', 'ok'] as const).map((n) => {
          const { rotulo, tom, Icone } = NIVEL[n]
          return (
            <span key={n} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold', conta(n) ? tom : 'bg-surface-800 text-surface-400')}>
              <Icone className="h-3.5 w-3.5" aria-hidden />{rotulo}<span className="tabular-nums">{conta(n)}</span>
            </span>
          )
        })}
        <p className="ml-auto text-[12px] text-surface-400">Só as jornadas publicadas (ativas, em sombra e pausadas)</p>
      </div>
      <ul className="overflow-hidden rounded-[12px] border border-surface-700">
        {lista.map((s, i) => {
          const { tom, Icone, rotulo } = NIVEL[s.level]
          return (
            <li key={s.journeyId} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }} className="jornadas-aparecer border-t border-surface-700 first:border-t-0 bg-surface-800 px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', tom)} title={rotulo} aria-label={rotulo}><Icone className="h-4 w-4" aria-hidden /></span>
                <button type="button" onClick={() => abrir(s.journeyId, 'desenho')} className="min-w-0 truncate text-left text-[14px] font-semibold text-surface-50 hover:underline cursor-pointer">{s.name}</button>
                <SeloDoStatus status={s.status} />
                <dl className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
                  {([
                    ['Chegaram (7 dias)', s.deliveryRate7d === null ? '—' : `${s.deliveryRate7d}%`],
                    ['Erros (24 h)', String(s.errors24h)],
                    ['Presas', String(s.stuck)],
                    ['Último envio', s.lastSendAt ? quandoFoi(s.lastSendAt) : '—'],
                  ] as const).map(([r, v]) => (
                    <div key={r} className="flex items-baseline gap-1.5"><dt className="text-surface-500">{r}</dt><dd className="font-semibold tabular-nums text-surface-100">{v}</dd></div>
                  ))}
                </dl>
              </div>
              {s.issues.length > 0 && (
                <ul className="mt-3 space-y-1.5 pl-12">
                  {s.issues.map((x, k) => (
                    <li key={k} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <span className="flex min-w-0 items-start gap-2 text-[14px] leading-snug text-surface-200">
                        <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', x.level === 'grave' ? 'bg-[var(--color-danger)]' : 'bg-status-pending')} aria-hidden />
                        {x.text}
                      </span>
                      <button type="button" onClick={() => abrir(s.journeyId, x.target)} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold jt-texto-azul hover:underline cursor-pointer">
                        {DESTINO[x.target].rotulo}<ArrowRight className="h-3 w-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
