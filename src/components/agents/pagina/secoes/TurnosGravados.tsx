import { useEffect, useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import {
  getAgentRuntimeFlags, listAgentTurns, replayAgentTurn, type AgentTurnSummary, type TurnReplayResult,
} from '@/services/agentsApi'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Bloco } from './Estrutura'

function quando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Resultado da repetição: o que mudou em relação ao turno gravado. */
function ResultadoDaRepeticao({ r }: { r: TurnReplayResult }) {
  const semGravacao = r.toolCalls.filter((c) => c.source === 'missing')
  return (
    <div className="mt-3 space-y-2 rounded-md border border-surface-700 bg-[var(--sf1)] p-3 text-xs">
      {r.instructions === 'current_not_applied' && (
        <p className="text-surface-400">Não deu para aplicar as instruções atuais neste turno; repetido com as de quando aconteceu.</p>
      )}
      <p className={r.textChanged || r.toolsChanged ? 'font-medium text-status-pending' : 'font-medium text-status-active'}>
        {!r.textChanged && !r.toolsChanged && 'Mesma resposta e mesmas ferramentas.'}
        {r.textChanged && !r.toolsChanged && 'A resposta mudou; as ferramentas foram as mesmas.'}
        {r.toolsChanged && 'O agente pediu ferramentas diferentes das gravadas.'}
      </p>
      {r.textChanged && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div><p className="text-surface-500">Antes</p><p className="whitespace-pre-wrap text-surface-300">{r.recorded.text || '—'}</p></div>
          <div><p className="text-surface-500">Agora</p><p className="whitespace-pre-wrap text-surface-100">{r.text || '—'}</p></div>
        </div>
      )}
      {semGravacao.length > 0 && (
        <p className="text-surface-400">
          Sem resultado gravado (não executadas): {semGravacao.map((c) => c.name).join(', ')}
        </p>
      )}
    </div>
  )
}

/**
 * Onda 5 (M17) — turnos gravados do agente e a repetição segura: o turno é
 * refeito contra o modelo com as ferramentas respondidas pelo que foi gravado.
 * Nada é executado de verdade (nem agenda, nem CRM, nem integração).
 */
export function TurnosGravados({ agentId }: { agentId: string }) {
  const [turnos, setTurnos] = useState<AgentTurnSummary[] | null>(null)
  const [gravando, setGravando] = useState<boolean | null>(null)
  const [erro, setErro] = useState(false)
  const [repetindo, setRepetindo] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Record<string, TurnReplayResult | string>>({})

  useEffect(() => {
    let vivo = true
    getAgentRuntimeFlags().then((f) => { if (vivo) setGravando(f.turnRecord === true) }).catch(() => { if (vivo) setGravando(false) })
    listAgentTurns(agentId)
      .then((t) => { if (vivo) setTurnos(t) })
      .catch(() => { if (vivo) { setTurnos([]); setErro(true) } })
    return () => { vivo = false }
  }, [agentId])

  const repetir = async (id: string) => {
    setRepetindo(id)
    try {
      const r = await replayAgentTurn(agentId, id)
      setResultados((p) => ({ ...p, [id]: r }))
    } catch (e) {
      setResultados((p) => ({ ...p, [id]: e instanceof Error ? e.message : 'Não foi possível repetir o turno agora' }))
    } finally {
      setRepetindo(null)
    }
  }

  return (
    <Bloco
      titulo="Turnos gravados"
      descricao="Repita um atendimento com as instruções atuais do agente para ver se uma correção resolveu. As ferramentas respondem com o que foi gravado; nada é executado de verdade."
    >
      {turnos === null ? (
        <Skeleton className="h-24 w-full bg-[var(--sf2)]" />
      ) : erro ? (
        <EmptyState icon={History} title="Turnos gravados indisponíveis" hint="O servidor do agente ainda não tem este recurso ou não respondeu." />
      ) : turnos.length === 0 ? (
        <EmptyState
          icon={History}
          title={gravando ? 'Nenhum turno gravado ainda' : 'Gravação de turnos desligada'}
          hint={gravando
            ? 'Os próximos atendimentos deste agente aparecem aqui por alguns dias.'
            : 'Sem a gravação, não dá para repetir um atendimento. Fale com a Oryon para ligar nesta conta.'}
        />
      ) : (
        <ul className="divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700">
          {turnos.map((t) => {
            const res = resultados[t.id]
            return (
              <li key={t.id} className="bg-[var(--sf2)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-surface-100">{t.lastUserText ? `“${t.lastUserText}”` : 'Sem texto do cliente'}</p>
                    <p className="mt-0.5 text-xs text-surface-400 tabular-nums">
                      {quando(t.createdAt)}
                      {t.toolsCalled > 0 && ` · ${t.toolsCalled} ${t.toolsCalled === 1 ? 'ferramenta' : 'ferramentas'}`}
                      {t.conversationId ? '' : ' · teste'}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    loading={repetindo === t.id} disabled={repetindo !== null}
                    onClick={() => void repetir(t.id)}
                  >
                    Repetir
                  </Button>
                </div>
                {typeof res === 'string' && <p className="mt-2 text-xs text-danger">{res}</p>}
                {res && typeof res !== 'string' && <ResultadoDaRepeticao r={res} />}
              </li>
            )
          })}
        </ul>
      )}
    </Bloco>
  )
}
