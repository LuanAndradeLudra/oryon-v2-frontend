import { useEffect, useSyncExternalStore } from 'react'
import { whatsappNumbersApi } from '@/services/api'
import { listAgents } from '@/services/agentsApi'
import { calcularLinhasComIA, type LinhasComIA } from '@/lib/filaAgora'

/**
 * Quais linhas de WhatsApp um Agente IA ligado atende — o dado que falta na
 * conversa (o formato público de `/conversations` não traz o `agentId` da
 * linha) para dizer se a IA está cuidando de uma conversa.
 *
 * Uma leitura por sessão, compartilhada: cada linha da lista de Conversas
 * chama este hook, e nenhuma dispara busca própria. Renova a cada 5 min
 * (vincular um agente a uma linha é raro e feito nas Configurações).
 *
 * Até a primeira resposta, `conhecidas` é falso: quem mostra o estado da IA
 * não deve afirmar "linha sem IA" antes de saber (ver `estadoDaIA`).
 */

const RENOVA_MS = 5 * 60_000

export interface LinhasDaIA {
  linhasComIA: LinhasComIA
  /** Já houve uma leitura bem-sucedida. */
  conhecidas: boolean
}

const INICIAL: LinhasDaIA = { linhasComIA: new Set(), conhecidas: false }

let atual: LinhasDaIA = INICIAL
let lidoEm = 0
let emVoo: Promise<void> | null = null
/** Sobe a cada troca de sessão: leitura em voo da conta anterior é descartada. */
let geracao = 0
const ouvintes = new Set<() => void>()

function avisar() { for (const o of ouvintes) o() }

async function ler(): Promise<void> {
  if (emVoo) return emVoo
  const minha = geracao
  emVoo = (async () => {
    try {
      const [numeros, agentes] = await Promise.all([
        whatsappNumbersApi.listDetailed().then((r) => (Array.isArray(r.data) ? r.data : [])),
        listAgents().catch(() => null),
      ])
      if (minha !== geracao) return
      atual = { linhasComIA: calcularLinhasComIA(numeros, agentes), conhecidas: true }
      lidoEm = Date.now()
      avisar()
    } catch {
      // Sem as linhas, fica o último conjunto conhecido (ou o inicial).
    } finally {
      if (minha === geracao) emVoo = null
    }
  })()
  return emVoo
}

function assinar(o: () => void) {
  ouvintes.add(o)
  return () => { ouvintes.delete(o) }
}

function useStoreDasLinhas(): LinhasDaIA {
  const valor = useSyncExternalStore(assinar, () => atual, () => atual)
  useEffect(() => {
    if (Date.now() - lidoEm > RENOVA_MS) void ler()
  }, [])
  return valor
}

/** O conjunto de linhas com IA ligada (vazio até a primeira leitura). */
export function useLinhasComIA(): LinhasComIA {
  return useStoreDasLinhas().linhasComIA
}

/** O conjunto e se ele já é conhecido — para quem precisa afirmar "linha sem IA". */
export function useLinhasDaIA(): LinhasDaIA {
  return useStoreDasLinhas()
}

/**
 * Esquece as linhas da sessão atual. Revisão 02/10: o store é do módulo e o
 * logout é SPA (sem recarregar) — entrar em outra conta em menos de 5 min
 * mostrava o estado da IA com as linhas da conta anterior. O AuthContext
 * chama isto ao sair (mesmo padrão de `resetBillingState`).
 */
export function resetLinhasComIA() {
  geracao++
  atual = INICIAL
  lidoEm = 0
  emVoo = null
  avisar()
}

/** Só para testes: volta ao estado inicial. */
export function __zerarLinhasComIA() {
  resetLinhasComIA()
}
