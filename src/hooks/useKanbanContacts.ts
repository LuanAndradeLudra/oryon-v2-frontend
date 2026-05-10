import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { contactsApi } from '@/services/api'
import { withRetry } from '@/lib/utils'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import type { Contact, ContactFilters, Tag } from '@/types'

export interface UseKanbanContactsOpts {
  /**
   * When false, no fetches happen and the hook returns empty state. Used by
   * ContactsPage to skip kanban fetches while the table/mobile view is
   * active. Default: true.
   */
  enabled?: boolean
}

export interface ColumnState {
  contacts: Contact[]
  total: number
  /** Last successfully loaded page (1-based). 0 means nothing loaded yet. */
  page: number
  hasMore: boolean
  /** True when the first page is in flight (drives the column skeleton). */
  loading: boolean
  /** True when a non-first page is in flight (drives the bottom spinner). */
  loadingMore: boolean
  error: Error | null
}

const PAGE_SIZE = 50

const EMPTY_COLUMN: ColumnState = {
  contacts: [],
  total: 0,
  page: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
}

/**
 * Per-column hook over the paginated `/contacts` endpoint, designed for the
 * kanban view of ContactsPage.
 *
 * Differences from `useContacts`:
 *   - Fetches one request per stage in parallel on mount and on filter change,
 *     keeping a separate `ColumnState` per stage with its own page/total/hasMore.
 *   - Exposes `loadMore(stageKey)` so each kanban column can drive its own
 *     infinite scroll independently.
 *   - Mutations (drag-drop a card to another stage, bulk move, delete, etc.)
 *     update the source and destination buckets atomically with optimistic
 *     state and rollback on error.
 *
 * Why not factor a shared base with useContacts: the bucket-aware mutations
 * differ enough from the flat-array mutations that abstracting them creates
 * more complexity than the local duplication. Both hooks coexist; the page
 * picks one via `enabled` based on viewMode.
 */
