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

/** O que a carga entrega. Fica no estado inteiro, não em campo por campo, para
 *  a tela nunca misturar a campanha de uma carga com o analytics de outra. */
interface DadosDoRelatorio {
  campaign: Campaign | null
  analytics: unknown
  recipientsAvailable: boolean
  recipientsTotal: number
}

/** Desfecho da carga identificada por `chave`. É o que permite derivar
 *  `loading` em vez de escrevê-lo — ver o comentário do efeito. */
interface DesfechoDaCarga {
  chave: string
  error: string | null
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
  const [dados, setDados] = useState<DadosDoRelatorio | null>(null)
  const [desfecho, setDesfecho] = useState<DesfechoDaCarga | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  // Identifica a carga corrente. `reload()` só incrementa o nonce; é a mudança
  // da chave que invalida o desfecho anterior.
  const chave = `${campaignId ?? ''}#${nonce}`

  // `loading` e `error` são DERIVADOS da chave, não escritos no corpo do
  // efeito. Um `setLoading(true)` síncrono ali dentro custa um render extra e
  // é o que a regra `react-hooks/set-state-in-effect` aponta; comparar a chave
  // dá o mesmo resultado no primeiro render, sem o render a mais.
  const liquidado = desfecho?.chave === chave
  const loading = Boolean(campaignId) && !liquidado
  const error = liquidado ? desfecho.error : null

  useEffect(() => {
    // Sem id não há o que carregar; esse caso é derivado no return, não
    // escrito aqui.
    if (!campaignId) return

    let cancelado = false

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
        setDados({
          campaign: campanha.data,
          analytics: analiticos.data,
          recipientsAvailable: destinatarios.available,
          recipientsTotal: destinatarios.data.total ?? 0,
        })
        setDesfecho({ chave, error: null })
      })
      .catch((err: unknown) => {
        if (cancelado) return
        // 401/403/500 e falha de rede chegam aqui — "o backend quebrou" não
        // pode ser confundido com "a feature ainda não existe". Os dados
        // anteriores ficam de pé: num reload que falha, a tela continua
        // mostrando o que já tinha, com o erro por cima.
        setDesfecho({ chave, error: mensagemDeErro(err) })
      })

    return () => {
      cancelado = true
    }
  }, [campaignId, chave])

  const model = useMemo(
    () => buildReportModel(dados?.campaign ?? null, dados?.analytics ?? null),
    [dados],
  )

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

  return {
    campaign: dados?.campaign ?? null,
    model,
    recipientsAvailable: dados?.recipientsAvailable ?? false,
    recipientsTotal: dados?.recipientsTotal ?? 0,
    loading,
    error,
    reload,
  }
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
