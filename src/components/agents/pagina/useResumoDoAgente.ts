import { useCallback, useEffect, useState } from 'react'
import { listAgentKnowledge, type AgentConfigWithTools } from '@/services/agentsApi'
import { agentCatalogApi } from '@/services/api'

export interface ResumoDoAgente {
  caracteresInstrucoes: number
  /** null enquanto carrega (ou se a leitura falhar). */
  documentos: number | null
  produtosAtivos: number | null
  capacidadesLigadas: number
  regrasAtivas: number
}

/**
 * O resumo que a navegação mostra (contagens e "de onde saem as respostas").
 * Instruções, capacidades e regras vêm do próprio agente; documentos e
 * catálogo são lidos uma vez e relidos quando uma seção avisa que mudou.
 */
export function useResumoDoAgente(agent: AgentConfigWithTools | null) {
  const [documentos, setDocumentos] = useState<number | null>(null)
  const [produtosAtivos, setProdutosAtivos] = useState<number | null>(null)
  const agentId = agent?.id

  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!agentId) return
    let vivo = true
    Promise.allSettled([listAgentKnowledge(agentId), agentCatalogApi.get(agentId)]).then(([docs, catalogo]) => {
      if (!vivo) return
      setDocumentos(docs.status === 'fulfilled' ? docs.value.length : null)
      setProdutosAtivos(catalogo.status === 'fulfilled' ? catalogo.value.data.length : null)
    })
    return () => { vivo = false }
  }, [agentId, versao])

  const resumo: ResumoDoAgente = {
    caracteresInstrucoes: agent?.system_prompt?.trim().length ?? 0,
    documentos,
    produtosAtivos,
    capacidadesLigadas: (agent?.crm_capabilities?.capabilities ?? []).filter((c) => c.enabled).length,
    regrasAtivas: (agent?.handoff_rules?.rules ?? []).filter((r) => r.enabled).length,
  }

  return { resumo, recarregarResumo: recarregar }
}
