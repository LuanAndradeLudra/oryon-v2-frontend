import { useCallback, useEffect, useMemo, useState } from 'react'
import { campaignReportApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import { buildReportModel, type ReportViewModel } from './reportModel'
import type { Campaign } from '@/types'
import type { CampaignRecipientsResponse } from '@/types/campaignsV2'

const EMPTY_RECIPIENTS: CampaignRecipientsResponse = { data: [], total: 0, page: 1, limit: 0 }

interface UseCampaignReport {
  campaign: Campaign | null
  model: ReportViewModel
  /** `true` quando `GET /campaigns/:id/recipients` respondeu (BE.1 no ar). */
  recipientsAvailable: boolean
  recipientsTotal: number
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Carrega o relatório e decide em qual dos dois mundos estamos.
 *
 * Este hook é o ÚNICO lugar que sabe que existem dois mundos — os componentes
 * de apresentação recebem sempre o mesmo view-model. Quando a Onda 2 religar
 * tudo, some o ramo de fallback e nada mais muda.
 *
 * As duas detecções são diferentes de propósito:
 *
 * - **analytics** → por FORMA (`hasExtendedAnalytics`). A rota responde 200
 *   nos dois mundos: hoje devolve `{ campaignId, campaignName, stats, sentAt }`
 *   e com a BE.1 devolve `funnel`/`readHeatmap`/`failures`/`replies`. Não há
 *   erro nenhum para `withFallback` capturar.
 * - **recipients** → por STATUS (`withFallback`). Essa rota 404 de verdade
 *   enquanto a BE.1 não subir.
 */
export function useCampaignReport(campaignId: string | undefined): UseCampaignReport {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<unknown>(null)
  const [recipientsAvailable, setRecipientsAvailable] = useState(false)
  const [recipientsTotal, setRecipientsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    // Sem id não há o que carregar; o estado desse caso é derivado no return,
    // não escrito aqui — `setState` no corpo do efeito para uma condição que
    // já dá para calcular só produz um render a mais.
    if (!campaignId) return

    let cancelado = false
    setLoading(true)
    setError(null)

    Promise.all([
      campaignReportApi.getCampaign(campaignId),
      campaignReportApi.getAnalyticsV2(campaignId),
      // Só o total: a lista paginada é carregada pela aba Contatos, que tem
      // filtro e página próprios. Aqui a chamada serve para saber se a rota
      // existe e para o contador do segmented.
      withFallback(
        () => campaignReportApi.getRecipients(campaignId, { limit: 1 }).then((r) => r.data),
        EMPTY_RECIPIENTS,
      ),
    ])
      .then(([campanha, analiticos, destinatarios]) => {
        if (cancelado) return
        setCampaign(campanha.data)
        setAnalytics(analiticos.data)
        setRecipientsAvailable(destinatarios.available)
        setRecipientsTotal(destinatarios.data.total ?? 0)
      })
      .catch((err: unknown) => {
        if (cancelado) return
        // 401/403/500 e falha de rede chegam aqui — "o backend quebrou" não
        // pode ser confundido com "a feature ainda não existe".
        setError(mensagemDeErro(err))
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [campaignId, nonce])

  const model = useMemo(() => buildReportModel(campaign, analytics), [campaign, analytics])

  if (!campaignId) {
    return {
      campaign: null,
      model,
      recipientsAvailable: false,
      recipientsTotal: 0,
      loading: false,
      error: 'Campanha não informada.',
      reload,
    }
  }

  return { campaign, model, recipientsAvailable, recipientsTotal, loading, error, reload }
}

function mensagemDeErro(err: unknown): string {
  const status =
    typeof err === 'object' && err !== null
      ? (err as { response?: { status?: number } }).response?.status
      : undefined
  if (status === 404) return 'Campanha não encontrada.'
  if (status === 403) return 'Você não tem acesso a esta campanha.'
  return 'Não foi possível carregar o relatório.'
}
