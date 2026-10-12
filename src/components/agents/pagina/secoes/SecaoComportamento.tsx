import { useState } from 'react'
import { updateAgent, type AgentConfig, type AgentConfigWithTools } from '@/services/agentsApi'
import { conversationsApi } from '@/services/api'
import { FormField } from '@/components/ui/FormField'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { useToast } from '@/hooks/useToast'
import { useSalvamento } from '../salvamentoContexto'
import { CabecalhoDaSecao } from './Estrutura'

// Vazio = herdar da organização (e depois do padrão da plataforma).
const PAUSA = [
  { v: '', r: 'Igual ao da organização' },
  { v: '30', r: '30 minutos' }, { v: '60', r: '1 hora' }, { v: '120', r: '2 horas' },
  { v: '240', r: '4 horas' }, { v: '480', r: '8 horas' }, { v: '1440', r: '24 horas' },
  { v: '4320', r: '3 dias' }, { v: '10080', r: '1 semana' },
]
const ESPERA = [
  { v: '', r: 'Igual ao da organização' },
  { v: '0', r: 'Não esperar (responde cada mensagem)' },
  { v: '5', r: '5 segundos' }, { v: '10', r: '10 segundos' }, { v: '12', r: '12 segundos' },
  { v: '15', r: '15 segundos' }, { v: '20', r: '20 segundos' }, { v: '30', r: '30 segundos' },
]

const paraTexto = (n: number | null | undefined) => (n == null ? '' : String(n))
const paraNumero = (s: string) => (s === '' ? null : parseInt(s, 10))

/** Comportamento — duas escolhas, gravadas assim que mudam. */
export function SecaoComportamento({ agent, onAtualizar }: { agent: AgentConfigWithTools; onAtualizar: (a: AgentConfig) => void }) {
  const { toast } = useToast()
  const { salvar } = useSalvamento()
  const [ocupado, setOcupado] = useState(false)

  const gravar = async (campo: 'ai_handoff_pause_minutes' | 'ai_inbound_debounce_seconds', valor: string) => {
    setOcupado(true)
    try {
      const atualizado = await salvar(() => updateAgent(agent.id, { [campo]: paraNumero(valor) }))
      onAtualizar(atualizado)
      // Sem isto o valor novo levaria até 60 s (cache do backend) para valer.
      await conversationsApi.refreshAgentBehaviorCache(agent.id).catch(() => {})
    } catch {
      toast('Não foi possível salvar o comportamento.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div>
      <CabecalhoDaSecao id="comportamento" />
      <div className="max-w-xl space-y-6">
        <FormField
          label="Quando alguém da equipe responde, a IA pausa por"
          hint="Vale para aquela conversa. Quem atende pode religar a IA na própria conversa, a qualquer momento."
        >
          <SelectMenu value={paraTexto(agent.ai_handoff_pause_minutes)} disabled={ocupado}
            onChange={(e) => void gravar('ai_handoff_pause_minutes', e.target.value)}>
            {PAUSA.map((o) => <option key={o.v} value={o.v}>{o.r}</option>)}
          </SelectMenu>
        </FormField>
        <FormField
          label="Esperar o cliente terminar de escrever"
          hint="Quem manda “oi”, “tudo bem?” e a pergunta em três mensagens recebe uma resposta só, depois da pausa escolhida."
        >
          <SelectMenu value={paraTexto(agent.ai_inbound_debounce_seconds)} disabled={ocupado}
            onChange={(e) => void gravar('ai_inbound_debounce_seconds', e.target.value)}>
            {ESPERA.map((o) => <option key={o.v} value={o.v}>{o.r}</option>)}
          </SelectMenu>
        </FormField>
      </div>
    </div>
  )
}
