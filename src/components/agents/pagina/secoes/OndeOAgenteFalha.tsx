import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, BookPlus, HelpCircle } from 'lucide-react'
import { getAgentInsights, type AgentInsights } from '@/services/agentsApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Bloco } from './Estrutura'

function quando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * Onda 5 (M16) — onde o agente está falhando: conversas que terminaram em
 * erro/tempo/laço e perguntas que a base não soube responder, nos últimos 30
 * dias. Os dois registros podem estar desligados na conta; aí a tela diz isso
 * em vez de mostrar "nenhum problema".
 */
export function OndeOAgenteFalha({ agentId }: { agentId: string }) {
  const [dados, setDados] = useState<AgentInsights | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    getAgentInsights(agentId)
      .then((d) => { if (vivo) { setDados(d); setErro(false) } })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [agentId])

  if (erro) {
    return (
      <Bloco titulo="Onde o agente está falhando">
        <EmptyState icon={AlertTriangle} title="Não deu para carregar agora" hint="Tente de novo em alguns minutos." />
      </Bloco>
    )
  }
  if (!dados) {
    return (
      <Bloco titulo="Onde o agente está falhando">
        <Skeleton className="h-24 w-full bg-[var(--sf2)]" />
      </Bloco>
    )
  }

  const periodo = `Últimos ${dados.days} dias.`
  return (
    <>
      <Bloco titulo="Conversas com problema" descricao={periodo}>
        {!dados.logging.executions && dados.problems.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Registro de conversas desligado" hint="Sem o registro, não dá para saber quais conversas deram errado. Fale com a Oryon para ligar nesta conta." />
        ) : dados.problems.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Nenhuma conversa com problema" hint="Quando o agente falhar, passar do tempo ou se enrolar numa resposta, a conversa aparece aqui." />
        ) : (
          <ul className="divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700">
            {dados.problems.map((p) => (
              <li key={p.conversationId} className="flex items-center justify-between gap-3 bg-[var(--sf2)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-surface-100">{p.reason}</p>
                  <p className="mt-0.5 text-xs text-surface-400 tabular-nums">{quando(p.at)}</p>
                </div>
                <Link
                  to={`/conversations?id=${encodeURIComponent(p.conversationId)}`}
                  className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-medium text-brand-400 hover:underline"
                >
                  Abrir conversa <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco
        titulo="Perguntas sem resposta"
        descricao={`${periodo} Perguntas em que o agente procurou na base e não achou nada.`}
        acoes={dados.unanswered.length > 0 ? (
          <Link
            to={`/agents/${encodeURIComponent(agentId)}/conhecimento`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:underline"
          >
            <BookPlus className="h-3.5 w-3.5" aria-hidden /> Completar a base
          </Link>
        ) : undefined}
      >
        {!dados.logging.ragQueries && dados.unanswered.length === 0 ? (
          <EmptyState icon={HelpCircle} title="Registro de buscas desligado" hint="Sem o registro, não dá para saber o que os clientes perguntaram e a base não respondeu. Fale com a Oryon para ligar nesta conta." />
        ) : dados.unanswered.length === 0 ? (
          <EmptyState icon={HelpCircle} title="Nenhuma pergunta ficou sem resposta" hint="Quando a base não tiver nada sobre o que o cliente perguntou, a pergunta aparece aqui." />
        ) : (
          <ul className="divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700">
            {dados.unanswered.map((q) => (
              <li key={`${q.question}-${q.lastAt}`} className="flex items-baseline justify-between gap-3 bg-[var(--sf2)] px-4 py-3">
                <p className="min-w-0 break-words text-sm text-surface-100">“{q.question}”</p>
                <p className="flex-shrink-0 text-xs text-surface-400 tabular-nums">
                  {q.count === 1 ? '1 vez' : `${q.count.toLocaleString('pt-BR')} vezes`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </>
  )
}
