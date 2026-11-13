import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, conversationsApi, usersApi, whatsappNumbersApi, type AvailableUser } from '@/services/api'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { connectSocket } from '@/services/socket'
import { calcularLinhasComIA, montarFila, type ItemDaFila, type LinhasComIA } from '@/lib/filaAgora'
import type { Conversation, ConversationFilters, WhatsAppNumberDetailed } from '@/types'

/** Recarga periódica (decisão do PO: o painel atualiza sozinho a cada minuto). */
const RECARGA_MS = 60_000
/**
 * Revisão 02/10: cada `message:new`/`conversation:*` disparava, com 1 s de
 * respiro, a carga inteira (15–25 requisições). Num tenant com mensagem a cada
 * 2–3 s isso virava uma rajada contínua por aba aberta. Agora: no máximo uma
 * carga em voo, com pelo menos este intervalo entre cargas puxadas por evento,
 * e nada enquanto a aba está escondida (recarrega ao voltar).
 */
export const MIN_ENTRE_RECARGAS_MS = 5_000
/** A espera exibida anda sem recarregar: recalcula a cada 30 s. */
const RELOGIO_MS = 30_000
/**
 * A fila lê as PENDENTES (a mesma base da aba "Fila" da inbox), em páginas de
 * 100 (teto do backend), até este número de páginas; a ordem pela espera é
 * feita aqui (o servidor só ordena pela mais recente — P1 do SCRUM-1161).
 */
export const POR_PAGINA_DA_FILA = 100
const MAX_PAGINAS_DA_FILA = 5
/** Quantas conversas "precisam de verificação" o painel lê de uma vez. */
export const LIMITE_DA_VERIFICACAO = 50

const EVENTOS = [
  'message:new',
  'conversation:new',
  'conversation:assigned',
  'conversation:updated',
  'conversation:resolved',
  'conversation:ai-pause-updated',
  'conversation:status-updated',
  'conversation:handoff',
] as const

/**
 * Contagens EXATAS do servidor (28/09). As listas têm teto de carga; contar
 * só o que carregou dava números diferentes da inbox (o Dashboard mostrou
 * "173 sem dono" com 332 na aba Fila). Cada número aqui é o total de uma
 * consulta do próprio servidor — o mesmo que a aba Fila mostra.
 */
export interface TotaisDaFila {
  /** Pendentes sem dono + pendentes com dono sem resposta humana — só as ATIVAS (auditoria 12/11). */
  esperando: number
  /** Ninguém assumiu (pendente sem dono, ativa). */
  semDono: number
  /** Alguém assumiu e ainda não respondeu. `semDono + comDonoSemResposta = esperando`. */
  comDonoSemResposta: number
  /** Esperando, mas sem mensagem do paciente há mais de `horizonteDias` (fora da fila). */
  paradas: number
  horizonteDias: number
}

/** Auditoria do Dashboard (12/11): o `/home/queue` — a fila só com as conversas ativas. */
interface FilaDoServidor {
  horizonteDias?: number
  esperando: number
  semDono: number
  comDonoSemResposta?: number
  paradas?: number
  maiorEsperaMin: number | null
  janelaFechando: number
  janelaFechada: number
  itens?: Array<{ id: string; desde: string; semDono: boolean }>
}

/** Horizonte padrão quando o servidor não diz (backend antigo). */
export const HORIZONTE_PADRAO_DIAS = 7

/**
 * Revisão das métricas (30/09, M5): `GET /home/queue` — calculado no servidor
 * sobre a fila INTEIRA (a lista acima tem teto e vem pela mais recente, então
 * a maior espera ficava de fora). A espera conta da última mensagem do CLIENTE.
 */
export interface ResumoDaFila {
  maiorEsperaMin: number | null
  janelaFechando: number
  janelaFechada: number
  /** Quando foi lido — a espera anda com o relógio do painel. */
  lidoEm: number
}

