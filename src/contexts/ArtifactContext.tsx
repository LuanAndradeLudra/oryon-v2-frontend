import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ArtifactType } from '@/lib/copilotParser'
import { appLogger } from '@/services/appLogger'

export type { ArtifactType }

/** A single version of an artifact, preserved across edits so the user can
 *  step back to earlier states (like Claude's artifact version slider). */
export interface ArtifactVersion {
  content: string
  title: string
  createdAt: string // ISO
}

export interface ArtifactItem {
  id: string
  content: string      // current active content (== versions[versionIndex].content)
  title: string        // current active title
  type: ArtifactType
  createdAt: string    // ISO — when version 1 was created
  versions: ArtifactVersion[] // versions[0] is v1; always has at least one entry
  versionIndex: number        // which version is active
}

interface ArtifactContextValue {
  // Currently open in the panel
  artifact: ArtifactItem | null
  // Persisted list
  artifacts: ArtifactItem[]
  /** Opens an artifact — if a recent same-type artifact from the same
   *  session exists, appends a new version to it; otherwise creates a new
   *  item. Returns the id of the target item. */
  openArtifact: (content: string, title: string, type?: ArtifactType) => string
  /** Register an artifact in the store WITHOUT activating the panel.
   *  Used by chat cards during cold-load so a session with 10 artifacts
   *  doesn't pop the panel open 10 times. Returns the item id. */
  registerArtifact: (content: string, title: string, type?: ArtifactType) => string
  openExisting: (id: string) => void
  closeArtifact: () => void
  updateArtifactContent: (id: string, content: string) => void
  /** Switch the active version of an artifact. */
  setArtifactVersion: (id: string, index: number) => void
  deleteArtifact: (id: string) => void
}

const ArtifactContext = createContext<ArtifactContextValue | null>(null)

const STORAGE_KEY = 'oryon_artifacts'
const MAX_STORED = 50
/** A new artifact with the same type arriving within this window is treated
 *  as an edit of the previous one instead of a brand-new artifact. */
const EDIT_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

function loadFromStorage(): ArtifactItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Partial<ArtifactItem>>
    // Migrate older items that don't have versions[] yet.
    return parsed.map((a) => migrateItem(a)).filter((a): a is ArtifactItem => a !== null)
  } catch {
    return []
  }
}

function migrateItem(raw: Partial<ArtifactItem>): ArtifactItem | null {
  if (!raw.id || !raw.content || !raw.type) return null
  if (Array.isArray(raw.versions) && raw.versions.length > 0 && typeof raw.versionIndex === 'number') {
    return raw as ArtifactItem
  }
  // Legacy item: wrap its current content as version 1.
  return {
    id: raw.id,
    content: raw.content,
    title: raw.title ?? 'Artefato',
    type: raw.type,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    versions: [{ content: raw.content, title: raw.title ?? 'Artefato', createdAt: raw.createdAt ?? new Date().toISOString() }],
    versionIndex: 0,
  }
}

