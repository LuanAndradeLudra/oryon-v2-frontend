import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { updateAgent, type AgentConfig, type AgentConfigWithTools, type HandoffRule } from '@/services/agentsApi'
import { HandoffRulesPanel } from '@/components/agents/HandoffRuleBuilder'
import { useToast } from '@/hooks/useToast'
import { useSalvamento } from '../salvamentoContexto'
import { Bloco, CabecalhoDaSecao } from './Estrutura'
import { RespostasRapidas } from './RespostasRapidas'
import { CriteriosDeDecisao } from './CriteriosDeDecisao'

/**
 * Transferência — o que acontece ANTES e FORA da resposta da IA: quando ela
 * chama uma pessoa (regras), o que responde sem gastar IA (respostas rápidas)
 * e, recolhido, os critérios que ela usa para decidir.
 */
export function SecaoTransferencia({ agent, onAtualizar }: {
  agent: AgentConfigWithTools
  onAtualizar: (a: AgentConfig) => void
}) {
  const { toast } = useToast()
  const { salvar } = useSalvamento()
  const salvas: HandoffRule[] = useMemo(() => agent.handoff_rules?.rules ?? [], [agent.handoff_rules])
  const [regras, setRegras] = useState<HandoffRule[]>(salvas)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // O agente recarregado (outra aba, outra pessoa) manda.
  const [origem, setOrigem] = useState(salvas)
  if (origem !== salvas) {
    setOrigem(salvas)
    setRegras(salvas)
  }

  // Auto-save com debounce: uma sequência de cliques vira uma gravação só.
  const mudar = useCallback((proximas: HandoffRule[]) => {
    setRegras(proximas)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      salvar(() => updateAgent(agent.id, { handoff_rules: { rules: proximas } }))
        .then(onAtualizar)
        .catch(() => toast('Não foi possível salvar as regras de transferência.', 'error'))
    }, 400)
  }, [agent.id, onAtualizar, salvar, toast])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return (
    <div>
      <CabecalhoDaSecao id="transferencia" />
      <div className="space-y-8">
        <Bloco titulo="Quando chamar uma pessoa" descricao="A conversa vai para a equipe com todo o histórico, e a IA pausa enquanto alguém atende.">
          <HandoffRulesPanel rules={regras} onChange={mudar} />
        </Bloco>
        <Bloco titulo="Respostas rápidas" descricao="Respostas fixas por palavra-chave, sem chamar a IA. Boas para saudação, horário e endereço.">
          <RespostasRapidas agentId={agent.id} />
        </Bloco>
        <Bloco
          titulo="Como ela decide"
          descricao="Os critérios que a IA consulta antes de mexer no CRM. Deixe no padrão da Oryon, a não ser que seu negócio tenha regra própria."
          recolhivel
          abertoInicial={false}
        >
          <CriteriosDeDecisao agent={agent} onAtualizar={onAtualizar} />
        </Bloco>
      </div>
    </div>
  )
}
