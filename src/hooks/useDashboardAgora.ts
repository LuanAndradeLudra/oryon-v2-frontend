import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, conversationsApi, usersApi, whatsappNumbersApi, type AvailableUser } from '@/services/api'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { connectSocket } from '@/services/socket'
import { calcularLinhasComIA, montarFila, type ItemDaFila, type LinhasComIA } from '@/lib/filaAgora'
import type { Conversation, ConversationFilters, WhatsAppNumberDetailed } from '@/types'

/** Recarga periódica (decisão do PO: o painel atualiza sozinho a cada minuto). */
const RECARGA_MS = 60_000
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
  /** Pendentes sem dono + pendentes com dono sem resposta humana. */
  esperando: number
  /** Pendentes sem dono = a aba Fila da inbox. */
  semDono: number
  /** O mesmo "esperando", só nas linhas com IA (a IA passou para a equipe). */
  iaPassou: number
  iaPassouSemDono: number
}

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

const PENDENTES_SEM_DONO = { status: 'pending', assignedTo: 'unassigned' } as ConversationFilters
const PENDENTES_AGUARDANDO = { status: 'pending', awaitingReply: true } as ConversationFilters
const PENDENTES_SEM_DONO_AGUARDANDO = { status: 'pending', assignedTo: 'unassigned', awaitingReply: true } as ConversationFilters

/** Uma consulta só pelo total (limit 1). */
async function contar(filtros: ConversationFilters): Promise<number> {
  const { data } = await conversationsApi.list(filtros, 1, 1)
  return data?.total ?? 0
}

/** "Esperando alguém" num recorte: sem dono + com dono aguardando (sem contar duas vezes). */
async function contarEsperando(extra: Partial<ConversationFilters> = {}): Promise<{ esperando: number; semDono: number }> {
  const [semDono, aguardando, semDonoAguardando] = await Promise.all([
    contar({ ...PENDENTES_SEM_DONO, ...extra }),
    contar({ ...PENDENTES_AGUARDANDO, ...extra }),
    contar({ ...PENDENTES_SEM_DONO_AGUARDANDO, ...extra }),
  ])
  return { esperando: semDono + Math.max(0, aguardando - semDonoAguardando), semDono }
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
      const [semDono, aguardando, totalGeral, revisar, pessoas, numeros, ias, fila] = await Promise.all([
        lerTodas(PENDENTES_SEM_DONO),
        lerTodas(PENDENTES_AGUARDANDO),
        contarEsperando(),
        conversationsApi.list({ needsReview: true } as ConversationFilters, 1, LIMITE_DA_VERIFICACAO).catch(() => null),
        usersApi.available().catch(() => ({ data: [] as AvailableUser[] })),
        whatsappNumbersApi.listDetailed().catch(() => ({ data: [] as WhatsAppNumberDetailed[] })),
        listAgents().catch(() => null),
        api.get<Omit<ResumoDaFila, 'lidoEm'>>('/home/queue').catch(() => null),
      ])
      if (!aindaAtual()) return
      // A lista: as pendentes sem dono (a aba Fila, inteira) + as com dono em
      // que ninguém respondeu ainda.
      const lista = [...semDono.lista]
      for (const c of aguardando.lista) if (c.assignedUser && !lista.some((x) => x.id === c.id)) lista.push(c)
      // "IA passou": o mesmo recorte, só nas linhas com IA ligada.
      const linhasLidas = Array.isArray(numeros.data) ? numeros.data : []
      const idsComIA = [...calcularLinhasComIA(linhasLidas, Array.isArray(ias) ? ias : null)]
      const porLinha = await Promise.all(idsComIA.map((id) => contarEsperando({ whatsappNumberId: id })))
      if (!aindaAtual()) return
      // Publica o retrato inteiro de uma vez, somente depois de todas as leituras.
      setConversas(lista)
      setFilaTruncada(semDono.truncada || aguardando.truncada)
      setTotais({
        esperando: totalGeral.esperando,
        semDono: totalGeral.semDono,
        iaPassou: porLinha.reduce((n, x) => n + x.esperando, 0),
        iaPassouSemDono: porLinha.reduce((n, x) => n + x.semDono, 0),
      })
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
    void carregar()
    const recarga = setInterval(() => void carregar(), RECARGA_MS)
    const relogio = setInterval(() => setAgora(Date.now()), RELOGIO_MS)
    let espera: ReturnType<typeof setTimeout> | undefined
    const socket = connectSocket()
    const aoEvento = () => {
      clearTimeout(espera)
      espera = setTimeout(() => void carregar(), 1_000)
    }
    for (const e of EVENTOS) socket.on(e, aoEvento)
    return () => {
      vivo.current = false
      clearInterval(recarga)
      clearInterval(relogio)
      clearTimeout(espera)
      for (const e of EVENTOS) socket.off(e, aoEvento)
    }
  }, [carregar])

  const linhasComIA = useMemo(() => calcularLinhasComIA(linhas, agentes), [linhas, agentes])
  const fila = useMemo(() => montarFila(conversas, linhasComIA, agora), [conversas, linhasComIA, agora])
  const recarregar = useCallback(() => { void carregar() }, [carregar])

  return { fila, totais, resumo, filaTruncada, equipe, agentes, linhas, linhasComIA, verificar, verificarTotal, carregando, erro, atualizadoEm, recarregar, agora }
}