function saveToStorage(items: ArtifactItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED)))
  } catch { /* ignore quota errors */ }
}

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>(loadFromStorage)
  const [artifact, setArtifact] = useState<ArtifactItem | null>(null)

  /** Internal implementation shared by openArtifact (activates panel) and
   *  registerArtifact (silent). The `activate` flag decides whether to also
   *  set the active artifact — pulled out so the two public entry points
   *  stay consistent in every edge case (dedupe, edit-in-place, new). */
  const addOrUpdate = useCallback((
    content: string,
    title: string,
    type: ArtifactType,
    activate: boolean,
  ): string => {
    let targetId = ''
    setArtifacts((prev) => {
      // 1) Exact dedupe: same content already stored → reuse that item.
      const sameContent = prev.find((a) => a.content === content)
      if (sameContent) {
        targetId = sameContent.id
        if (activate) setArtifact(sameContent)
        return prev
      }

      // 2) Edit-in-place: if the most recent artifact of this type was
      // created within EDIT_WINDOW_MS, treat this as a new version of it.
      const now = Date.now()
      const editable = prev.find((a) => {
        if (a.type !== type) return false
        const latest = a.versions[a.versions.length - 1]?.createdAt ?? a.createdAt
        return now - new Date(latest).getTime() < EDIT_WINDOW_MS
      })

      if (editable) {
        const nextVersion: ArtifactVersion = { content, title, createdAt: new Date().toISOString() }
        const updatedItem: ArtifactItem = {
          ...editable,
          content,
          title,
          versions: [...editable.versions, nextVersion],
          versionIndex: editable.versions.length, // point to the new (last) version
        }
        appLogger.logArtifact({
          artifact_type: type,
          title:         title || null,
          char_count:    content.length,
        })
        appLogger.logActivity({
          action:      'artifact_updated',
          entity_type: 'artifact',
          entity_name: title || null,
          description: `Artefato atualizado: "${title || type}" (v${updatedItem.versions.length})`,
          details:     { type, char_count: content.length, version: updatedItem.versions.length },
          source:      'copilot',
        })
        const updated = prev.map((a) => (a.id === editable.id ? updatedItem : a))
        saveToStorage(updated)
        targetId = updatedItem.id
        if (activate) setArtifact(updatedItem)
        return updated
      }

      // 3) New artifact
      const nowIso = new Date().toISOString()
      const newItem: ArtifactItem = {
        id: crypto.randomUUID(),
        content,
        title,
        type,
        createdAt: nowIso,
        versions: [{ content, title, createdAt: nowIso }],
        versionIndex: 0,
      }
      appLogger.logArtifact({
        artifact_type: type,
        title:         title || null,
        char_count:    content.length,
      })
      appLogger.logActivity({
        action:      'artifact_generated',
        entity_type: 'artifact',
        entity_name: title || null,
        description: `Artefato gerado: "${title || type}" (${type}, ${content.length} chars)`,
        details:     { type, char_count: content.length },
        source:      'copilot',
      })
      const updated = [newItem, ...prev].slice(0, MAX_STORED)
      saveToStorage(updated)
      targetId = newItem.id
      if (activate) setArtifact(newItem)
      return updated
    })
    return targetId
  }, [])

  const openArtifact = useCallback(
    (content: string, title: string, type: ArtifactType = 'document') =>
      addOrUpdate(content, title, type, true),
    [addOrUpdate],
  )

  /** Silent register (cold-load path). Populates the store so the chat
   *  ArtifactCard can display version badges, but does NOT pop the panel
   *  open — the user decides which artifact (if any) to view. */
  const registerArtifact = useCallback(
    (content: string, title: string, type: ArtifactType = 'document') =>
      addOrUpdate(content, title, type, false),
    [addOrUpdate],
  )

  const openExisting = useCallback((id: string) => {
    setArtifacts((prev) => {
      const found = prev.find((a) => a.id === id)
      if (found) setArtifact(found)
      return prev
    })
  }, [])

  const closeArtifact = useCallback(() => setArtifact(null), [])

  const updateArtifactContent = useCallback((id: string, content: string) => {
    setArtifacts((prev) => {
      const updated = prev.map((a) => {
        if (a.id !== id) return a
        // Update the currently-active version in place.
        const newVersions = a.versions.map((v, i) => (i === a.versionIndex ? { ...v, content } : v))
        return { ...a, content, versions: newVersions }
      })
      saveToStorage(updated)
      setArtifact((cur) => (cur?.id === id ? { ...cur, content, versions: cur.versions.map((v, i) => (i === cur.versionIndex ? { ...v, content } : v)) } : cur))
      return updated
    })
  }, [])

  const setArtifactVersion = useCallback((id: string, index: number) => {
    setArtifacts((prev) => {
      const target = prev.find((a) => a.id === id)
      if (!target) return prev
      if (index < 0 || index >= target.versions.length) return prev
      const targetVersion = target.versions[index]
      const updatedItem: ArtifactItem = {
        ...target,
        versionIndex: index,
        content: targetVersion.content,
        title: targetVersion.title,
      }
      const updated = prev.map((a) => (a.id === id ? updatedItem : a))
      saveToStorage(updated)
      // Always set the active artifact to the updated item — this opens the
      // panel if it was closed, or syncs it to the new version if already open.
      setArtifact(updatedItem)
      return updated
    })
  }, [])

  const deleteArtifact = useCallback((id: string) => {
    setArtifacts((prev) => {
      const updated = prev.filter((a) => a.id !== id)
      saveToStorage(updated)
      return updated
    })
    setArtifact((cur) => (cur?.id === id ? null : cur))
  }, [])

  return (
    <ArtifactContext.Provider value={{
      artifact, artifacts,
      openArtifact, registerArtifact, openExisting, closeArtifact,
      updateArtifactContent, setArtifactVersion, deleteArtifact,
    }}>
      {children}
    </ArtifactContext.Provider>
  )
}

export function useArtifactContext() {
  const ctx = useContext(ArtifactContext)
  if (!ctx) throw new Error('useArtifactContext must be used within ArtifactProvider')
  return ctx
}
