// ─── useCostEstimate ───────────────────────────────────────────────────────
// "Custo estimado" da barra fixa e do bloco Envio — BE.5,
// `POST /campaigns/cost-estimate` (contrato em campaignsV2Api.ts, bloco
// [D2][D1]). Fica FORA do `useComposerDraft` de propósito: é um número
// derivado e degradável, não faz parte do rascunho (coord/D2-plano.md §2).
//
// Aqui `withFallback` é seguro, ao contrário do `useTestSend`: o contrato do
// BE.5 não define nenhum 404 de domínio, então um 404 só pode significar
// "endpoint ainda não implantado". Nesse caso a métrica é OCULTADA — nunca
// mostrada como "R$ 0,00", que seria um número errado e não um número
// ausente (coord/D2-plano.md §5).
import { useState, useEffect } from 'react'
import { campaignSchedulingApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import type { CampaignCostEstimate, CampaignCostEstimateRequest } from '@/types/campaignsV2'
import type { AudienceDraft } from './useComposerDraft'

/** Espera antes de perguntar o custo. O público muda a cada tecla dentro do
 *  construtor do Crivo; sem isso seria uma chamada por caractere. */
const DEBOUNCE_MS = 400

/** A resposta fica guardada junto da chave do pedido que a produziu. Assim
 *  `estimate` e `loading` são DERIVADOS — trocar de público invalida o
 *  número na hora, sem um `setState` de limpeza dentro do efeito (que a
 *  regra `react-hooks/set-state-in-effect` proíbe, com razão: seria um
 *  render a mais só para zerar algo que dá para calcular). */
interface CostEntry {
  key: string
  value: CampaignCostEstimate | null
}

export function useCostEstimate(audience: AudienceDraft | null, templateId?: string) {
  const [entry, setEntry] = useState<CostEntry | null>(null)
  /** `false` = endpoint não implantado; quem mostra deve esconder o bloco. */
  const [available, setAvailable] = useState(true)

  // Serializado, o pedido é estável mesmo quando o `AudienceBlock` recria o
  // objeto a cada render (mesma razão da comparação estrutural em
  // useComposerDraft).
  const request = buildRequest(audience, templateId)
  const requestKey = request ? JSON.stringify(request) : null

  useEffect(() => {
    if (!requestKey) return
    // `let` do efeito, e nao `useRef`: o ref e' UM so' para todas as rodadas,
    // entao a rodada nova zerava a marca que a rodada velha tinha deixado, e
    // uma resposta atrasada da chave antiga voltava a escrever por cima —
    // travando o custo em "calculando..." para sempre (achado do Calibre no
    // #130). Cada rodada precisa da propria marca.
    let stale = false

    const timer = setTimeout(() => {
      withFallback(
        () => campaignSchedulingApi.costEstimate(JSON.parse(requestKey) as CampaignCostEstimateRequest),
        null,
      )
        .then((res) => {
          if (stale) return
          setAvailable(res.available)
          setEntry({ key: requestKey, value: res.available && res.data ? res.data.data : null })
        })
        .catch(() => {
          // 401/403/500/rede: não é "recurso inexistente". Guarda a chave
          // com valor nulo para não repetir a chamada em loop e para não
          // mostrar um preço velho ao lado de um público novo.
          if (!stale) setEntry({ key: requestKey, value: null })
        })
    }, DEBOUNCE_MS)

    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [requestKey])

  const estimate = entry && entry.key === requestKey ? entry.value : null
  const loading = requestKey !== null && entry?.key !== requestKey

  return { estimate, loading, available }
}

/** Monta o corpo na forma que o contrato aceita: segmento salvo por id, ou
 *  os grupos inline. Sem template escolhido não há preço por mensagem, então
 *  não há o que perguntar. */
function buildRequest(audience: AudienceDraft | null, templateId?: string): CampaignCostEstimateRequest | null {
  if (!audience || !templateId) return null
  if (audience.segmentId) return { segmentId: audience.segmentId, templateId }
  return { groups: audience.definition.groups, exclude: audience.definition.exclude, templateId }
}
