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
 * Até a primeira resposta, o conjunto é vazio — "nenhuma linha com IA", o que
 * erra para MOSTRAR quem espera, nunca para esconder.
 */

const RENOVA_MS = 5 * 60_000
const VAZIO: LinhasComIA = new Set()

let atual: LinhasComIA = VAZIO
let lidoEm = 0
let emVoo: Promise<void> | null = null
const ouvintes = new Set<() => void>()

function avisar() { for (const o of ouvintes) o() }

async function ler(): Promise<void> {
  if (emVoo) return emVoo
  emVoo = (async () => {
    try {
      const [numeros, agentes] = await Promise.all([
        whatsappNumbersApi.listDetailed().then((r) => (Array.isArray(r.data) ? r.data : [])),
        listAgents().catch(() => null),
      ])
      atual = calcularLinhasComIA(numeros, agentes)
      lidoEm = Date.now()
      avisar()
    } catch {
      // Sem as linhas, fica o último conjunto conhecido (ou o vazio).
    } finally {
      emVoo = null
    }
  })()
  return emVoo
}

function assinar(o: () => void) {
  ouvintes.add(o)
  return () => { ouvintes.delete(o) }
}

export function useLinhasComIA(): LinhasComIA {
  const valor = useSyncExternalStore(assinar, () => atual, () => atual)
  useEffect(() => {
    if (Date.now() - lidoEm > RENOVA_MS) void ler()
  }, [])
  return valor
}

/** Só para testes: volta ao estado inicial. */
export function __zerarLinhasComIA() {
  atual = VAZIO
  lidoEm = 0
  emVoo = null
}
