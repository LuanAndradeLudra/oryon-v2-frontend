import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/services/api'
import { formatActivity, pickActivityType } from '@/components/dashboard/activityFormatter'
import { montarSnapshot } from '@/lib/snapshotDoPainel'
import { juntarMetricasDoNegocio, type MetricaDoCatalogo, type RespostaDasMetricas, type RespostaDoCatalogo } from '@/lib/metricasDoNegocio'
import type { ActivityEvent, DashboardSnapshot } from '@/types/dashboard'
import { chaveDoPeriodo, paramsDoPeriodo, periodoDoEco, periodoIncluiHoje, type Periodo } from '@/lib/periodoDoPainel'
import { connectSocket } from '@/services/socket'
import type { HomeStats } from '@/types'

// Row shape returned by GET /activity-feed (mirrors the public shape from
// backend/src/modules/activity/activity.service.ts). The `metadata` bag
// carries the row's `details` JSONB plus enrichments resolved at request time
// (userName, tagName); both go to the formatter.
interface ActivityFeedApiRow {
  id: string
  type: string
  timestamp: string
  actor: string
  subject: string
  summary: string
  metadata?: Record<string, unknown>
}

/**
 * Linhas cruas → `ActivityEvent`. Ícone por `pickActivityType` (genérico para
 * ação desconhecida) e frase por `formatActivity`, que já traz o ator —
 * `subject` guarda a frase inteira.
 */
function mapActivityFeed(rows: ActivityFeedApiRow[]): ActivityEvent[] {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    const rawActorType = typeof r.metadata?.actorType === 'string' ? r.metadata.actorType : ''
    const actorType =
      rawActorType === 'user' ? 'user' as const :
      rawActorType === 'agent' ? 'agent' as const :
      'system' as const
    // Sem nome resolvido para linha de agente (lookup cruzado com agent_configs
    // não existe): "Agente IA", nunca "Sistema" para ação do bot.
    const actorName = r.actor || (actorType === 'agent' ? 'Agente IA' : 'Sistema')
    return {
      id: r.id,
      type: pickActivityType(r.type),
      actorName,
      actorType,
      subject: formatActivity({ action: r.type, subject: r.subject, details: r.metadata }),
      timestamp: r.timestamp,
    }
  })
}

/**
 * PL-C4-FAR-1: teto próprio de 15 s, independente do interceptor de
 * services/api.ts (uma tentativa; o retry de timeout já saiu no PL-C3-FAR-1).
 */
const TETO_MS = 15_000

/**
 * Tempo real da aba (06/11): o backend avisa `metricas:mudou` (só a versão,
 * nenhum número) e guarda a conta por versão, refeita no máximo a cada 30 s.
 * A aba relê no mesmo ritmo: no máximo uma vez a cada 30 s.
 */
export const EVENTO_METRICAS = 'metricas:mudou'
export const MIN_ENTRE_RECARGAS_AO_VIVO_MS = 30_000

function comTeto<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('dashboard-fetch-timeout')), TETO_MS)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

export interface RelatoriosDoPainel {
  /** O último snapshot bom — de `periodoCarregado`, que pode não ser o pedido. */
  snapshot: DashboardSnapshot | null
  periodoCarregado: Periodo | null
  /** O período que o backend diz ter calculado (`period`), do mesmo snapshot; `null` sem eco. */
  periodoDaResposta: Periodo | null
  atividade: ActivityEvent[]
  /** Nenhum dado ainda (primeira carga). */
  carregando: boolean
  /** Buscando outro período (ou recarregando) com dado antigo na tela. */
  atualizando: boolean
  /** A busca do período pedido falhou. */
  erro: boolean
  /** Mensagem do backend quando ele recusa o período (422), para o aviso. */
  mensagemDoErro: string | null
  /** Sem comparação: o ano anterior é de antes de a conta existir (`previousReason`). */
  semComparacao: boolean
  atualizadoEm: Date | null
  recarregar: () => void
  /** SCRUM-1465: o catálogo das métricas do negócio já respondeu (a faixa salva só é gravada depois — A20). */
  catalogoPronto: boolean
}

