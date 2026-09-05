// ─── Saúde do agente expandido ────────────────────────────────────────────
// Busca `health` (AS.2/AS.3) só para a linha que está aberta, e uma vez por
// linha. O `useDeckData` do Deck busca health de TODOS os agentes porque a
// coluna Atenção precisa disso; aqui só uma linha fica aberta por vez, então
// puxar tudo seria N requisições para mostrar uma.
//
// Fica em `list/` e não no hook do Deck de propósito: o `useDeckData` está em
// revisão no PR do núcleo (#126) e não deve ganhar responsabilidade nova antes
// de mesclar.

import { useEffect, useRef, useState } from 'react'

import { agentDraftApi } from '@/services/agentsOpsApi'
import { withFallback } from '@/services/withFallback'
import type { AgentHealth } from '@/types/agentsOps'

export function useAgentHealth(agentId: string | null): AgentHealth | undefined {
  const [cache, setCache] = useState<Record<string, AgentHealth>>({})
  const buscados = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!agentId || buscados.current.has(agentId)) return
    buscados.current.add(agentId)
    let cancelado = false

    void (async () => {
      try {
        const res = await withFallback(() => agentDraftApi.health(agentId), null as AgentHealth | null)
        if (!cancelado && res.data) setCache((prev) => ({ ...prev, [agentId]: res.data as AgentHealth }))
      } catch {
        // 401/403/500: a linha mostra só o que vem do próprio AgentConfig.
      }
    })()

    return () => { cancelado = true }
  }, [agentId])

  return agentId ? cache[agentId] : undefined
}
