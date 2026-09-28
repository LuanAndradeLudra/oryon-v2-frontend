import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Pencil, Plug } from 'lucide-react'
import {
  getAgentSpecForAgent, getEffectivePrompt, listAgentTestRuns,
  type AgentConfigWithTools, type AgentTestRun,
} from '@/services/agentsApi'
import { rodarBateria } from '@/components/agents/bateria/bateria'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { contradicoes, ferramentasNovas, marcarFerramentasVistas } from '../ferramentasNoTexto'

type Bateria =
  | { estado: 'rodando' }
  | { estado: 'pronta'; run: AgentTestRun }
  | { estado: 'sem-testes' }
  | { estado: 'erro' }

/**
 * SCRUM-1159 (item 3) — ferramenta conectada depois da criação. Aponta os
 * trechos do texto que ainda dizem que o agente não faz o que a ferramenta
 * agora permite, e, quando percebe ferramenta nova, roda a bateria de testes
 * uma vez para mostrar se as respostas mudaram.
 */
export function AvisoDeFerramentas({
  agent, onEditar, onRevisar, tamanho = 'sm',
}: {
  agent: AgentConfigWithTools
  onEditar: () => void
  /** Presente quando o assistente novo está disponível. */
  onRevisar?: () => void
  tamanho?: 'sm' | 'md'
}) {
  const [ferramentas, setFerramentas] = useState<Array<{ name: string; description: string }> | null>(null)
  const [novas, setNovas] = useState<string[]>([])
  const [bateria, setBateria] = useState<Bateria | null>(null)

  useEffect(() => {
    let vivo = true
    getEffectivePrompt(agent)
      .then(async (r) => {
        if (!vivo) return
        setFerramentas(r.tools)
        const nomes = r.tools.map((t) => t.name)
        const { novas: n, primeiraVez } = ferramentasNovas(agent.id, nomes)
        marcarFerramentasVistas(agent.id, nomes)
        if (primeiraVez || n.length === 0) return
        setNovas(n)
        // Ferramenta nova: a bateria mostra se as respostas mudaram com ela.
        setBateria({ estado: 'rodando' })
        try {
          const [{ spec, version }, runs] = await Promise.all([getAgentSpecForAgent(agent.id), listAgentTestRuns(agent.id).catch(() => [] as AgentTestRun[])])
          if (!spec.tests?.some((t) => t.question.trim())) { if (vivo) setBateria({ estado: 'sem-testes' }); return }
          const run = await rodarBateria({ agent, tests: spec.tests, anterior: runs[0] ?? null, trigger: 'manual', specVersion: version })
          if (vivo) setBateria({ estado: 'pronta', run })
        } catch {
          if (vivo) setBateria({ estado: 'erro' })
        }
      })
      .catch(() => { /* servidor sem o recurso: sem aviso */ })
    return () => { vivo = false }
    // Só ao abrir o agente: a lista de ferramentas não muda enquanto se edita o texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id])

  const conflitos = useMemo(
    () => (ferramentas ? contradicoes(agent.system_prompt, ferramentas) : []),
    [ferramentas, agent.system_prompt],
  )

  if (!conflitos.length && !novas.length) return null

  return (
    <Banner variant={conflitos.length ? 'warning' : 'info'} className="mb-4" icon={<Plug className="h-4 w-4" />}>
      {novas.length > 0 && (
        <span className="block font-medium">
          {novas.length === 1 ? 'Ferramenta nova conectada' : 'Ferramentas novas conectadas'}: {novas.map((n) => <code key={n} className="mx-0.5">{n}</code>)}.
          {' '}O agente já pode usar a partir da próxima mensagem.
        </span>
      )}
      {conflitos.length > 0 && (
        <>
          <span className="mt-1 block">
            O texto do agente ainda diz que ele não faz o que a ferramenta agora permite. As regras da plataforma dão
            preferência à ferramenta, mas vale ajustar o texto para não haver dúvida:
          </span>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {conflitos.map((c) => (
              <li key={c.trecho}>
                “{c.trecho}” <span className="text-xs opacity-80">— {c.ferramentas.join(', ')}</span>
              </li>
            ))}
          </ul>
          <span className="mt-2 flex flex-wrap gap-2">
            <Button size={tamanho} variant="neutral" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEditar}>Editar o texto</Button>
            {onRevisar && (
              <Button size={tamanho} variant="ghost" leftIcon={<ListChecks className="h-3.5 w-3.5" />} onClick={onRevisar}>Revisar com o assistente novo</Button>
            )}
          </span>
        </>
      )}
      {bateria && (
        <span className="mt-2 block text-xs">
          {bateria.estado === 'rodando' && 'Rodando a bateria de testes para ver se as respostas mudaram…'}
          {bateria.estado === 'sem-testes' && 'Este agente não tem perguntas de teste; vale testar na bancada antes de confiar.'}
          {bateria.estado === 'erro' && 'Não deu para rodar a bateria de testes agora; teste na bancada.'}
          {bateria.estado === 'pronta' && (
            <>
              Bateria de testes: {bateria.run.changed === 0 ? 'nada mudou' : `${bateria.run.changed} de ${bateria.run.total} mudaram`}.{' '}
              <Link to={`/agents/${encodeURIComponent(agent.id)}/desempenho`} className="font-medium underline">Ver em Desempenho</Link>
            </>
          )}
        </span>
      )}
    </Banner>
  )
}
