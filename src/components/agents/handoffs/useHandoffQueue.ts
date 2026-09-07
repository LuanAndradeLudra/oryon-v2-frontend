// ─── Fila da caixa de transferências (A6 / SCRUM-1017) ───────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react'
import { handoffsApi } from '@/services/agentsOpsApi'
import { withFallback } from '@/services/withFallback'
import { conversationsApi } from '@/services/api'
import { listAgents } from '@/services/agentsApi'
import type { HandoffItem, HandoffStatus, HandoffSummary } from '@/types/agentsOps'
import type { Conversation, ConversationFilters } from '@/types'
import { maskPhone } from './handoffRow'

/** Intervalo da fila e do resumo — o mesmo que a A1 usa para live/feed. */
export const POLL_MS = 20_000
/** Tick do relógio do SLA. Só roda em `waiting`; ver `useRelogioSla`. */
export const TICK_MS = 1_000

export interface QueueState {
  itens: HandoffItem[]
  total: number
  resumo: HandoffSummary | null
  /**
   * `false` = BE.6 não está no ar e a fila veio do fallback de
   * `GET /conversations`. Liga o modo reduzido na tela inteira.
   */
  disponivel: boolean
  carregando: boolean
  erro: string | null
  /** id → nome, do rol do agent-server. Vazio se o agent-server estiver fora. */
  nomesDeAgente: Map<string, string>
  recarregar: () => void
}

/**
 * Converte uma conversa em `HandoffItem` para o **modo degradado**.
 *
 * O que este caminho NÃO pode fazer é fingir que tem o que não tem. Em
 * particular `slaSeconds: 0`, que o `sla()` lê como "sem SLA" e portanto não
 * pinta de vermelho: sem BE.6 não existe SLA nenhum, e inventar um faria a
 * tela acusar atraso que ninguém definiu.
 *
 * `waitingSeconds` aqui é `agora − lastMessageAt`, uma **aproximação** — não é
 * o mesmo número que o servidor daria. Por isso o banner de modo reduzido
 * avisa; silenciar seria mentir com número.
 */
export function conversaComoHandoff(c: Conversation, agora = Date.now()): HandoffItem {
  const desde = Date.parse(c.lastMessageAt ?? '')
  const espera = Number.isFinite(desde) ? Math.max(0, Math.floor((agora - desde) / 1000)) : 0
  return {
    id: `conv:${c.id}`,
    conversationId: c.id,
    contact: {
      id: c.contact?.id ?? '',
      name: c.contact?.displayName ?? 'Sem nome',
      phoneMasked: maskPhone(c.contact?.waId),
    },
    // Sem agente neste modo, e isto é um achado contra o plano: ele previa
    // resolver o agente por `conversation.whatsappNumber`, mas `WhatsAppNumber`
    // **não expõe `agentId`** no frontend (só `id`, `displayPhoneNumber`,
    // `label`, `status`, `isPrimary`, `isActive`). Sem o id não há o que
    // resolver, então a célula `via <agente>` degrada — que é o comportamento
    // honesto. Inventar o agente pela linha exigiria um endpoint que não existe.
    agent: { id: '', name: null },
    rule: { id: null, label: null },
    target: { type: null, id: null, label: null },
    intent: null,
    queue: '',                 // sem fila neste modo — a barra de chips some
    summary: null,
    waitingSeconds: espera,
    slaSeconds: 0,             // "sem SLA", não "SLA zero"
    createdAt: c.lastMessageAt ?? new Date(agora).toISOString(),
  }
}

/**
 * O que cada segmento SIGNIFICA quando o BE.6 não está no ar.
 *
 * Sem esta tradução o modo degradado pedia sempre a mesma coisa
 * (`aiHandling: 'paused'` + `status: 'open'`), e os três segmentos devolviam a
 * MESMA lista: "Resolvidas hoje" mostrava conversa que ainda esperava humano.
 * Segmento que não filtra não é um segmento — é um rótulo em cima da mesma
 * lista, e quem clica acredita nele.
 *
 * A fonte é `GET /conversations`, então a tradução é para o vocabulário dela:
 *   • aguardando   → IA pausada, conversa aberta e SEM responsável;
 *   • em atendimento → IA pausada, conversa aberta e COM responsável;
 *   • resolvidas   → IA pausada e conversa resolvida.
 *
 * "Em atendimento" não tem filtro de servidor que sirva: `assignedTo` aceita
 * `me`, `unassigned`, `all` ou um id — não existe "de qualquer um". Então este
 * caso pede a lista aberta e a peneira sai em `pertenceAoSegmento`.
 */
