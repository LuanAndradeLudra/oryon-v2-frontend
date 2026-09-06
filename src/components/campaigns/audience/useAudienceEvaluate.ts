// ─── useAudienceEvaluate ───────────────────────────────────────────────────
// Avalia a definição corrente: quantos atendem, quantos sobram depois das
// exclusões, quanto cada condição contribui e uma amostra de contatos.
//
// Caminho feliz: `POST /campaigns/segments/evaluate` (BE.3).
// Sem BE.3 no ar (404/501): cai para `campaignsApi.countSegment` sobre o
// `CampaignSegment` legado, via `withFallback` (W0.6). O fallback devolve só
// um total — não existe `perCondition`, `excluded` nem `within24h` no motor
// antigo — e `available: false`, que é o sinal para a UI degradar (1 grupo E,
// opt-out imposto, "Salvar segmento" oculto).
import { useEffect, useMemo, useRef, useState } from 'react'
import { campaignsApi } from '@/services/api'
import { segmentsApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import type { SegmentEvaluateResult } from '@/types/campaignsV2'
import { toLegacySegment } from './legacyMapping'
import { hasAnyCondition, toEvaluateGroups, type AudienceDefinition } from './segmentBuilder'

export interface AudienceEvaluation extends SegmentEvaluateResult {
  /** `false` = respondido pelo motor antigo; a UI esconde o que ele não sabe. */
  available: boolean
}

export interface UseAudienceEvaluateResult {
  result: AudienceEvaluation | null
  loading: boolean
  error: string | null
  /** Ids de condições que o motor antigo não representa (só no fallback). */
  unsupported: string[]
}

const SAMPLE_SIZE = 4
const DEBOUNCE_MS = 400

/** Resposta vazia do fallback: o motor antigo devolve um total e nada mais.
 *  Zerar (em vez de inventar) mantém a UI honesta — a coluna viva esconde os
 *  blocos que dependem do que não veio. */
function legacyEvaluation(total: number): AudienceEvaluation {
  return {
    matched: total,
    eligible: total,
    excluded: { optOut: 0, recentlyCampaigned: 0, activeAi: 0 },
    perCondition: [],
    within24h: 0,
    sample: [],
    available: false,
  }
}

export function useAudienceEvaluate(definition: AudienceDefinition): UseAudienceEvaluateResult {
  const [result, setResult] = useState<AudienceEvaluation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unsupported, setUnsupported] = useState<string[]>([])

  // Serializar a definição é o gatilho certo: o que importa é o que vai para
  // a API, não a identidade do objeto (que muda a cada tecla no editor).
  const groups = useMemo(() => toEvaluateGroups(definition), [definition])
  const payload = useMemo(
    () => JSON.stringify({ groups, exclude: definition.exclude }),
    [groups, definition.exclude],
  )
  const empty = !hasAnyCondition(definition)

  // Cada avaliação recebe um número; respostas de pedidos antigos que chegam
  // atrasadas são descartadas, senão a contagem exibida pisca para trás e o
  // `perCondition` casa com uma definição que não está mais na tela.
  const requestRef = useRef(0)

  useEffect(() => {
    if (empty) {
      setResult(null)
      setUnsupported([])
      setError(null)
      setLoading(false)
      return
    }

    const requestId = ++requestRef.current
    const body = JSON.parse(payload) as { groups: typeof groups; exclude: AudienceDefinition['exclude'] }
    let cancelled = false

    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)

      withFallback(
        () => segmentsApi.evaluate({ ...body, sample: SAMPLE_SIZE }).then((r) => r.data),
        null as SegmentEvaluateResult | null,
      )
        .then(async ({ data, available }) => {
          if (available && data) return { evaluation: { ...data, available: true }, unsupported: [] as string[] }

          const legacy = toLegacySegment(definition)
          const count = await campaignsApi.countSegment(legacy.segment).then((r) => r.data.count)
          return { evaluation: legacyEvaluation(count), unsupported: legacy.unsupported }
        })
        .then(({ evaluation, unsupported: notMapped }) => {
          if (cancelled || requestId !== requestRef.current) return
          setResult(evaluation)
          setUnsupported(notMapped)
        })
        .catch(() => {
          if (cancelled || requestId !== requestRef.current) return
          // 401/403/500/rede: o público é desconhecido, não zero. Zerar aqui
          // faria a D2 liberar "Agendar" achando que o público está resolvido.
          setResult(null)
          setError('Não foi possível calcular o público agora.')
        })
        .finally(() => {
          if (!cancelled && requestId === requestRef.current) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // `definition` entra só pelo `payload` serializado (e pelo mapeamento do
    // fallback, que lê a mesma definição daquele instante).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, empty])

  return { result, loading, error, unsupported }
}
