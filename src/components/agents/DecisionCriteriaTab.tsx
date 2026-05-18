import { useState, useEffect } from 'react'
import { Save, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig } from '@/services/agentsApi'

// ─── BASE_CRITERIA (mirror) ────────────────────────────────────────────────
// Kept in lockstep with agent-server/src/services/decisionCriteria.ts. Shown
// to the operator as the placeholder so they see exactly what "use default"
// resolves to before deciding to customise. If the agent-server text changes,
// update both — there's no fetch endpoint for these on purpose (one less
// round-trip on every Agent Builder load).

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

// ─── Per-category metadata for the UI ──────────────────────────────────────

const CATEGORIES = [
  {
    key: 'resolved' as const,
    field: 'decision_criteria_resolved' as const,
    title: 'Marcar conversa como Resolvida',
    summary: 'Quando o agente deve fechar a conversa. Customize se seu negócio tem critério próprio (ex.: jurídico exige confirmação por escrito).',
  },
  {
    key: 'stage_transitions' as const,
    field: 'decision_criteria_stage_transitions' as const,
    title: 'Mover contato entre estágios do funil',
    summary: 'Sinais que justificam mover o contato. Mantenha vazio para usar o padrão (apenas evidência observável).',
  },
  {
    key: 'tags' as const,
    field: 'decision_criteria_tags' as const,
    title: 'Aplicar etiquetas',
    summary: 'Política de etiquetagem. Ajuste se você usa tags com semântica específica (ex.: "vip", "objeção_preço").',
  },
  {
    key: 'handoff' as const,
    field: 'decision_criteria_handoff' as const,
    title: 'Transferir para atendente humano',
    summary: 'Quando o agente deve sair de cena e chamar um humano. Defina gatilhos do seu time (ex.: temas regulatórios).',
  },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

// ─── Component ────────────────────────────────────────────────────────────

export function DecisionCriteriaTab({
  agent,
  onUpdate,
}: {
  agent: AgentConfig
  onUpdate: (a: AgentConfig) => void
}) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-800/40 border border-surface-700/40">
        <AlertCircle className="w-4 h-4 mt-0.5 text-brand-400 flex-shrink-0" />
        <div className="text-xs text-surface-300 leading-relaxed">
          <strong className="text-surface-100">Critérios de decisão</strong> orientam quando o agente
          deve agir no CRM. Deixe em branco para usar o padrão da plataforma — adapte apenas quando o seu
          negócio tem critério próprio. Cada categoria é independente.
        </div>
      </div>

      {CATEGORIES.map((cat) => (
        <CriterionEditor
          key={cat.key}
          agent={agent}
          onUpdate={onUpdate}
          categoryKey={cat.key}
          field={cat.field}
          title={cat.title}
          summary={cat.summary}
        />
      ))}
    </div>
  )
}

function CriterionEditor({
  agent,
  onUpdate,
  categoryKey,
  field,
  title,
  summary,
}: {
  agent: AgentConfig
  onUpdate: (a: AgentConfig) => void
  categoryKey: CategoryKey
  field:
    | 'decision_criteria_resolved'
    | 'decision_criteria_stage_transitions'
    | 'decision_criteria_tags'
    | 'decision_criteria_handoff'
  title: string
  summary: string
}) {
  const stored = agent[field] ?? ''
  const [draft, setDraft] = useState(stored)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(agent[field] ?? '') }, [agent, field])

  // "Dirty" relative to the stored value (not the BASE) — saving an empty
  // string is a meaningful operation (= "go back to default") so we must
  // distinguish "untouched empty" from "edited to empty".
  const isDirty = draft.trim() !== (stored ?? '').trim()
  const isUsingBase = (stored ?? '').trim().length === 0

  const handleSave = async () => {
    setSaving(true)
    try {
      // Send empty as `null` so the backend stores NULL and the agent-server
      // falls back to BASE_CRITERIA — anything else (even an empty string)
      // would record the override and bypass the default.
      const value = draft.trim().length === 0 ? null : draft
      const updated = await updateAgent(agent.id, { [field]: value })
      onUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleResetToBase = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.id, { [field]: null })
      onUpdate(updated)
      setDraft('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-surface-800/60 bg-surface-900/40 p-4 flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-surface-100">{title}</h3>
          <p className="text-xs text-surface-400 mt-0.5">{summary}</p>
        </div>
        <span
          className={cn(
            'flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ring-1',
            isUsingBase
              ? 'bg-surface-800/60 text-surface-400 ring-surface-700/40'
              : 'bg-brand-500/15 text-brand-300 ring-brand-500/30',
          )}
        >
          {isUsingBase ? 'Usando padrão' : 'Customizado'}
        </span>
      </header>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={BASE_CRITERIA[categoryKey]}
        rows={8}
        spellCheck
        className="w-full px-3 py-2 rounded-lg bg-surface-950/60 border border-surface-700/50 text-xs text-surface-100 placeholder:text-surface-500 placeholder:whitespace-pre-line focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono leading-relaxed resize-y"
      />

      <footer className="flex items-center justify-between gap-3">
        <div className="text-[11px] text-surface-500">
          {draft.length > 0 ? `${draft.length} caracteres` : 'Vazio = usar padrão da plataforma'}
        </div>
        <div className="flex items-center gap-2">
          {!isUsingBase && (
            <button
              onClick={handleResetToBase}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar padrão
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition',
              isDirty && !saving
                ? 'bg-brand-600 hover:bg-brand-500 text-white'
                : 'bg-surface-800 text-surface-500 cursor-not-allowed',
            )}
          >
            {saving ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Salvando…</>
            ) : saved ? (
              <><Save className="w-3 h-3" /> Salvo</>
            ) : (
              <><Save className="w-3 h-3" /> Salvar</>
            )}
          </button>
        </div>
      </footer>
    </section>
  )
}
