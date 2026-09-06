// ─── Saúde do agente expandido ────────────────────────────────────────────
// Busca `health` (AS.2/AS.3) só para a linha que está aberta, e uma vez por
// linha. O `useDeckData` do Deck busca health de TODOS os agentes porque a
// coluna Atenção precisa disso; aqui só uma linha fica aberta por vez, então
// puxar tudo seria N requisições para mostrar uma.
//
// Fica em `list/` e não no hook do Deck de propósito: o `useDeckData` está em
// revisão no PR do núcleo (#126) e não deve ganhar responsabilidade nova antes
// de mesclar.
//
// Dois cuidados que a primeira versão não tinha (achados 1 e 4 do Lince):
//
//   · "já buscado" é marcado no SUCESSO, não na largada. Marcar antes fazia um
//     500 transitório esconder a saúde daquela linha pelo resto da sessão —
//     fechar e reabrir não refazia a busca. Agora a falha não entra no
//     conjunto e reabrir tenta de novo; o `emVoo` separado continua evitando a
//     requisição duplicada que a marcação antecipada também impedia.
//
//   · `invalidar(id)` existe porque a saúde ENVELHECE por ação do usuário:
//     testar um agente muda `last_test_at`, e sem invalidar a linha continuava
//     dizendo "nunca" até recarregar a página.
//
// A resposta é sempre escrita na chave do `agentId` capturado pelo efeito, então
// uma resposta atrasada não contamina a linha que estiver aberta quando ela
// chegar — o padrão que o CHECKLIST-REVISAO registra como recorrente.

import { useCallback, useEffect, useRef, useState } from 'react'

import { agentDraftApi } from '@/services/agentsOpsApi'
import { withFallback } from '@/services/withFallback'
import type { AgentHealth } from '@/types/agentsOps'

export interface UseAgentHealth {
  health: AgentHealth | undefined
  /** Descarta o que foi buscado para este agente e força nova busca. */
  invalidar: (agentId: string) => void
}

export function useAgentHealth(agentId: string | null): UseAgentHealth {
  const [cache, setCache] = useState<Record<string, AgentHealth>>({})
  const buscados = useRef<Set<string>>(new Set())
  const emVoo = useRef<Set<string>>(new Set())
  const [geracao, setGeracao] = useState(0)

  useEffect(() => {
    if (!agentId) return
    if (buscados.current.has(agentId) || emVoo.current.has(agentId)) return
    emVoo.current.add(agentId)
    let cancelado = false

    void (async () => {
      try {
        const res = await withFallback(() => agentDraftApi.health(agentId), null as AgentHealth | null)
        if (cancelado) return
        if (res.data) {
          buscados.current.add(agentId)
          setCache((prev) => ({ ...prev, [agentId]: res.data as AgentHealth }))
        }
      } catch {
        // 401/403/500: a linha mostra só o que vem do próprio AgentConfig, e
        // como `buscados` não foi marcado, reabrir a linha tenta de novo.
      } finally {
        emVoo.current.delete(agentId)
      }
    })()

    return () => { cancelado = true }
  }, [agentId, geracao])

  const invalidar = useCallback((id: string) => {
    buscados.current.delete(id)
    setCache((prev) => {
      if (!(id in prev)) return prev
      const proximo = { ...prev }
      delete proximo[id]
      return proximo
    })
    setGeracao((g) => g + 1)
  }, [])

  return { health: agentId ? cache[agentId] : undefined, invalidar }
}