export interface DashboardAgora {
  fila: ItemDaFila[]
  /** null até a primeira leitura. */
  totais: TotaisDaFila | null
  /** Resumo do servidor (maior espera, janelas); null se a leitura falhou. */
  resumo: ResumoDaFila | null
  /** O backend tinha mais conversas aguardando do que a fila leu. */
  filaTruncada: boolean
  equipe: AvailableUser[]
  /** `null` = o servidor de agentes não respondeu (não é "nenhum agente"). */
  agentes: AgentConfig[] | null
  linhas: WhatsAppNumberDetailed[]
  linhasComIA: LinhasComIA
  /**
   * Conversas em que a IA disse ter feito algo que o sistema não confirmou
   * (`agent_phantom_confirmation_handoff`, SCRUM-806) e ninguém verificou
   * ainda. É o mesmo filtro "Precisam de verificação" da inbox.
   */
  verificar: Conversation[]
  /** Total no backend (pode passar do que foi lido). */
  verificarTotal: number
  carregando: boolean
  erro: boolean
  atualizadoEm: Date | null
  recarregar: () => void
  /** Relógio do painel (anda a cada 30 s) — para os tempos relativos. */
  agora: number
}

/** As pendentes com mensagem nos últimos `dias` (a base da fila; o servidor diz quais esperam). */
function pendentesAtivas(dias: number): ConversationFilters {
  return { status: 'pending', startDate: new Date(Date.now() - dias * 86_400_000).toISOString() } as ConversationFilters
}

/** Todas as conversas de um filtro (até MAX_PAGINAS_DA_FILA páginas). */
async function lerTodas(filtros: ConversationFilters): Promise<{ lista: Conversation[]; truncada: boolean }> {
  const lista: Conversation[] = []
  let pagina = 1
  let temMais = true
  while (temMais && pagina <= MAX_PAGINAS_DA_FILA) {
    const { data } = await conversationsApi.list(filtros, pagina, POR_PAGINA_DA_FILA)
    const itens = Array.isArray(data?.data) ? data.data : []
    for (const c of itens) if (!lista.some((x) => x.id === c.id)) lista.push(c)
    temMais = !!data?.hasMore
    pagina += 1
  }
  return { lista, truncada: temMais }
}

/**
 * Dados da aba "Agora" do Dashboard (direção A). Leituras que já existiam no
 * backend e a tela não usava: as pendentes (a base da aba "Fila" da inbox), a presença e a
 * carga da equipe (`/users/available`), as linhas com o agente de cada uma
 * (`/whatsapp/numbers`) e os agentes de IA.
 *
 * Ao vivo: recarrega a cada minuto e, com um respiro de 1 s, a cada evento de
 * conversa (mensagem nova, atribuição, a IA passar para a equipe…). Presença
 * não tem evento no backend (P3 do SCRUM-1161) — entra na recarga do minuto.
 */