export function filtroDegradado(status: HandoffStatus): ConversationFilters {
  const base: ConversationFilters = { aiHandling: 'paused' }
  if (status === 'resolved') return { ...base, status: 'resolved' }
  if (status === 'waiting') return { ...base, status: 'open', assignedTo: 'unassigned' }
  return { ...base, status: 'open' }
}

/**
 * A MESMA regra, conferida na linha que voltou.
 *
 * Não é cinto e suspensório: o filtro do servidor é uma otimização para não
 * puxar a lista inteira, e quem define o segmento é esta função. Um backend que
 * ignore um filtro que não conhece devolveria linhas de fora — e sem esta
 * conferência elas entrariam na tela debaixo do rótulo errado, que é
 * exatamente o defeito que estamos consertando, só que mais difícil de ver.
 *
 * A REGRA É ASSIMÉTRICA DE PROPÓSITO, e a primeira versão desta função errou
 * justamente aqui — exigia `status === 'open'` também no "aguardando" e
 * ESVAZIAVA a tela quando a linha vinha sem o campo. Consertar um segmento
 * apagando os outros não é conserto.
 *
 * Quem afirma a MAIS, prova: "resolvidas" e "em atendimento" acrescentam um
 * fato sobre a conversa (foi resolvida; alguém assumiu) e só entram com esse
 * fato presente. "Aguardando" é o segmento BASE — o que sobra depois de tirar
 * o que comprovadamente está noutro lugar. Numa fonte degradada, campo ausente
 * é ignorância, não negação, e ignorância não pode apagar a fila.
 */
export function pertenceAoSegmento(c: Conversation, status: HandoffStatus): boolean {
  if (status === 'resolved') return c.status === 'resolved'
  if (status === 'claimed') return c.status !== 'resolved' && !!c.assignedUser
  return c.status !== 'resolved' && !c.assignedUser
}

export function useHandoffQueue(status: HandoffStatus, queue?: string): QueueState {
  const [itens, setItens] = useState<HandoffItem[]>([])
  const [total, setTotal] = useState(0)
  const [resumo, setResumo] = useState<HandoffSummary | null>(null)
  const [disponivel, setDisponivel] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [nomesDeAgente, setNomesDeAgente] = useState<Map<string, string>>(new Map())
  const [gatilho, setGatilho] = useState(0)

  const recarregar = useCallback(() => setGatilho((n) => n + 1), [])

  // O rol de agentes resolve o id→nome que o backend deliberadamente não manda
  // (D36). Carrega uma vez: é lista curta e não muda durante o plantão.
  useEffect(() => {
    let vivo = true
    listAgents()
      .then((agentes) => {
        if (!vivo) return
        setNomesDeAgente(new Map(agentes.map((a) => [a.id, a.name])))
      })
      // O agent-server fora não pode derrubar a caixa: sem o rol a célula
      // "via <agente>" degrada para o resto do texto, e só.
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    let vivo = true

    async function buscar() {
      try {
        const lista = await withFallback(
          () => handoffsApi.list({ status, queue, page: 1, limit: 20 }).then((r) => r.data),
          { items: [], total: 0 },
        )
        if (!vivo) return

        if (lista.available) {
          setItens(lista.data.items)
          setTotal(lista.data.total)
          setDisponivel(true)
          const resu = await withFallback(() => handoffsApi.summary().then((r) => r.data), null)
          if (vivo) setResumo(resu.available ? resu.data : null)
        } else {
          // Modo degradado. `aiHandling: 'paused'` é a definição de "um humano
          // assumiu ou a conversa foi transferida" — NÃO uso `needsReview`,
          // que é bem mais estreito (só o phantom-confirmation handoff) e que
          // o backend combina com AND, devolvendo uma fatia da fila em vez da
          // fila.
          const conversas = await conversationsApi.list(filtroDegradado(status), 1, 20)
          if (!vivo) return
          const agora = Date.now()
          const doSegmento = (conversas.data.data ?? []).filter((c) => pertenceAoSegmento(c, status))
          const linhas = [...doSegmento]
            .sort((a, b) => Date.parse(b.lastMessageAt ?? '') - Date.parse(a.lastMessageAt ?? ''))
            .map((c) => conversaComoHandoff(c, agora))
          setItens(linhas)
          // O total do servidor conta a resposta INTEIRA; depois da peneira ele
          // deixa de descrever o que está na tela. Só vale quando nada saiu.
          setTotal(doSegmento.length === (conversas.data.data ?? []).length
            ? (conversas.data.total ?? linhas.length)
            : linhas.length)
          setDisponivel(false)
          // Sem `summary` os KPIs somem inteiros. Derivá-los da página corrente
          // daria um número errado com cara de certo.
          setResumo(null)
        }
        setErro(null)
      } catch {
        if (vivo) setErro('Não foi possível carregar a fila agora.')
      } finally {
        if (vivo) setCarregando(false)
      }
    }

    buscar()
    const id = window.setInterval(() => {
      if (!document.hidden) buscar()
    }, POLL_MS)
    return () => { vivo = false; window.clearInterval(id) }
  }, [status, queue, gatilho])

  return { itens, total, resumo, disponivel, carregando, erro, nomesDeAgente, recarregar }
}

