import { useNavigate } from 'react-router-dom'
import { Network, TriangleAlert, Zap } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ConexoesDasJornadas as Conexoes } from '@/services/jornadas/tipos'
import { SeloDoStatus } from './comum'
import { numero, useCarregar } from './apoio'

/**
 * O mapa de conexões (P2, 16/11): o que liga uma jornada a outra. O mesmo
 * evento pode fazer uma jornada começar, outra bater a meta e outra tirar a
 * pessoa; quem começa é avaliado numa ordem. E várias jornadas dividem a mesma
 * linha de WhatsApp. Para achar sobreposição antes que o contato receba duas
 * mensagens no mesmo dia.
 */
const PAPEL = {
  entra: { rotulo: 'Entra', tom: 'jt-azul' },
  meta: { rotulo: 'Bate a meta', tom: 'jt-verde' },
  sai: { rotulo: 'Sai', tom: 'jt-cinza' },
} as const

export function ConexoesDasJornadas() {
  const navigate = useNavigate()
  const { dados, erro, recarregar } = useCarregar(() => jornadasApi.conexoes(), [])
  if (erro && !dados) return <ErrorState onRetry={recarregar} />
  if (!dados) return <div className="space-y-2">{[0, 1].map((i) => <SkeletonCard key={i} lines={3} />)}</div>
  const abrir = (id: string) => navigate(`/jornadas/${id}`)
  // As saídas que todas têm (pediu para não receber, humano assumiu) não ligam uma jornada à outra: vão numa linha só.
  const soSaida = (g: Conexoes['byEvent'][number]) => g.uses.every((u) => u.role === 'sai')
  const ligam = dados.byEvent.filter((g) => !soSaida(g))
  const saidasComuns = dados.byEvent.filter(soSaida)
  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-surface-50">Eventos que ligam jornadas</h2>
          <p className="mt-0.5 max-w-[760px] text-[14px] text-surface-400">Quando o evento acontece, as jornadas que começam por ele são avaliadas nesta ordem (a publicada há mais tempo primeiro). Metas e saídas valem para quem já está dentro.</p>
        </div>
        {ligam.length === 0
          ? <EmptyState icon={Network} title="Nenhum evento liga duas jornadas" hint="Cada jornada começa e bate a meta por eventos só dela." />
          : (
            <div className="grid gap-4 md:grid-cols-2">
              {ligam.map((g) => <CartaoDoEvento key={g.event} g={g} onAbrir={abrir} />)}
            </div>
          )}
        {saidasComuns.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-[12px] text-surface-400">
            <span className="font-semibold text-surface-300">Saídas em comum:</span>
            {saidasComuns.map((g) => (
              <span key={g.event} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-800 px-3 text-surface-200" title={g.uses.map((u) => u.name).join(' · ')}>
                {g.label}<span className="tabular-nums text-surface-400">{new Set(g.uses.map((u) => u.journeyId)).size} jornadas</span>
              </span>
            ))}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-[16px] font-semibold text-surface-50">Linhas de WhatsApp</h2>
          <p className="mt-0.5 max-w-[760px] text-[14px] text-surface-400">O que cada jornada mandou por cada linha no mês. Tudo o que sai pela mesma linha conta junto na qualidade do número na Meta.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {dados.byLine.map((l) => {
            const maior = Math.max(1, ...l.journeys.map((j) => j.messagesThisMonth))
            return (
              <div key={l.whatsappNumberId} className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-surface-50">
                  <WhatsAppIcon size={16} />{l.name}
                  <span className="ml-auto text-[12px] font-normal tabular-nums text-surface-400">{numero(l.totalMessagesThisMonth)} mensagens no mês</span>
                </p>
                <ul className="mt-3 space-y-2">
                  {l.journeys.map((j) => (
                    <li key={j.journeyId} className="grid grid-cols-[minmax(0,1fr)_120px_72px] items-center gap-3 text-[14px]">
                      <button type="button" onClick={() => abrir(j.journeyId)} className="min-w-0 truncate text-left text-surface-200 hover:underline cursor-pointer" title={j.name}>{j.name}</button>
                      <span className="h-1.5 overflow-hidden rounded-full bg-surface-700" aria-hidden><span className="block h-full rounded-full bg-surface-400" style={{ width: `${(j.messagesThisMonth / maior) * 100}%` }} /></span>
                      <span className="text-right text-[12px] tabular-nums text-surface-300">{numero(j.messagesThisMonth)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CartaoDoEvento({ g, onAbrir }: { g: Conexoes['byEvent'][number]; onAbrir: (id: string) => void }) {
  const entram = g.uses.filter((u) => u.role === 'entra')
  const dobra = entram.length > 1 && entram.some((u) => !u.skipsIfInOther)
  return (
    <div className="rounded-[12px] border border-surface-700 bg-surface-800 px-5 py-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-surface-50">
        <Zap className="h-4 w-4 text-surface-400" aria-hidden />{g.label}
        <span className="ml-auto text-[12px] font-normal text-surface-400">{new Set(g.uses.map((u) => u.journeyId)).size} jornadas</span>
      </p>
      <ol className="mt-3 space-y-2">
        {g.uses.map((u) => (
          <li key={`${u.journeyId}:${u.role}`} className="flex flex-wrap items-center gap-2 text-[14px]">
            <span className={cn('inline-flex h-6 min-w-[96px] items-center justify-center rounded-[6px] px-2 text-[12px] font-semibold', PAPEL[u.role].tom)}>
              {PAPEL[u.role].rotulo}{u.order ? ` · ${u.order}ª` : ''}
            </span>
            <button type="button" onClick={() => onAbrir(u.journeyId)} className="min-w-0 truncate text-left text-surface-100 hover:underline cursor-pointer">{u.name}</button>
            <SeloDoStatus status={u.status} />
            {u.skipsIfInOther && <span className="text-[12px] text-surface-400">pula quem já está noutra</span>}
          </li>
        ))}
      </ol>
      {dobra && (
        <p className="mt-3 flex items-start gap-2 rounded-[8px] jt-ambar px-3 py-2 text-[12px] leading-snug">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          A mesma pessoa pode entrar nas {entram.length}. Para evitar, ligue "Pular quem já está noutra jornada" na porta da que vem depois.
        </p>
      )}
    </div>
  )
}
