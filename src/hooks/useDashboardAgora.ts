import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { conversationsApi, usersApi, whatsappNumbersApi, type AvailableUser } from '@/services/api'
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

export interface DashboardAgora {
  fila: ItemDaFila[]
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

/** Todas as pendentes (até MAX_PAGINAS_DA_FILA páginas). */
async function lerPendentes(): Promise<{ lista: Conversation[]; truncada: boolean }> {
  const filtros = { status: 'pending' } as ConversationFilters
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

  const carregar = useCallback(async () => {
    try {
      // A fila vem com folga e é ordenada no cliente pela maior espera: o
      // backend só ordena pela mensagem mais recente (P1 do SCRUM-1161).
      const [convs, revisar, pessoas, numeros, ias] = await Promise.all([
        lerPendentes(),
        conversationsApi.list({ needsReview: true } as ConversationFilters, 1, LIMITE_DA_VERIFICACAO).catch(() => null),
        usersApi.available().catch(() => ({ data: [] as AvailableUser[] })),
        whatsappNumbersApi.listDetailed().catch(() => ({ data: [] as WhatsAppNumberDetailed[] })),
        listAgents().catch(() => null),
      ])
      if (!vivo.current) return
      setConversas(convs.lista)
      setFilaTruncada(convs.truncada)
      // Falhou só esta leitura: mantém a anterior em vez de dizer "nenhuma".
      if (revisar) {
        const rev = Array.isArray(revisar.data?.data) ? revisar.data.data : []
        setVerificar(rev)
        setVerificarTotal(revisar.data?.total ?? rev.length)
      }
      setEquipe(Array.isArray(pessoas.data) ? pessoas.data : [])
      setLinhas(Array.isArray(numeros.data) ? numeros.data : [])
      setAgentes(Array.isArray(ias) ? ias : null)
      setErro(false)
      setAtualizadoEm(new Date())
      setAgora(Date.now())
    } catch {
      if (vivo.current) setErro(true)
    } finally {
      if (vivo.current) setCarregando(false)
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

  return { fila, filaTruncada, equipe, agentes, linhas, linhasComIA, verificar, verificarTotal, carregando, erro, atualizadoEm, recarregar, agora }
}
