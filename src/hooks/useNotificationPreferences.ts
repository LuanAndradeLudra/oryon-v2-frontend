import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '@/contexts/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp'

export type NotificationCategory =
  | 'conversations'
  | 'team'
  | 'campaigns'
  | 'automations'
  | 'security'

/**
 * Phase 19: shape returned by `GET /notification-preferences`. Each row is
 * a single type (14 total), already resolved — `enabled` reflects the
 * user's override when `isOverride=true`, otherwise the role default.
 */
export interface ResolvedPreference {
  type: string
  label: string
  description: string
  category: NotificationCategory
  enabled: boolean
  channels: NotificationChannel[]
  isOverride: boolean
  mandatory: boolean
}

/**
 * Hook for the Settings "Notificações" page. Loads the full resolved list
 * once and exposes optimistic `update()` + `bulkSave()` functions. Missing
 * rows (user never customized) render the role default and flip to an
 * override on first change.
 */
export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth()
  const [preferences, setPreferences] = useState<ResolvedPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      const { data } = await axios.get<ResolvedPreference[]>(`${API}/notification-preferences`)
      setPreferences(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar preferências')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { load() }, [load])

  /**
   * Optimistic single-toggle update. Flips local state immediately and
   * rolls back on failure so the user sees instant feedback but we never
   * diverge from the backend.
   */
  const update = useCallback(async (type: string, enabled: boolean) => {
    let snapshot: ResolvedPreference[] = []
    setPreferences((prev) => {
      snapshot = prev
      return prev.map((p) =>
        p.type === type ? { ...p, enabled, isOverride: true } : p,
      )
    })
    try {
      setSaving(true)
      const { data } = await axios.patch<ResolvedPreference[]>(
        `${API}/notification-preferences/${encodeURIComponent(type)}`,
        { enabled },
      )
      setPreferences(data)
      setError(null)
    } catch (e) {
      setPreferences(snapshot)
      setError(e instanceof Error ? e.message : 'Erro ao salvar preferência')
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  /** Reset a single type to the role default (deletes the override). */
  const reset = useCallback(async (type: string) => {
    const snapshot = preferences
    try {
      setSaving(true)
      await axios.delete(`${API}/notification-preferences/${encodeURIComponent(type)}`)
      await load()
    } catch (e) {
      setPreferences(snapshot)
      throw e
    } finally {
      setSaving(false)
    }
  }, [preferences, load])

  return { preferences, loading, saving, error, update, reset, reload: load }
}
