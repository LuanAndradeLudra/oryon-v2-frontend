import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { GrupoDeEventos } from '@/lib/eventosDaConversa'

/**
 * T4 fase 1 — linha discreta entre as mensagens, com o ator escrito ("IA",
 * "Você", nome). Não compete com as bolhas: texto miúdo, centrado. Eventos
 * seguidos do mesmo tipo viram uma linha só, que abre ao clicar.
 * Os sempre visíveis (D10: transferência, IA para a equipe, verificação,
 * falha) ganham um ponto de cor para não passarem despercebidos.
 */
const TOM: Record<string, string> = {
  transferencia: 'bg-[var(--color-accent-blue)]',
  ia_para_equipe: 'bg-status-pending',
  verificacao: 'bg-status-pending',
  falha: 'bg-danger',
}

function hora(iso: string) {
  return format(new Date(iso), 'HH:mm')
}

function Linha({ ator, texto, at, tipo }: { ator: string; texto: string; at: string; tipo: string }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-[11.5px] leading-[1.4] text-surface-500">
      {TOM[tipo] && <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', TOM[tipo])} />}
      <span className="font-semibold text-surface-400">{ator}</span>
      <span className="truncate">{texto}</span>
      <span className="text-surface-600 tabular-nums flex-shrink-0">· {hora(at)}</span>
    </p>
  )
}

function Grupo({ grupo }: { grupo: GrupoDeEventos }) {
  const [aberto, setAberto] = useState(false)
  const [primeiro] = grupo.eventos
  if (grupo.eventos.length === 1) return <Linha {...primeiro} />
  if (aberto) {
    return (
      <div className="space-y-0.5">
        {grupo.eventos.map((e) => <Linha key={e.id} {...e} />)}
        <button type="button" onClick={() => setAberto(false)} className="block mx-auto text-[11px] text-surface-500 hover:text-surface-300">
          recolher
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => setAberto(true)}
      className="block mx-auto text-[11.5px] text-surface-500 hover:text-surface-300"
      title="Ver cada evento"
    >
      <span className="font-semibold text-surface-400">{primeiro.ator}</span>{' '}
      {primeiro.texto} <span className="text-surface-600">e mais {grupo.eventos.length - 1}</span>
      <span className="text-surface-600 tabular-nums"> · {hora(primeiro.at)}–{hora(grupo.eventos[grupo.eventos.length - 1].at)}</span>
    </button>
  )
}

export function LinhaDeEventos({ grupos }: { grupos: GrupoDeEventos[] }) {
  return (
    <div role="note" aria-label="Eventos da conversa" className="my-2 space-y-0.5 px-8">
      {grupos.map((g) => <Grupo key={g.id} grupo={g} />)}
    </div>
  )
}
