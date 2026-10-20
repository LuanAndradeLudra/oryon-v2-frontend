import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/services/api'


export type NotificationChannel = 'in_app' | 'email' | 'whatsapp'

export type NotificationCategory =
  | 'conversations'
  | 'team'
  | 'campaigns'
  | 'automations'
  | 'security'
  | 'billing'

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
  /** O tipo aceita cópia por e-mail (20/10). Ausente em backend anterior. */
  emailAvailable?: boolean
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
      const { data } = await api.get<ResolvedPreference[]>('/notification-preferences')
      setPreferences(data)
      setError(null)
    } catch {
      // Sem o e.message do axios ("Request failed with status code 500") na tela.
      setError('Não foi possível carregar suas preferências de notificação.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { load() }, [load])

  // Lista atual para o rollback (20/10): ler dentro do atualizador do
  // setState não é garantido — o React pode rodá-lo depois, e o rollback
  // voltava para [] (tela de Notificações vazia após um erro).
  const prefsRef = useRef(preferences)
  prefsRef.current = preferences

  /**
   * Optimistic single-toggle update. Flips local state immediately and
   * rolls back on failure so the user sees instant feedback but we never
   * diverge from the backend.
   */
  const update = useCallback(async (type: string, enabled: boolean) => {
    const snapshot = prefsRef.current
    setPreferences(snapshot.map((p) =>
      p.type === type ? { ...p, enabled, isOverride: true } : p,
    ))
    try {
      setSaving(true)
      const { data } = await api.patch<ResolvedPreference[]>(
        `/notification-preferences/${encodeURIComponent(type)}`,
        { enabled },
      )
      setPreferences(data)
      setError(null)
    } catch (e) {
      setPreferences(snapshot)
      setError('Não foi possível salvar a preferência. Ela voltou ao valor anterior.')
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  /**
   * Liga/desliga a cópia por e-mail de um tipo (20/10). Otimista, com
   * rollback. Manda `enabled` junto: a rota grava os dois.
   */
  const setEmail = useCallback(async (type: string, on: boolean) => {
    const snapshot = prefsRef.current
    const enabled = snapshot.find((p) => p.type === type)?.enabled ?? true
    const channels: NotificationChannel[] = on ? ['in_app', 'email'] : ['in_app']
    setPreferences(snapshot.map((p) => (p.type === type ? { ...p, channels, isOverride: true } : p)))
    try {
      setSaving(true)
      const { data } = await api.patch<ResolvedPreference[]>(
        `/notification-preferences/${encodeURIComponent(type)}`,
        { enabled, channels: on ? ['in_app', 'email'] : ['in_app'] },
      )
      setPreferences(data)
      setError(null)
    } catch (e) {
      setPreferences(snapshot)
      setError('Não foi possível salvar o aviso por e-mail. Ele voltou ao valor anterior.')
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
      await api.delete(`/notification-preferences/${encodeURIComponent(type)}`)
      await load()
    } catch (e) {
      setPreferences(snapshot)
      throw e
    } finally {
      setSaving(false)
    }
  }, [preferences, load])

  return { preferences, loading, saving, error, update, setEmail, reset, reload: load }
}
