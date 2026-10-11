import { useEffect, useRef, useState } from 'react'
import { conversationsApi } from '@/services/api'
import { getSocket } from '@/services/socket'
import type { PendingCounts } from '@/types'

/** "N na fila · N aguardando você" (D11): pendentes sem dono e pendentes suas. */
export interface ContagensDaFila {
  naFila: number
  suas: number
}

const DEBOUNCE_MS = 500

/**
 * A FONTE das contagens, isolada (revisão 11/10). Com o backend novo (SCRUM-1161
 * C5), `GET /conversations` devolve `pendingCounts: { queue, mine }` — escopo
 * empresa + linhas permitidas + linha do seletor, independente de aba/busca —
 * e basta UMA chamada. Sem o campo (backend antigo), cai nas 2 chamadas com
 * `limit=1` de antes. Quando o C5 estiver em todo lugar, o fallback sai daqui.
 */
export async function lerContagensDaFila(whatsappNumberId?: string): Promise<ContagensDaFila> {
  const linha = whatsappNumberId ? { whatsappNumberId } : {}
  const { data } = await conversationsApi.list({ ...linha, assignedTo: 'unassigned', status: 'pending' }, 1, 1)
  if (data.pendingCounts) return { naFila: data.pendingCounts.queue, suas: data.pendingCounts.mine }
  const { data: minhas } = await conversationsApi.list({ ...linha, assignedTo: 'me', status: 'pending' }, 1, 1)
  return { naFila: data.statusCounts.pending, suas: minhas.statusCounts.pending }
}

/** Eventos que mexem em "na fila"/"aguardando você": conversa nova, dono, status, pausa. */
const CANAIS = [
  'conversation:new', 'conversation:assigned', 'conversation:resolved',
  'conversation:status-updated', 'conversation:ai-pause-updated', 'connect',
] as const

/**
 * Contagens do cabeçalho de Conversas. Antes só reliam quando mudavam as
 * contagens da ABA (open/pending) — ficavam velhas ao Assumir (que não muda o
 * status) e ao chegar conversa nova fora da aba. Agora:
 *  - `daLista`: `pendingCounts` que veio na última leitura da lista (C5) — usa
 *    direto, sem pedido extra;
 *  - releem por socket (outros operadores, IA, conversa nova) e pelo evento
 *    local `oryon:activity-invalidate` (as ações do próprio operador, como
 *    Assumir), com debounce para uma rajada virar uma leitura só.
 */
export function useContagensDaFila(daLista?: PendingCounts | null, whatsappNumberId?: string): ContagensDaFila | null {
  const [lidas, setLidas] = useState<ContagensDaFila | null>(null)
  const [releitura, setReleitura] = useState(0)
  // Já veio da lista: a 1ª leitura própria é desnecessária.
  const temDaLista = useRef(!!daLista)
  temDaLista.current = !!daLista

  useEffect(() => {
    if (daLista) setLidas({ naFila: daLista.queue, suas: daLista.mine })
  }, [daLista?.queue, daLista?.mine]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (releitura === 0 && temDaLista.current) return
    let vivo = true
    const t = setTimeout(() => {
      lerContagensDaFila(whatsappNumberId)
        .then((c) => { if (vivo) setLidas(c) })
        .catch(() => { /* contagem é aviso: mantém a anterior */ })
    }, releitura === 0 ? 0 : DEBOUNCE_MS)
    return () => { vivo = false; clearTimeout(t) }
  }, [releitura, whatsappNumberId])

  useEffect(() => {
    const reler = () => setReleitura((n) => n + 1)
    const socket = getSocket()
    CANAIS.forEach((c) => socket.on(c, reler))
    window.addEventListener('oryon:activity-invalidate', reler)
    return () => {
      CANAIS.forEach((c) => socket.off(c, reler))
      window.removeEventListener('oryon:activity-invalidate', reler)
    }
  }, [])

  return lidas
}
