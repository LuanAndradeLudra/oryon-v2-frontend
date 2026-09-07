// ─── Fonte de dados da Agenda ──────────────────────────────────────────────
// A única porta de rede da tela. A D1b (Board, SCRUM-1019) consome este mesmo
// hook — as duas telas são a mesma fonte em disposições diferentes.
import { useCallback, useEffect, useRef, useState } from 'react'
import { campaignsPagedApi } from '@/services/campaignsV2Api'
import type { Campaign } from '@/types'

/**
 * Teto de paginação. `GET /campaigns` ordena por `createdAt DESC` e não aceita
 * recorte por data (campaigns.service.ts) — os dois eixos não coincidem com o
 * de uma agenda, que é a data de execução. Até a Onda 2 trazer
 * `?from=&to=&order=scheduledAt`, a tela lê as N campanhas mais recentes e
 * DIZ que é isso que está mostrando (`truncated`), em vez de fingir que o mês
 * está completo. Decisão 2 do Maestro (coord/D1-decisoes.md).
 */
export const PAGE_SIZE = 100
export const MAX_PAGES = 3

const POLL_ACTIVE_MS = 20_000
const POLL_IDLE_MS = 60_000
/**
 * Idade máxima de uma amostra que ainda serve para medir taxa: 2x o poll ocioso.
 * Acima disso o intervalo não é mais "entre dois tiques" — é uma aba que ficou
 * escondida, um laptop que dormiu ou uma rede que sumiu, e a divisão devolveria
 * a MÉDIA do buraco com a tipografia de uma taxa instantânea.
 */
const MAX_SAMPLE_AGE_MS = 2 * POLL_IDLE_MS

/** Taxa de envio medida entre dois polls, por campanha. */
export interface SendRate {
  /** Mensagens por segundo. */
  perSecond: number
}

interface Sample { sent: number; at: number }

export interface AgendaData {
  campaigns: Campaign[]
  loading: boolean
  error: unknown
  /** `true` quando o teto de páginas cortou a lista — a tela declara isso. */
  truncated: boolean
  /** Quantas campanhas o backend diz existir no total. */
  total: number
  /** Taxa medida por campanha em envio; vazia no primeiro tique. */
  rates: Map<string, SendRate>
  refresh: () => void
}

export function useAgendaCampaigns(): AgendaData {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [rates, setRates] = useState<Map<string, SendRate>>(new Map())

  const samples = useRef<Map<string, Sample>>(new Map())
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    // Um poll por vez: uma rede lenta não pode empilhar quatro varreduras de
    // 3 páginas em cima uma da outra.
    if (inFlight.current) return
    inFlight.current = true
    try {
      const collected: Campaign[] = []
      let page = 1
      let reportedTotal = 0
      let cut = false

      for (;;) {
        const res = await campaignsPagedApi.list({ page, limit: PAGE_SIZE })
        const body = res.data
        reportedTotal = body.total
        collected.push(...body.data)
        const done = collected.length >= body.total || body.data.length === 0
        if (done) break
        if (page >= MAX_PAGES) { cut = true; break }
        page += 1
      }

      setRates(measureRates(collected, samples.current, Date.now()))
      setCampaigns(collected)
      setTotal(reportedTotal)
      setTruncated(cut)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Cadência do polling: 20 s quando há envio em curso (o cartão "enviando"
  // mostra progresso e taxa medida), 60 s no resto. Mesma convenção que a A1
  // usa para live/pulse — o épico não precisa de dois dialetos de polling.
  const hasSending = campaigns.some((c) => c.status === 'sending')
  useEffect(() => {
    const interval = hasSending ? POLL_ACTIVE_MS : POLL_IDLE_MS
    const id = window.setInterval(() => {
      // Aba escondida não consome rede. A segunda metade do cuidado está no
      // `MAX_SAMPLE_AGE_MS` do `measureRates`: sem ele, o primeiro tique depois
      // de 40 min oculta dividiria o delta pelo intervalo inteiro e exibiria a
      // média do buraco como se fosse a taxa de agora.
      if (document.hidden) return
      void load()
    }, interval)
    return () => window.clearInterval(id)
  }, [hasSending, load])

  return { campaigns, loading, error, truncated, total, rates, refresh: load }
}

/**
 * Taxa = derivada entre duas leituras. Não é dado do backend (não existe
 * socket de campanha nem campo de throughput), mas também não é extrapolação:
 * é o que realmente saiu entre dois instantes conhecidos. Por isso a Agenda
 * mostra taxa e NÃO mostra tempo restante — decisão 6 do Maestro.
 */
export function measureRates(
  campaigns: Campaign[],
  samples: Map<string, Sample>,
  now: number,
): Map<string, SendRate> {
  const out = new Map<string, SendRate>()

  for (const c of campaigns) {
    if (c.status !== 'sending') { samples.delete(c.id); continue }
    const sent = c.stats?.sent ?? 0
    const prev = samples.get(c.id)
    samples.set(c.id, { sent, at: now })
    if (!prev) continue // primeiro tique: ainda não há intervalo para medir

    const seconds = (now - prev.at) / 1000
    const delta = sent - prev.sent
    if (seconds <= 0 || delta <= 0) continue // parada ou relógio estranho: some
    // A amostra nova já foi gravada acima, então descartar a velha custa UM
    // tique sem taxa e devolve a medida correta no seguinte — o mesmo
    // comportamento honesto que `delta <= 0` já tem.
    if (seconds * 1000 > MAX_SAMPLE_AGE_MS) continue
    out.set(c.id, { perSecond: delta / seconds })
  }

  return out
}
