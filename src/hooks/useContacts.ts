import { useState, useEffect, useCallback } from 'react'
import { contactsApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import type { Contact, ContactFilters, Tag } from '@/types'

export function useContacts(initialFilters: ContactFilters = {}) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<ContactFilters>(initialFilters)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await withRetry(() => contactsApi.list(filters))
      setContacts(res.data.data)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetch() }, [fetch])

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
