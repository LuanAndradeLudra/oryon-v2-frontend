import { useState } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateAgent, type AgentConfig } from '@/services/agentsApi'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/hooks/useToast'
import { useRascunhoPendente, useSalvamento } from '../salvamentoContexto'
import { useTamanhoDeToque } from '../useToque'

// ─── BASE_CRITERIA (espelho) ───────────────────────────────────────────────
// Em sincronia com agent-server/src/services/decisionCriteria.ts. Aparece
// como texto de exemplo para a pessoa ver exatamente o que "usar o padrão"
// significa antes de personalizar. Se o texto do agent-server mudar, mude os
// dois — não há endpoint para isso de propósito.
const BASE_CRITERIA = {
  resolved: `QUANDO marcar a conversa como RESOLVIDA:
- Considere quando o cliente confirmou explicitamente a solução ("isso resolveu", "perfeito, era isso", "obrigado, deu certo").
- Considere quando você entregou a solução completa e o cliente sinalizou concordância sem novas perguntas em sequência.
- Considere quando o cliente sumiu há mais de 48h DEPOIS de você ter entregue uma solução completa (não apenas mensagem qualquer).
- NUNCA marque como resolvida apenas porque o cliente respondeu "ok" / "sim" / "obrigado" isoladamente — essas palavras frequentemente são confirmações parciais de uma pergunta sua, não fim de conversa.
- NUNCA marque como resolvida se houver uma pendência sua em aberto (informação que você prometeu enviar, agendamento não confirmado, dúvida ainda no ar).
- Em caso de dúvida, mantenha o status atual e continue conversando.`,
  stage_transitions: `QUANDO mover o contato de estágio do funil:
- Considere mover SOMENTE quando houver evidência observável no diálogo (frase explícita do cliente, conclusão de etapa, dado confirmado). Não infira por humor ou educação do cliente.
- Use a lista de estágios permitidos que aparece em LIMITES CONFIGURADOS. Se o estágio que você considera correto não está nessa lista, não mova — escolha o mais próximo permitido OU não mova.
- Avalie a sequência atual de estágios. Pular várias etapas em um único turno é quase sempre erro — prefira uma única transição.
- Em caso de dúvida sobre qual estágio aplicar, mantenha o atual.`,
  tags: `QUANDO aplicar uma etiqueta:
- Use etiquetas para enriquecer o perfil do contato/conversa com sinais úteis para o time comercial (interesse demonstrado, objeção, perfil de cliente, urgência).
- Aplique no máximo 1-2 etiquetas novas por conversa — etiquetar em excesso polui o filtro.
- Antes de criar tag mentalmente, verifique a lista TAGS PERMITIDAS em LIMITES CONFIGURADOS e escolha a mais alinhada.
- Não use etiquetas como anotação interna ou lembrete — etiqueta é sinalização permanente, não scratchpad.`,
  handoff: `QUANDO atribuir a conversa a um humano (handoff):
- Atribua quando o cliente pedir explicitamente por um atendente humano, gerente, supervisor.
- Atribua quando perceber frustração / raiva clara que você não consegue resolver tecnicamente.
- Atribua para temas sensíveis: cobrança, jurídico, reclamação formal, denúncia.
- Atribua quando você tentou resolver 2 vezes sem progresso real (não conta como tentativa repetir a mesma resposta).
- Use find_available_user para pegar a lista de atendentes ordenada (online primeiro, depois menor carga) e prefira o primeiro disponível.
- NUNCA force handoff se já houver um humano atribuído à conversa (veja "assignado_a_humano" no estado).`,
} as const

const CATEGORIAS = [
  { key: 'handoff' as const, field: 'decision_criteria_handoff' as const, curto: 'chamar uma pessoa',
    titulo: 'Quando chamar uma pessoa', resumo: 'Os sinais para sair de cena e passar para a equipe.' },
  { key: 'resolved' as const, field: 'decision_criteria_resolved' as const, curto: 'encerrar',
    titulo: 'Quando encerrar a conversa', resumo: 'Quando a IA pode marcar a conversa como resolvida.' },
  { key: 'stage_transitions' as const, field: 'decision_criteria_stage_transitions' as const, curto: 'mover no funil',
    titulo: 'Quando mover o negócio no funil', resumo: 'A evidência que justifica mudar de etapa.' },
  { key: 'tags' as const, field: 'decision_criteria_tags' as const, curto: 'etiquetas',
    titulo: 'Quando aplicar etiquetas', resumo: 'A política de etiquetas da sua equipe.' },
]

