import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { EventoDaConversa, GrupoDeEventos } from '@/lib/eventosDaConversa'

/**
 * T4 fase 1 — linha discreta entre as mensagens, com o ator escrito ("IA",
 * "Você", nome). Não compete com as bolhas: texto miúdo, centrado. Marcos em
 * linha própria; rotina seguida vira um bloco "N eventos" que abre ao clicar.
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

function faixa(e: EventoDaConversa) {
  return e.inicio && hora(e.inicio) !== hora(e.at) ? `${hora(e.inicio)}–${hora(e.at)}` : hora(e.at)
}

/** Botão discreto de abrir/recolher — mesmo tom das linhas. */
function Alternar({ aberto, onClick, children, titulo }: { aberto: boolean; onClick: () => void; children: React.ReactNode; titulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      title={titulo}
      className="flex items-center justify-center gap-1.5 mx-auto max-w-full text-xs leading-[1.4] text-surface-500 hover:text-surface-300"
    >
      {children}
    </button>
  )
}

function Conteudo({ e }: { e: EventoDaConversa }) {
  return (
    <>
      {TOM[e.tipo] && <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', TOM[e.tipo])} />}
      <span className="font-semibold text-surface-400">{e.ator}</span>
      <span className="truncate">{e.texto}</span>
      <span className="text-surface-600 tabular-nums flex-shrink-0">· {faixa(e)}</span>
    </>
  )
}

/** Um evento. Se for fundido (SCRUM-1253), abre os passos originais. */
function Linha({ e }: { e: EventoDaConversa }) {
  const [aberto, setAberto] = useState(false)
  if (!e.fundidos) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs leading-[1.4] text-surface-500">
        <Conteudo e={e} />
      </p>
    )
  }
  return (
    <div className="space-y-0.5">
      <Alternar aberto={aberto} onClick={() => setAberto((v) => !v)} titulo={aberto ? 'Recolher os passos' : 'Ver cada passo'}>
        <Conteudo e={e} />
      </Alternar>
      {aberto && (
        <div className="space-y-0.5 opacity-80">
          {e.fundidos.map((f) => <Linha key={f.id} e={f} />)}
        </div>
      )}
    </div>
  )
}

/**
 * Bloco de rotina seguida (2+ eventos sem mensagem no meio): uma linha
 * "N eventos · quem · início–fim" que abre a lista (SCRUM-1253).
 */
function Grupo({ grupo }: { grupo: GrupoDeEventos }) {
  const [aberto, setAberto] = useState(false)
  const { eventos } = grupo
  if (eventos.length === 1) return <Linha e={eventos[0]} />
  const primeiro = eventos[0]
  const ultimo = eventos[eventos.length - 1]
  const atores = [...new Set(eventos.flatMap((e) => e.ator.split(' e ')))].join(', ')
  const inicio = hora(primeiro.inicio ?? primeiro.at)
  const fim = hora(ultimo.at)
  return (
    <div className="space-y-0.5">
      <Alternar aberto={aberto} onClick={() => setAberto((v) => !v)} titulo={aberto ? 'Recolher os eventos' : 'Ver cada evento'}>
        <span className="font-semibold text-surface-400">{eventos.length} eventos</span>
        <span className="truncate">· {atores}</span>
        <span className="text-surface-600 tabular-nums flex-shrink-0">· {inicio === fim ? inicio : `${inicio}–${fim}`}</span>
      </Alternar>
      {aberto && eventos.map((e) => <Linha key={e.id} e={e} />)}
    </div>
  )
}

export function LinhaDeEventos({ grupos }: { grupos: GrupoDeEventos[] }) {
  return (
    <div role="note" aria-label="Eventos da conversa" className="linha-de-eventos my-2 space-y-0.5 px-8">
      {grupos.map((g) => <Grupo key={g.id} grupo={g} />)}
    </div>
  )
}
