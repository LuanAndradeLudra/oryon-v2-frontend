// ─── useAudiencePreview ────────────────────────────────────────────────────
// Lista paginada de quem vai receber — o "ver os N" do público. Entregue
// pronto para a D2 plugar no `ContactListModal` (dono: Alavanca), que hoje
// filtra em memória um array de contatos já carregado e passa a receber
// itens paginados por props.
//
// Caminho feliz: `POST /campaigns/segments/preview` (BE.3, Decisão D26 —
// separado do `evaluate`, que fica com uma amostra pequena).
// Sem BE.3 (404/501): `campaignsApi.previewSegment` sobre o `CampaignSegment`
// legado, que já existe e já pagina, com o mesmo shape de resposta.
//
// `total` é sempre o número de elegíveis (pós-exclusões), não o de quem
// atende às condições — a lista é sobre quem realmente vai receber.
import { useEffect, useState } from 'react'
import { campaignsApi } from '@/services/api'
import { segmentsApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import type { SegmentPreviewResponse } from '@/types/campaignsV2'
import { toLegacySegment } from './legacyMapping'
import { hasAnyCondition, toEvaluateGroups, type AudienceDefinition } from './segmentBuilder'

export interface UseAudiencePreviewResult extends SegmentPreviewResponse {
  loading: boolean
  error: string | null
  /** `false` = respondido pelo motor antigo (sem grupos nem exclusões). */
  available: boolean
}

const EMPTY: SegmentPreviewResponse = { data: [], total: 0, page: 1, limit: 50 }

export function useAudiencePreview(
  definition: AudienceDefinition,
  { page = 1, limit = 50 }: { page?: number; limit?: number } = {},
): UseAudiencePreviewResult {
  const [response, setResponse] = useState<SegmentPreviewResponse>(EMPTY)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payload = JSON.stringify({ groups: toEvaluateGroups(definition), exclude: definition.exclude })
  const empty = !hasAnyCondition(definition)

  useEffect(() => {
    if (empty) {
      setResponse({ ...EMPTY, page, limit })
      setError(null)
      // Sem isto o `loading` fica preso em `true` para sempre quando a
      // definição esvazia com requisição em voo: a limpeza do efeito anterior
      // marca `cancelled`, o `finally` dele desiste do `setLoading(false)`, e
      // este ramo sai antes de ligar qualquer coisa. O modal ficaria girando
      // sobre uma lista vazia sem nada pendente.
      setLoading(false)
      return
    }

    let cancelled = false
    const body = JSON.parse(payload) as { groups: ReturnType<typeof toEvaluateGroups>; exclude: AudienceDefinition['exclude'] }

    setLoading(true)
    setError(null)

    withFallback(
      () => segmentsApi.preview({ ...body, page, limit }).then((r) => r.data),
      null as SegmentPreviewResponse | null,
    )
      .then(async ({ data, available: hasEndpoint }) => {
        if (hasEndpoint && data) return { page: data, hasEndpoint: true }
        const legacy = toLegacySegment(definition)
        const res = await campaignsApi.previewSegment(legacy.segment, page, limit)
        return { page: res.data, hasEndpoint: false }
      })
      .then(({ page: pageData, hasEndpoint }) => {
        if (cancelled) return
        setResponse(pageData)
        setAvailable(hasEndpoint)
      })
      .catch(() => {
        if (cancelled) return
        // Lista desconhecida, não lista vazia: o modal mostra o erro em vez
        // de "nenhum contato", que faria o operador achar que o público some.
        setResponse({ ...EMPTY, page, limit })
        setError('Não foi possível carregar os contatos deste público.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // `definition` entra pelo `payload` serializado (e pelo mapeamento do
    // fallback, que lê a mesma definição daquele instante).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, empty, page, limit])

  return { ...response, loading, error, available }
}