/**
 * Dados da aba Relatórios por período (28/09).
 *
 * - O período vai em `?range=` para `/home/stats` e `/home/snapshot`; trocar
 *   de período refaz só essas leituras. A atividade (janela fixa de 4 h) é
 *   outra leitura, feita ao abrir e no "atualizar".
 * - SCRUM-1465: as métricas do negócio são uma leitura À PARTE, com estado e
 *   teto próprios — uma métrica lenta nunca derruba a aba (A3). O catálogo
 *   (`/home/metrics/catalog`, que não calcula nada) vem ao abrir: com ele, se
 *   `/home/metrics` falhar, os cards do negócio aparecem em erro e nunca voltam
 *   calados ao card fixo de antes (A2). O pedido anterior é cancelado quando o
 *   período muda (A41).
 * - Só a resposta mais recente vale: trocar de "7 dias" para "Hoje" e de
 *   volta rápido não deixa uma resposta velha sobrescrever a nova.
 * - Trocando de período, o dado anterior fica na tela (esmaecido) até o novo
 *   chegar — nada de piscar o esqueleto a cada clique.
 * - Falha: sem dado nenhum, a tela de erro; com dado anterior, ele fica e um
 *   aviso diz qual período está à vista (nunca zera nada).
 */
export function useRelatoriosDoPainel(periodoPedido: Periodo, podeVerAtividade = true): RelatoriosDoPainel {
  // O objeto muda a cada render; a chave é o que identifica o período.
  const chave = chaveDoPeriodo(periodoPedido)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const periodo = useMemo(() => periodoPedido, [chave])
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [periodoCarregado, setPeriodoCarregado] = useState<Periodo | null>(null)
  const [atividade, setAtividade] = useState<ActivityEvent[]>([])
  const [erroDoPeriodo, setErroDoPeriodo] = useState<string | null>(null)
  const [mensagemDoErro, setMensagemDoErro] = useState<string | null>(null)
  const [periodoDaResposta, setPeriodoDaResposta] = useState<Periodo | null>(null)
  const [semComparacao, setSemComparacao] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [recarregando, setRecarregando] = useState(false)
  const seq = useRef(0)
  /** Fim da última leitura boa do período (base da janela de 30 s do tempo real). */
  const ultimaLeitura = useRef(0)
  const vivo = useRef(true)
  // Métricas do negócio: catálogo (uma vez) e valores por período, com o próprio cancelamento.
  const [catalogo, setCatalogo] = useState<MetricaDoCatalogo[] | null>(null)
  const [negocio, setNegocio] = useState<{ chave: string; resposta: RespostaDasMetricas | null } | null>(null)
  const pedidoDoNegocio = useRef<AbortController | null>(null)

  const buscarNegocio = useCallback(async (p: Periodo) => {
    pedidoDoNegocio.current?.abort()
    const params = paramsDoPeriodo(p, { comparar: 'ano' })
    const ctl = new AbortController()
    pedidoDoNegocio.current = ctl
    try {
      const { data } = await comTeto(api.get<RespostaDasMetricas>('/home/metrics', { params, signal: ctl.signal }))
      if (vivo.current && !ctl.signal.aborted) setNegocio({ chave: chaveDoPeriodo(p), resposta: data ?? null })
    } catch (err) {
      if (!vivo.current || ctl.signal.aborted) return
      console.warn('[Dashboard/Relatórios] métricas do negócio indisponíveis:', err)
      setNegocio({ chave: chaveDoPeriodo(p), resposta: null })
    } finally {
      if (pedidoDoNegocio.current === ctl) ctl.abort()
    }
  }, [])

  useEffect(() => {
    let ativo = true
    api.get<RespostaDoCatalogo>('/home/metrics/catalog')
      .then(({ data }) => { if (ativo) setCatalogo(Array.isArray(data?.metricas) ? data.metricas : []) })
      .catch(() => { if (ativo) setCatalogo([]) })
    return () => { ativo = false }
  }, [])

  const buscarPeriodo = useCallback(async (p: Periodo) => {
    const minha = ++seq.current
    const params = paramsDoPeriodo(p, { comparar: 'sempre' })
    try {
      const [{ data: db }, { data: stats }] = await comTeto(Promise.all([
        api.get('/home/snapshot', { params }),
        api.get<HomeStats>('/home/stats', { params }),
      ]))
      if (!vivo.current || minha !== seq.current) return
      setSnapshot(montarSnapshot(stats, db))
      // O rótulo sai do período que o backend diz ter calculado (`period`, só
      // nos pedidos novos); sem eco, vale o pedido.
      const eco = (stats as { period?: { previousReason?: string | null } } | null)?.period
      setPeriodoCarregado(p)
      setPeriodoDaResposta(periodoDoEco(eco))
      setSemComparacao(eco?.previousReason === 'before_account')
      setErroDoPeriodo(null)
      setMensagemDoErro(null)
      setAtualizadoEm(new Date())
      ultimaLeitura.current = Date.now()
    } catch (err) {
      if (!vivo.current || minha !== seq.current) return
      console.error('[Dashboard/Relatórios] busca do período falhou:', err)
      setErroDoPeriodo(chaveDoPeriodo(p))
      // 422 validation_failed: o backend diz o que há de errado com o período.
      const resp = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response
      setMensagemDoErro(resp?.status === 422 && typeof resp.data?.message === 'string' ? resp.data.message : null)
    } finally {
      if (vivo.current && minha === seq.current) setRecarregando(false)
    }
  }, [])

  const buscarAtividade = useCallback(async () => {
    // GET /activity-feed é só de administrador: sem permissão, nem pede
    // (antes pedia e engolia o 403 — o cartão ficava vazio sem dizer por quê).
    if (!podeVerAtividade) return
    const desde = new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    try {
      const { data } = await api.get<{ data: ActivityFeedApiRow[] }>('/activity-feed', { params: { since: desde, limit: 100 } })
      if (vivo.current) setAtividade(mapActivityFeed(data?.data ?? []))
    } catch {
      // A atividade é complementar: sem ela o cartão mostra o vazio dele.
    }
  }, [podeVerAtividade])

  useEffect(() => {
    vivo.current = true
    void buscarAtividade()
    return () => { vivo.current = false }
  }, [buscarAtividade])

  useEffect(() => { void buscarPeriodo(periodo) }, [periodo, buscarPeriodo])

  // Tempo real: `metricas:mudou` relê o período em silêncio (sem esmaecer),
  // no máximo uma vez a cada 30 s — um aviso dentro da janela agenda UMA
  // recarga para o fim dela. Aba escondida só marca; ao voltar, relê.
  // Período que não inclui hoje (mês anterior, personalizado no passado)
  // nunca muda: o aviso é ignorado.
  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined
    let pendente = false
    const escondida = () => document.visibilityState !== 'visible'
    const reler = () => {
      espera = undefined
      void buscarPeriodo(periodo)
      void buscarNegocio(periodo)
    }
    const agendar = () => {
      if (espera !== undefined) return
      const falta = MIN_ENTRE_RECARGAS_AO_VIVO_MS - (Date.now() - ultimaLeitura.current)
      if (falta <= 0) reler()
      else espera = setTimeout(reler, falta)
    }
    const aoMudar = () => {
      if (!periodoIncluiHoje(periodo)) return
      if (escondida()) { pendente = true; return }
      agendar()
    }
    const aoVoltar = () => {
      if (escondida() || !pendente) return
      pendente = false
      agendar()
    }
    const socket = connectSocket()
    socket.on(EVENTO_METRICAS, aoMudar)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      clearTimeout(espera)
      socket.off(EVENTO_METRICAS, aoMudar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [periodo, buscarPeriodo, buscarNegocio])
  useEffect(() => { void buscarNegocio(periodo) }, [periodo, buscarNegocio])
  useEffect(() => () => pedidoDoNegocio.current?.abort(), [])

  const recarregar = useCallback(() => {
    setRecarregando(true)
    void buscarPeriodo(periodo)
    void buscarNegocio(periodo)
    void buscarAtividade()
  }, [periodo, buscarPeriodo, buscarNegocio, buscarAtividade])

  // O cartão do negócio só mostra valor do MESMO período dos fixos à vista; senão, "carregando".
  const snapshotComNegocio = useMemo(() => {
    if (!snapshot) return null
    const doMesmoPeriodo = negocio && periodoCarregado && negocio.chave === chaveDoPeriodo(periodoCarregado) ? negocio : null
    const kpis = juntarMetricasDoNegocio(snapshot.kpis, doMesmoPeriodo?.resposta ?? null, catalogo ?? [], doMesmoPeriodo ? 'erro' : 'carregando')
    return kpis === snapshot.kpis ? snapshot : { ...snapshot, kpis }
  }, [snapshot, negocio, periodoCarregado, catalogo])

  const erro = erroDoPeriodo === chave
  const carregadoEhOPedido = !!periodoCarregado && chaveDoPeriodo(periodoCarregado) === chave
  return {
    catalogoPronto: catalogo !== null,
    snapshot: snapshotComNegocio,
    periodoCarregado,
    periodoDaResposta,
    atividade,
    carregando: !snapshot && !erro,
    atualizando: recarregando || (!!snapshot && !carregadoEhOPedido && !erro),
    erro,
    mensagemDoErro,
    semComparacao,
    atualizadoEm,
    recarregar,
  }
}
