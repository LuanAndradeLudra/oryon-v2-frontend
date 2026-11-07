// Retomadas (06/11): o HISTÓRICO do plano — tudo o que já foi feito, do mais novo para o mais
// antigo, agrupado por dia: os resultados marcados, os modelos enviados, etiqueta, funil, disparo,
// o que o gestor mudou e o que o sistema viu (consulta confirmada pela agenda, prazo vencido).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlarmClock, CalendarCheck, CalendarClock, CheckCheck, CircleCheck, CircleX, History, Inbox, Kanban, Megaphone, PencilLine, Send, Tag as TagIcon,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { diaDoPasso, fraseDoHistorico, quandoExato } from '@/lib/planosDeAcao'
import { followUpsApi, type EventoDoHistorico, type TipoDoHistorico } from '@/services/followUpsApi'
import { cn } from '@/lib/utils'

const ICONE: Record<TipoDoHistorico, LucideIcon> = {
  received: Inbox,
  outcome: CircleCheck,
  auto_booked: CalendarCheck,
  template: Send,
  tag: TagIcon,
  pipeline: Kanban,
  campaign_draft: Megaphone,
  conclude: CheckCheck,
  edit: PencilLine,
  extend: CalendarClock,
  cancel: CircleX,
  expire: AlarmClock,
}

/** O tom do ícone: o que deu certo em verde, o que veio do gestor em azul-petróleo, o resto neutro. */
const TOM = (e: EventoDoHistorico) =>
  e.kind === 'auto_booked' || (e.kind === 'outcome' && String(e.detail?.outcome ?? '').startsWith('agendou'))
    ? 'text-status-active bg-status-active-bg'
    : e.actor.type === 'manager'
      ? 'text-brand-500 bg-[var(--rowhover)]'
      : e.kind === 'expire' || e.kind === 'cancel'
        ? 'text-status-pending bg-status-pending-bg'
        : 'text-surface-300 bg-surface-800'

export function HistoricoDoPlano({ planId, versao }: { planId: string; versao: number }) {
  const [eventos, setEventos] = useState<EventoDoHistorico[] | null>(null)
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let vivo = true
    followUpsApi.historico(planId)
      .then((r) => { if (vivo) { setEventos(r.data.data); setErro(false) } })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [planId, versao, tentativa])

  if (erro && !eventos) return <ErrorState onRetry={() => setTentativa((t) => t + 1)} />
  if (!eventos) return <div className="space-y-2" aria-busy="true" aria-label="Carregando o histórico">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}</div>
  if (!eventos.length) return <EmptyState icon={History} title="Nada por aqui ainda" hint="O que a equipe fizer neste plano aparece aqui." />

  const grupos: Array<{ dia: string; itens: EventoDoHistorico[] }> = []
  for (const e of eventos) {
    const dia = diaDoPasso(e.at)
    const g = grupos[grupos.length - 1]
    if (g && g.dia === dia) g.itens.push(e)
    else grupos.push({ dia, itens: [e] })
  }
  const daEquipe = eventos.filter((e) => e.actor.type === 'user').length

  return (
    <section aria-label="Histórico do plano" className="space-y-5">
      <p className="text-sm text-surface-400">
        Tudo o que já foi feito neste plano, do mais novo para o mais antigo.{daEquipe ? ` A equipe deu ${daEquipe} ${daEquipe === 1 ? 'passo' : 'passos'} até agora.` : ''}
      </p>
      {grupos.map((g) => (
        <div key={g.dia}>
          <h3 className="mb-1 text-xs font-semibold text-surface-400">{g.dia}</h3>
          <ol className="rounded-[10px] border border-surface-700 bg-surface-800 divide-y divide-surface-700">
            {g.itens.map((e) => {
              const Icone = ICONE[e.kind] ?? History
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={cn('mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0', TOM(e))}>
                    <Icone className="w-3.5 h-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-surface-100 leading-snug">{fraseDoHistorico(e)}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-400">
                      <time dateTime={e.at}>{quandoExato(e.at)}</time>
                      {e.contact?.conversationId && (
                        <Link to={`/conversations?id=${encodeURIComponent(e.contact.conversationId)}`} className="text-brand-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-[4px]">
                          Abrir conversa
                        </Link>
                      )}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}
