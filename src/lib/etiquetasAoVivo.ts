import { useEffect, useRef } from 'react'
import type { Contact, Conversation, Tag } from '@/types'

/**
 * Etiqueta excluída/alterada "ao vivo" — SCRUM-1253 (PO, 11/10).
 *
 * Antes, excluir uma etiqueta só atualizava a lista de etiquetas da conta: as
 * cópias guardadas em cada conversa e em cada contato carregado (lista de
 * Conversas, chat, Leads, ficha) continuavam mostrando a etiqueta até o F5.
 *
 * Quem altera avisa aqui; quem guarda conversas/contatos escuta e aplica.
 * O aviso vale para a aba atual (evento de janela) e para as outras abas do
 * mesmo navegador (BroadcastChannel). Outros usuários dependem do backend
 * emitir `tag:deleted` / `tag:updated` pelo socket — o TagsProvider já
 * escuta esses eventos e repassa para cá (SCRUM-1161).
 */
export type MudancaDeEtiqueta =
  | { tipo: 'excluida'; id: string }
  | { tipo: 'alterada'; tag: Pick<Tag, 'id'> & Partial<Tag> }

const EVENTO = 'oryon:etiqueta'
const canal: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('oryon-etiquetas') : null

if (canal) {
  // Vindo de outra aba: só repassa nesta (não reenvia, para não ecoar).
  canal.onmessage = (e: MessageEvent<MudancaDeEtiqueta>) => {
    window.dispatchEvent(new CustomEvent<MudancaDeEtiqueta>(EVENTO, { detail: e.data }))
  }
}

/** Avisa esta aba e as outras abas abertas. */
export function avisarMudancaDeEtiqueta(m: MudancaDeEtiqueta): void {
  window.dispatchEvent(new CustomEvent<MudancaDeEtiqueta>(EVENTO, { detail: m }))
  try { canal?.postMessage(m) } catch { /* canal fechado */ }
}

/** Avisa só esta aba (eventos do socket já chegam em todas as abas). */
export function avisarNestaAba(m: MudancaDeEtiqueta): void {
  window.dispatchEvent(new CustomEvent<MudancaDeEtiqueta>(EVENTO, { detail: m }))
}

/** Escuta as mudanças. O callback pode mudar a cada render. */
export function useMudancaDeEtiqueta(cb: (m: MudancaDeEtiqueta) => void): void {
  const ref = useRef(cb)
  useEffect(() => { ref.current = cb })
  useEffect(() => {
    const ouvir = (e: Event) => ref.current((e as CustomEvent<MudancaDeEtiqueta>).detail)
    window.addEventListener(EVENTO, ouvir)
    return () => window.removeEventListener(EVENTO, ouvir)
  }, [])
}

/** Aplica a mudança numa lista de etiquetas; devolve a MESMA referência se nada mudou. */
export function aplicarNasEtiquetas(tags: Tag[] | undefined, m: MudancaDeEtiqueta): Tag[] | undefined {
  if (!tags || tags.length === 0) return tags
  if (m.tipo === 'excluida') {
    return tags.some((t) => t.id === m.id) ? tags.filter((t) => t.id !== m.id) : tags
  }
  return tags.some((t) => t.id === m.tag.id) ? tags.map((t) => (t.id === m.tag.id ? { ...t, ...m.tag } : t)) : tags
}

export function aplicarNoContato<C extends Contact | null | undefined>(c: C, m: MudancaDeEtiqueta): C {
  if (!c) return c
  const tags = aplicarNasEtiquetas(c.tags, m)
  return tags === c.tags ? c : ({ ...c, tags } as C)
}

export function aplicarNaConversa(c: Conversation, m: MudancaDeEtiqueta): Conversation {
  const tags = aplicarNasEtiquetas(c.tags, m)
  const contact = aplicarNoContato(c.contact, m)
  return tags === c.tags && contact === c.contact ? c : { ...c, tags, contact }
}

/** Aplica numa lista; devolve a MESMA lista se nenhum item mudou. */
export function aplicarNaLista<T>(lista: T[], m: MudancaDeEtiqueta, aplicar: (x: T, m: MudancaDeEtiqueta) => T): T[] {
  let mudou = false
  const nova = lista.map((x) => { const y = aplicar(x, m); if (y !== x) mudou = true; return y })
  return mudou ? nova : lista
}
