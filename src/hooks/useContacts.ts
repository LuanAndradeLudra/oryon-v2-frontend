import { useState, useEffect, useCallback, useRef } from 'react'
import { contactsApi, dealsApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import type { Contact, ContactFilters, Tag } from '@/types'

export interface UseContactsOpts {
  /** When false, no fetches happen and the hook returns its initial state.
   *  Used by ContactsPage to skip the table-view fetch while the kanban
   *  view is active (kanban has its own per-column hook). Default: true. */
  enabled?: boolean
  /** When false, skips the batched `dealsApi.summary` enrichment (used to
   *  power the "Negócios" chip/faceta). Callers that only need the flat
   *  contact list (e.g. ConversationsPage's tag/user filters) should opt
   *  out so they don't pay for a fetch they never read. Default: true. */
  withDealsSummary?: boolean
}

/** Tamanho de página da lista de contatos — mesmo valor usado no backend
 *  como default e no antigo useKanbanContacts (per-stage). */
const PAGE_SIZE = 50

export function useContacts(initialFilters: ContactFilters = {}, opts: UseContactsOpts = {}) {
  const enabled = opts.enabled !== false
  const withDealsSummary = opts.withDealsSummary !== false
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<ContactFilters>(initialFilters)
  // Guarda contra corrida: uma resposta de negócios de uma busca antiga (o
  // filtro trocou no meio) é descartada em vez de fundida por cima da atual.
  const generationRef = useRef(0)
  // Cursor de paginação — em ref para loadMore ler o valor atual sem precisar
  // recriar o callback a cada página (mesmo padrão de useConversations).
  const pageRef = useRef(1)
  // Trava síncrona contra scroll disparando loadMore várias vezes antes do
  // primeiro setState (`loadingMore`) ser commitado (mesmo padrão de
  // useConversations/useKanbanContacts).
  const loadingMoreLockRef = useRef(false)

  const applyDealsSummary = useCallback((ids: string[], generation: number) => {
    if (!withDealsSummary || ids.length === 0) return
    dealsApi.summary(ids)
      .then((sres) => {
        if (generation !== generationRef.current) return
        const byId = new Map(sres.data.map((s) => [s.contactId, s]))
        if (byId.size === 0) return
        setContacts((cs) => cs.map((c) => {
          const s = byId.get(c.id)
          return s ? { ...c, dealsSummary: s } : c
        }))
      })
      .catch(() => { /* badge é best-effort — ignora */ })
  }, [withDealsSummary])

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const generation = ++generationRef.current
    pageRef.current = 1
    try {
      const res = await withRetry(() => contactsApi.list(filters, 1, PAGE_SIZE))
      setContacts(res.data.data)
      setTotal(res.data.total)
      setHasMore(res.data.data.length < res.data.total)
      // Busca em lote o resumo de negócios (múltiplos pipelines) e funde
      // `dealsSummary` por id — alimenta a faceta "Situação comercial" e a
      // coluna "Negócios" da tabela (spec UX 2026-07-09). Best-effort: erro
      // só significa que o chip não aparece, não quebra a lista.
      applyDealsSummary(res.data.data.map((c) => c.id), generation)
    } catch {
      setError('Não foi possível carregar os contatos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [filters, enabled, applyDealsSummary])

  useEffect(() => { fetch() }, [fetch])

  /** Anexa a próxima página à lista (scroll infinito da tabela/lista mobile
   *  — antes só o Kanban aposentado tinha paginação; a tabela ficava presa
   *  nos primeiros 50 contatos). Dedup por id evita duplicar linhas se um
   *  contato mudar de posição (reordenação por `lastContactedAt`) entre a
   *  página atual e a próxima. */
  const loadMore = useCallback(async () => {
    if (!enabled || loadingMoreLockRef.current || !hasMore) return
    loadingMoreLockRef.current = true
    const next = pageRef.current + 1
    setLoadingMore(true)
    const generation = generationRef.current
    try {
      const res = await withRetry(() => contactsApi.list(filters, next, PAGE_SIZE))
      if (generation !== generationRef.current) return
      let appendedIds: string[] = []
      setContacts((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        const incoming = res.data.data.filter((c) => !seen.has(c.id))
        appendedIds = incoming.map((c) => c.id)
        return [...prev, ...incoming]
      })
      setTotal(res.data.total)
      pageRef.current = next
      setHasMore(next * PAGE_SIZE < res.data.total)
      applyDealsSummary(appendedIds, generation)
    } catch {
      // Mantém a lista atual; o usuário pode tentar de novo rolando mais.
    } finally {
      setLoadingMore(false)
      loadingMoreLockRef.current = false
    }
  }, [enabled, hasMore, filters, applyDealsSummary])

  const updateContact = useCallback(async (id: string, patch: Partial<Contact>) => {
    const prev = contacts.find((c) => c.id === id)
    setContacts((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c))
    try {
      const res = await contactsApi.update(id, patch)
      setContacts((cs) => cs.map((c) => c.id === id ? res.data : c))
      return res.data
    } catch (err) {
      if (prev) setContacts((cs) => cs.map((c) => c.id === id ? prev : c))
      throw err
    }
  }, [contacts])

  const createContact = useCallback(async (dto: Partial<Contact> & { displayName: string; waId: string }) => {
    const res = await contactsApi.create(dto)
    setContacts((prev) => [res.data, ...prev])
    setTotal((t) => t + 1)
    return res.data
  }, [])

  const bulkUpdateStage = useCallback(async (ids: string[], stage: string) => {
    const prevById = new Map(
      contacts.filter((c) => ids.includes(c.id)).map((c) => [c.id, c.stage]),
    )
    setContacts((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, stage } : c)))
    try {
      const res = await contactsApi.bulkUpdateStage(ids, stage)
      return res.data
    } catch (err) {
      // Rollback: restore previous stage for each affected contact.
      setContacts((cs) =>
        cs.map((c) => {
          const prev = prevById.get(c.id)
          return prev !== undefined ? { ...c, stage: prev } : c
        }),
      )
      throw err
    }
  }, [contacts])

  const bulkAddTag = useCallback(async (ids: string[], tag: Tag) => {
    const idSet = new Set(ids)
    const prev = contacts
    setContacts((cs) => cs.map((c) => {
      if (!idSet.has(c.id)) return c
      const has = (c.tags ?? []).some((t) => t.id === tag.id)
      return has ? c : { ...c, tags: [...(c.tags ?? []), tag] }
    }))
    try {
      const res = await contactsApi.bulkUpdateTags(ids, { addTagIds: [tag.id] })
      return res.data
    } catch (err) {
      setContacts(prev)
      throw err
    }
  }, [contacts])

  const bulkRemoveTag = useCallback(async (ids: string[], tagId: string) => {
    const idSet = new Set(ids)
    const prev = contacts
    setContacts((cs) => cs.map((c) => {
      if (!idSet.has(c.id)) return c
      return { ...c, tags: (c.tags ?? []).filter((t) => t.id !== tagId) }
    }))
    try {
      const res = await contactsApi.bulkUpdateTags(ids, { removeTagIds: [tagId] })
      return res.data
    } catch (err) {
      setContacts(prev)
      throw err
    }
  }, [contacts])

  const bulkSetOptIn = useCallback(async (ids: string[], optIn: boolean) => {
    const idSet = new Set(ids)
    const prev = contacts
    setContacts((cs) => cs.map((c) => (idSet.has(c.id) ? { ...c, optIn } : c)))
    try {
      const res = await contactsApi.bulkSetOptIn(ids, optIn)
      return res.data
    } catch (err) {
      setContacts(prev)
      throw err
    }
  }, [contacts])

  const removeContact = useCallback((id: string) => {
    setContacts((cs) => cs.filter((c) => c.id !== id))
    setTotal((t) => Math.max(0, t - 1))
  }, [])

  const bulkRemove = useCallback(async (ids: string[]) => {
    // Optimistic: drop rows from the list immediately; rollback on failure.
    const prev = contacts
    setContacts((cs) => cs.filter((c) => !ids.includes(c.id)))
    setTotal((t) => Math.max(0, t - ids.length))
    try {
      const res = await contactsApi.bulkDelete(ids)
      // Reconcile total with what the server actually deleted (in case some
      // ids were already gone — `deleted` may be < ids.length).
      const diff = ids.length - res.data.deleted
      if (diff > 0) setTotal((t) => t + diff)
      return res.data
    } catch (err) {
      setContacts(prev)
      setTotal((t) => t + ids.length)
      throw err
    }
  }, [contacts])

  return {
    contacts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    total,
    filters,
    setFilters,
    updateContact,
    createContact,
    bulkUpdateStage,
    bulkRemove,
    bulkAddTag,
    bulkRemoveTag,
    bulkSetOptIn,
    removeContact,
    refetch: fetch,
  }
}