export function useKanbanContacts(filters: ContactFilters, opts: UseKanbanContactsOpts = {}) {
  const enabled = opts.enabled !== false
  const { stages, loadingStages } = useCRMConfig()

  const [columns, setColumns] = useState<Record<string, ColumnState>>({})

  // Race protection: every fetch tags itself with a generation. When filters
  // change (or `stages` changes identity), we bump the generation; in-flight
  // fetches resolving against an older generation are discarded so a slow
  // page-2 response can't clobber a fresh page-1 from a new filter.
  const generationRef = useRef(0)

  // Per-stage synchronous lock used by the scroll-handler-driven loadMore.
  // Scroll events fire faster than React flushes setState, so checking the
  // `loadingMore` field on `columns[stage]` would let several scroll events
  // start a fetch before the first one set the flag. Same pattern as
  // useConversations.loadingMoreLockRef. Released in fetchPage's finally.
  const loadingMoreLocksRef = useRef<Record<string, boolean>>({})

  const setColumn = useCallback((stageKey: string, patch: Partial<ColumnState>) => {
    setColumns((prev) => ({
      ...prev,
      [stageKey]: { ...(prev[stageKey] ?? EMPTY_COLUMN), ...patch },
    }))
  }, [])

  // Build the per-stage filter. Backend expects `stage` as a single string
  // (Query('stage') stage?: string in contacts.controller, then split(',') for
  // an IN clause). Frontend type is ContactStage[] for legacy reasons but the
  // wire format is a single key — we cast at the boundary.
  const buildStageFilter = useCallback((stageKey: string): ContactFilters => {
    return { ...filters, stage: stageKey as unknown as ContactFilters['stage'] }
  }, [filters])

  const fetchPage = useCallback(
    async (stageKey: string, page: number, generation: number) => {
      if (!enabled) return
      // Mark the right loading flag depending on whether this is page 1 (cold
      // load → column skeleton) or a subsequent page (loadMore → bottom spinner).
      setColumn(stageKey, page === 1
        ? { loading: true, error: null }
        : { loadingMore: true, error: null })

      try {
        const res = await withRetry(() =>
          contactsApi.list(buildStageFilter(stageKey), page, PAGE_SIZE),
        )
        // Discard stale responses (filters changed mid-fetch). Without this,
        // a slow page-2 from filter set A could overwrite a fresh page-1
        // from filter set B.
        if (generation !== generationRef.current) return
        const { data, total } = res.data
        setColumns((prev) => {
          const cur = prev[stageKey] ?? EMPTY_COLUMN
          const merged = page === 1 ? data : [...cur.contacts, ...data]
          return {
            ...prev,
            [stageKey]: {
              ...cur,
              contacts: merged,
              total,
              page,
              hasMore: page * PAGE_SIZE < total,
              loading: false,
              loadingMore: false,
              error: null,
            },
          }
        })
      } catch (err) {
        if (generation !== generationRef.current) return
        setColumn(stageKey, {
          loading: false,
          loadingMore: false,
          error: err instanceof Error ? err : new Error(String(err)),
        })
      } finally {
        // Release the synchronous lock so a future scroll event can trigger
        // the next page. Page-1 fetches don't acquire the lock (they go
        // through the filter useEffect, not loadMore), so the delete is a
        // no-op for those — harmless.
        loadingMoreLocksRef.current[stageKey] = false
      }
    },
    [enabled, buildStageFilter, setColumn],
  )

  // (Re-)fetch all columns when filters or stages change, or when the hook
  // is enabled. We watch a key derived from filters (a JSON snapshot) so
  // identity changes that don't affect the filter content don't refetch.
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters])
  // Deliberate: stages identity from CRMConfigContext is stable for a given
  // tenant config, so listing stage keys is enough to detect changes.
  const stagesKey = useMemo(() => stages.map((s) => s.key).join('|'), [stages])

  useEffect(() => {
    if (!enabled) return
    if (loadingStages || stages.length === 0) return

    const generation = generationRef.current + 1
    generationRef.current = generation

    // Reset columns to a "loading page 1" state for every stage so transitions
    // (e.g. filter changed) don't show stale data with the new badge counts.
    setColumns(() => {
      const next: Record<string, ColumnState> = {}
      for (const s of stages) {
        next[s.key] = { ...EMPTY_COLUMN, loading: true }
      }
      return next
    })

    void Promise.all(stages.map((s) => fetchPage(s.key, 1, generation)))
  }, [enabled, loadingStages, stagesKey, filtersKey, fetchPage, stages])

  const loadMore = useCallback(
    (stageKey: string) => {
      const cur = columns[stageKey]
      if (!cur || cur.loading || cur.loadingMore || !cur.hasMore) return
      // Synchronous gate that survives React's setState batching — without
      // this a fast scroll can fire several onScroll events before
      // `loadingMore: true` is committed to state, each starting a fetch.
      if (loadingMoreLocksRef.current[stageKey]) return
      loadingMoreLocksRef.current[stageKey] = true
      void fetchPage(stageKey, cur.page + 1, generationRef.current)
    },
    [columns, fetchPage],
  )

  const refetchColumn = useCallback(
    (stageKey: string) => {
      void fetchPage(stageKey, 1, generationRef.current)
    },
    [fetchPage],
  )

  const refetchAll = useCallback(() => {
    if (!enabled || stages.length === 0) return
    const generation = generationRef.current + 1
    generationRef.current = generation
    void Promise.all(stages.map((s) => fetchPage(s.key, 1, generation)))
  }, [enabled, stages, fetchPage])

  // ─── Aggregates derived from columns ────────────────────────────────────────

  const flatContacts = useMemo(() => {
    return stages.flatMap((s) => columns[s.key]?.contacts ?? [])
  }, [stages, columns])

  const totalAcrossStages = useMemo(() => {
    return Object.values(columns).reduce((acc, c) => acc + c.total, 0)
  }, [columns])

  const loading = useMemo(() => {
    if (loadingStages) return true
    return Object.values(columns).some((c) => c.loading)
  }, [columns, loadingStages])

  const initialLoading = useMemo(() => {
    if (loadingStages) return true
    if (stages.length === 0) return false
    // "initial" = no column has any contacts loaded yet AND at least one is loading
    return Object.values(columns).every((c) => c.contacts.length === 0)
      && Object.values(columns).some((c) => c.loading)
  }, [columns, loadingStages, stages])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Snapshot helper used by mutations that need atomic rollback. Captures the
   * relevant slices of `columns` so a failed API call restores the user's
   * previous view exactly.
   */
  const snapshotColumns = useCallback(() => {
    return columns
  }, [columns])

  const moveContactBetween = useCallback(
    (contact: Contact, from: string | null, to: string | null) => {
      setColumns((prev) => {
        const next = { ...prev }
        if (from && next[from]) {
          next[from] = {
            ...next[from],
            contacts: next[from].contacts.filter((c) => c.id !== contact.id),
            total: Math.max(0, next[from].total - 1),
          }
        }
        if (to && next[to]) {
          // Don't double-add if it's already there (e.g. server pushed it back)
          const already = next[to].contacts.some((c) => c.id === contact.id)
          if (!already) {
            next[to] = {
              ...next[to],
              contacts: [contact, ...next[to].contacts],
              total: next[to].total + 1,
            }
          }
        }
        return next
      })
    },
    [],
  )

  const updateContact = useCallback(
    async (id: string, patch: Partial<Contact>) => {
      // Find the contact and its current bucket.
      let prevContact: Contact | null = null
      let prevStage: string | null = null
      for (const s of stages) {
        const found = columns[s.key]?.contacts.find((c) => c.id === id)
        if (found) {
          prevContact = found
          prevStage = s.key
          break
        }
      }
      if (!prevContact) {
        // Contact not currently visible; do a passthrough update without
        // touching local state (server is source of truth).
        const res = await contactsApi.update(id, patch)
        return res.data
      }

      const targetStage = patch.stage !== undefined ? patch.stage : prevStage
      const merged: Contact = { ...prevContact, ...patch }

      if (patch.stage !== undefined && patch.stage !== prevStage) {
        // Stage change → move buckets optimistically.
        moveContactBetween(merged, prevStage, targetStage)
      } else {
        // In-place patch.
        setColumns((prev) => ({
          ...prev,
          [prevStage as string]: {
            ...prev[prevStage as string],
            contacts: prev[prevStage as string].contacts.map((c) =>
              c.id === id ? merged : c,
            ),
          },
        }))
      }

      try {
        const res = await contactsApi.update(id, patch)
        // Reconcile with server response (handles fields the server populates).
        setColumns((prev) => {
          const bucket = res.data.stage ?? targetStage
          if (!bucket || !prev[bucket]) return prev
          return {
            ...prev,
            [bucket]: {
              ...prev[bucket],
              contacts: prev[bucket].contacts.map((c) =>
                c.id === id ? res.data : c,
              ),
            },
          }
        })
        return res.data
      } catch (err) {
        // Rollback: undo the optimistic change.
        if (patch.stage !== undefined && patch.stage !== prevStage) {
          moveContactBetween(prevContact, targetStage, prevStage)
        } else {
          setColumns((prev) => ({
            ...prev,
            [prevStage as string]: {
              ...prev[prevStage as string],
              contacts: prev[prevStage as string].contacts.map((c) =>
                c.id === id ? prevContact! : c,
              ),
            },
          }))
        }
        throw err
      }
    },
    [columns, stages, moveContactBetween],
  )

  const createContact = useCallback(
    async (dto: Partial<Contact> & { displayName: string; waId: string }) => {
      const res = await contactsApi.create(dto)
      const stageKey = res.data.stage ?? stages[0]?.key
      if (stageKey) {
        setColumns((prev) => {
          const cur = prev[stageKey] ?? EMPTY_COLUMN
          return {
            ...prev,
            [stageKey]: {
              ...cur,
              contacts: [res.data, ...cur.contacts],
              total: cur.total + 1,
            },
          }
        })
      }
      return res.data
    },
    [stages],
  )

  const bulkUpdateStage = useCallback(
    async (ids: string[], stage: string) => {
      // Snapshot of which bucket each id was in, for rollback.
      const prevById = new Map<string, { contact: Contact; stage: string }>()
      for (const s of stages) {
        for (const c of columns[s.key]?.contacts ?? []) {
          if (ids.includes(c.id)) {
            prevById.set(c.id, { contact: c, stage: s.key })
          }
        }
      }

      // Optimistic move: pull from each source bucket, push into target.
      setColumns((prev) => {
        const next = { ...prev }
        // Drop from source buckets and decrement totals
        for (const [, { stage: srcStage }] of prevById) {
          const cur = next[srcStage]
          if (!cur) continue
          const remaining = cur.contacts.filter((c) => !ids.includes(c.id))
          const dropped = cur.contacts.length - remaining.length
          next[srcStage] = {
            ...cur,
            contacts: remaining,
            total: Math.max(0, cur.total - dropped),
          }
        }
        // Push into target with patched stage
        const target = next[stage]
        if (target) {
          const patched: Contact[] = []
          for (const [, { contact }] of prevById) {
            patched.push({ ...contact, stage })
          }
          next[stage] = {
            ...target,
            contacts: [...patched, ...target.contacts],
            total: target.total + patched.length,
          }
        }
        return next
      })

      try {
        const res = await contactsApi.bulkUpdateStage(ids, stage)
        return res.data
      } catch (err) {
        // Rollback to snapshot.
        setColumns((prev) => {
          const next = { ...prev }
          // Remove from target
          if (next[stage]) {
            next[stage] = {
              ...next[stage],
              contacts: next[stage].contacts.filter((c) => !ids.includes(c.id)),
              total: Math.max(
                0,
                next[stage].total - prevById.size,
              ),
            }
          }
          // Restore in originals
          for (const [, { contact, stage: srcStage }] of prevById) {
            const cur = next[srcStage]
            if (!cur) continue
            const already = cur.contacts.some((c) => c.id === contact.id)
            if (already) continue
            next[srcStage] = {
              ...cur,
              contacts: [contact, ...cur.contacts],
              total: cur.total + 1,
            }
          }
          return next
        })
        throw err
      }
    },
    [columns, stages],
  )

  const bulkRemove = useCallback(
    async (ids: string[]) => {
      const snapshot = snapshotColumns()
      // Optimistic: filter ids from every bucket and decrement totals.
      setColumns((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          const cur = next[key]
          const remaining = cur.contacts.filter((c) => !ids.includes(c.id))
          const dropped = cur.contacts.length - remaining.length
          if (dropped === 0) continue
          next[key] = {
            ...cur,
            contacts: remaining,
            total: Math.max(0, cur.total - dropped),
          }
        }
        return next
      })

      try {
        const res = await contactsApi.bulkDelete(ids)
        // If the server says fewer were deleted (some already gone), don't
        // restore — the optimistic decrement already accounts for the
        // requested ids. Server is canonical for total count anyway.
        return res.data
      } catch (err) {
        setColumns(snapshot)
        throw err
      }
    },
    [snapshotColumns],
  )

  const bulkAddTag = useCallback(
    async (ids: string[], tag: Tag) => {
      const idSet = new Set(ids)
      const snapshot = snapshotColumns()
      setColumns((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = {
            ...next[key],
            contacts: next[key].contacts.map((c) => {
              if (!idSet.has(c.id)) return c
              const has = (c.tags ?? []).some((t) => t.id === tag.id)
              return has ? c : { ...c, tags: [...(c.tags ?? []), tag] }
            }),
          }
        }
        return next
      })

      try {
        const res = await contactsApi.bulkUpdateTags(ids, { addTagIds: [tag.id] })
        return res.data
      } catch (err) {
        setColumns(snapshot)
        throw err
      }
    },
    [snapshotColumns],
  )

  const bulkRemoveTag = useCallback(
    async (ids: string[], tagId: string) => {
      const idSet = new Set(ids)
      const snapshot = snapshotColumns()
      setColumns((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = {
            ...next[key],
            contacts: next[key].contacts.map((c) => {
              if (!idSet.has(c.id)) return c
              return { ...c, tags: (c.tags ?? []).filter((t) => t.id !== tagId) }
            }),
          }
        }
        return next
      })

      try {
        const res = await contactsApi.bulkUpdateTags(ids, { removeTagIds: [tagId] })
        return res.data
      } catch (err) {
        setColumns(snapshot)
        throw err
      }
    },
    [snapshotColumns],
  )

  const removeContact = useCallback((id: string) => {
    setColumns((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        const cur = next[key]
        const remaining = cur.contacts.filter((c) => c.id !== id)
        if (remaining.length !== cur.contacts.length) {
          next[key] = {
            ...cur,
            contacts: remaining,
            total: Math.max(0, cur.total - 1),
          }
        }
      }
      return next
    })
  }, [])

  return {
    columns,
    loadMore,
    refetchColumn,
    refetchAll,
    flatContacts,
    totalAcrossStages,
    loading,
    initialLoading,
    updateContact,
    createContact,
    bulkUpdateStage,
    bulkRemove,
    bulkAddTag,
    bulkRemoveTag,
    removeContact,
  }
}
