import { useEffect, useState } from 'react'
import { whatsappNumbersApi } from '@/services/api'

/**
 * Onde cada agente atende, lido das LINHAS (`whatsapp_numbers.agentId`), que
 * é o vínculo que o atendimento de fato usa. O campo `agent.channels.whatsapp`
 * não é gravado por ninguém (nem pelo assistente, nem pela publicação, nem por
 * Configurações → Números), então não serve para mostrar o número.
 *
 * `GET /whatsapp/numbers` não exige perfil de administrador (ao contrário de
 * `/meta/numbers`) e já devolve `agentId`.
 */
export interface LinhaDoAgente {
  id: string
  displayPhoneNumber: string
  label?: string | null
  agentId: string | null
}

let pedido: Promise<LinhaDoAgente[]> | null = null
let falhou = false

/** Todas as linhas do tenant, com uma consulta por carga de página. */
export function carregarLinhas(forcar = false): Promise<LinhaDoAgente[]> {
  if (!pedido || forcar) {
    falhou = false
    pedido = whatsappNumbersApi.listDetailed()
      .then((r) => (r.data ?? []).map((n) => ({
        id: n.id,
        displayPhoneNumber: n.displayPhoneNumber,
        label: n.label ?? null,
        agentId: n.agentId ?? null,
      })))
      .catch(() => {
        pedido = null
        falhou = true
        return []
      })
  }
  return pedido
}

/** A última leitura falhou: a lista vazia não quer dizer "nenhuma linha". */
export function leituraDeLinhasFalhou(): boolean {
  return falhou
}

/** Depois de ligar ou trocar uma linha: a próxima leitura busca de novo. */
export function invalidarLinhas(): void {
  pedido = null
}

/** Linhas agrupadas por agente (um agente pode atender em mais de uma). */
export function linhasPorAgente(linhas: LinhaDoAgente[]): Map<string, LinhaDoAgente[]> {
  const mapa = new Map<string, LinhaDoAgente[]>()
  for (const l of linhas) {
    if (!l.agentId) continue
    mapa.set(l.agentId, [...(mapa.get(l.agentId) ?? []), l])
  }
  return mapa
}

export function formatarLinha(l: Pick<LinhaDoAgente, 'displayPhoneNumber' | 'label'>): string {
  return l.label ? `${l.label} · ${l.displayPhoneNumber}` : l.displayPhoneNumber
}

/** "+55 11 9… " ou "+55 11 9… (+1)" quando o agente atende em mais de uma linha. */
export function numeroDoAgente(linhas: LinhaDoAgente[] | undefined): string | undefined {
  if (!linhas?.length) return undefined
  return linhas.length === 1 ? linhas[0].displayPhoneNumber : `${linhas[0].displayPhoneNumber} (+${linhas.length - 1})`
}

/** Mapa agentId → linhas; `null` enquanto carrega. */
export function useLinhasPorAgente(): Map<string, LinhaDoAgente[]> | null {
  const [mapa, setMapa] = useState<Map<string, LinhaDoAgente[]> | null>(null)
  useEffect(() => {
    let vivo = true
    void carregarLinhas().then((l) => { if (vivo) setMapa(linhasPorAgente(l)) })
    return () => { vivo = false }
  }, [])
  return mapa
}