export function useDashboardAgora(): DashboardAgora {
  const [conversas, setConversas] = useState<Conversation[]>([])
  const [desdePorId, setDesdePorId] = useState<ReadonlyMap<string, string> | undefined>(undefined)
  const [filaTruncada, setFilaTruncada] = useState(false)
  const [totais, setTotais] = useState<TotaisDaFila | null>(null)
  const [resumo, setResumo] = useState<ResumoDaFila | null>(null)
  const [equipe, setEquipe] = useState<AvailableUser[]>([])
  const [agentes, setAgentes] = useState<AgentConfig[] | null>(null)
  const [linhas, setLinhas] = useState<WhatsAppNumberDetailed[]>([])
  const [verificar, setVerificar] = useState<Conversation[]>([])
  const [verificarTotal, setVerificarTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const vivo = useRef(true)
  const geracao = useRef(0)

  const carregar = useCallback(async () => {
    // LOG-FE-01: só a carga mais nova pode publicar o estado do painel.
    const minhaGeracao = ++geracao.current
    const aindaAtual = () => vivo.current && minhaGeracao === geracao.current
    try {
      // A fila vem com folga e é ordenada no cliente pela maior espera: o
      // backend só ordena pela mensagem mais recente (P1 do SCRUM-1161).
      // Auditoria do Dashboard (12/11): o servidor diz QUEM está na fila (só as ativas, 7 dias),
      // os totais (as duas partes que somam o total, as paradas à parte) e desde quando cada
      // paciente espera. A lista carrega as pendentes com mensagem no mesmo horizonte.
      const [pendentes, revisar, pessoas, numeros, ias, fila] = await Promise.all([
        lerTodas(pendentesAtivas(HORIZONTE_PADRAO_DIAS)),
        conversationsApi.list({ needsReview: true } as ConversationFilters, 1, LIMITE_DA_VERIFICACAO).catch(() => null),
        usersApi.available().catch(() => ({ data: [] as AvailableUser[] })),
        whatsappNumbersApi.listDetailed().catch(() => ({ data: [] as WhatsAppNumberDetailed[] })),
        listAgents().catch(() => null),
        api.get<FilaDoServidor>('/home/queue').catch(() => null),
      ])
      if (!aindaAtual()) return
      const doServidor = fila?.data ?? null
      const itens = Array.isArray(doServidor?.itens) ? doServidor.itens : null
      // Publica o retrato inteiro de uma vez, somente depois de todas as leituras.
      setConversas(pendentes.lista)
      setDesdePorId(itens ? new Map(itens.map((i) => [i.id, i.desde])) : undefined)
      setFilaTruncada(pendentes.truncada || (!!itens && !!doServidor && itens.length < doServidor.esperando))
      setTotais(doServidor ? {
        esperando: doServidor.esperando ?? 0,
        semDono: doServidor.semDono ?? 0,
        comDonoSemResposta: doServidor.comDonoSemResposta ?? Math.max(0, (doServidor.esperando ?? 0) - (doServidor.semDono ?? 0)),
        paradas: doServidor.paradas ?? 0,
        horizonteDias: doServidor.horizonteDias ?? HORIZONTE_PADRAO_DIAS,
      } : null)
      // Falhou só esta leitura: mantém a anterior em vez de dizer "nenhuma".
      if (revisar) {
        const rev = Array.isArray(revisar.data?.data) ? revisar.data.data : []
        setVerificar(rev)
        setVerificarTotal(revisar.data?.total ?? rev.length)
      }
      // Falhou só o resumo: a faixa volta a contar pela lista (como antes).
      setResumo(fila?.data ? {
        maiorEsperaMin: typeof fila.data.maiorEsperaMin === 'number' ? fila.data.maiorEsperaMin : null,
        janelaFechando: fila.data.janelaFechando ?? 0,
        janelaFechada: fila.data.janelaFechada ?? 0,
        lidoEm: Date.now(),
      } : null)
      setEquipe(Array.isArray(pessoas.data) ? pessoas.data : [])
      setLinhas(Array.isArray(numeros.data) ? numeros.data : [])
      setAgentes(Array.isArray(ias) ? ias : null)
      setErro(false)
      setAtualizadoEm(new Date())
      setAgora(Date.now())
    } catch {
      if (aindaAtual()) setErro(true)
    } finally {
      if (aindaAtual()) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    vivo.current = true
    let espera: ReturnType<typeof setTimeout> | undefined
    let emVoo = false
    let pendente = false
    let sujo = false
    let ultima = 0
    const escondida = () => typeof document !== 'undefined' && document.hidden
    const disparar = async () => {
      if (emVoo) { pendente = true; return }
      emVoo = true
      ultima = Date.now()
      try {
        await carregar()
      } finally {
        emVoo = false
        if (pendente && vivo.current) { pendente = false; agendar() }
      }
    }
    const agendar = () => {
      clearTimeout(espera)
      const falta = Math.max(1_000, MIN_ENTRE_RECARGAS_MS - (Date.now() - ultima))
      espera = setTimeout(() => void disparar(), falta)
    }
    void disparar()
    const recarga = setInterval(() => { if (!escondida()) void disparar(); else sujo = true }, RECARGA_MS)
    const relogio = setInterval(() => setAgora(Date.now()), RELOGIO_MS)
    const socket = connectSocket()
    const aoEvento = () => {
      if (escondida()) { sujo = true; return }
      agendar()
    }
    const aoVoltar = () => {
      if (!escondida() && sujo) { sujo = false; agendar() }
    }
    for (const e of EVENTOS) socket.on(e, aoEvento)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      vivo.current = false
      clearInterval(recarga)
      clearInterval(relogio)
      clearTimeout(espera)
      for (const e of EVENTOS) socket.off(e, aoEvento)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  const linhasComIA = useMemo(() => calcularLinhasComIA(linhas, agentes), [linhas, agentes])
  const fila = useMemo(() => montarFila(conversas, linhasComIA, agora, desdePorId), [conversas, linhasComIA, agora, desdePorId])
  const recarregar = useCallback(() => { void carregar() }, [carregar])

  return { fila, totais, resumo, filaTruncada, equipe, agentes, linhas, linhasComIA, verificar, verificarTotal, carregando, erro, atualizadoEm, recarregar, agora }
}
