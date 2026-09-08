// Seção "Prompt" do Workspace (A2 / SCRUM-1013).
// Doc com gutter de linha (decisão 7 do Maestro) — ver `promptDocCore.ts` para
// por que o parsing é próprio e o `PromptArtifact.tsx` fica com ZERO mudanças.
// A leitura é o doc; editar é o mesmo toggle de textarea que a SystemPromptTab
// já tinha, não um editor novo. O `SystemPromptTab` segue intacto servindo o
// AgentDetail legado que a /agents ainda renderiza.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pencil, RefreshCw, Sparkles, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { hubHasContent, injectHubIntoPrompt, isAgentStale, loadHub } from '@/services/companyContextService'
import { generateAgentPromptWithSource, updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { wizardConfigToPromptRequest } from '@/components/agents/studio/wizardConfigToPrompt'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { SectionHeader } from '../SectionHeader'
import { PromptDoc } from '../PromptDoc'
import { approxTokens } from '../promptDocCore'
import { sectionById } from '../sectionNavCore'

export function PromptSection({
  agent,
  onUpdate,
  promptVersion,
}: {
  agent: AgentConfigWithTools
  onUpdate: (a: AgentConfig) => void
  /** Versão publicada (AS.2). Ausente = subtítulo sem o `v3`. */
  promptVersion?: number | null
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(agent.system_prompt)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)
  /** Origem do último texto regenerado. `null` = nada foi regenerado ainda. */
  const [regenSource, setRegenSource] = useState<'ai' | 'local_fallback' | null>(null)

  /** Ver `useAgentSimulator` (#135): quem compara é a CÓPIA LOCAL da geração.
   *  O ref sozinho não resolve — ele é um só para todas as rodadas, então a
   *  rodada nova apagaria a marca da velha. Aqui a corrida é trocar de agente
   *  com uma geração em voo: a resposta do agente antigo não pode cair no
   *  rascunho do novo. */
  const generationRef = useRef(0)
  useEffect(() => { generationRef.current += 1 }, [agent.id])

  // Prompt recarregado por fora (troca de agente, publicação) descarta o
  // rascunho local — mesma regra que a SystemPromptTab já aplicava.
  useEffect(() => { setDraft(agent.system_prompt) }, [agent.system_prompt])

  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const isStale = hub && hubHasContent(hub) ? isAgentStale(agent.updated_at, hub) : false
  const isDirty = draft !== agent.system_prompt

  const handleSave = async () => {
    setSaving(true)
    try {
      onUpdate(await updateAgent(agent.id, { system_prompt: draft }))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (!hub) return
    setSyncing(true)
    try {
      const merged = injectHubIntoPrompt(agent.system_prompt, hub)
      onUpdate(await updateAgent(agent.id, { system_prompt: merged }))
      setDraft(merged)
    } finally {
      setSyncing(false)
    }
  }

  // Uma chamada serve às duas perguntas: o que mandar para a geração, e por que
  // o botão está desabilitado quando não dá para gerar.
  //
  // O estado VIVO vai junto: `wizard_config` é um retrato do momento do wizard,
  // mas as regras de transferência e os canais têm coluna própria no agente e
  // são o que a seção Regras edita. Sem isto, quem cria pelo wizard, acrescenta
  // duas regras no workspace e clica em Regenerar receberia um prompt com as
  // regras ANTIGAS, e nada avisaria.
  const { request, motivo } = useMemo(
    () => wizardConfigToPromptRequest(agent.wizard_config, {
      handoff_rules: agent.handoff_rules,
      channels: agent.channels,
    }),
    [agent.wizard_config, agent.handoff_rules, agent.channels],
  )

  const regenerar = async () => {
    setConfirmRegen(false)
    if (!request) return
    const generation = generationRef.current
    setRegenerating(true)
    setRegenError(null)
    try {
      const { prompt, source } = await generateAgentPromptWithSource(request)
      // Trocou de agente no meio do voo: o texto é de outro e não entra.
      if (generationRef.current !== generation) return
      setDraft(prompt)
      setRegenSource(source)
      setEditing(true)
    } catch {
      if (generationRef.current !== generation) return
      // O rascunho NÃO muda: falhar em gerar não pode custar o que a pessoa
      // já tinha escrito.
      setRegenError('Não foi possível gerar o prompt agora. O texto atual está intacto.')
    } finally {
      if (generationRef.current === generation) setRegenerating(false)
    }
  }

  /** Reversível contra o PUBLICADO não pede confirmação; destrutivo de trabalho
   *  NÃO SALVO pede. Regenerar só preenche o rascunho — Cancelar devolve o que
   *  está no ar —, então o único caso que confirma é o da edição local em voo. */
  const pedirRegenerar = () => { if (isDirty) setConfirmRegen(true); else void regenerar() }

  const description = [
    typeof promptVersion === 'number' && promptVersion > 0 ? `v${promptVersion}` : null,
    // Rotulado como aproximação porque é heurística de caracteres, não
    // tokenizer — ver `approxTokens`.
    `~${approxTokens(agent.system_prompt).toLocaleString('pt-BR')} tokens`,
    'o que muda aqui aparece na conversa ao lado',
  ].filter(Boolean).join(' · ')

  // O mockup (`p2a-agentes.html:144`) põe `Editar` secundário e `Regenerar`
  // PRIMÁRIO lado a lado. Na edição ele cede o primário ao Salvar: dois
  // primários lado a lado disputam a mesma decisão.
  //
  // Aparece nos DOIS estados de propósito. Escondê-lo durante a edição
  // obrigaria a pessoa a CANCELAR para alcançá-lo — e cancelar é exatamente o
  // que perde o trabalho que a confirmação existe para proteger.
  //
  // Sem `wizard_config` ele fica DESABILITADO COM MOTIVO, nunca oculto: a
  // capacidade existe no produto, o que falta é a entrada DESTE agente, e
  // ocultar faria a pessoa procurar um botão que ela viu em outro agente.
  const regenerarBtn = (
    <Button
      variant={editing ? 'secondary' : 'primary'}
      size="sm"
      onClick={pedirRegenerar}
      disabled={regenerating || saving || !request}
      title={motivo ?? undefined}
    >
      <Sparkles className={regenerating ? 'w-4 h-4 animate-pulse' : 'w-4 h-4'} />
      {regenerating ? 'Gerando…' : 'Regenerar'}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Prompt"
        description={description}
        accent={sectionById('prompt').accent}
        actions={
          <>
            {editing ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setDraft(agent.system_prompt); setEditing(false); setRegenSource(null) }}
                  disabled={saving || regenerating}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                {regenerarBtn}
                <Button size="sm" onClick={handleSave} disabled={saving || regenerating || !isDirty}>
                  <Check className="w-4 h-4" />
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4" />
                  Editar
                </Button>
                {regenerarBtn}
              </>
            )}
          </>
        }
      />

      {isStale && (
        <Banner
          variant="warning"
          action={
            <button
              onClick={handleSync}
              disabled={syncing}
              aria-label="Sincronizar o prompt com o contexto da empresa"
              className="inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
            >
              <RefreshCw className={syncing ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
              {syncing ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          }
        >
          O contexto da empresa mudou depois da última edição deste prompt.
        </Banner>
      )}

      {regenError && <Banner variant="danger">{regenError}</Banner>}

      {/* A ORIGEM, não um erro: o texto entra no rascunho nos dois casos. O
          aviso só existe porque "Regenerar" promete IA, e com o backend fora o
          prompt vem montado da configuração do wizard, sem modelo nenhum.
          Gerado pela IA entra CALADO — é o que o botão prometeu, e avisar
          sempre ensina a ignorar o aviso. */}
      {regenSource === 'local_fallback' && (
        <Banner variant="warning">
          Este texto foi montado a partir da configuração do wizard, sem IA — o serviço de
          geração não respondeu. Revise antes de salvar.
        </Banner>
      )}

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Prompt do agente"
          spellCheck={false}
          className="w-full min-h-[420px] rounded-xl border border-surface-700 bg-surface-900/40 px-4 py-3 font-mono text-xs leading-6 text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        />
      ) : (
        <PromptDoc content={agent.system_prompt} />
      )}

      <ConfirmModal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        onConfirm={() => { void regenerar() }}
        title="Regenerar o prompt?"
        description="Você tem alterações não salvas neste prompt. Regenerar substitui o texto do editor pelo prompt gerado, e o que você digitou se perde."
        confirmLabel="Regenerar"
        danger
      />
    </div>
  )
}