/**
 * Relógio do SLA. Devolve o "agora" em ms enquanto está correndo, e `0` quando
 * parado — quem consome recalcula a espera com `esperaAoVivo`.
 *
 * **Só corre em `waiting`.** Por BE.6, `waitingSeconds` é congelado assim que o
 * evento vira `claimed`/`resolved` — histórico não muda depois. Um contador
 * subindo nesses dois segmentos mostraria a espera crescendo para uma conversa
 * que já foi atendida.
 */
export function useRelogioSla(ativo: boolean): number {
  // Devolvo o RELÓGIO, não um deslocamento acumulado, e quem consome recalcula
  // a espera a partir do `createdAt` do próprio evento. Três coisas saem de
  // graça daí:
  //  • nada para zerar quando `ativo` muda — logo, nenhum `setState` síncrono
  //    no corpo do efeito (que dispara render em cascata e o lint proíbe);
  //  • nenhum ref lido no render (também proibido);
  //  • um valor obsoleto é só um relógio 1 s atrasado, que se corrige sozinho
  //    no tique seguinte — enquanto um deslocamento obsoleto carregaria a
  //    duração inteira da ativação anterior, que pode ser de minutos.
  const [agora, setAgora] = useState(0)

  useEffect(() => {
    if (!ativo) return
    const id = window.setInterval(() => {
      if (document.hidden) return
      setAgora(Date.now())
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [ativo])

  return ativo ? agora : 0
}

/**
 * A espera que a linha mostra: recalculada do `createdAt` quando o relógio
 * está correndo, e o número do servidor enquanto ele não deu o primeiro tique
 * (ou nos segmentos em que o valor é histórico e não deve mudar).
 */
export function esperaAoVivo(item: HandoffItem, agora: number): number {
  if (!agora) return item.waitingSeconds
  const desde = Date.parse(item.createdAt)
  if (!Number.isFinite(desde)) return item.waitingSeconds
  return Math.max(0, Math.floor((agora - desde) / 1000))
}

/**
 * Chips de fila a partir das filas presentes na página.
 *
 * Devolve lista vazia — e a barra some — quando `queue` não vem no item, que é
 * o estado enquanto o BE.6 não subir com a D30. Nunca chips vazios, nunca um
 * "Todas as filas" solo fingindo ser filtro.
 *
 * A contagem é **da página corrente**, então ela é omitida quando há mais de
 * uma página: número parcial com cara de total é exatamente o que não se quer.
 */
export function useChipsDeFila(itens: HandoffItem[], total: number) {
  return useMemo(() => {
    const comFila = itens.filter((i) => typeof i.queue === 'string' && i.queue !== '')
    if (comFila.length === 0) return { filas: [], mostrarContagem: false }
    const contagem = new Map<string, number>()
    for (const i of comFila) contagem.set(i.queue, (contagem.get(i.queue) ?? 0) + 1)
    return {
      filas: [...contagem.entries()]
        .map(([nome, n]) => ({ nome, n }))
        .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome)),
      mostrarContagem: total <= itens.length,
    }
  }, [itens, total])
}