type Categoria = (typeof CATEGORIAS)[number]

/**
 * "Como ela decide" — os critérios que a IA consulta antes de mexer no CRM.
 * Texto lido ao vivo: fica em rascunho até salvar (como as Instruções).
 */
export function CriteriosDeDecisao({ agent, onAtualizar }: { agent: AgentConfig; onAtualizar: (a: AgentConfig) => void }) {
  return (
    <ul className="divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700">
      {CATEGORIAS.map((c) => <Criterio key={c.key} c={c} agent={agent} onAtualizar={onAtualizar} />)}
    </ul>
  )
}

function Criterio({ c, agent, onAtualizar }: { c: Categoria; agent: AgentConfig; onAtualizar: (a: AgentConfig) => void }) {
  const tam = useTamanhoDeToque()
  const { toast } = useToast()
  const { salvar, lerTexto, guardarTexto } = useSalvamento()
  const chave = `criterio:${c.key}`
  const salvo = (agent[c.field] ?? '').trim()
  const guardado = lerTexto(chave)
  const [rascunho, setRascunhoLocal] = useState(guardado ?? salvo)
  const [aberto, setAberto] = useState(guardado !== undefined)
  const [salvando, setSalvando] = useState(false)
  const sujo = rascunho.trim() !== salvo
  const personalizado = salvo.length > 0
  useRascunhoPendente(`Critérios (${c.curto})`, sujo)

  const setRascunho = (v: string) => {
    setRascunhoLocal(v)
    guardarTexto(chave, v.trim() === salvo ? undefined : v)
  }

  const gravar = async (valor: string | null) => {
    setSalvando(true)
    try {
      const atualizado = await salvar(() => updateAgent(agent.id, { [c.field]: valor }))
      guardarTexto(chave, undefined)
      setRascunhoLocal(valor ?? '')
      onAtualizar(atualizado)
    } catch {
      toast('Não foi possível salvar o critério.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <li className="bg-[var(--sf2)]">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-surface-100">{c.titulo}</span>
          <span className="block text-xs text-surface-400">{c.resumo}</span>
        </span>
        <span className={cn(
          'inline-flex h-5 flex-shrink-0 items-center rounded-xs border px-[7px] text-2xs font-semibold whitespace-nowrap',
          personalizado ? 'border-transparent bg-accent-soft text-accent-dark' : 'border-surface-700 text-surface-400',
        )}>
          {personalizado ? 'Personalizado' : 'Padrão da Oryon'}
        </span>
        <ChevronDown className={cn('h-4 w-4 flex-shrink-0 text-surface-500 transition-transform', aberto && 'rotate-180')} aria-hidden />
      </button>
      {aberto && (
        <div className="space-y-3 border-t border-surface-700 px-4 py-3">
          <Textarea
            aria-label={c.titulo}
            rows={8}
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder={BASE_CRITERIA[c.key]}
            className="font-mono text-xs leading-relaxed placeholder:whitespace-pre-line"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="basis-full text-xs text-surface-500 sm:flex-1 sm:basis-auto">
              {rascunho.trim() ? `${rascunho.length.toLocaleString('pt-BR')} caracteres` : 'Vazio = a IA segue o padrão da Oryon (o texto de exemplo acima).'}
            </p>
            {personalizado && (
              <Button variant="ghost" size={tam} leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => void gravar(null)} disabled={salvando}>
                Voltar ao padrão
              </Button>
            )}
            {sujo && (
              <Button variant="ghost" size={tam} onClick={() => setRascunho(salvo)} disabled={salvando}>Descartar</Button>
            )}
            <Button size={tam} onClick={() => void gravar(rascunho.trim() ? rascunho : null)} disabled={!sujo} loading={salvando}>
              Salvar
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
