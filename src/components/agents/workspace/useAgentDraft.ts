// ─── Rascunho do agente (A2 / SCRUM-1013) ────────────────────────────────────
// Lógica pura em `agentDraftCore.ts` (testada); aqui fica só o estado React e
// a rede.
//
// AS.2 (draft/publish no agent-server) ainda não está no ar. O hook funciona
// nos dois mundos e diz qual está valendo através de `available`:
//   • available=true  → o rascunho vive no servidor; localStorage é só buffer.
//   • available=false → localStorage é a única fonte, e "Publicar" aplica os
//     campos direto via updateAgent, SEM criar versão de prompt. É perda real
//     de funcionalidade, então a UI rotula (sem contador de versão) em vez de
//     fingir que versionou.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { agentDraftApi } from '@/services/agentsOpsApi'
import { withFallback } from '@/services/withFallback'
import {
  changedFields as computeChanged, pruneDraft, readStoredDraft, writeStoredDraft,
  type AgentDraft, type DraftField,
} from './agentDraftCore'

export interface UseAgentDraft {
  draft: AgentDraft | null
  changedFields: DraftField[]
  isDirty: boolean
  setDraftField: (field: DraftField, value: unknown) => void
  publish: () => Promise<void>
  discard: () => void
  publishing: boolean
  publishError: string | null
  /** false = AS.2 não respondeu (404/501): rodando 100% local. */
  available: boolean
}

export function useAgentDraft(
  agent: AgentConfigWithTools,
  onPublished: (a: AgentConfig) => void,
): UseAgentDraft {
  const [draft, setDraft] = useState<AgentDraft | null>(() => readStoredDraft(agent.id))
  const [available, setAvailable] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Descobre se AS.2 existe sem quebrar quando não existe. `withFallback` só
  // engole 404/501 — 401/500/rede continuam subindo, porque "backend quebrado"
  // não pode ser lido como "funcionalidade ainda não existe".
  useEffect(() => {
    let cancelled = false
    withFallback(() => agentDraftApi.health(agent.id), null)
      .then(({ available: ok }) => { if (!cancelled) setAvailable(ok) })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true }
  }, [agent.id])

  // O agente publicado é o baseline: quando ele muda (publicação, recarga), o
  // que virou igual ao publicado sai do rascunho sozinho.
  useEffect(() => {
    setDraft(prev => {
      const pruned = pruneDraft(agent, prev)
      writeStoredDraft(agent.id, pruned)
      return pruned
    })
  }, [agent])

  const setDraftField = useCallback((field: DraftField, value: unknown) => {
    setDraft(prev => {
      const next = pruneDraft(agent, { ...(prev ?? {}), [field]: value })
      writeStoredDraft(agent.id, next)
      if (available) {
        // Buffer local primeiro, servidor depois: se o PATCH falhar, o que a
        // pessoa digitou não some da tela.
        agentDraftApi.patch(agent.id, (next ?? {}) as Record<string, unknown>).catch(() => {})
      }
      return next
    })
  }, [agent, available])

  const changedFields = useMemo(() => computeChanged(agent, draft), [agent, draft])

  const discard = useCallback(() => {
    setDraft(null)
    writeStoredDraft(agent.id, null)
    if (available) agentDraftApi.discard(agent.id).catch(() => {})
  }, [agent.id, available])

  const publish = useCallback(async () => {
    if (!draft || changedFields.length === 0) return
    setPublishing(true)
    setPublishError(null)
    try {
      if (available) {
        const { config } = await agentDraftApi.publish(agent.id)
        onPublished(config)
      } else {
        // Fallback: aplica direto nas colunas ao vivo. Sem linha em
        // `agent_prompt_versions` — não existe ainda.
        onPublished(await updateAgent(agent.id, draft as Partial<AgentConfig>))
      }
      // NÃO se limpa o rascunho daqui. Estas duas linhas existiam e eram
      // destrutivas: elas rodam DEPOIS do `await`, a partir do retrato de
      // rascunho que existia quando o publish começou. Quem continuou
      // digitando enquanto a rede respondia perdia o que escreveu — da tela E
      // do `localStorage` —, e `changedFields` voltava vazio, então a tela
      // afirmava "nada pendente" no instante exato em que acabara de descartar
      // o que estava pendente. Sem aviso e sem confirmação.
      //
      // Desabilitar o "Publicar" durante o voo não resolve: o que se perde não
      // é um segundo publish, é a digitação no textarea, que não está
      // desabilitado. `pending` evita CHAMADA duplicada, não evita ESCRITA
      // perdida.
      //
      // Quem limpa é o `useEffect([agent])` acima: `onPublished` troca o agente
      // publicado, o efeito dispara e o `pruneDraft` tira do rascunho o que
      // ficou igual ao publicado — mantendo o que ainda difere. No caminho
      // normal o resultado é idêntico ao das linhas apagadas; no caminho
      // concorrente é a diferença entre preservar e perder.
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Não foi possível publicar')
    } finally {
      setPublishing(false)
    }
  }, [agent.id, available, changedFields.length, draft, onPublished])

  return {
    draft,
    changedFields,
    isDirty: changedFields.length > 0,
    setDraftField,
    publish,
    discard,
    publishing,
    publishError,
    available,
  }
}
