import { useEffect, useState } from 'react'
import { ListChecks, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAgentSpecForAgent, listAgentTestRuns,
  type AgentConfigWithTools, type AgentSpec, type AgentTestRun, type AgentTestRunResult,
} from '@/services/agentsApi'
import { rodarBateria } from '@/components/agents/bateria/bateria'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Bloco } from './Estrutura'

function situacao(r: AgentTestRunResult): { rotulo: string; cor: string } {
  if (r.error) return { rotulo: 'Erro', cor: 'text-danger' }
  if (r.answerChanged || r.toolsChanged) return { rotulo: r.toolsChanged ? 'Ferramentas mudaram' : 'Resposta mudou', cor: 'text-status-pending' }
  if (r.answerChanged === false || r.toolsChanged === false) return { rotulo: 'Igual', cor: 'text-status-active' }
  return { rotulo: 'Primeira vez', cor: 'text-surface-400' }
}

function Linha({ r }: { r: AgentTestRunResult }) {
  const [aberta, setAberta] = useState(false)
  const s = situacao(r)
  return (
    <li className="bg-[var(--sf2)] px-4 py-3">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setAberta((a) => !a)} aria-expanded={aberta}>
        <span className="min-w-0 text-sm text-surface-100">{r.question}</span>
        <span className={cn('flex-shrink-0 text-xs font-medium', s.cor)}>{s.rotulo}</span>
      </button>
      {aberta && (
        <div className="mt-2 space-y-2 text-xs">
          {r.error ? <p className="text-danger">{r.error}</p> : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div><p className="text-surface-500">Resposta</p><p className="whitespace-pre-wrap text-surface-100">{r.answer || '—'}</p></div>
              {r.approvedAnswer && <div><p className="text-surface-500">Aprovada no ensaio</p><p className="whitespace-pre-wrap text-surface-300">{r.approvedAnswer}</p></div>}
            </div>
          )}
          {r.toolCalls.length > 0 && <p className="text-surface-400">Ferramentas pedidas (simuladas): {r.toolCalls.join(', ')}</p>}
        </div>
      )}
    </li>
  )
}

/**
 * Onda 5 (M18) — as perguntas de teste do agente (etapa Ensaio do assistente)
 * rodam de novo a cada publicação e quando o dono pede, com as ferramentas
 * simuladas. Mostra o que mudou desde a resposta aprovada ou a última vez.
 */
export function BateriaDeTestes({ agent }: { agent: AgentConfigWithTools }) {
  const [spec, setSpec] = useState<{ tests: AgentSpec['tests']; version: number | null } | null>(null)
  const [runs, setRuns] = useState<AgentTestRun[] | null>(null)
  const [indisponivel, setIndisponivel] = useState(false)
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    Promise.all([getAgentSpecForAgent(agent.id), listAgentTestRuns(agent.id)])
      .then(([s, r]) => { if (vivo) { setSpec({ tests: s.spec.tests ?? [], version: s.version }); setRuns(r) } })
      .catch(() => { if (vivo) { setIndisponivel(true); setRuns([]) } })
    return () => { vivo = false }
  }, [agent.id])

  const rodar = async () => {
    if (!spec) return
    setErro(null)
    setProgresso({ feitas: 0, total: spec.tests.length })
    try {
      const run = await rodarBateria({
        agent, tests: spec.tests, anterior: runs?.[0] ?? null, trigger: 'manual', specVersion: spec.version,
        onProgresso: (feitas, total) => setProgresso({ feitas, total }),
      })
      setRuns((r) => [run, ...(r ?? [])])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível rodar a bateria')
    } finally {
      setProgresso(null)
    }
  }

  const ultima = runs?.[0] ?? null
  const temTestes = (spec?.tests.length ?? 0) > 0

  return (
    <Bloco
      titulo="Bateria de testes"
      descricao="As perguntas do ensaio rodam de novo a cada publicação. Agenda, CRM e integrações são simulados: nada é executado."
      acoes={temTestes ? (
        <Button size="sm" variant="secondary" leftIcon={<Play className="h-3.5 w-3.5" />} loading={progresso !== null} disabled={progresso !== null} onClick={() => void rodar()}>
          {progresso ? `${progresso.feitas} de ${progresso.total}` : 'Rodar agora'}
        </Button>
      ) : undefined}
    >
      {runs === null ? (
        <Skeleton className="h-24 w-full bg-[var(--sf2)]" />
      ) : indisponivel ? (
        <EmptyState icon={ListChecks} title="Bateria indisponível" hint="O servidor do agente ainda não tem este recurso ou não respondeu." />
      ) : !temTestes ? (
        <EmptyState icon={ListChecks} title="Nenhuma pergunta de teste" hint="As perguntas vêm da etapa Ensaio do assistente. Revise o agente com o assistente novo para criar as suas." />
      ) : (
        <div className="space-y-3">
          {erro && <p className="text-xs text-danger">{erro}</p>}
          {ultima ? (
            <>
              <p className="text-xs text-surface-400">
                {ultima.trigger === 'publish' ? 'Rodada ao publicar' : 'Rodada manualmente'} em{' '}
                {new Date(ultima.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                {' · '}{ultima.changed === 0 ? 'nada mudou' : `${ultima.changed} de ${ultima.total} mudaram`}
                {ultima.failed > 0 && ` · ${ultima.failed} com erro`}
              </p>
              <ul className="divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700">
                {ultima.results.map((r) => <Linha key={r.question} r={r} />)}
              </ul>
            </>
          ) : (
            <p className="text-xs text-surface-400">{spec?.tests.length} {spec?.tests.length === 1 ? 'pergunta' : 'perguntas'}, ainda não rodadas.</p>
          )}
        </div>
      )}
    </Bloco>
  )
}
